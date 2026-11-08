import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KeysPage } from '@/features/keys/keys-page';
import { MonitoringPage } from '@/features/monitoring/monitoring-page';

function withClient(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{node}</QueryClientProvider>;
}

describe('fases 3-4 placeholders com conexão', () => {
  it('KeysPage sem conexão exibe empty state', () => {
    render(withClient(<KeysPage selectedConnection={undefined} />));
    expect(screen.getByText(/nenhuma conexão/i)).toBeInTheDocument();
  });

  it('MonitoringPage sem conexão exibe empty state', () => {
    render(withClient(<MonitoringPage selectedConnection={undefined} />));
    expect(screen.getByText(/nenhuma conexão/i)).toBeInTheDocument();
  });
});
