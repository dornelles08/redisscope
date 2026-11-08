import type { FastifyInstance } from 'fastify';
import { KeysService } from './keys.service.js';
import {
  createKeySchema,
  updateStringSchema,
  ttlSchema,
  renameSchema,
  hashFieldsSchema,
  hashDeleteSchema,
  listPushSchema,
  listSetSchema,
  setMembersSchema,
  zsetMembersSchema,
  zsetDeleteSchema,
  streamAddSchema,
} from './keys.schema.js';
import { ValidationError } from '../../common/errors/app-error.js';

export interface KeysRoutesOptions {
  service: KeysService;
}

const connParams = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', minLength: 1 } },
} as const;

const keyParams = {
  type: 'object',
  required: ['id', 'key'],
  properties: {
    id: { type: 'string', minLength: 1 },
    key: { type: 'string', minLength: 1 },
  },
} as const;

const indexParams = {
  type: 'object',
  required: ['id', 'key', 'index'],
  properties: {
    id: { type: 'string', minLength: 1 },
    key: { type: 'string', minLength: 1 },
    index: { type: 'string', pattern: '^-?\\d+$' },
  },
} as const;

function parse<T>(schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: { issues: unknown } } }, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success || parsed.data === undefined) {
    throw new ValidationError('Dados inválidos.', (parsed.error as { issues?: unknown })?.issues);
  }
  return parsed.data;
}

