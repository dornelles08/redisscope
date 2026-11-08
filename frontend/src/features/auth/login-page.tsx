import { useState } from 'react';
import { Logo } from '@/components/common/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiClientError } from '@/services/api-client';

interface LoginPageProps {
  onLogin: (input: { username: string; password: string }) => Promise<unknown>;
  isLoading: boolean;
  error: Error | null;
}

export function LoginPage({ onLogin, isLoading, error }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!username.trim()) {
      setLocalError('Informe o usuário.');
      return;
    }
    if (!password) {
      setLocalError('Informe a senha.');
      return;
    }
    try {
      await onLogin({ username, password });
    } catch {
      // erro exibido via prop
    }
  };

  const displayError = error instanceof ApiClientError ? error.message : error ? 'Erro ao entrar. Tente novamente.' : localError;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 dark:bg-dark-background">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-sm dark:border-dark-border dark:bg-dark-surface">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo className="h-12 w-12" />
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">RedisScope</h1>
            <p className="text-sm text-muted dark:text-slate-400">Gerencie suas instâncias Redis pelo navegador</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Input
            label="Usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            disabled={isLoading}
          />
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={isLoading}
          />
          {displayError && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {displayError}
            </p>
          )}
          <Button type="submit" disabled={isLoading} className="mt-2">
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
