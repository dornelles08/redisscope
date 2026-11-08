import pino from 'pino';

/** Logger base — Pino com redação de segredos. */
export function createLogger(level: string) {
  return pino({
    level,
    redact: ['password', 'passwd', 'pwd', 'secret', 'token', 'authorization', '*.password'],
  });
}
