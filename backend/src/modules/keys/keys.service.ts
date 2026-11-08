import { randomUUID } from 'node:crypto';
import { ConnectionsService } from '../connections/connections.service.js';
import type { RedisManager } from '../../infrastructure/redis/redis-manager.js';
import { BadGatewayError, NotFoundError } from '../../common/errors/app-error.js';
import type { CreateKeyInput } from './keys.schema.js';

/**
 * Utilitário de cliente conectado compartilhado entre keys/monitoring.
 */
export async function ensureClient(
  connections: ConnectionsService,
  redis: RedisManager,
  connectionId: string,
): Promise<InstanceType<typeof import('ioredis').Redis>> {
  let client = redis.getClient(connectionId);
  if (client) return client;
  const status = await connections.connect(connectionId);
  if (status.status !== 'connected') {
    throw new BadGatewayError('Não foi possível conectar ao Redis.');
  }
  client = redis.getClient(connectionId);
  if (!client) throw new BadGatewayError('Não foi possível conectar ao Redis.');
  return client;
}

export interface KeySummary {
  key: string;
  type: string;
  ttl: number;
}

export interface ListKeysParams {
  cursor: string;
  count: number;
  match?: string;
  type?: string;
}

const MAX_VALUE_LENGTH = 1024 * 1024; // 1 MiB por campo (limite do body)
const DEFAULT_PAGE = 50;

export class KeysService {
  constructor(
    private readonly connections: ConnectionsService,
    private readonly redis: RedisManager,
  ) {}

  private async client(connectionId: string): Promise<InstanceType<typeof import('ioredis').Redis>> {
    return ensureClient(this.connections, this.redis, connectionId);
  }

  private async databaseOf(connectionId: string): Promise<number> {
    const stored = await this.connections.getStoredById(connectionId);
    return stored.database;
  }

  async listKeys(connectionId: string, params: ListKeysParams) {
    const client = await this.client(connectionId);
    const count = Math.min(Math.max(params.count, 1), 500);

    let nextCursor: string;
    let rawKeys: string[];
    try {
      const scanFn = client.scan.bind(client) as unknown as (
        cursor: string,
        ...args: (string | number)[]
      ) => Promise<[string, string[]]>;
      const args: (string | number)[] = ['COUNT', count];
      if (params.match) args.push('MATCH', params.match);
      const result = await scanFn(params.cursor, ...args);
      nextCursor = result[0] as string;
      rawKeys = result[1] as string[];
    } catch {
      throw new BadGatewayError('Não foi possível listar as chaves.');
    }

    let typeFilter: string | undefined;
    if (params.type && params.type !== '' && params.type !== 'all') {
      typeFilter = params.type.toLowerCase();
    }

    const summaries: KeySummary[] = [];
    if (rawKeys.length > 0) {
      const pipeline = client.pipeline();
      for (const k of rawKeys) {
        pipeline.type(k);
        pipeline.ttl(k);
      }
      let results: [Error | null, unknown][];
      try {
        results = (await pipeline.exec()) as [Error | null, unknown][];
      } catch {
        throw new BadGatewayError('Não foi possível listar as chaves.');
      }
      for (let i = 0; i < rawKeys.length; i++) {
        const typeRes = results[i * 2]?.[1] as string | undefined;
        const ttlRes = results[i * 2 + 1]?.[1] as number | undefined;
        const type = typeof typeRes === 'string' ? typeRes : 'unknown';
        if (type === 'none') continue; // expirou entre SCAN e TYPE
        if (typeFilter && type !== typeFilter) continue;
        summaries.push({
          key: rawKeys[i] as string,
          type,
          ttl: typeof ttlRes === 'number' ? ttlRes : -2,
        });
      }
    }

    return { keys: summaries, cursor: nextCursor, done: nextCursor === '0' };
  }

