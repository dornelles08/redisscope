import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, RefreshCw, Copy, Trash2, Eye, Loader2, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { pushToast } from '@/components/ui/toast';
import { keysApi } from '@/services/endpoints';
import { formatTtl } from '@/lib/format';
import { KeyDetailPanel } from './key-detail-panel';
import type { Connection, CreateKeyPayload } from '@/types/api';
import { cn } from '@/lib/utils';

const TYPES = ['all', 'string', 'hash', 'list', 'set', 'zset', 'stream'] as const;

export function KeysPage({ selectedConnection }: { selectedConnection?: Connection }) {
  const [match, setMatch] = useState('');
  const [appliedMatch, setAppliedMatch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [cursor, setCursor] = useState('0');
  const [accumulated, setAccumulated] = useState<Array<{ key: string; type: string; ttl: number }>>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const connectionId = selectedConnection?.id ?? '';

  const keysQuery = useQuery({
    queryKey: ['keys', connectionId, appliedMatch, typeFilter, cursor],
    queryFn: () => keysApi.list(connectionId, { cursor, count: 100, match: appliedMatch || undefined, type: typeFilter }),
    enabled: Boolean(connectionId),
    retry: false,
  });

  const sorted = useMemo(() => {
    const copy = [...accumulated];
    copy.sort((a, b) => (sortAsc ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key)));
    return copy;
  }, [accumulated, sortAsc]);

  // Acumula páginas
  useEffect(() => {
    const data = keysQuery.data;
    if (!data) return;
    if (cursor === '0') {
      setAccumulated(data.keys);
    } else {
      setAccumulated((prev) => {
        const seen = new Set(prev.map((k) => k.key));
        const fresh = data.keys.filter((k) => !seen.has(k.key));
        // Reset se mudou filtro — o cursor '0' já cobre, mas este efeito roda por cursor
        return [...prev, ...fresh];
      });
    }
  }, [keysQuery.data, cursor]);

  const resetAndSearch = () => {
    setCursor('0');
    setAppliedMatch(match.trim());
    setAccumulated([]);
    setSelectedKey(null);
  };

  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ['key-detail', connectionId, selectedKey],
    queryFn: () => {
      if (!selectedKey) throw new Error('Sem chave');
      return keysApi.get(connectionId, selectedKey);
    },
    enabled: Boolean(connectionId && selectedKey),
    retry: false,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['keys'] });
    void queryClient.invalidateQueries({ queryKey: ['key-detail'] });
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      pushToast('Copiado.', 'success');
    } catch {
      pushToast('Erro ao copiar.', 'error');
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await keysApi.remove(connectionId, key);
      pushToast('Chave excluída.', 'success');
      setAccumulated((prev) => prev.filter((k) => k.key !== key));
      if (selectedKey === key) setSelectedKey(null);
      invalidate();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erro ao excluir.', 'error');
    }
  };

  if (!selectedConnection) {
    return (
      <EmptyState
        title="Nenhuma conexão selecionada"
        description="Selecione ou cadastre uma conexão Redis no menu lateral para navegar pelas chaves."
      />
    );
  }

  const done = keysQuery.data?.done ?? true;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-52 flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={match}
              onChange={(e) => setMatch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') resetAndSearch(); }}
              placeholder="Pesquisar — padrão SCAN (ex.: usuario:*)"
              className="pl-8"
            />
          </div>
          <Button onClick={resetAndSearch} disabled={keysQuery.isFetching}>
            {keysQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
          </Button>
        </div>

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setCursor('0'); setAccumulated([]); }}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          aria-label="Filtrar por tipo"
        >
          {TYPES.map((t) => <option key={t} value={t}>{t === 'all' ? 'Todos os tipos' : t}</option>)}
        </select>

        <Button variant="outline" onClick={() => { setCursor('0'); setAccumulated([]); void queryClient.invalidateQueries({ queryKey: ['keys'] }); }} disabled={keysQuery.isFetching}>
          <RefreshCw className={cn('h-4 w-4', keysQuery.isFetching && 'animate-spin')} /> Atualizar
        </Button>

        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Nova chave
        </Button>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        DB {selectedConnection.database} · {selectedConnection.name} — exibindo {sorted.length} chave(s) (ordenação alfabética da página). Cursor: {keysQuery.data?.cursor ?? '0'}
      </p>

      {keysQuery.isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : keysQuery.isError ? (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          Erro ao listar chaves: {keysQuery.error instanceof Error ? keysQuery.error.message : 'tente novamente'}
        </p>
      ) : sorted.length === 0 ? (
        <EmptyState
          title="Nenhuma chave encontrada"
          description="Ajuste a pesquisa ou crie uma nova chave."
          action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Nova chave</Button>}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border dark:border-dark-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium">
                  <button type="button" onClick={() => setSortAsc((s) => !s)} className="inline-flex items-center gap-1">
                    Chave <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium">Tipo</th>
                <th className="px-4 py-3 text-left font-medium">TTL</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {sorted.map((item) => (
                <tr key={item.key} className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800">
                  <td className="max-w-64 truncate px-4 py-2.5 font-mono text-xs" title={item.key}>{item.key}</td>
                  <td className="px-4 py-2.5"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium dark:bg-slate-700">{item.type}</span></td>
                  <td className="px-4 py-2.5 font-mono text-xs">{formatTtl(item.ttl)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => setSelectedKey(item.key)} className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label={`Ver ${item.key}`} title="Ver">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => void handleCopy(item.key)} className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label={`Copiar nome ${item.key}`} title="Copiar nome">
                        <Copy className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setDeleting(item.key)} className="rounded-md p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30" aria-label={`Excluir ${item.key}`} title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!done && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setCursor(keysQuery.data?.cursor ?? '0')}
            disabled={keysQuery.isFetching}
          >
            {keysQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Carregar mais (SCAN cursor)
          </Button>
        </div>
      )}

      <CreateKeyModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        connectionId={connectionId}
        onCreated={(key) => { setCreateOpen(false); setAccumulated([]); setCursor('0'); setSelectedKey(key); invalidate(); }}
      />

      {selectedKey && (
        <KeyDetailPanel
          connectionId={connectionId}
          detail={detailQuery.data}
          isLoading={detailQuery.isLoading}
          onClose={() => setSelectedKey(null)}
          onRefresh={() => void detailQuery.refetch()}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => { if (deleting) await handleDelete(deleting); setDeleting(null); }}
        title="Excluir chave?"
        description={`A chave "${deleting}" será excluída permanentemente.`}
        confirmLabel="Excluir"
      />
    </div>
  );
}

