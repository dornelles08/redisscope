import { z } from 'zod';

export const executeCommandSchema = z.object({
  command: z.string().min(1, 'Comando é obrigatório').max(8192),
  confirm: z.boolean().optional(),
});

export type ExecuteCommandInput = z.infer<typeof executeCommandSchema>;

/**
 * Tokeniza linha no estilo Redis CLI: respeita aspas duplas e simples.
 * Ex.: `SET "chave com espaco" 'valor'` → ['SET','chave com espaco','valor']
 */
export function tokenize(raw: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inDouble = false;
  let inSingle = false;
  let hasCurrent = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i] as string;
    if (ch === '\\' && i + 1 < raw.length) {
      const next = raw[i + 1] as string;
      if (next === 'n') current += '\n';
      else if (next === 't') current += '\t';
      else current += next;
      i++;
      hasCurrent = true;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      hasCurrent = true;
      continue;
    }
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      hasCurrent = true;
      continue;
    }
    if (!inDouble && !inSingle && /\s/.test(ch)) {
      if (hasCurrent) {
        tokens.push(current);
        current = '';
        hasCurrent = false;
      }
      continue;
    }
    current += ch;
    hasCurrent = true;
  }
  if (inDouble || inSingle) throw new Error('Aspas não fechadas no comando.');
  if (hasCurrent) tokens.push(current);
  return tokens;
}

export type CommandCategory = 'allowed' | 'confirm-required' | 'blocked' | 'blocking';

const BLOCKED = new Set([
  'SHUTDOWN',
  'DEBUG',
  'MODULE',
  'SCRIPT',
  'CLIENT',
]);

const CONFIRM_REQUIRED = new Set([
  'FLUSHDB',
  'FLUSHALL',
]);

const BLOCKING = new Set([
  'BLPOP',
  'BRPOP',
  'BLMOVE',
  'BZPOPMIN',
  'BZPOPMAX',
  'XREAD',
  'XREADGROUP',
  'SUBSCRIBE',
  'PSUBSCRIBE',
  'UNSUBSCRIBE',
  'PUNSUBSCRIBE',
  'KEYS',
  'SCANSTREAM',
]);

export function classifyCommand(tokens: string[]): CommandCategory {
  if (tokens.length === 0) return 'blocked';
  const base = (tokens[0] as string).toUpperCase();
  // CONFIG: bloquear todas as variantes na v1 (inclui SET/REWRITE/GET seguros, mas simplificamos)
  if (base === 'CONFIG') return 'blocked';
  if (BLOCKED.has(base)) return 'blocked';
  if (BLOCKING.has(base)) return 'blocking';
  if (CONFIRM_REQUIRED.has(base)) return 'confirm-required';
  return 'allowed';
}

/** Título de confirmação para o frontend (sem expor lógica interna). */
export function confirmTitle(command: string): string {
  return `Executar ${command.toUpperCase()}?`;
}

export function confirmDescription(command: string): string {
  return `O comando ${command} pode apagar dados do Redis. Esta ação não pode ser desfeita.`;
}
