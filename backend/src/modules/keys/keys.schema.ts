import { z } from 'zod';

export const scanQuerySchema = z.object({
  cursor: z.string().default('0'),
  count: z.coerce.number().int().min(1).max(500).default(100),
  match: z.string().max(255).optional(),
  type: z.string().max(50).optional(),
});

export const getKeyQuerySchema = z.object({
  // Paginação para estruturas grandes
  cursor: z.string().optional(),
  count: z.coerce.number().int().min(1).max(200).optional(),
  start: z.coerce.number().int().optional(),
  stop: z.coerce.number().int().optional(),
  from: z.string().max(100).optional(),
  to: z.string().max(100).optional(),
  order: z.enum(['asc', 'desc', 'rev']).optional(),
});

export const createKeySchema = z.discriminatedUnion('type', [
  z.object({
    key: z.string().min(1).max(1024),
    type: z.literal('string'),
    value: z.string().max(1048576),
    ttlSeconds: z.number().int().min(1).max(86400 * 365).optional(),
  }),
  z.object({
    key: z.string().min(1).max(1024),
    type: z.literal('hash'),
    fields: z.record(z.string(), z.string()).refine((o) => Object.keys(o).length > 0 && Object.keys(o).length <= 100, 'Informe de 1 a 100 campos'),
    ttlSeconds: z.number().int().min(1).max(86400 * 365).optional(),
  }),
  z.object({
    key: z.string().min(1).max(1024),
    type: z.literal('list'),
    values: z.array(z.string().max(1048576)).min(1).max(100),
    ttlSeconds: z.number().int().min(1).max(86400 * 365).optional(),
  }),
  z.object({
    key: z.string().min(1).max(1024),
    type: z.literal('set'),
    members: z.array(z.string().max(1048576)).min(1).max(100),
    ttlSeconds: z.number().int().min(1).max(86400 * 365).optional(),
  }),
  z.object({
    key: z.string().min(1).max(1024),
    type: z.literal('zset'),
    members: z.array(z.object({ member: z.string().min(1).max(1048576), score: z.number() })).min(1).max(100),
    ttlSeconds: z.number().int().min(1).max(86400 * 365).optional(),
  }),
  z.object({
    key: z.string().min(1).max(1024),
    type: z.literal('stream'),
    fields: z.record(z.string(), z.string()).refine((o) => Object.keys(o).length > 0 && Object.keys(o).length <= 50, 'Informe de 1 a 50 campos'),
    ttlSeconds: z.number().int().min(1).max(86400 * 365).optional(),
  }),
]);

export const updateStringSchema = z.object({
  value: z.string().max(1048576),
  ttlSeconds: z.number().int().min(1).max(86400 * 365).optional(),
});

export const ttlSchema = z.object({
  ttlSeconds: z.number().int().min(1).max(86400 * 365),
});

export const renameSchema = z.object({
  newKey: z.string().min(1).max(1024),
});

export const hashFieldsSchema = z.object({
  fields: z.record(z.string(), z.string()).refine((o) => Object.keys(o).length > 0 && Object.keys(o).length <= 100, 'Informe de 1 a 100 campos'),
});

export const hashDeleteSchema = z.object({
  fields: z.array(z.string().min(1).max(1024)).min(1).max(100),
});

export const listPushSchema = z.object({
  side: z.enum(['left', 'right']).default('right'),
  values: z.array(z.string().max(1048576)).min(1).max(100),
});

export const listSetSchema = z.object({
  value: z.string().max(1048576),
});

export const setMembersSchema = z.object({
  members: z.array(z.string().max(1048576)).min(1).max(100),
});

export const zsetMembersSchema = z.object({
  members: z.array(z.object({ member: z.string().min(1).max(1048576), score: z.number() })).min(1).max(100),
});

export const zsetDeleteSchema = z.object({
  members: z.array(z.string().min(1).max(1024)).min(1).max(100),
});

export const streamAddSchema = z.object({
  fields: z.record(z.string(), z.string()).refine((o) => Object.keys(o).length > 0 && Object.keys(o).length <= 50, 'Informe de 1 a 50 campos'),
  id: z.string().max(100).optional(),
});

export type CreateKeyInput = z.infer<typeof createKeySchema>;
