import { useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Header } from './header';
import type { Theme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import type { Connection } from '@/types/api';

interface MainLayoutProps {
  theme: Theme;
  onToggleTheme: () => void;
  username?: string;
  onLogout: () => void;
  connectionName?: string;
  latencyMs?: number | null;
  isConnected?: boolean;
  connections?: Connection[];
  selectedConnectionId?: string | null;
  onSelectConnection?: (id: string | null) => void;
  statusLabel?: string;
  children: ReactNode;
}

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/keys': 'Key Browser',
  '/console': 'Console',
  '/monitoring': 'Monitoramento',
  '/server': 'Informações do servidor',
  '/settings': 'Configurações',
};

export function MainLayout({
  theme,
  onToggleTheme,
  username,
  onLogout,
  connectionName,
  latencyMs,
  isConnected,
  connections = [],
  selectedConnectionId = null,
  onSelectConnection,
  statusLabel,
  children,
}: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const title = TITLES[location.pathname] ?? 'RedisScope';

  return (
    <div className="flex h-screen overflow-hidden bg-background text-ink dark:bg-dark-background dark:text-slate-100">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          username={username}
          onLogout={onLogout}
          connections={connections}
          selectedConnectionId={selectedConnectionId}
          onSelectConnection={onSelectConnection}
          statusLabel={statusLabel}
          isConnected={isConnected}
        />
      </div>

      {/* Mobile drawer */}
      <div className={cn('fixed inset-0 z-40 lg:hidden', mobileOpen ? 'block' : 'hidden')}>
        <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
        <div className="relative h-full w-64">
          <Sidebar
            collapsed={false}
            onToggle={() => setMobileOpen(false)}
            username={username}
            onLogout={onLogout}
            connections={connections}
            selectedConnectionId={selectedConnectionId}
            onSelectConnection={onSelectConnection}
            statusLabel={statusLabel}
            isConnected={isConnected}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title={title}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onOpenMobile={() => setMobileOpen(true)}
          connectionName={connectionName}
          latencyMs={latencyMs}
          isConnected={isConnected}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