  async getKey(connectionId: string, key: string, query: Record<string, string | number | undefined>) {
    const client = await this.client(connectionId);
    const database = await this.databaseOf(connectionId);
    let type: string;
    let ttl: number;
    try {
      type = (await client.type(key)) as string;
      ttl = (await client.ttl(key)) as number;
    } catch {
      throw new BadGatewayError('Não foi possível consultar a chave.');
    }
    if (type === 'none') throw new NotFoundError('Chave', key);

    const base = { key, type, ttl, database };
    const count = Math.min(Math.max(Number(query.count ?? DEFAULT_PAGE), 1), 200);
    const start = Math.max(Number(query.start ?? 0), 0);
    const stop = Math.min(Number(query.stop ?? start + DEFAULT_PAGE - 1), start + 199);

    try {
      switch (type) {
        case 'string': {
          const value = (await client.get(key)) as string | null;
          const size = await this.safe(() =>
            (client.strlen as unknown as (k: string) => Promise<number>)(key),
          );
          return { ...base, value: value ?? '', size };
        }
        case 'hash': {
          const cursor = String(query.cursor ?? '0');
          const [nextCursor, chunk] = (await client.hscan(key, cursor, 'COUNT', String(count))) as [string, string[]];
          const fields: Array<{ field: string; value: string }> = [];
          for (let i = 0; i + 1 < chunk.length; i += 2) {
            fields.push({ field: chunk[i] as string, value: chunk[i + 1] as string });
          }
          const total = await this.safe(() => client.hlen(key).then((n) => n as number));
          return { ...base, fields, totalFields: total, cursor: nextCursor, done: nextCursor === '0' };
        }
        case 'list': {
          const total = await this.safe(() => client.llen(key).then((n) => n as number));
          const items = (await client.lrange(key, start, stop)) as string[];
          return { ...base, items, totalLength: total, range: { start, stop } };
        }
        case 'set': {
          const cursor = String(query.cursor ?? '0');
          const [nextCursor, members] = (await client.sscan(key, cursor, 'COUNT', String(count))) as [string, string[]];
          const total = await this.safe(() => client.scard(key).then((n) => n as number));
          return { ...base, members, totalMembers: total, cursor: nextCursor, done: nextCursor === '0' };
        }
        case 'zset': {
          const order = String(query.order ?? 'desc');
          const total = await this.safe(() =>
            (client.zcard as unknown as (k: string) => Promise<number>)(key),
          );
          let members: Array<{ member: string; score: number }>;
          if (order === 'asc') {
            const raw = (await (client.zrange as unknown as (k: string, s: string, e: string, ...a: string[]) => Promise<string[]>)(
              key,
              String(start),
              String(stop),
              'WITHSCORES',
            )) as string[];
            members = toZMembers(raw);
          } else {
            const raw = (await (client.zrevrange as unknown as (k: string, s: string, e: string, ...a: string[]) => Promise<string[]>)(
              key,
              String(start),
              String(stop),
              'WITHSCORES',
            )) as string[];
            members = toZMembers(raw);
          }
          return { ...base, members, totalMembers: total, range: { start, stop }, order };
        }
        case 'stream': {
          const total = await this.safe(() => client.xlen(key).then((n) => n as number));
          const from = String(query.from ?? '-');
          const to = String(query.to ?? '+');
          const raw = (await client.xrange(key, from, to, 'COUNT', String(count))) as unknown;
          const messages = toStreamMessages(raw);
          return { ...base, messages, totalMessages: total, range: { from, to } };
        }
        default: {
          const size = await this.safe(() =>
            (client.memory as unknown as (sub: string, k: string) => Promise<number | null>)('USAGE', key),
          );
          return { ...base, size };
        }
      }
    } catch (err) {
      if (err instanceof BadGatewayError || err instanceof NotFoundError) throw err;
      throw new BadGatewayError('Não foi possível consultar a chave.');
    }
  }

  async createKey(connectionId: string, input: CreateKeyInput) {
    const client = await this.client(connectionId);
    const ttl = input.ttlSeconds;
    try {
      switch (input.type) {
        case 'string': {
          await client.set(input.key, input.value);
          if (ttl) await client.expire(input.key, ttl);
          break;
        }
        case 'hash': {
          await client.hset(input.key, input.fields);
          if (ttl) await client.expire(input.key, ttl);
          break;
        }
        case 'list': {
          await client.rpush(input.key, ...input.values);
          if (ttl) await client.expire(input.key, ttl);
          break;
        }
        case 'set': {
          await client.sadd(input.key, ...input.members);
          if (ttl) await client.expire(input.key, ttl);
          break;
        }
        case 'zset': {
          const args: string[] = [];
          for (const m of input.members) args.push(String(m.score), m.member);
          await client.zadd(input.key, ...args);
          if (ttl) await client.expire(input.key, ttl);
          break;
        }
        case 'stream': {
          const flat = flattenFields(input.fields);
          await (client.xadd as unknown as (k: string, id: string, ...a: string[]) => Promise<string>)(input.key, '*', ...flat);
          if (ttl) await client.expire(input.key, ttl);
          break;
        }
      }
    } catch {
      throw new BadGatewayError('Não foi possível criar a chave.');
    }
    return this.getKey(connectionId, input.key, {});
  }

  async updateString(connectionId: string, key: string, value: string, ttlSeconds?: number) {
    const client = await this.client(connectionId);
    if (value.length > MAX_VALUE_LENGTH) {
      throw new BadGatewayError('Valor muito grande.');
    }
    try {
      await client.set(key, value);
      if (ttlSeconds !== undefined) await client.expire(key, ttlSeconds);
    } catch {
      throw new BadGatewayError('Não foi possível atualizar a chave.');
    }
    return this.getKey(connectionId, key, {});
  }

