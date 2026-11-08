import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', {
    schema: {
      tags: ['health'],
      summary: 'Healthcheck',
      response: {
        200: {
          description: 'OK',
          type: 'object',
          properties: {
            status: { type: 'string' },
            version: { type: 'string' },
            uptime: { type: 'number' },
          },
        },
      },
    },
  }, async () => ({
    status: 'ok',
    version: process.env.npm_package_version ?? '0.1.0',
    uptime: Math.floor(process.uptime()),
  }));
}
