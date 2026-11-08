import { randomUUID } from 'node:crypto';
import { ConnectionsRepository, toPublic } from './connections.repository.js';
import type { CreateConnectionInput, UpdateConnectionInput } from './connections.schema.js';
import { NotFoundError } from '../../common/errors/app-error.js';
import { assertHostAllowed } from '../../common/utils/ssrf.js';
import type { RedisConnectionStatus, RedisTestResult } from '../../infrastructure/redis/redis.types.js';
import type { RedisManager } from '../../infrastructure/redis/redis-manager.js';

export class ConnectionsService {
  constructor(
    private readonly repo: ConnectionsRepository,
    private readonly allowedHosts: string,
    private readonly encryptionKey: string | undefined,
    private readonly redis: RedisManager,
  ) {}

  async list() {
    const all = await this.repo.list();
    return all.map(toPublic);
  }

  async getById(id: string) {
    const found = await this.repo.getById(id);
    if (!found) throw new NotFoundError('Conexão', id);
    return toPublic(found);
  }

  async getStoredById(id: string) {
    const found = await this.repo.getById(id);
    if (!found) throw new NotFoundError('Conexão', id);
    return found;
  }

  async create(input: CreateConnectionInput) {
    assertHostAllowed(input.host, this.allowedHosts);
    const now = new Date().toISOString();
    const stored = {
      id: randomUUID(),
      name: input.name,
      host: input.host,
      port: input.port,
      username: input.username,
      encryptedPassword: this.repo.encryptPassword(input.password, this.encryptionKey),
      database: input.database ?? 0,
      tls: input.tls ?? false,
      createdAt: now,
      updatedAt: now,
    };
    await this.repo.create(stored);
    return toPublic(stored);
  }

  async update(id: string, input: UpdateConnectionInput) {
    const existing = await this.repo.getById(id);
    if (!existing) throw new NotFoundError('Conexão', id);
    if (input.host) assertHostAllowed(input.host, this.allowedHosts);

    const next = {
      ...existing,
      name: input.name ?? existing.name,
      host: input.host ?? existing.host,
      port: input.port ?? existing.port,
      username: input.username !== undefined ? (input.username || undefined) : existing.username,
      encryptedPassword:
        input.password !== undefined && input.password !== ''
          ? this.repo.encryptPassword(input.password, this.encryptionKey)
          : existing.encryptedPassword,
      database: input.database ?? existing.database,
      tls: input.tls ?? existing.tls,
      updatedAt: new Date().toISOString(),
    };
    await this.repo.update(id, next);
    // Config física mudou → descarta cliente reutilizado
    if (
      next.host !== existing.host ||
      next.port !== existing.port ||
      next.username !== existing.username ||
      next.encryptedPassword !== existing.encryptedPassword ||
      next.database !== existing.database ||
      next.tls !== existing.tls
    ) {
      await this.redis.disconnect(id);
    }
    return toPublic(next);
  }

  async remove(id: string): Promise<void> {
    // Garante encerramento limpo do cliente antes de excluir o registro
    await this.redis.disconnect(id);
    const removed = await this.repo.remove(id);
    if (!removed) throw new NotFoundError('Conexão', id);
  }

  async testConnection(id: string): Promise<RedisTestResult> {
    const stored = await this.getStoredById(id);
    assertHostAllowed(stored.host, this.allowedHosts);
    const password = await this.repo.decryptPasswordForUse(stored, this.encryptionKey);
    return this.redis.testConnection({
      host: stored.host,
      port: stored.port,
      username: stored.username,
      password,
      database: stored.database,
      tls: stored.tls,
    });
  }

  async connect(id: string): Promise<RedisConnectionStatus> {
    const stored = await this.getStoredById(id);
    assertHostAllowed(stored.host, this.allowedHosts);
    const password = await this.repo.decryptPasswordForUse(stored, this.encryptionKey);
    return this.redis.connect(id, {
      host: stored.host,
      port: stored.port,
      username: stored.username,
      password,
      database: stored.database,
      tls: stored.tls,
    });
  }

  async disconnect(id: string): Promise<RedisConnectionStatus> {
    // 404 se o registro não existe (evita "disconnect" silencioso de id inválido)
    await this.getStoredById(id);
    return this.redis.disconnect(id);
  }

  async status(id: string): Promise<RedisConnectionStatus> {
    await this.getStoredById(id);
    return this.redis.getStatus(id);
  }
}
