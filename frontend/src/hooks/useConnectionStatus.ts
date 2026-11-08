import { useQuery } from '@tanstack/react-query';
import { connectionsApi } from '@/services/endpoints';
import type { ConnectionStatus } from '@/types/api';

/**
 * Status da conexão selecionada com polling leve (10s).
 * Não dispara excessivamente — o backend reutiliza o cliente persistente.
 */
export function useConnectionStatus(selectedId: string | null) {
  return useQuery({
    queryKey: ['connection-status', selectedId],
    queryFn: () => {
      if (!selectedId) throw new Error('Sem seleção');
      return connectionsApi.status(selectedId);
    },
    enabled: Boolean(selectedId),
    retry: false,
    refetchInterval: 10_000,
  });
}

export function statusLabel(status: ConnectionStatus | undefined): string {
  if (!status) return 'Desconectado';
  switch (status.status) {
    case 'connected':
      return status.latencyMs !== undefined ? `Conectado · ${status.latencyMs} ms` : 'Conectado';
    case 'connecting':
      return 'Conectando...';
    case 'error':
      return 'Erro';
    default:
      return 'Desconectado';
  }
}
