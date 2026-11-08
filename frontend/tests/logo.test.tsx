import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Logo } from '@/components/common/logo';
import { EmptyState } from '@/components/ui/feedback';

describe('logo', () => {
  it('renderiza o símbolo RedisScope', () => {
    render(<Logo />);
    expect(screen.getByRole('img', { name: /redisscope/i })).toBeInTheDocument();
  });
});

describe('empty-state', () => {
  it('exibe título e descrição', () => {
    render(<EmptyState title="Vazio" description="Nada aqui" />);
    expect(screen.getByText('Vazio')).toBeInTheDocument();
    expect(screen.getByText('Nada aqui')).toBeInTheDocument();
  });
});
