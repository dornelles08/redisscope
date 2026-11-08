import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { connectionsApi } from '@/services/endpoints';
import type { Connection } from '@/types/api';

const STORAGE_KEY = 'redisscope.selected-connection';

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function store(id: string | null): void {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignora
  }
}

export function useSelectedConnection() {
  const [selectedId, setSelectedId] = useState<string | null>(readStored);

  const connectionsQuery = useQuery({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.list(),
    enabled: true,
  });

  const connections: Connection[] = useMemo(
    () => connectionsQuery.data?.connections ?? [],
    [connectionsQuery.data?.connections],
  );

  // Se a seleção não existe mais (excluída), volta para a primeira conexão
  useEffect(() => {
    if (connectionsQuery.isLoading) return;
    if (connections.length === 0) {
      if (selectedId) {
        setSelectedId(null);
        store(null);
      }
      return;
    }
    if (!selectedId || !connections.some((c) => c.id === selectedId)) {
      const next = connections[0]?.id ?? null;
      setSelectedId(next);
      store(next);
    }
  }, [connections, connectionsQuery.isLoading, selectedId]);

  const select = (id: string | null) => {
    setSelectedId(id);
    store(id);
  };

  const selected: Connection | undefined = selectedId ? connections.find((c) => c.id === selectedId) : undefined;

  return {
    selectedId,
    selected,
    select,
    connections,
    isLoading: connectionsQuery.isLoading,
  };
}
