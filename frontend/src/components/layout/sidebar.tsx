import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  KeyRound,
  Terminal,
  Activity,
  Server,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Logo } from '@/components/common/logo';
import { ConnectionSelector } from './connection-selector';
import { cn } from '@/lib/utils';
import type { Connection } from '@/types/api';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  username?: string;
  onLogout: () => void;
  connections?: Connection[];
  selectedConnectionId?: string | null;
  onSelectConnection?: (id: string | null) => void;
  statusLabel?: string;
  isConnected?: boolean;
}

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/keys', label: 'Key Browser', icon: KeyRound },
  { to: '/console', label: 'Console', icon: Terminal },
  { to: '/monitoring', label: 'Monitoramento', icon: Activity },
  { to: '/server', label: 'Servidor', icon: Server },
  { to: '/settings', label: 'Configurações', icon: Settings },
];

export function Sidebar({
  collapsed,
  onToggle,
  username,
  onLogout,
  connections = [],
  selectedConnectionId = null,
  onSelectConnection,
  statusLabel,
  isConnected,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-slate-200 bg-white transition-all dark:border-slate-700 dark:bg-slate-800',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className={cn('flex items-center gap-2 border-b border-slate-100 px-4 py-4 dark:border-slate-700', collapsed && 'justify-center px-2')}>
        <Logo className="h-8 w-8 shrink-0" />
        {!collapsed && (
          <div className="flex flex-col leading-tight">
            <span className="font-semibold tracking-tight">RedisScope</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">v0.1.0</span>
          </div>
        )}
      </div>

      <div className="border-b border-slate-100 px-1 py-3 dark:border-slate-700">
        <ConnectionSelector
          connections={connections}
          selectedId={selectedConnectionId}
          onSelect={onSelectConnection ?? (() => {})}
          collapsed={collapsed}
        />
        {!collapsed && statusLabel && (
          <p className="flex items-center gap-1.5 px-3 text-xs text-slate-500 dark:text-slate-400">
            <span className={cn('h-2 w-2 rounded-full', isConnected ? 'bg-green-500' : 'bg-slate-400')} />
            {statusLabel}
          </p>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                title={label}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
                    collapsed && 'justify-center px-2',
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-slate-200 px-2 py-3 dark:border-slate-700">
        {!collapsed && username && (
          <p className="px-2 pb-2 truncate text-xs text-slate-500 dark:text-slate-400" title={username}>
            {username}
          </p>
        )}
        <button
          type="button"
          onClick={onLogout}
          title="Sair"
          className={cn(
            'mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
            collapsed && 'justify-center px-2',
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'flex w-full items-center rounded-md px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700',
            collapsed ? 'justify-center px-2' : 'gap-3',
          )}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          {!collapsed && <span>Recolher</span>}
        </button>
      </div>
    </aside>
  );
}
