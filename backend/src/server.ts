import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';

async function main(): Promise<void> {
  const env = loadEnv();
  const app = await buildApp();

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    app.log.info({ signal }, 'Sinal recebido, encerrando...');
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error(err as Error, 'Erro ao encerrar');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  const address = await app.listen({ host: env.HOST, port: env.PORT });
  app.log.info(`RedisScope backend ouvindo em ${address}`);
}

void main().catch((err: unknown) => {
  // Falha no start — sem stack para o cliente, apenas para o operador
  console.error('Falha ao iniciar o backend:', err);
  process.exit(1);
});
