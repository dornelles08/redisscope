import type { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { loadEnv } from './config/env.js';
import { registerErrorHandler } from './common/hooks/error-handler.js';
import { registerAuthHook } from './common/hooks/auth-hook.js';
import { AuthService } from './infrastructure/auth/auth-service.js';
import { RedisManager } from './infrastructure/redis/redis-manager.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { ConnectionsRepository } from './modules/connections/connections.repository.js';
import { ConnectionsService } from './modules/connections/connections.service.js';
import { connectionsRoutes } from './modules/connections/connections.controller.js';
import { KeysService } from './modules/keys/keys.service.js';
import { keysRoutes } from './modules/keys/keys.controller.js';
import { MonitoringService } from './modules/monitoring/monitoring.service.js';
import { monitoringRoutes } from './modules/monitoring/monitoring.controller.js';
import { CommandsService } from './modules/commands/commands.service.js';
import { commandsRoutes } from './modules/commands/commands.controller.js';

export async function buildApp(): Promise<FastifyInstance> {
  const env = loadEnv();

  const { default: fastify } = await import('fastify');
  const app = fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
    },
    bodyLimit: 1024 * 1024, // 1 MB
  });

  await app.register(fastifyHelmet, { contentSecurityPolicy: false });
  await app.register(fastifyCors, {
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
    credentials: true,
  });
  await app.register(fastifyRateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    allowList: ['127.0.0.1', '::1'],
  });

  if (env.NODE_ENV !== 'production') {
    await app.register(fastifySwagger, {
      openapi: {
        info: {
          title: 'RedisScope API',
          description: 'API REST do RedisScope — gerenciamento e inspeção de instâncias Redis',
          version: '0.1.0',
        },
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          },
        },
      },
    });
    await app.register(fastifySwaggerUi, { routePrefix: '/docs' });
  }

  const authService = new AuthService(env.AUTH_USERNAME, env.AUTH_PASSWORD, env.AUTH_SECRET, env.AUTH_TOKEN_EXPIRY_SECONDS);
  registerAuthHook(app, (t) => authService.verifyToken(t));
  registerErrorHandler(app);

  await app.register(healthRoutes);
  await app.register(authRoutes, { authService });

  const redis = new RedisManager(env.REDIS_CONNECT_TIMEOUT_MS, env.REDIS_COMMAND_TIMEOUT_MS);
  const repo = new ConnectionsRepository(env.DATA_DIR, env.DATA_FILE);
  const connectionsService = new ConnectionsService(repo, env.ALLOWED_HOSTS, env.ENCRYPTION_KEY, redis);
  await app.register(connectionsRoutes, { service: connectionsService });

  const keysService = new KeysService(connectionsService, redis);
  await app.register(keysRoutes, { service: keysService });

  const monitoringService = new MonitoringService(connectionsService, redis);
  await app.register(monitoringRoutes, { service: monitoringService });

  const commandsService = new CommandsService(connectionsService, redis, env.REDIS_COMMAND_TIMEOUT_MS);
  await app.register(commandsRoutes, { service: commandsService });

  // Ciclo de vida: fecha todos os clientes Redis persistentes no shutdown
  app.addHook('onClose', async (instance) => {
    await redis.disconnectAll();
    instance.log.info('Clientes Redis encerrados.');
  });

  app.get('/api/status', {
    schema: { tags: ['status'], summary: 'Status da API' },
  }, async () => ({ ok: true, version: '0.1.0' }));

  return app;
}
