import { Redis } from 'ioredis';
import type {
  RedisConnectionConfig,
  RedisConnectionStatus,
  RedisTestResult,
} from './redis.types.js';

const MAX_CONNECTIONS = 20;

interface ManagedEntry {
  client: InstanceType<typeof Redis>;
  status: 'connected' | 'connecting' | 'error';
  latencyMs?: number;
  error?: string;
}

/**
 * Totais centralizados do ciclo de vida das conexões ioredis.
 *
 * Garantias:
 * - Reutilização: uma instância por `connectionId`.
 * - Limite de conexões simultâneas (20) — evita esgotar recursos.
 * - Conexão controlada: timeout + PING de calibração para latência.
 * - Estados observáveis: connected / disconnected / connecting / error.
 * - Desconexão limpa em `disconnectAll()` (shutdown do servidor).
 *
 * Erros de rede nunca vazam detalhes internos: o chamador traduz para
 * mensagem genérica; os detalhes ficam apenas nos logs do servidor.
 */
export class RedisManager {
  private readonly clients = new Map<string, ManagedEntry>();
  private readonly connecting = new Map<string, Promise<ManagedEntry>>();

  constructor(
    private readonly connectTimeoutMs: number,
    private readonly commandTimeoutMs: number,
  ) {}

  private buildOptions(config: RedisConnectionConfig) {
    return {
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      db: config.database,
      tls: config.tls ? {} : undefined,
      connectTimeout: this.connectTimeoutMs,
      commandTimeout: this.commandTimeoutMs,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy: (times: number): number | null => (times <= 3 ? times * 200 : null),
    };
  }

  /** Teste efêmero — não deixa cliente persistente. */
  async testConnection(config: RedisConnectionConfig): Promise<RedisTestResult> {
    const client = new Redis(this.buildOptions(config));
    // Evita evento 'error' não tratado derrubando o processo
    client.on('error', () => {});
    const started = Date.now();
    try {
      const connected = (async () => {
        await client.connect();
        const res = await client.ping();
        if (res !== 'PONG') throw new Error('Resposta PING inesperada.');
      })();
      await this.withTimeout(connected, this.connectTimeoutMs + this.commandTimeoutMs, 'tempo esgotado');
      const latencyMs = Date.now() - started;
      return { ok: true, latencyMs };
    } catch {
      return { ok: false, error: 'Não foi possível conectar ao Redis.' };
    } finally {
      try {
        await client.quit().catch(() => client.disconnect());
      } catch {
        client.disconnect();
      }
    }
  }

  /** Conecta (ou reutiliza) de forma persistente. */
  async connect(connectionId: string, config: RedisConnectionConfig): Promise<RedisConnectionStatus> {
    const existing = this.clients.get(connectionId);
    if (existing && existing.status === 'connected' && existing.client.status === 'ready') {
      const latencyMs = await this.pingLatency(existing.client);
      return { connectionId, status: 'connected', latencyMs: latencyMs ?? existing.latencyMs };
    }

    const pending = this.connecting.get(connectionId);
    if (pending) {
      try {
        const entry = await pending;
        return { connectionId, status: 'connected', latencyMs: entry.latencyMs };
      } catch {
        return { connectionId, status: 'error', error: 'Não foi possível conectar ao Redis.' };
      }
    }

    if (!existing && this.clients.size >= MAX_CONNECTIONS) {
      return { connectionId, status: 'error', error: 'Limite de conexões simultâneas atingido.' };
    }

    const promise = this.doConnect(connectionId, config);
    this.connecting.set(connectionId, promise);
    try {
      const entry = await promise;
      return { connectionId, status: 'connected', latencyMs: entry.latencyMs };
    } catch {
      return { connectionId, status: 'error', error: 'Não foi possível conectar ao Redis.' };
    } finally {
      this.connecting.delete(connectionId);
    }
  }

  private async doConnect(connectionId: string, config: RedisConnectionConfig): Promise<ManagedEntry> {
    // Substitui cliente anterior obsoleto (ex.: config foi alterada)
    const previous = this.clients.get(connectionId);
    if (previous) {
      try {
        previous.client.disconnect();
      } catch {
        // ignora
      }
      this.clients.delete(connectionId);
    }

    const client = new Redis(this.buildOptions(config));
    const entry: ManagedEntry = { client, status: 'connecting' };
    this.clients.set(connectionId, entry);

    client.on('ready', () => {
      entry.status = 'connected';
      entry.error = undefined;
    });
    client.on('error', () => {
      if (entry.status !== 'connected') entry.status = 'error';
      entry.error = 'Falha de conexão.';
    });
    client.on('close', () => {
      if (entry.status === 'connected') entry.status = 'error';
    });

    const started = Date.now();
    await this.withTimeout(
      (async () => {
        await client.connect();
        const res = await client.ping();
        if (res !== 'PONG') throw new Error('Resposta PING inesperada.');
      })(),
      this.connectTimeoutMs + this.commandTimeoutMs,
      'tempo esgotado',
    );
    entry.status = 'connected';
    entry.latencyMs = Date.now() - started;
    entry.error = undefined;
    return entry;
  }

  async disconnect(connectionId: string): Promise<RedisConnectionStatus> {
    const entry = this.clients.get(connectionId);
    if (!entry) return { connectionId, status: 'disconnected' };
    this.clients.delete(connectionId);
    try {
      await this.withTimeout(entry.client.quit(), this.commandTimeoutMs, 'tempo esgotado');
    } catch {
      try {
        entry.client.disconnect();
      } catch {
        // ignora
      }
    }
    return { connectionId, status: 'disconnected' };
  }

  async disconnectAll(): Promise<void> {
    const entries = [...this.clients.values()];
    this.clients.clear();
    this.connecting.clear();
    await Promise.allSettled(
      entries.map(async (e) => {
        try {
          await e.client.quit();
        } catch {
          e.client.disconnect();
        }
      }),
    );
  }

  /** Cliente reutilizável para fases futuras (keys/commands/monitoring). */
  getClient(connectionId: string): InstanceType<typeof Redis> | undefined {
    const entry = this.clients.get(connectionId);
    if (!entry || entry.status !== 'connected') return undefined;
    if (entry.client.status !== 'ready') return undefined;
    return entry.client;
  }

  /** Status atual — com PING vivo quando conectado para medir latência. */
  async getStatus(connectionId: string): Promise<RedisConnectionStatus> {
    const entry = this.clients.get(connectionId);
    if (!entry) return { connectionId, status: 'disconnected' };
    if (entry.status === 'connecting') return { connectionId, status: 'connecting' };
    if (entry.status === 'error') {
      entry.client.disconnect();
      this.clients.delete(connectionId);
      return { connectionId, status: 'error', error: entry.error ?? 'Falha de conexão.' };
    }
    if (entry.client.status !== 'ready') {
      this.clients.delete(connectionId);
      return { connectionId, status: 'disconnected' };
    }
    const latencyMs = await this.pingLatency(entry.client);
    if (latencyMs === undefined) {
      this.clients.delete(connectionId);
      return { connectionId, status: 'error', error: 'Falha de conexão.' };
    }
    entry.latencyMs = latencyMs;
    return { connectionId, status: 'connected', latencyMs };
  }

  private async pingLatency(client: InstanceType<typeof Redis>): Promise<number | undefined> {
    const started = Date.now();
    try {
      const res = (await this.withTimeout(client.ping(), this.commandTimeoutMs, 'tempo esgotado')) as string;
      if (res !== 'PONG') return undefined;
      return Date.now() - started;
    } catch {
      return undefined;
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  }
}
