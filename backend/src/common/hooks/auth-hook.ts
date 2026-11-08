import type { FastifyInstance, FastifyRequest } from 'fastify';
import { UnauthorizedError } from '../../common/errors/app-error.js';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: { username: string };
}

const PUBLIC_PATHS = new Set(['/health', '/api/auth/login', '/docs', '/documentation']);

/** Hook de autenticação — protege /api exceto login/health. */
export function registerAuthHook(app: FastifyInstance, verifyToken: (t: string) => { sub: string }): void {
  app.addHook('onRequest', async (request, _reply) => {
    const url = request.url.split('?')[0] ?? '';
    if (PUBLIC_PATHS.has(url) || url.startsWith('/docs/') || url.startsWith('/documentation/')) return;
    if (!url.startsWith('/api/')) return;

    const auth = request.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token de autenticação ausente.');
    }
    const token = auth.slice('Bearer '.length).trim();
    try {
      const payload = verifyToken(token);
      (request as AuthenticatedRequest).user = { username: payload.sub };
    } catch {
      throw new UnauthorizedError('Token inválido ou expirado.');
    }
  });
}
