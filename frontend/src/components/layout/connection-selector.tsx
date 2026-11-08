import { ChevronDown, Database } from 'lucide-react';
import type { Connection } from '@/types/api';
import { cn } from '@/lib/utils';

interface ConnectionSelectorProps {
  connections: Connection[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  collapsed?: boolean;
}

export function ConnectionSelector({ connections, selectedId, onSelect, collapsed }: ConnectionSelectorProps) {
  if (collapsed) {
    return (
      <div className="mb-2 px-2" title={connections.find((c) => c.id === selectedId)?.name ?? 'Sem conexão'}>
        <div className="flex justify-center rounded-md border border-slate-200 px-2 py-2 dark:border-slate-700">
          <Database className="h-5 w-5 text-slate-500" />
        </div>
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="mb-2 px-2">
        <p className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400">
          Nenhuma conexão. Cadastre em Configurações.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-3 px-2">
      <label htmlFor="connection-select" className="mb-1 block px-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        Conexão
      </label>
      <div className="relative">
        <Database className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <select
          id="connection-select"
          value={selectedId ?? ''}
          onChange={(e) => onSelect(e.target.value || null)}
          className={cn(
            'w-full appearance-none rounded-md border border-slate-300 bg-white py-2 pl-8 pr-8 text-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
          )}
        >
          <option value="">Selecione...</option>
          {connections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.host}:{c.port})
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}
