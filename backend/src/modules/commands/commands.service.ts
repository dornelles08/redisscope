import { ConnectionsService } from '../connections/connections.service.js';
import type { RedisManager } from '../../infrastructure/redis/redis-manager.js';
import { BadGatewayError, ForbiddenError, ValidationError } from '../../common/errors/app-error.js';
import { ensureClient } from '../keys/keys.service.js';
import { tokenize, classifyCommand } from './commands.schema.js';

export interface CommandResult {
  command: string;
  args: string[];
  result: unknown;
  latencyMs: number;
  truncated: boolean;
}

const MAX_RESULT_BYTES = 100 * 1024;
const MAX_ELEMENTS = 1000;

export class CommandsService {
  constructor(
    private readonly connections: ConnectionsService,
    private readonly redis: RedisManager,
    private readonly commandTimeoutMs: number,
  ) {}

  async execute(connectionId: string, rawCommand: string, confirm?: boolean): Promise<CommandResult> {
    const trimmed = rawCommand.trim();
    if (!trimmed) throw new ValidationError('Comando vazio.');

    let tokens: string[];
    try {
      tokens = tokenize(trimmed);
    } catch (err) {
      throw new ValidationError(err instanceof Error ? err.message : 'Sintaxe inválida.');
    }
    if (tokens.length === 0) throw new ValidationError('Comando vazio.');

    const command = (tokens[0] as string).toUpperCase();
    const args = tokens.slice(1);
    const category = classifyCommand(tokens);

    if (category === 'blocked') {
      throw new ForbiddenError(`Comando ${command} bloqueado por política de segurança.`);
    }
    if (category === 'blocking') {
      if (command === 'KEYS') {
        throw new ForbiddenError('Comando KEYS bloqueado — use SCAN com MATCH/COUNT (Key Browser).');
      }
      throw new ForbiddenError(`Comando ${command} bloqueado (pode travar a aplicação).`);
    }
    if (category === 'confirm-required' && confirm !== true) {
      throw new ValidationError(`Comando ${command} requer confirmação explícita. Envie confirm:true.`);
    }

    const client = await ensureClient(this.connections, this.redis, connectionId);
    const started = Date.now();
    let result: unknown;
    try {
      const call = client.call as unknown as (...a: (string | number)[]) => Promise<unknown>;
      result = await this.withTimeout(call.call(client, command, ...args), this.commandTimeoutMs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao executar comando.';
      // Mensagens de erro do Redis são úteis (ex.: WRONGTYPE) sem vazar rede
      throw new BadGatewayError(message);
    }
    const latencyMs = Date.now() - started;

    const { truncatedResult, truncated } = truncateResult(result);
    return { command, args, result: truncatedResult, latencyMs, truncated };
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Tempo esgotado ao executar comando.')), ms);
      }),
    ]);
  }
}

function truncateResult(value: unknown): { truncatedResult: unknown; truncated: boolean } {
  try {
    const json = JSON.stringify(value) ?? '';
    if (json.length > MAX_RESULT_BYTES) {
      return { truncatedResult: `${json.slice(0, MAX_RESULT_BYTES)}… (resposta truncada — ${json.length} bytes)`, truncated: true };
    }
    if (Array.isArray(value) && value.length > MAX_ELEMENTS) {
      return { truncatedResult: [...value.slice(0, MAX_ELEMENTS), `… (${value.length - MAX_ELEMENTS} itens omitidos)`], truncated: true };
    }
  } catch {
    return { truncatedResult: String(value), truncated: false };
  }
  return { truncatedResult: value, truncated: false };
}
