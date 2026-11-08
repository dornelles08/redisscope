import type { FastifyInstance } from 'fastify';
import { AuthService } from '../../infrastructure/auth/auth-service.js';
import { UnauthorizedError, ValidationError } from '../../common/errors/app-error.js';
import { loginSchema } from './auth.schema.js';

export interface AuthRoutesOptions {
  authService: AuthService;
}

const loginBodyJsonSchema = {
  type: 'object',
  required: ['username', 'password'],
  properties: {
    username: { type: 'string', minLength: 1, maxLength: 100 },
    password: { type: 'string', minLength: 1, maxLength: 256 },
  },
} as const;

export async function authRoutes(app: FastifyInstance, opts: AuthRoutesOptions): Promise<void> {
  const { authService } = opts;

  app.post('/api/auth/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      tags: ['auth'],
      summary: 'Login — autenticação por usuário e senha',
      body: loginBodyJsonSchema,
      response: {
        200: {
          description: 'Login ok',
          type: 'object',
          properties: {
            token: { type: 'string' },
            expiresAt: { type: 'string' },
            user: { type: 'object', properties: { username: { type: 'string' } } },
          },
        },
      },
    },
  }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Dados de login inválidos.', parsed.error.issues);
    }
    const { username, password } = parsed.data;
    const ok = authService.verifyCredentials(username, password);
    if (!ok) {
      await new Promise((r) => setTimeout(r, 300));
      throw new UnauthorizedError('Usuário ou senha inválidos.');
    }
    const { token, expiresAt } = authService.signToken(username);
    await reply.send({ token, expiresAt, user: { username } });
  });

  app.get('/api/auth/me', {
    schema: {
      tags: ['auth'],
      summary: 'Usuário autenticado atual',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Usuário atual',
          type: 'object',
          properties: { username: { type: 'string' } },
        },
      },
    },
  }, async (request) => {
    const user = (request as unknown as { user?: { username: string } }).user;
    return { username: user?.username ?? 'unknown' };
  });

  app.post('/api/auth/logout', {
    schema: {
      tags: ['auth'],
      summary: 'Logout (client-side: descartar token)',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Logout ok',
          type: 'object',
          properties: { ok: { type: 'boolean' } },
        },
      },
    },
  }, async () => ({ ok: true }));
}
