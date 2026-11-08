import { Moon, Sun, Menu } from 'lucide-react';
import type { Theme } from '@/hooks/useTheme';

interface HeaderProps {
  title: string;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenMobile?: () => void;
  connectionName?: string;
  latencyMs?: number | null;
  isConnected?: boolean;
}

export function Header({ title, theme, onToggleTheme, onOpenMobile, connectionName, latencyMs, isConnected }: HeaderProps) {
  return (
    <header className="flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-800 lg:px-6">
      {onOpenMobile && (
        <button
          type="button"
          onClick={onOpenMobile}
          className="rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 lg:hidden"
          aria-label="Abrir navegação"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>

      <div className="ml-auto flex items-center gap-3">
        {connectionName && (
          <span className="hidden max-w-40 truncate rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200 md:block" title={connectionName}>
            {connectionName}
          </span>
        )}
        {connectionName && (
          <span
            className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium md:flex ${
              isConnected
                ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
            }`}
            title={latencyMs !== undefined && latencyMs !== null ? `Latência: ${latencyMs} ms` : 'Status da conexão'}
          >
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-slate-400'}`} />
            {isConnected ? (latencyMs !== null && latencyMs !== undefined ? `${latencyMs} ms` : 'Conectado') : 'Desconectado'}
          </span>
        )}
        <button
          type="button"
          onClick={onToggleTheme}
          className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
          aria-label={theme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
          title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>
    </header>
  );
}
