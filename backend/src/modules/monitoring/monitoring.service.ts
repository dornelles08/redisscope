import { ConnectionsService } from '../connections/connections.service.js';
import type { RedisManager } from '../../infrastructure/redis/redis-manager.js';
import { BadGatewayError } from '../../common/errors/app-error.js';
import { parseInfo, parseNumber, type InfoSections } from '../../common/utils/info-parser.js';
import { ensureClient } from '../keys/keys.service.js';

export interface MonitoringSummary {
  version: string;
  mode: string;
  uptimeSeconds: number;
  memoryUsedBytes: number;
  memoryUsedHuman: string;
  maxMemoryBytes: number;
  maxMemoryHuman: string;
  memoryFragmentationRatio: number | null;
  keysCount: number;
  connectedClients: number;
  databasesUsed: number;
  opsPerSecond: number;
  totalCommands: number;
  hits: number;
  misses: number;
  hitRate: number | null;
  expiredKeys: number;
  evictedKeys: number;
  osMonoTicks: number | null;
}

export class MonitoringService {
  constructor(
    private readonly connections: ConnectionsService,
    private readonly redis: RedisManager,
  ) {}

  async getInfoSections(connectionId: string): Promise<InfoSections> {
    const client = await ensureClient(this.connections, this.redis, connectionId);
    try {
      const raw = (await client.info()) as string;
      return parseInfo(raw);
    } catch {
      throw new BadGatewayError('Não foi possível obter as informações do servidor.');
    }
  }

  async getMonitoring(connectionId: string): Promise<MonitoringSummary> {
    const client = await ensureClient(this.connections, this.redis, connectionId);
    let raw: string;
    let keysCount: number;
    try {
      raw = (await client.info()) as string;
      keysCount = (await client.dbsize()) as number;
    } catch {
      throw new BadGatewayError('Não foi possível obter as métricas.');
    }

    const sections = parseInfo(raw);
    const server = sections['server'] ?? {};
    const memory = sections['memory'] ?? {};
    const clients = sections['clients'] ?? {};
    const stats = sections['stats'] ?? {};
    const cpu = sections['cpu'] ?? {};
    const keyspace = sections['keyspace'] ?? {};

    const hits = parseNumber(stats['keyspace_hits']) ?? 0;
    const misses = parseNumber(stats['keyspace_misses']) ?? 0;
    const hitRate = hits + misses > 0 ? hits / (hits + misses) : null;

    return {
      version: server['redis_version'] ?? 'desconhecido',
      mode: server['redis_mode'] ?? 'standalone',
      uptimeSeconds: parseNumber(server['uptime_in_seconds']) ?? 0,
      memoryUsedBytes: parseNumber(memory['used_memory']) ?? 0,
      memoryUsedHuman: memory['used_memory_human'] ?? '-',
      maxMemoryBytes: parseNumber(memory['maxmemory']) ?? 0,
      maxMemoryHuman: memory['maxmemory_human'] ?? '-',
      memoryFragmentationRatio: parseNumber(memory['mem_fragmentation_ratio']) ?? null,
      keysCount,
      connectedClients: parseNumber(clients['connected_clients']) ?? 0,
      databasesUsed: Object.keys(keyspace).length,
      opsPerSecond: parseNumber(stats['instantaneous_ops_per_sec']) ?? 0,
      totalCommands: parseNumber(stats['total_commands_processed']) ?? 0,
      hits,
      misses,
      hitRate,
      expiredKeys: parseNumber(stats['expired_keys']) ?? 0,
      evictedKeys: parseNumber(stats['evicted_keys']) ?? 0,
      osMonoTicks: parseNumber(cpu['os_mono_ticks']) ?? null,
    };
  }
}
