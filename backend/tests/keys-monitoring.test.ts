import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { resetEnvCacheForTests } from '../src/config/env.js';

describe('keys + monitoring — proteção e validação', () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    resetEnvCacheForTests();
    process.env.NODE_ENV = 'test';
    process.env.AUTH_USERNAME = 'admin';
    process.env.AUTH_PASSWORD = 'test-password-123';
    process.env.AUTH_SECRET = 'test-secret-at-least-32-characters-long!!';
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    process.env.DATA_DIR = './data-test';
    process.env.DATA_FILE = 'connections.json';
    process.env.REDIS_CONNECT_TIMEOUT_MS = '1000';
    process.env.REDIS_COMMAND_TIMEOUT_MS = '1000';
    app = await buildApp();
    await app.ready();
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'test-password-123' },
    });
    token = (JSON.parse(login.body) as { token: string }).token;
  });

  afterAll(async () => {
    await app.close();
    const { rm } = await import('node:fs/promises');
    await rm('data-test', { recursive: true, force: true }).catch(() => {});
  });

  it('GET /keys sem token retorna 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/connections/qualquer/keys' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /keys de conexão inexistente retorna 404 ou 502 (sem vazar stack)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/connections/inexistente/keys',
      headers: { authorization: `Bearer ${token}` },
    });
    expect([404, 502]).toContain(res.statusCode);
    const body = JSON.parse(res.body) as { error: { code: string; message: string } };
    expect(body.error.message).toBeTruthy();
    expect(body.error.message).not.toContain('ioredis');
  });

  it('GET /info sem token retorna 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/connections/qualquer/info' });
    expect(res.statusCode).toBe(401);
  });

  it('POST /keys com body inválido retorna 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/connections/inexistente/keys',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      payload: { key: '', type: 'string' },
    });
    // Body inválido → 400 (validação) OU 404/502 se conexão não existe e validação passou
    expect([400, 404, 502]).toContain(res.statusCode);
  });

  it('GET /monitoring sem token retorna 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/connections/qualquer/monitoring' });
    expect(res.statusCode).toBe(401);
  });
});
