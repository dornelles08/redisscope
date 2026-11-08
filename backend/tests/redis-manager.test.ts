import { describe, it, expect } from 'vitest';
import { RedisManager } from '../src/infrastructure/redis/redis-manager.js';

describe('RedisManager', () => {
  it('testConnection com host inalcançável retorna ok:false sem lançar', async () => {
    const manager = new RedisManager(500, 500);
    const result = await manager.testConnection({
      host: 'redis-invalido-fase2-teste',
      port: 6379,
      database: 0,
      tls: false,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain('redis-invalido');
    await manager.disconnectAll();
  });

  it('getStatus de id desconhecido retorna disconnected', async () => {
    const manager = new RedisManager(500, 500);
    const status = await manager.getStatus('unknown-id');
    expect(status.status).toBe('disconnected');
    expect(status.connectionId).toBe('unknown-id');
    await manager.disconnectAll();
  });

  it('disconnect de id desconhecido retorna disconnected', async () => {
    const manager = new RedisManager(500, 500);
    const status = await manager.disconnect('unknown-id');
    expect(status.status).toBe('disconnected');
  });

  it('getClient de id desconhecido retorna undefined', async () => {
    const manager = new RedisManager(500, 500);
    expect(manager.getClient('unknown-id')).toBeUndefined();
  });
});
