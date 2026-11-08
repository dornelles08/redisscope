import { useEffect, useRef, useState } from 'react';
import { Trash2, Terminal as TerminalIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/feedback';
import { commandsApi } from '@/services/endpoints/commands';
import { ApiClientError } from '@/services/api-client';
import { formatResult, isDestructiveCommand, type HistoryEntry } from './console-utils';
import type { Connection } from '@/types/api';

const HISTORY_KEY_PREFIX = 'redisscope.console-history.';

function loadHistory(connectionId: string): HistoryEntry[] {
  try {
    const raw = sessionStorage.getItem(`${HISTORY_KEY_PREFIX}${connectionId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed.slice(-100) : [];
  } catch {
    return [];
  }
}

function saveHistory(connectionId: string, entries: HistoryEntry[]): void {
  try {
    sessionStorage.setItem(`${HISTORY_KEY_PREFIX}${connectionId}`, JSON.stringify(entries.slice(-100)));
  } catch {
    // ignora
  }
}

export function ConsolePage({ selectedConnection }: { selectedConnection?: Connection }) {
  const connectionId = selectedConnection?.id ?? '';
  const connectionName = selectedConnection?.name ?? '';

  const [entries, setEntries] = useState<HistoryEntry[]>(() => (connectionId ? loadHistory(connectionId) : []));
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [confirmCmd, setConfirmCmd] = useState<string | null>(null);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restaura histórico da sessão ao trocar de conexão
  useEffect(() => {
    if (!connectionId) return;
    setEntries(loadHistory(connectionId));
    setInput('');
    setHistoryIndex(null);
  }, [connectionId]);

  useEffect(() => {
    if (connectionId) saveHistory(connectionId, entries);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [entries, connectionId]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const inputHistory = entries.filter((e): e is { type: 'input'; command: string; timestamp: number } => e.type === 'input').map((e) => e.command);

  const run = async (raw: string, confirm?: boolean) => {
    if (!raw.trim() || running) return;
    setRunning(true);
    const timestamp = Date.now();
    setEntries((prev) => [...prev, { type: 'input', command: raw.trim(), timestamp }]);
    try {
      const result = await commandsApi.execute(connectionId, raw.trim(), confirm);
      setEntries((prev) => [...prev, { type: 'output', result, timestamp: Date.now() }]);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : 'Erro ao executar comando.';
      setEntries((prev) => [...prev, { type: 'error', message, timestamp: Date.now() }]);
    } finally {
      setRunning(false);
      setInput('');
      setHistoryIndex(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input.trim();
    if (!raw) return;
    if (isDestructiveCommand(raw)) {
      setConfirmCmd(raw);
      return;
    }
    void run(raw);
  };

  const handleConfirmDestructive = async () => {
    if (!confirmCmd) return;
    const raw = confirmCmd;
    setConfirmCmd(null);
    await run(raw, true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (inputHistory.length === 0) return;
      const next = historyIndex === null ? inputHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(next);
      setInput(inputHistory[next] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === null) return;
      const next = historyIndex + 1;
      if (next >= inputHistory.length) {
        setHistoryIndex(null);
        setInput('');
      } else {
        setHistoryIndex(next);
        setInput(inputHistory[next] ?? '');
      }
    }
  };

  if (!selectedConnection) {
    return (
      <EmptyState
        title="Nenhuma conexão selecionada"
        description="Selecione ou cadastre uma conexão Redis para usar o console."
      />
    );
  }

  return (
    <div className="flex h-full min-h-[480px] flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-900 text-slate-100 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-5 w-5 text-teal-400" />
          <span className="text-sm font-medium">Console — {connectionName}</span>
          <span className="hidden font-mono text-xs text-slate-400 sm:block">PING · INFO · DBSIZE · GET · SCAN · TYPE · TTL</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEntries([])}
          disabled={entries.length === 0}
          className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800"
        >
          <Trash2 className="h-4 w-4" /> Limpar histórico
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 font-mono text-sm leading-relaxed">
        {entries.length === 0 && (
          <p className="text-slate-500">
            Digite um comando e pressione Enter. Ex.: <span className="text-slate-300">PING</span>,{' '}
            <span className="text-slate-300">INFO</span>, <span className="text-slate-300">SCAN 0 MATCH usuario:* COUNT 100</span>.
            Use ↑/↓ para navegar no histórico.
          </p>
        )}
        {entries.map((entry, i) => {
          if (entry.type === 'input') {
            return (
              <p key={i} className="mt-2">
                <span className="text-teal-400">{connectionName}&gt;</span> <span className="text-slate-100">{entry.command}</span>
              </p>
            );
          }
          if (entry.type === 'output') {
            return (
              <div key={i} className="my-1">
                <pre className="whitespace-pre-wrap break-words text-slate-300">{formatResult(entry.result.result)}</pre>
                <p className="text-xs text-slate-500">
                  {entry.result.command} · {entry.result.latencyMs} ms{entry.result.truncated ? ' · truncado' : ''}
                </p>
              </div>
            );
          }
          return (
            <p key={i} className="my-1 text-red-400">
              (erro) {entry.message}
            </p>
          );
        })}
        {running && <p className="mt-2 animate-pulse text-slate-400">Executando...</p>}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-slate-800 px-4 py-3">
        <span className="shrink-0 font-mono text-sm text-teal-400">{connectionName}&gt;</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={running}
          placeholder="Digite o comando..."
          className="w-full bg-transparent font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
          aria-label="Entrada do console Redis"
        />
        <Button type="submit" size="sm" disabled={running || !input.trim()}>
          {running ? 'Executando...' : 'Enviar'}
        </Button>
      </form>

      <ConfirmDialog
        open={Boolean(confirmCmd)}
        onClose={() => setConfirmCmd(null)}
        onConfirm={handleConfirmDestructive}
        title="Comando destrutivo?"
        description={`O comando "${confirmCmd}" pode apagar dados do Redis. Esta ação não pode ser desfeita.`}
        confirmLabel="Executar mesmo assim"
      />
    </div>
  );
}