  async deleteKey(connectionId: string, key: string): Promise<{ deleted: boolean }> {
    const client = await this.client(connectionId);
    try {
      const res = (await client.del(key)) as number;
      return { deleted: res > 0 };
    } catch {
      throw new BadGatewayError('Não foi possível excluir a chave.');
    }
  }

  async renameKey(connectionId: string, key: string, newKey: string) {
    const client = await this.client(connectionId);
    try {
      const exists = (await client.exists(key)) as number;
      if (exists === 0) throw new NotFoundError('Chave', key);
      await client.rename(key, newKey);
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
      throw new BadGatewayError('Não foi possível renomear a chave.');
    }
    return this.getKey(connectionId, newKey, {});
  }

  async duplicateKey(connectionId: string, key: string, newKey: string) {
    const client = await this.client(connectionId);
    try {
      const type = (await client.type(key)) as string;
      if (type === 'none') throw new NotFoundError('Chave', key);
      // Tenta COPY (Redis >= 6.2); fallback manual por tipo
      try {
        const res = (await client.copy(key, newKey)) as number;
        if (res === 1) return this.getKey(connectionId, newKey, {});
      } catch {
        // sem COPY — cai para manual
      }
      await this.manualCopy(client, key, newKey, type);
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
      throw new BadGatewayError('Não foi possível duplicar a chave.');
    }
    return this.getKey(connectionId, newKey, {});
  }

  private async manualCopy(
    client: InstanceType<typeof import('ioredis').Redis>,
    source: string,
    dest: string,
    type: string,
  ): Promise<void> {
    await client.del(dest).catch(() => {});
    const ttl = (await client.ttl(source).catch(() => -1)) as number;
    switch (type) {
      case 'string': {
        const v = (await client.get(source)) as string | null;
        if (v !== null) await client.set(dest, v);
        break;
      }
      case 'hash': {
        const all = (await client.hgetall(source)) as Record<string, string>;
        if (Object.keys(all).length > 0) await client.hset(dest, all);
        break;
      }
      case 'list': {
        const items = (await client.lrange(source, 0, -1)) as string[];
        if (items.length > 0) await client.rpush(dest, ...items);
        break;
      }
      case 'set': {
        const members = (await client.smembers(source)) as string[];
        if (members.length > 0) await client.sadd(dest, ...members);
        break;
      }
      case 'zset': {
        const raw = (await (client.zrange as unknown as (k: string, s: string, e: string, ...a: string[]) => Promise<string[]>)(
          source,
          '0',
          '-1',
          'WITHSCORES',
        )) as string[];
        if (raw.length > 0) await (client.zadd as unknown as (k: string, ...a: string[]) => Promise<number>)(dest, ...raw);
        break;
      }
      case 'stream': {
        const entries = (await client.xrange(source, '-', '+')) as unknown;
        for (const msg of toStreamMessages(entries)) {
          await (client.xadd as unknown as (k: string, id: string, ...a: string[]) => Promise<string>)(dest, msg.id, ...flattenFields(msg.fields));
        }
        break;
      }
      default:
        break;
    }
    if (ttl > 0) await client.expire(dest, ttl);
  }

  async getTtl(connectionId: string, key: string) {
    const client = await this.client(connectionId);
    try {
      const type = (await client.type(key)) as string;
      if (type === 'none') throw new NotFoundError('Chave', key);
      const ttl = (await client.ttl(key)) as number;
      return { key, ttl };
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
      throw new BadGatewayError('Não foi possível consultar o TTL.');
    }
  }

  async setTtl(connectionId: string, key: string, ttlSeconds: number) {
    const client = await this.client(connectionId);
    try {
      const res = (await client.expire(key, ttlSeconds)) as number;
      if (res === 0) throw new NotFoundError('Chave', key);
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
      throw new BadGatewayError('Não foi possível definir o TTL.');
    }
    return this.getTtl(connectionId, key);
  }

  async persist(connectionId: string, key: string) {
    const client = await this.client(connectionId);
    try {
      const type = (await client.type(key)) as string;
      if (type === 'none') throw new NotFoundError('Chave', key);
      await client.persist(key);
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
      throw new BadGatewayError('Não foi possível remover o TTL.');
    }
    return this.getTtl(connectionId, key);
  }

  async hashUpsert(connectionId: string, key: string, fields: Record<string, string>) {
    const client = await this.client(connectionId);
    try {
      await client.hset(key, fields);
    } catch {
      throw new BadGatewayError('Não foi possível atualizar o hash.');
    }
    return this.getKey(connectionId, key, {});
  }

