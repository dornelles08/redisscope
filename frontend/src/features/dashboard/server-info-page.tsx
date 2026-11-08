import { useMemo, useState } from 'react';
import { Copy, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';
import { pushToast } from '@/components/ui/toast';
import { useServerInfo } from '@/hooks/useMonitoring';
import type { Connection } from '@/types/api';

const SENSITIVE_KEYS = new Set(['file', 'config_file', 'executable', 'config', 'dir']);

const SECTION_TITLES: Record<string, string> = {
  server: 'Server',
  clients: 'Clients',
  memory: 'Memory',
  persistence: 'Persistence',
  stats: 'Stats',
  replication: 'Replication',
  cpu: 'CPU',
  keyspace: 'Keyspace',
  cluster: 'Cluster',
};

export function ServerInfoPage({ selectedConnection }: { selectedConnection?: Connection }) {
  const connectionId = selectedConnection?.id ?? null;
  const { data, isLoading, isError, error, refetch } = useServerInfo(connectionId);
  const [filter, setFilter] = useState('');

  const sections = useMemo(() => {
    if (!data) return [];
    const entries = Object.entries(data.sections);
    const q = filter.trim().toLowerCase();
    return entries
      .map(([name, fields]) => {
        const filtered = Object.entries(fields).filter(
          ([k, v]) => !SENSITIVE_KEYS.has(k.toLowerCase()) && (!q || k.toLowerCase().includes(q) || v.toLowerCase().includes(q)),
        );
        return { name, title: SECTION_TITLES[name] ?? name, fields: filtered };
      })
      .filter((s) => s.fields.length > 0);
  }, [data, filter]);

  if (!selectedConnection) {
    return (
      <EmptyState title="Nenhuma conexão selecionada" description="Selecione ou cadastre uma conexão Redis para ver as informações do servidor." />
    );
  }

  const copyAll = async () => {
    if (!data) return;
    const text = Object.entries(data.sections)
      .map(([name, fields]) => [`# ${name.toUpperCase()}`, ...Object.entries(fields).map(([k, v]) => `${k}:${v}`)].join('\n'))
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      pushToast('Informações copiadas.', 'success');
    } catch {
      pushToast('Erro ao copiar.', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar campos do INFO..." className="pl-8" />
        </div>
        <Button variant="outline" onClick={() => void refetch()} disabled={isLoading}>Atualizar</Button>
        <Button variant="outline" onClick={() => void copyAll()} disabled={!data}>
          <Copy className="h-4 w-4" /> Copiar
        </Button>
      </div>

      {data && <p className="text-xs text-slate-500 dark:text-slate-400">Gerado em {new Date(data.generatedAt).toLocaleString('pt-BR')}</p>}

      {isLoading && !data ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />)}
        </div>
      ) : isError ? (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          Erro ao carregar INFO: {error instanceof Error ? error.message : 'tente novamente'}
        </p>
      ) : sections.length === 0 ? (
        <EmptyState title="Nenhuma seção encontrada" description="Ajuste o filtro ou verifique a conexão." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sections.map((section) => (
            <div key={section.name} className="overflow-hidden rounded-lg border border-border dark:border-dark-border">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                <h3 className="font-semibold">{section.title}</h3>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {section.fields.map(([k, v]) => (
                    <tr key={k}>
                      <td className="w-48 px-4 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">{k}</td>
                      <td className="break-all px-4 py-2 font-mono text-xs">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