function CreateKeyModal({ open, onClose, connectionId, onCreated }: { open: boolean; onClose: () => void; connectionId: string; onCreated: (key: string) => void }) {
  const [key, setKey] = useState('');
  const [type, setType] = useState<'string' | 'hash' | 'list' | 'set' | 'zset' | 'stream'>('string');
  const [stringValue, setStringValue] = useState('');
  const [ttl, setTtl] = useState('');
  const [lines, setLines] = useState('');
  const [saving, setSaving] = useState(false);

  const buildPayload = (): CreateKeyPayload | null => {
    const parsedTtl = ttl.trim() ? Number(ttl) : undefined;
    if (ttl.trim() && (!Number.isInteger(parsedTtl) || (parsedTtl as number) <= 0)) {
      pushToast('TTL inválido.', 'error');
      return null;
    }
    const ttlSeconds = parsedTtl;
    if (!key.trim()) { pushToast('Informe o nome da chave.', 'error'); return null; }
    const cleanKey = key.trim();

    switch (type) {
      case 'string':
        return ttlSeconds !== undefined
          ? { key: cleanKey, type: 'string', value: stringValue, ttlSeconds }
          : { key: cleanKey, type: 'string', value: stringValue };
      case 'hash': {
        const fields: Record<string, string> = {};
        for (const line of lines.split('\n')) {
          const sep = line.indexOf('=');
          if (sep <= 0) continue;
          fields[line.slice(0, sep).trim()] = line.slice(sep + 1);
        }
        if (Object.keys(fields).length === 0) { pushToast('Informe ao menos um campo (campo=valor).', 'error'); return null; }
        return ttlSeconds !== undefined
          ? { key: cleanKey, type: 'hash', fields, ttlSeconds }
          : { key: cleanKey, type: 'hash', fields };
      }
      case 'list': {
        const values = lines.split('\n').map((v) => v.trim()).filter(Boolean);
        if (values.length === 0) { pushToast('Informe ao menos um elemento.', 'error'); return null; }
        return ttlSeconds !== undefined
          ? { key: cleanKey, type: 'list', values, ttlSeconds }
          : { key: cleanKey, type: 'list', values };
      }
      case 'set': {
        const members = lines.split('\n').map((v) => v.trim()).filter(Boolean);
        if (members.length === 0) { pushToast('Informe ao menos um membro.', 'error'); return null; }
        return ttlSeconds !== undefined
          ? { key: cleanKey, type: 'set', members, ttlSeconds }
          : { key: cleanKey, type: 'set', members };
      }
      case 'zset': {
        const members: Array<{ member: string; score: number }> = [];
        for (const line of lines.split('\n')) {
          const sep = line.lastIndexOf('=');
          if (sep <= 0) continue;
          const score = Number(line.slice(sep + 1));
          if (!Number.isFinite(score)) continue;
          members.push({ member: line.slice(0, sep).trim(), score });
        }
        if (members.length === 0) { pushToast('Formato: membro=score (um por linha).', 'error'); return null; }
        return ttlSeconds !== undefined
          ? { key: cleanKey, type: 'zset', members, ttlSeconds }
          : { key: cleanKey, type: 'zset', members };
      }
      case 'stream': {
        const fields: Record<string, string> = {};
        for (const line of lines.split('\n')) {
          const sep = line.indexOf('=');
          if (sep <= 0) continue;
          fields[line.slice(0, sep).trim()] = line.slice(sep + 1);
        }
        if (Object.keys(fields).length === 0) { pushToast('Informe ao menos um campo.', 'error'); return null; }
        return ttlSeconds !== undefined
          ? { key: cleanKey, type: 'stream', fields, ttlSeconds }
          : { key: cleanKey, type: 'stream', fields };
      }
    }
  };

  const handleCreate = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setSaving(true);
    try {
      await keysApi.create(connectionId, payload);
      pushToast('Chave criada.', 'success');
      setKey('');
      setStringValue('');
      setLines('');
      setTtl('');
      onCreated(payload.key);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erro ao criar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nova chave">
      <div className="flex flex-col gap-4">
        <Input label="Nome da chave *" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Ex.: usuario:1" />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="create-type" className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo</label>
          <select
            id="create-type"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            <option value="string">STRING</option>
            <option value="hash">HASH</option>
            <option value="list">LIST</option>
            <option value="set">SET</option>
            <option value="zset">SORTED SET</option>
            <option value="stream">STREAM</option>
          </select>
        </div>

        {type === 'string' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="create-string-value" className="text-sm font-medium text-slate-700 dark:text-slate-300">Valor</label>
            <textarea id="create-string-value" value={stringValue} onChange={(e) => setStringValue(e.target.value)} rows={4} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-800" />
          </div>
        )}

        {type !== 'string' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="create-lines" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {type === 'hash' && 'Campos (campo=valor, um por linha)'}
              {type === 'list' && 'Elementos (um por linha)'}
              {type === 'set' && 'Membros (um por linha)'}
              {type === 'zset' && 'Membros (membro=score, um por linha)'}
              {type === 'stream' && 'Campos (campo=valor, um por linha)'}
            </label>
            <textarea id="create-lines" value={lines} onChange={(e) => setLines(e.target.value)} rows={4} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-800" />
          </div>
        )}

        <Input label="TTL (segundos, opcional)" type="number" min={1} value={ttl} onChange={(e) => setTtl(e.target.value)} placeholder="Deixar vazio = sem expiração" />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => void handleCreate()} disabled={saving || !key.trim()}>
            {saving ? 'Criando...' : 'Criar chave'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