  async hashDelete(connectionId: string, key: string, fields: string[]) {
    const client = await this.client(connectionId);
    try {
      await client.hdel(key, ...fields);
    } catch {
      throw new BadGatewayError('Não foi possível excluir os campos.');
    }
    const type = await this.safe(() => client.type(key).then((t) => t as string));
    if (type === 'none') return { deleted: true };
    return this.getKey(connectionId, key, {});
  }

  async listPush(connectionId: string, key: string, side: 'left' | 'right', values: string[]) {
    const client = await this.client(connectionId);
    try {
      if (side === 'left') await client.lpush(key, ...values);
      else await client.rpush(key, ...values);
    } catch {
      throw new BadGatewayError('Não foi possível adicionar elementos.');
    }
    return this.getKey(connectionId, key, {});
  }

  async listSet(connectionId: string, key: string, index: number, value: string) {
    const client = await this.client(connectionId);
    try {
      await client.lset(key, index, value);
    } catch {
      throw new BadGatewayError('Não foi possível atualizar o elemento.');
    }
    return this.getKey(connectionId, key, {});
  }

  async listDelete(connectionId: string, key: string, index: number) {
    const client = await this.client(connectionId);
    try {
      const marker = `__redisscope_del_${randomUUID()}`;
      await client.lset(key, index, marker);
      await client.lrem(key, 1, marker);
    } catch {
      throw new BadGatewayError('Não foi possível remover o elemento.');
    }
    const type = await this.safe(() => client.type(key).then((t) => t as string));
    if (type === 'none') return { deleted: true };
    return this.getKey(connectionId, key, {});
  }

  async setAdd(connectionId: string, key: string, members: string[]) {
    const client = await this.client(connectionId);
    try {
      await client.sadd(key, ...members);
    } catch {
      throw new BadGatewayError('Não foi possível adicionar membros.');
    }
    return this.getKey(connectionId, key, {});
  }

  async setRemove(connectionId: string, key: string, members: string[]) {
    const client = await this.client(connectionId);
    try {
      await client.srem(key, ...members);
    } catch {
      throw new BadGatewayError('Não foi possível remover membros.');
    }
    const type = await this.safe(() => client.type(key).then((t) => t as string));
    if (type === 'none') return { deleted: true };
    return this.getKey(connectionId, key, {});
  }

  async zsetUpsert(connectionId: string, key: string, members: Array<{ member: string; score: number }>) {
    const client = await this.client(connectionId);
    try {
      const args: string[] = [];
      for (const m of members) args.push(String(m.score), m.member);
      await client.zadd(key, ...args);
    } catch {
      throw new BadGatewayError('Não foi possível atualizar o sorted set.');
    }
    return this.getKey(connectionId, key, {});
  }

  async zsetRemove(connectionId: string, key: string, members: string[]) {
    const client = await this.client(connectionId);
    try {
      await client.zrem(key, ...members);
    } catch {
      throw new BadGatewayError('Não foi possível remover membros.');
    }
    const type = await this.safe(() => client.type(key).then((t) => t as string));
    if (type === 'none') return { deleted: true };
    return this.getKey(connectionId, key, {});
  }

  async streamAdd(connectionId: string, key: string, fields: Record<string, string>, id?: string) {
    const client = await this.client(connectionId);
    try {
      await (client.xadd as unknown as (k: string, id: string, ...a: string[]) => Promise<string>)(
        key,
        id ?? '*',
        ...flattenFields(fields),
      );
    } catch {
      throw new BadGatewayError('Não foi possível adicionar mensagem.');
    }
    return this.getKey(connectionId, key, {});
  }

  private async safe<T>(fn: () => Promise<T>): Promise<T | undefined> {
    try {
      return await fn();
    } catch {
      return undefined;
    }
  }
}

function toZMembers(raw: string[]): Array<{ member: string; score: number }> {
  const out: Array<{ member: string; score: number }> = [];
  for (let i = 0; i + 1 < raw.length; i += 2) {
    out.push({ member: raw[i] as string, score: Number(raw[i + 1]) });
  }
  return out;
}

function toStreamMessages(raw: unknown): Array<{ id: string; fields: Record<string, string> }> {
  if (!Array.isArray(raw)) return [];
  return (raw as Array<[string, unknown]>).map(([id, fields]) => {
    if (Array.isArray(fields)) {
      const obj: Record<string, string> = {};
      for (let i = 0; i + 1 < fields.length; i += 2) {
        obj[String(fields[i])] = String(fields[i + 1]);
      }
      return { id, fields: obj };
    }
    return { id, fields: (fields as Record<string, string>) ?? {} };
  });
}

function flattenFields(fields: Record<string, string>): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(fields)) {
    out.push(k, v);
  }
  return out;
}