export async function keysRoutes(app: FastifyInstance, opts: KeysRoutesOptions): Promise<void> {
  const { service } = opts;

  // Lista com SCAN + cursor
  app.get('/api/connections/:id/keys', {
    schema: {
      tags: ['keys'],
      summary: 'Listar chaves (SCAN com cursor)',
      security: [{ bearerAuth: [] }],
      params: connParams,
      querystring: {
        type: 'object',
        properties: {
          cursor: { type: 'string' },
          count: { type: 'integer', minimum: 1, maximum: 500 },
          match: { type: 'string', maxLength: 255 },
          type: { type: 'string', maxLength: 50 },
        },
      },
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const q = request.query as { cursor?: string; count?: number; match?: string; type?: string };
    return service.listKeys(id, {
      cursor: q.cursor ?? '0',
      count: q.count ?? 100,
      match: q.match,
      type: q.type,
    });
  });

  app.post('/api/connections/:id/keys', {
    schema: {
      tags: ['keys'],
      summary: 'Criar chave',
      security: [{ bearerAuth: [] }],
      params: connParams,
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parse(createKeySchema as never, request.body);
    const created = await service.createKey(id, body as never);
    await reply.status(201).send(created);
  });

  app.get('/api/connections/:id/keys/:key', {
    schema: {
      tags: ['keys'],
      summary: 'Detalhe da chave por tipo (paginado)',
      security: [{ bearerAuth: [] }],
      params: keyParams,
    },
  }, async (request) => {
    const { id, key } = request.params as { id: string; key: string };
    const q = (request.query ?? {}) as Record<string, string | number | undefined>;
    const decoded = safeDecode(key);
    return service.getKey(id, decoded, q);
  });

  app.put('/api/connections/:id/keys/:key', {
    schema: {
      tags: ['keys'],
      summary: 'Atualizar valor de chave STRING (SET)',
      security: [{ bearerAuth: [] }],
      params: keyParams,
    },
  }, async (request) => {
    const { id, key } = request.params as { id: string; key: string };
    const body = parse(updateStringSchema as never, request.body) as { value: string; ttlSeconds?: number };
    return service.updateString(id, safeDecode(key), body.value, body.ttlSeconds);
  });

  app.delete('/api/connections/:id/keys/:key', {
    schema: { tags: ['keys'], summary: 'Excluir chave', security: [{ bearerAuth: [] }], params: keyParams },
  }, async (request) => {
    const { id, key } = request.params as { id: string; key: string };
    return service.deleteKey(id, safeDecode(key));
  });

  app.post('/api/connections/:id/keys/:key/rename', {
    schema: { tags: ['keys'], summary: 'Renomear chave', security: [{ bearerAuth: [] }], params: keyParams },
  }, async (request) => {
    const { id, key } = request.params as { id: string; key: string };
    const body = parse(renameSchema as never, request.body) as { newKey: string };
    return service.renameKey(id, safeDecode(key), body.newKey);
  });

  app.post('/api/connections/:id/keys/:key/duplicate', {
    schema: { tags: ['keys'], summary: 'Duplicar chave', security: [{ bearerAuth: [] }], params: keyParams },
  }, async (request) => {
    const { id, key } = request.params as { id: string; key: string };
    const body = parse(renameSchema as never, request.body) as { newKey: string };
    return service.duplicateKey(id, safeDecode(key), body.newKey);
  });

  app.get('/api/connections/:id/keys/:key/ttl', {
    schema: { tags: ['keys'], summary: 'Consultar TTL', security: [{ bearerAuth: [] }], params: keyParams },
  }, async (request) => {
    const { id, key } = request.params as { id: string; key: string };
    return service.getTtl(id, safeDecode(key));
  });

  app.put('/api/connections/:id/keys/:key/ttl', {
    schema: { tags: ['keys'], summary: 'Definir TTL', security: [{ bearerAuth: [] }], params: keyParams },
  }, async (request) => {
    const { id, key } = request.params as { id: string; key: string };
    const body = parse(ttlSchema as never, request.body) as { ttlSeconds: number };
    return service.setTtl(id, safeDecode(key), body.ttlSeconds);
  });

  app.delete('/api/connections/:id/keys/:key/ttl', {
    schema: { tags: ['keys'], summary: 'Remover TTL (persist)', security: [{ bearerAuth: [] }], params: keyParams },
  }, async (request) => {
    const { id, key } = request.params as { id: string; key: string };
    return service.persist(id, safeDecode(key));
  });

  // Hash
  app.post('/api/connections/:id/keys/:key/hash', {
    schema: { tags: ['keys'], summary: 'Adicionar/atualizar campos do hash', security: [{ bearerAuth: [] }], params: keyParams },
  }, async (request) => {
    const { id, key } = request.params as { id: string; key: string };
    const body = parse(hashFieldsSchema as never, request.body) as { fields: Record<string, string> };
    return service.hashUpsert(id, safeDecode(key), body.fields);
  });

  app.delete('/api/connections/:id/keys/:key/hash', {
    schema: { tags: ['keys'], summary: 'Excluir campos do hash', security: [{ bearerAuth: [] }], params: keyParams },
  }, async (request) => {
    const { id, key } = request.params as { id: string; key: string };
    const body = parse(hashDeleteSchema as never, request.body) as { fields: string[] };
    return service.hashDelete(id, safeDecode(key), body.fields);
  });

  // List
  app.post('/api/connections/:id/keys/:key/list', {
    schema: { tags: ['keys'], summary: 'Inserir elementos na list', security: [{ bearerAuth: [] }], params: keyParams },
  }, async (request) => {
    const { id, key } = request.params as { id: string; key: string };
    const body = parse(listPushSchema as never, request.body) as { side: 'left' | 'right'; values: string[] };
    return service.listPush(id, safeDecode(key), body.side, body.values);
  });

  app.put('/api/connections/:id/keys/:key/list/:index', {
    schema: { tags: ['keys'], summary: 'Editar elemento da list por índice', security: [{ bearerAuth: [] }], params: indexParams },
  }, async (request) => {
    const { id, key, index } = request.params as { id: string; key: string; index: string };
    const body = parse(listSetSchema as never, request.body) as { value: string };
    return service.listSet(id, safeDecode(key), Number(index), body.value);
  });

  app.delete('/api/connections/:id/keys/:key/list/:index', {
    schema: { tags: ['keys'], summary: 'Remover elemento da list por índice', security: [{ bearerAuth: [] }], params: indexParams },
  }, async (request) => {
    const { id, key, index } = request.params as { id: string; key: string; index: string };
    return service.listDelete(id, safeDecode(key), Number(index));
  });

  // Set
  app.post('/api/connections/:id/keys/:key/set', {
    schema: { tags: ['keys'], summary: 'Adicionar membros ao set', security: [{ bearerAuth: [] }], params: keyParams },
  }, async (request) => {
    const { id, key } = request.params as { id: string; key: string };
    const body = parse(setMembersSchema as never, request.body) as { members: string[] };
    return service.setAdd(id, safeDecode(key), body.members);
  });

  app.delete('/api/connections/:id/keys/:key/set', {
    schema: { tags: ['keys'], summary: 'Remover membros do set', security: [{ bearerAuth: [] }], params: keyParams },
  }, async (request) => {
    const { id, key } = request.params as { id: string; key: string };
    const body = parse(setMembersSchema as never, request.body) as { members: string[] };
    return service.setRemove(id, safeDecode(key), body.members);
  });

  // Sorted set
  app.post('/api/connections/:id/keys/:key/zset', {
    schema: { tags: ['keys'], summary: 'Adicionar/atualizar membros do sorted set', security: [{ bearerAuth: [] }], params: keyParams },
  }, async (request) => {
    const { id, key } = request.params as { id: string; key: string };
    const body = parse(zsetMembersSchema as never, request.body) as { members: Array<{ member: string; score: number }> };
    return service.zsetUpsert(id, safeDecode(key), body.members);
  });

  app.delete('/api/connections/:id/keys/:key/zset', {
    schema: { tags: ['keys'], summary: 'Remover membros do sorted set', security: [{ bearerAuth: [] }], params: keyParams },
  }, async (request) => {
    const { id, key } = request.params as { id: string; key: string };
    const body = parse(zsetDeleteSchema as never, request.body) as { members: string[] };
    return service.zsetRemove(id, safeDecode(key), body.members);
  });

  // Stream
  app.post('/api/connections/:id/keys/:key/stream', {
    schema: { tags: ['keys'], summary: 'Adicionar mensagem ao stream', security: [{ bearerAuth: [] }], params: keyParams },
  }, async (request) => {
    const { id, key } = request.params as { id: string; key: string };
    const body = parse(streamAddSchema as never, request.body) as { fields: Record<string, string>; id?: string };
    return service.streamAdd(id, safeDecode(key), body.fields, body.id);
  });
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
