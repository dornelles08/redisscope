import { describe, it, expect } from 'vitest';
import { formatTtl, formatBytes, formatUptime } from '@/lib/format';
import { buildHistory, pushHistoryPoint } from '@/hooks/monitoring-history';
import type { MonitoringSummary } from '@/types/api';

const summary = {
  version: '7.0.0',
  mode: 'standalone',
  uptimeSeconds: 3661,
  memoryUsedBytes: 1024,
  memoryUsedHuman: '1.00K',
  maxMemoryBytes: 0,
  maxMemoryHuman: '0.00M',
  memoryFragmentationRatio: 1.1,
  keysCount: 10,
  connectedClients: 2,
  databasesUsed: 1,
  opsPerSecond: 5,
  totalCommands: 100,
  hits: 90,
  misses: 10,
  hitRate: 0.9,
  expiredKeys: 1,
  evictedKeys: 0,
  osMonoTicks: null,
} as MonitoringSummary;

describe('format', () => {
  it('formatTtl', () => {
    expect(formatTtl(-1)).toBe('Sem expiração');
    expect(formatTtl(5)).toBe('5s');
    expect(formatTtl(125)).toContain('2m');
  });

  it('formatBytes e formatUptime', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatUptime(3661)).toContain('1h');
  });
});

describe('monitoring-history', () => {
  it('acumula pontos com limite', () => {
    let points = pushHistoryPoint([], summary, 2);
    expect(points).toHaveLength(1);
    points = pushHistoryPoint(points, summary, 2);
    points = pushHistoryPoint(points, summary, 2);
    expect(points).toHaveLength(2);
    const history = buildHistory(points);
    expect(history.ops).toHaveLength(2);
  });
});
