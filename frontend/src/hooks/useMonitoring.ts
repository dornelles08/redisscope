import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { monitoringApi } from '@/services/endpoints';
import { pushHistoryPoint, type HistoryPoint } from './monitoring-history';

const INTERVAL_KEY = 'redisscope.monitor.interval';

export function readInterval(): number {
  try {
    const raw = localStorage.getItem(INTERVAL_KEY);
    const n = raw ? Number(raw) : 5000;
    return n === 10000 || n === 30000 ? n : 5000;
  } catch {
    return 5000;
  }
}

export function writeInterval(ms: number): void {
  try {
    localStorage.setItem(INTERVAL_KEY, String(ms));
  } catch {
    // ignora
  }
}

export function useMonitoring(selectedId: string | null, intervalMs = 5000) {
  const [paused, setPaused] = useState(false);
  const [points, setPoints] = useState<HistoryPoint[]>([]);

  const query = useQuery({
    queryKey: ['monitoring', selectedId, intervalMs],
    queryFn: () => {
      if (!selectedId) throw new Error('Sem seleção');
      return monitoringApi.monitoring(selectedId);
    },
    enabled: Boolean(selectedId),
    refetchInterval: paused ? false : intervalMs,
    retry: false,
  });

  useEffect(() => {
    if (query.data && !paused) {
      setPoints((prev) => pushHistoryPoint(prev, query.data));
    }
  }, [query.data, paused]);

  useEffect(() => {
    setPoints([]);
  }, [selectedId]);

  const togglePause = () => setPaused((p) => !p);

  return { summary: query.data, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch, paused, togglePause, points };
}

export function useServerInfo(selectedId: string | null) {
  return useQuery({
    queryKey: ['server-info', selectedId],
    queryFn: () => {
      if (!selectedId) throw new Error('Sem seleção');
      return monitoringApi.info(selectedId);
    },
    enabled: Boolean(selectedId),
    retry: false,
    refetchInterval: 30_000,
  });
}
