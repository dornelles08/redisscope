import type { FastifyInstance } from 'fastify';
import { AppError } from '../errors/app-error.js';

/** Hook global de tratamento de erros — nunca vaza stack nem segredos. */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: unknown, request, reply) => {
    if (error instanceof AppError) {
      request.log.error({ err: error, code: error.code, statusCode: error.statusCode }, error.message);
      void reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message, details: error.details },
      });
      return;
    }

    const fastifyErr = error as { statusCode?: number; code?: string; message?: string };
    // Erros do Fastify (400, 404, 413, etc.)
    if (typeof fastifyErr?.statusCode === 'number' && fastifyErr.statusCode < 500) {
      request.log.warn({ err: error, statusCode: fastifyErr.statusCode }, 'Erro de cliente');
      void reply.status(fastifyErr.statusCode).send({
        error: { code: fastifyErr.code ?? 'BAD_REQUEST', message: fastifyErr.message ?? 'Requisição inválida' },
      });
      return;
    }

    request.log.error({ err: error }, 'Erro interno não tratado');
    void reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' },
    });
  });
}
