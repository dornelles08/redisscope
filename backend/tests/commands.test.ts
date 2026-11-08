import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { resetEnvCacheForTests } from '../src/config/env.js';
import { tokenize, classifyCommand } from '../src/modules/commands/commands.schema.js';

describe('commands.schema — tokenize/classify', () => {
  it('tokeniza com aspas', () => {
    expect(tokenize('SET "chave com espaco" \'valor\'')).toEqual(['SET', 'chave com espaco', 'valor']);
    expect(tokenize('PING')).toEqual(['PING']);
  });

  it('classifica bloqueados e confirmáveis', () => {
    expect(classifyCommand(['SHUTDOWN'])).toBe('blocked');
    expect(classifyCommand(['FLUSHDB'])).toBe('confirm-required');
    expect(classifyCommand(['FLUSHALL'])).toBe('confirm-required');
    expect(classifyCommand(['CONFIG', 'SET', 'x'])).toBe('blocked');
    expect(classifyCommand(['KEYS', '*'])).toBe('blocking');
    expect(classifyCommand(['PING'])).toBe('allowed');
  });
});

describe('commands — proteção no backend', () => {
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

  it('sem token retorna 401', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/connections/qualquer/commands', payload: { command: 'PING' } });
    expect(res.statusCode).toBe(401);
  });

  it('SHUTDOWN é bloqueado (403)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/connections/inexistente/commands',
      headers: { authorization: `Bearer ${token}` },
      payload: { command: 'SHUTDOWN' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('FLUSHDB sem confirm retorna 400 CONFIRM', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/connections/inexistente/commands',
      headers: { authorization: `Bearer ${token}` },
      payload: { command: 'FLUSHDB' },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as { error: { message: string } };
    expect(body.error.message).toMatch(/confirmação/i);
  });

  it('KEYS é bloqueado com sugestão SCAN', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/connections/inexistente/commands',
      headers: { authorization: `Bearer ${token}` },
      payload: { command: 'KEYS *' },
    });
    expect(res.statusCode).toBe(403);
  });
});
