import type { MonitoringSummary } from '@/types/api';

export interface HistoryPoint {
  timestamp: number;
  memoryUsedBytes: number;
  opsPerSecond: number;
  connectedClients: number;
  totalCommands: number;
}

export interface HistoryData {
  memory: number[];
  ops: number[];
  clients: number[];
  commands: number[];
}

export function buildHistory(points: HistoryPoint[]): HistoryData {
  return {
    memory: points.map((p) => p.memoryUsedBytes),
    ops: points.map((p) => p.opsPerSecond),
    clients: points.map((p) => p.connectedClients),
    commands: points.map((p) => p.totalCommands),
  };
}

export function pushHistoryPoint(points: HistoryPoint[], summary: MonitoringSummary, maxPoints = 60): HistoryPoint[] {
  const next = [
    ...points,
    {
      timestamp: Date.now(),
      memoryUsedBytes: summary.memoryUsedBytes,
      opsPerSecond: summary.opsPerSecond,
      connectedClients: summary.connectedClients,
      totalCommands: summary.totalCommands,
    },
  ];
  return next.length > maxPoints ? next.slice(next.length - maxPoints) : next;
}
