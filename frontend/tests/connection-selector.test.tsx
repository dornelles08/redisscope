import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionSelector } from '@/components/layout/connection-selector';
import type { Connection } from '@/types/api';

const conns: Connection[] = [
  {
    id: '1',
    name: 'Redis - Local',
    host: '192.168.1.100',
    port: 6379,
    hasPassword: false,
    database: 0,
    tls: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

describe('ConnectionSelector', () => {
  it('exibe estado vazio', () => {
    render(<ConnectionSelector connections={[]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText(/nenhuma conexão/i)).toBeInTheDocument();
  });

  it('exibe opções e seleção', () => {
    render(<ConnectionSelector connections={conns} selectedId="1" onSelect={() => {}} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText(/redis - local/i)).toBeInTheDocument();
  });

  it('colapsado exibe ícone', () => {
    render(<ConnectionSelector connections={conns} selectedId="1" onSelect={() => {}} collapsed />);
    expect(screen.getByTitle(/redis - local/i)).toBeInTheDocument();
  });
});
