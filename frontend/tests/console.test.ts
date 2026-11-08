import { describe, it, expect } from 'vitest';
import { formatResult, isDestructiveCommand } from '@/features/commands/console-utils';

describe('console-utils', () => {
  it('formatResult formata tipos', () => {
    expect(formatResult(null)).toBe('(nil)');
    expect(formatResult('PONG')).toBe('PONG');
    expect(formatResult(123)).toBe('123');
    expect(formatResult(['a', 'b'])).toContain('"a"');
    expect(formatResult({ a: 1 })).toContain('"a": 1');
  });

  it('isDestructiveCommand detecta FLUSH', () => {
    expect(isDestructiveCommand('FLUSHDB')).toBe(true);
    expect(isDestructiveCommand('flushall')).toBe(true);
    expect(isDestructiveCommand('PING')).toBe(false);
    expect(isDestructiveCommand('FLUSHDB extra')).toBe(true);
  });
});
