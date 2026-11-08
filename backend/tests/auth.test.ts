import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('auth login/senha', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_USERNAME = 'admin';
    process.env.AUTH_PASSWORD = 'test-password-123';
    process.env.AUTH_SECRET = 'test-secret-at-least-32-characters-long!!';
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('login válido retorna token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'test-password-123' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { token: string };
    expect(body.token.length).toBeGreaterThan(10);
  });

  it('login inválido retorna 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'errada' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rota protegida sem token retorna 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/connections' });
    expect(res.statusCode).toBe(401);
  });
});
