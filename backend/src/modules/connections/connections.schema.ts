import { z } from 'zod';

export const createConnectionSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(120),
  host: z.string().min(1, 'Host é obrigatório').max(255),
  port: z.number().int().min(1).max(65535).default(6379),
  username: z.string().max(255).optional(),
  password: z.string().max(1024).optional(),
  database: z.number().int().min(0).max(15).default(0),
  tls: z.boolean().default(false),
});

export const updateConnectionSchema = createConnectionSchema.partial();

export const connectionQuerySchema = z.object({
  // reservado para filtros futuros
});

export type CreateConnectionInput = z.infer<typeof createConnectionSchema>;
export type UpdateConnectionInput = z.infer<typeof updateConnectionSchema>;
