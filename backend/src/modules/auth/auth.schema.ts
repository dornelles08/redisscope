import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Usuário é obrigatório').max(100),
  password: z.string().min(1, 'Senha é obrigatória').max(256),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const loginResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
  user: z.object({ username: z.string() }),
});

export const meResponseSchema = z.object({
  username: z.string(),
});
