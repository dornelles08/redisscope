import { useState } from 'react';
import { EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { Pause, Play } from 'lucide-react';
import { useMonitoring, readInterval, writeInterval } from '@/hooks/useMonitoring';
import { buildHistory } from '@/hooks/monitoring-history';
import { Sparkline } from '@/components/redis/sparkline';
import type { Connection } from '@/types/api';

export function MonitoringPage({ selectedConnection }: { selectedConnection?: Connection }) {
  const [intervalMs, setIntervalMs] = useState(readInterval);
  const connectionId = selectedConnection?.id ?? null;
  const { summary, isLoading, isError, error, paused, togglePause, points } = useMonitoring(connectionId, intervalMs);

  const changeInterval = (value: string) => {
    const next = Number(value);
    setIntervalMs(next);
    writeInterval(next);
  };
  const history = buildHistory(points);

  if (!selectedConnection) {
    return <EmptyState title="Nenhuma conexão selecionada" description="Selecione ou cadastre uma conexão Redis para monitorar." />;
  }

  const rows: Array<[string, string]> = summary
    ? [
        ['Memória usada', summary.memoryUsedHuman],
        ['Memória máxima', summary.maxMemoryHuman],
        ['Fragmentação', summary.memoryFragmentationRatio !== null ? summary.memoryFragmentationRatio.toFixed(2) : '—'],
        ['Clientes conectados', String(summary.connectedClients)],
        ['Comandos processados', summary.totalCommands.toLocaleString('pt-BR')],
        ['Ops/s', String(summary.opsPerSecond)],
        ['Hits', summary.hits.toLocaleString('pt-BR')],
        ['Misses', summary.misses.toLocaleString('pt-BR')],
        ['Hit rate', summary.hitRate !== null ? `${Math.round(summary.hitRate * 100)}%` : '—'],
        ['Expiradas', summary.expiredKeys.toLocaleString('pt-BR')],
        ['Expuldas (evicted)', summary.evictedKeys.toLocaleString('pt-BR')],
        ['Uptime (s)', String(summary.uptimeSeconds)],
        ['DBs utilizadas', String(summary.databasesUsed)],
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Monitoramento</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Histórico em memória enquanto a aplicação estiver aberta (sem banco de dados).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="monitor-interval" className="text-xs text-slate-500 dark:text-slate-400">Atualização</label>
          <select
            id="monitor-interval"
            value={intervalMs}
            onChange={(e) => changeInterval(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
            aria-label="Intervalo de atualização"
          >
            <option value="5000">5s</option>
            <option value="10000">10s</option>
            <option value="30000">30s</option>
          </select>
          <Button size="sm" variant="outline" onClick={togglePause} disabled={!summary}>
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {paused ? 'Retomar' : 'Pausar'}
          </Button>
        </div>
      </div>

      {isError ? (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          Erro ao carregar métricas: {error instanceof Error ? error.message : 'tente novamente'}
        </p>
      ) : isLoading && !summary ? (
        <div className="h-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
      ) : summary ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Memória (bytes)" data={history.memory} />
            <ChartCard title="Ops/segundo" data={history.ops} colorClass="text-sky-600" />
            <ChartCard title="Clientes" data={history.clients} colorClass="text-violet-600" />
            <ChartCard title="Comandos" data={history.commands} colorClass="text-amber-600" />
          </div>
          <div className="overflow-hidden rounded-lg border border-border dark:border-dark-border">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {rows.map(([label, value]) => (
                  <tr key={label}>
                    <td className="w-64 px-4 py-2 text-slate-500 dark:text-slate-400">{label}</td>
                    <td className="px-4 py-2 font-mono text-xs">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <EmptyState title="Sem dados" description="As métricas aparecerão aqui quando a conexão estiver ativa." />
      )}
    </div>
  );
}

function ChartCard({ title, data, colorClass = 'text-primary' }: { title: string; data: number[]; colorClass?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 dark:border-dark-border dark:bg-dark-surface">
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      <div className="overflow-x-auto">
        <Sparkline data={data} width={380} height={56} colorClass={colorClass} />
      </div>
    </div>
  );
}
