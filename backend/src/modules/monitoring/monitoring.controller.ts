import type { FastifyInstance } from 'fastify';
import { MonitoringService } from './monitoring.service.js';

export interface MonitoringRoutesOptions {
  service: MonitoringService;
}

const connParams = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', minLength: 1 } },
} as const;

export async function monitoringRoutes(app: FastifyInstance, opts: MonitoringRoutesOptions): Promise<void> {
  const { service } = opts;

  app.get('/api/connections/:id/info', {
    schema: {
      tags: ['server-info', 'monitoring'],
      summary: 'Informações do servidor (INFO parseado por seções)',
      security: [{ bearerAuth: [] }],
      params: connParams,
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const sections = await service.getInfoSections(id);
    return { generatedAt: new Date().toISOString(), sections };
  });

  app.get('/api/connections/:id/monitoring', {
    schema: {
      tags: ['monitoring'],
      summary: 'Métricas resumidas (memória, clientes, ops, hits)',
      security: [{ bearerAuth: [] }],
      params: connParams,
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    return service.getMonitoring(id);
  });

  // Alias mantido por compatibilidade com o contrato planejado
  app.get('/api/connections/:id/stats', {
    schema: {
      tags: ['monitoring'],
      summary: 'Alias de /monitoring',
      security: [{ bearerAuth: [] }],
      params: connParams,
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    return service.getMonitoring(id);
  });
}
