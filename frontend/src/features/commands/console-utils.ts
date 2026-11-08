export interface CommandResult {
  command: string;
  args: string[];
  result: unknown;
  latencyMs: number;
  truncated: boolean;
}

export type HistoryEntry =
  | { type: 'input'; command: string; timestamp: number }
  | { type: 'output'; result: CommandResult; timestamp: number }
  | { type: 'error'; message: string; timestamp: number };

export function formatResult(result: unknown): string {
  if (result === null || result === undefined) return '(nil)';
  if (typeof result === 'string') return result.length > 0 ? result : '(string vazia)';
  if (typeof result === 'number' || typeof result === 'boolean') return String(result);
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

export function isDestructiveCommand(raw: string): boolean {
  const base = raw.trim().split(/\s+/)[0]?.toUpperCase() ?? '';
  return base === 'FLUSHDB' || base === 'FLUSHALL';
}
