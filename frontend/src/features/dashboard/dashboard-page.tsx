import { useState } from 'react';
import { EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { Pause, Play, RefreshCw } from 'lucide-react';
import { useMonitoring, readInterval, writeInterval } from '@/hooks/useMonitoring';
import { buildHistory } from '@/hooks/monitoring-history';
import { Sparkline } from '@/components/redis/sparkline';
import { formatUptime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Connection, ConnectionStatus } from '@/types/api';

interface DashboardPageProps {
  selectedConnection?: Connection;
  status?: ConnectionStatus;
}

export function DashboardPage({ selectedConnection, status }: DashboardPageProps) {
  const [intervalMs, setIntervalMs] = useState(readInterval);
  const connectionId = selectedConnection?.id ?? null;
  const { summary, isLoading, isError, error, refetch, paused, togglePause, points } = useMonitoring(connectionId, intervalMs);
  const history = buildHistory(points);

  const changeInterval = (value: string) => {
    const next = Number(value);
    setIntervalMs(next);
    writeInterval(next);
  };

  if (!selectedConnection) {
    return (
      <EmptyState
        title="Nenhuma conexão selecionada"
        description="Selecione ou cadastre uma conexão Redis para ver o resumo da instância."
      />
    );
  }

  const connected = status?.status === 'connected';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{selectedConnection.name}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {selectedConnection.host}:{selectedConnection.port} · DB {selectedConnection.database} · {connected ? 'Conectado' : 'Desconectado'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="interval-select" className="text-xs text-slate-500 dark:text-slate-400">Atualização</label>
          <select
            id="interval-select"
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
          <Button size="sm" variant="outline" onClick={() => void refetch()} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} /> Atualizar
          </Button>
        </div>
      </div>

      {isError ? (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          Erro ao carregar métricas: {error instanceof Error ? error.message : 'tente novamente'}. Verifique se a conexão está ativa.
        </p>
      ) : isLoading && !summary ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />)}
        </div>
      ) : summary ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Status" value={connected ? 'Conectado' : 'Desconectado'} hint={status?.latencyMs !== undefined ? `${status.latencyMs} ms` : summary.version} />
            <StatCard label="Uptime" value={formatUptime(summary.uptimeSeconds)} hint={`Versão ${summary.version}`} />
            <StatCard label="Memória usada" value={summary.memoryUsedHuman} hint={`Máx: ${summary.maxMemoryHuman}`} />
            <StatCard label="Chaves" value={String(summary.keysCount)} hint={`${summary.databasesUsed} DB(s)`} />
            <StatCard label="Clientes" value={String(summary.connectedClients)} hint="Conectados" />
            <StatCard label="Ops/s" value={String(summary.opsPerSecond)} hint="Instântaneo" />
            <StatCard label="Comandos" value={summary.totalCommands.toLocaleString('pt-BR')} hint="Processados" />
            <StatCard label="Hit rate" value={summary.hitRate !== null ? `${Math.round(summary.hitRate * 100)}%` : '—'} hint={`${summary.hits.toLocaleString('pt-BR')} hits`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Memória" subtitle={summary.memoryUsedHuman}>
              <Sparkline data={history.memory} width={380} height={64} />
            </ChartCard>
            <ChartCard title="Operações/segundo" subtitle={`${summary.opsPerSecond} ops/s`}>
              <Sparkline data={history.ops} width={380} height={64} colorClass="text-sky-600" />
            </ChartCard>
            <ChartCard title="Clientes conectados" subtitle={String(summary.connectedClients)}>
              <Sparkline data={history.clients} width={380} height={64} colorClass="text-violet-600" />
            </ChartCard>
            <ChartCard title="Comandos processados" subtitle={summary.totalCommands.toLocaleString('pt-BR')}>
              <Sparkline data={history.commands} width={380} height={64} colorClass="text-amber-600" />
            </ChartCard>
          </div>

          {paused && (
            <p className="text-xs text-amber-600 dark:text-amber-400">Atualização pausada — os gráficos mostram o histórico até a pausa.</p>
          )}
        </>
      ) : (
        <EmptyState title="Sem dados" description="As métricas do Redis aparecerão aqui quando a conexão estiver ativa." />
      )}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 dark:border-dark-border dark:bg-dark-surface">
      <p className="text-sm text-muted dark:text-slate-400">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 dark:border-dark-border dark:bg-dark-surface">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</span>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
