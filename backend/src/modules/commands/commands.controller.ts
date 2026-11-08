import type { FastifyInstance } from 'fastify';
import { CommandsService } from './commands.service.js';
import { executeCommandSchema } from './commands.schema.js';
import { ValidationError } from '../../common/errors/app-error.js';

export interface CommandsRoutesOptions {
  service: CommandsService;
}

const connParams = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', minLength: 1 } },
} as const;

export async function commandsRoutes(app: FastifyInstance, opts: CommandsRoutesOptions): Promise<void> {
  const { service } = opts;

  app.post('/api/connections/:id/commands', {
    schema: {
      tags: ['commands'],
      summary: 'Executar comando Redis (validado no backend — denylist + timeout)',
      security: [{ bearerAuth: [] }],
      params: connParams,
      body: {
        type: 'object',
        required: ['command'],
        properties: {
          command: { type: 'string', minLength: 1, maxLength: 8192 },
          confirm: { type: 'boolean' },
        },
      },
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const parsed = executeCommandSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Dados inválidos.', parsed.error.issues);
    return service.execute(id, parsed.data.command, parsed.data.confirm);
  });
}
