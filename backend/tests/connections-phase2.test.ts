import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { resetEnvCacheForTests } from '../src/config/env.js';

describe('connections fase 2 — test/connect/status/disconnect', () => {
  let app: FastifyInstance;
  let token: string;
  let connectionId: string;

  beforeAll(async () => {
    resetEnvCacheForTests();
    process.env.NODE_ENV = 'test';
    process.env.AUTH_USERNAME = 'admin';
    process.env.AUTH_PASSWORD = 'test-password-123';
    process.env.AUTH_SECRET = 'test-secret-at-least-32-characters-long!!';
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    process.env.DATA_DIR = './data-test';
    process.env.DATA_FILE = 'connections.json';
    // Timeouts curtos para não travar em host inalcançável
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

    const created = await app.inject({
      method: 'POST',
      url: '/api/connections',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Fase2 Test', host: 'redis-invalido-fase2', port: 6379, database: 0, tls: false, password: 'secret' },
    });
    expect(created.statusCode).toBe(201);
    connectionId = (JSON.parse(created.body) as { id: string }).id;
  });

  afterAll(async () => {
    await app.close();
    // Limpeza dos dados de teste
    const { rm } = await import('node:fs/promises');
    await rm('data-test', { recursive: true, force: true }).catch(() => {});
  });

  it('GET /api/connections/:id/status retorna disconnected sem conectar', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/connections/${connectionId}/status`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { status: string; connectionId: string };
    expect(body.connectionId).toBe(connectionId);
    expect(body.status).toBe('disconnected');
  });

  it('POST /test retorna ok:false com erro genérico (host inalcançável)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/connections/${connectionId}/test`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { ok: boolean; error?: string };
    expect(body.ok).toBe(false);
    expect(body.error).toBeTruthy();
    // Nunca vaza IP/host no erro
    expect(body.error).not.toContain('redis-invalido');
  });

  it('POST /connect retorna error genérico (sem vazar detalhes)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/connections/${connectionId}/connect`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { status: string; error?: string };
    expect(body.status).toBe('error');
    expect(body.error).toBeTruthy();
  });

  it('POST /disconnect de conexão inexistente retorna disconnected sem erro', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/connections/${connectionId}/disconnect`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { status: string };
    expect(body.status).toBe('disconnected');
  });

  it('endpoints exigem autenticação', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/connections/${connectionId}/status` });
    expect(res.statusCode).toBe(401);
  });

  it('400 para id inexistente no status retorna 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/connections/nao-existe/status',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });
});
