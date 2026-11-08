import type { FastifyInstance } from 'fastify';
import { ConnectionsService } from './connections.service.js';
import { createConnectionSchema, updateConnectionSchema } from './connections.schema.js';
import { NotFoundError, ValidationError } from '../../common/errors/app-error.js';

export interface ConnectionsRoutesOptions {
  service: ConnectionsService;
}

const idParamsJsonSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', minLength: 1 } },
} as const;

const connectionBodyJsonSchema = {
  type: 'object',
  required: ['name', 'host', 'port'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 120 },
    host: { type: 'string', minLength: 1, maxLength: 255 },
    port: { type: 'integer', minimum: 1, maximum: 65535, default: 6379 },
    username: { type: 'string', maxLength: 255 },
    password: { type: 'string', maxLength: 1024 },
    database: { type: 'integer', minimum: 0, maximum: 15, default: 0 },
    tls: { type: 'boolean', default: false },
  },
} as const;

const updateBodyJsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 120 },
    host: { type: 'string', minLength: 1, maxLength: 255 },
    port: { type: 'integer', minimum: 1, maximum: 65535 },
    username: { type: 'string', maxLength: 255 },
    password: { type: 'string', maxLength: 1024 },
    database: { type: 'integer', minimum: 0, maximum: 15 },
    tls: { type: 'boolean' },
  },
} as const;

const statusResponseJsonSchema = {
  type: 'object',
  properties: {
    connectionId: { type: 'string' },
    status: { type: 'string', enum: ['connected', 'disconnected', 'connecting', 'error'] },
    latencyMs: { type: 'number' },
    error: { type: 'string' },
  },
} as const;

export async function connectionsRoutes(app: FastifyInstance, opts: ConnectionsRoutesOptions): Promise<void> {
  const { service } = opts;

  app.get('/api/connections', {
    schema: {
      tags: ['connections'],
      summary: 'Listar conexões Redis',
      security: [{ bearerAuth: [] }],
    },
  }, async () => ({ connections: await service.list() }));

  app.get('/api/connections/:id', {
    schema: {
      tags: ['connections'],
      summary: 'Obter conexão por ID',
      security: [{ bearerAuth: [] }],
      params: idParamsJsonSchema,
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    if (!id) throw new NotFoundError('Conexão');
    return service.getById(id);
  });

  app.post('/api/connections', {
    schema: {
      tags: ['connections'],
      summary: 'Criar conexão Redis',
      security: [{ bearerAuth: [] }],
      body: connectionBodyJsonSchema,
    },
  }, async (request, reply) => {
    const parsed = createConnectionSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Dados inválidos.', parsed.error.issues);
    const created = await service.create(parsed.data);
    await reply.status(201).send(created);
  });

  app.put('/api/connections/:id', {
    schema: {
      tags: ['connections'],
      summary: 'Atualizar conexão Redis (senha vazia preserva credencial)',
      security: [{ bearerAuth: [] }],
      params: idParamsJsonSchema,
      body: updateBodyJsonSchema,
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const parsed = updateConnectionSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Dados inválidos.', parsed.error.issues);
    return service.update(id, parsed.data);
  });

  app.delete('/api/connections/:id', {
    schema: {
      tags: ['connections'],
      summary: 'Excluir conexão Redis',
      security: [{ bearerAuth: [] }],
      params: idParamsJsonSchema,
      response: { 204: { description: 'Sem conteúdo', type: 'null' } },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.remove(id);
    await reply.status(204).send();
  });

  app.post('/api/connections/:id/test', {
    schema: {
      tags: ['connections'],
      summary: 'Testar conexão Redis (PING efêmero, sem cliente persistente)',
      security: [{ bearerAuth: [] }],
      params: idParamsJsonSchema,
      response: {
        200: {
          description: 'Resultado do teste',
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            latencyMs: { type: 'number' },
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    return service.testConnection(id);
  });

  app.post('/api/connections/:id/connect', {
    schema: {
      tags: ['connections'],
      summary: 'Conectar (cliente persistente reutilizável)',
      security: [{ bearerAuth: [] }],
      params: idParamsJsonSchema,
      response: { 200: { description: 'Status', ...statusResponseJsonSchema } },
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    return service.connect(id);
  });

  app.post('/api/connections/:id/disconnect', {
    schema: {
      tags: ['connections'],
      summary: 'Desconectar (fecha cliente persistente)',
      security: [{ bearerAuth: [] }],
      params: idParamsJsonSchema,
      response: { 200: { description: 'Status', ...statusResponseJsonSchema } },
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    return service.disconnect(id);
  });

  app.get('/api/connections/:id/status', {
    schema: {
      tags: ['connections'],
      summary: 'Estado + latência da conexão',
      security: [{ bearerAuth: [] }],
      params: idParamsJsonSchema,
      response: { 200: { description: 'Status', ...statusResponseJsonSchema } },
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    return service.status(id);
  });
}
