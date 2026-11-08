import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:8080'),
  // Auth — login e senha completo (v1). Sem defaults inseguros: obrigatórios em produção.
  // Em desenvolvimento/teste, os testes definem explicitamente.
  AUTH_USERNAME: z.string().min(1),
  AUTH_PASSWORD: z.string().min(8, 'AUTH_PASSWORD deve ter pelo menos 8 caracteres'),
  AUTH_TOKEN_EXPIRY_SECONDS: z.coerce.number().int().min(60).max(86400).default(43200),
  // JWT signing secret — min 32 chars (obrigatório; dev gera temporariamente abaixo)
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET deve ter pelo menos 32 caracteres'),
  // Chave para criptografia AES-256-GCM das credenciais Redis — 32 bytes em hex (64 chars).
  // Obrigatória para persistir senhas Redis em produção.
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/, 'ENCRYPTION_KEY deve ser 32 bytes em hex (64 caracteres hex)')
    .optional(),
  DATA_DIR: z.string().default('./data'),
  DATA_FILE: z.string().default('connections.json'),
  // Proteção SSRF — lista de hosts permitidos (separados por vírgula). Vazio = permite redes privadas locais (padrão homelab).
  ALLOWED_HOSTS: z.string().default(''),
  // Rate limit
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  // Redis defaults
  REDIS_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(5000),
  REDIS_COMMAND_TIMEOUT_MS: z.coerce.number().int().min(100).max(30000).default(5000),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // DX local: em development/test, injeta defaults claramente inseguros apenas para abrir o app.
    // NUNCA usado em produção — se NODE_ENV=production sem segredo, falha explicitamente.
    // Em produção, defina AUTH_USERNAME/AUTH_PASSWORD/AUTH_SECRET no painel/.env.
    if (process.env.NODE_ENV !== 'production') {
      if (!process.env.AUTH_USERNAME) process.env.AUTH_USERNAME = 'dev-admin';
      if (!process.env.AUTH_PASSWORD) process.env.AUTH_PASSWORD = 'dev-password-123';
      if (!process.env.AUTH_SECRET) process.env.AUTH_SECRET = 'dev-only-secret-at-least-32-chars-long!!';
    }
    const retry = envSchema.safeParse(process.env);
    if (!retry.success) {
      const issues = retry.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
      throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
    }
    cached = retry.data;
    return cached;
  }
  cached = parsed.data;
  return cached;
}

export function resetEnvCacheForTests(): void {
  cached = null;
}
