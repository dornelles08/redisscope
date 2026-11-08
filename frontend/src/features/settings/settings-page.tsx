import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Loader2, Plug, Unplug, Gauge, CircleDot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { pushToast } from '@/components/ui/toast';
import { connectionsApi } from '@/services/endpoints';
import type { Connection, CreateConnectionInput, UpdateConnectionInput } from '@/types/api';
import { cn } from '@/lib/utils';

interface ConnectionFormProps {
  initial?: Connection;
  onSubmit: (input: CreateConnectionInput | UpdateConnectionInput) => Promise<unknown>;
  isSaving: boolean;
}

function ConnectionForm({ initial, onSubmit, isSaving }: ConnectionFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [host, setHost] = useState(initial?.host ?? '');
  const [port, setPort] = useState(String(initial?.port ?? 6379));
  const [username, setUsername] = useState(initial?.username ?? '');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState(String(initial?.database ?? 0));
  const [tls, setTls] = useState(initial?.tls ?? false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const portNum = Number(port);
    const dbNum = Number(database);
    if (!name.trim()) return setError('Nome é obrigatório.');
    if (!host.trim()) return setError('Host é obrigatório.');
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) return setError('Porta deve estar entre 1 e 65535.');
    if (!Number.isInteger(dbNum) || dbNum < 0 || dbNum > 15) return setError('Database deve estar entre 0 e 15.');

    const payload: CreateConnectionInput | UpdateConnectionInput = {
      name: name.trim(),
      host: host.trim(),
      port: portNum,
      username: username.trim() || undefined,
      database: dbNum,
      tls,
      ...(password ? { password } : {}),
    };
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Nome amigável *" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Redis - Local" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Host *" value={host} onChange={(e) => setHost(e.target.value)} placeholder="redis ou 192.168.1.100" />
        <Input label="Porta *" type="number" value={port} onChange={(e) => setPort(e.target.value)} min={1} max={65535} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Usuário" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="default (opcional)" />
        <Input
          label={initial ? 'Nova senha (deixar vazio para manter a atual)' : 'Senha (opcional)'}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder={initial?.hasPassword ? 'Credencial já configurada' : 'Opcional'}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Database" type="number" value={database} onChange={(e) => setDatabase(e.target.value)} min={0} max={15} />
        <label className="flex items-end gap-2 pb-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={tls} onChange={(e) => setTls(e.target.checked)} className="h-4 w-4 rounded" />
          TLS
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {initial ? 'Salvar alterações' : 'Criar conexão'}
        </Button>
      </div>
    </form>
  );
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Connection | null>(null);
  const [deleting, setDeleting] = useState<Connection | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const connectionsQuery = useQuery({ queryKey: ['connections'], queryFn: () => connectionsApi.list() });

  const createMutation = useMutation({
    mutationFn: (input: CreateConnectionInput) => connectionsApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connections'] });
      setFormOpen(false);
      pushToast('Conexão criada com sucesso.', 'success');
    },
    onError: (e) => pushToast(e instanceof Error ? e.message : 'Erro ao criar conexão.', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateConnectionInput }) => connectionsApi.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connections'] });
      setEditing(null);
      pushToast('Conexão atualizada.', 'success');
    },
    onError: (e) => pushToast(e instanceof Error ? e.message : 'Erro ao atualizar.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => connectionsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connections'] });
      void queryClient.invalidateQueries({ queryKey: ['connection-status'] });
      setDeleting(null);
      pushToast('Conexão excluída.', 'success');
    },
    onError: (e) => pushToast(e instanceof Error ? e.message : 'Erro ao excluir.', 'error'),
  });

  const handleTest = async (c: Connection) => {
    setBusyId(c.id);
    try {
      const res = await connectionsApi.test(c.id);
      if (res.ok) {
        pushToast(`Conexão "${c.name}" OK (${res.latencyMs} ms).`, 'success');
      } else {
        pushToast(`Falha ao conectar em "${c.name}": ${res.error ?? 'erro desconhecido'}`, 'error');
      }
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erro ao testar conexão.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleConnect = async (c: Connection) => {
    setBusyId(c.id);
    try {
      const res = await connectionsApi.connect(c.id);
      void queryClient.invalidateQueries({ queryKey: ['connection-status', c.id] });
      if (res.status === 'connected') {
        pushToast(`Conectado a "${c.name}" (${res.latencyMs} ms).`, 'success');
      } else {
        pushToast(`Falha ao conectar em "${c.name}": ${res.error ?? 'erro desconhecido'}`, 'error');
      }
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erro ao conectar.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDisconnect = async (c: Connection) => {
    setBusyId(c.id);
    try {
      await connectionsApi.disconnect(c.id);
      void queryClient.invalidateQueries({ queryKey: ['connection-status', c.id] });
      pushToast(`Desconectado de "${c.name}".`, 'info');
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erro ao desconectar.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const connections = connectionsQuery.data?.connections ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Conexões Redis</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Cadastre instâncias Redis externas. Credenciais são criptografadas no servidor.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> Nova conexão
        </Button>
      </div>

      {connectionsQuery.isLoading ? (
        <div data-testid="connections-loading" className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : connectionsQuery.isError ? (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          Erro ao carregar conexões: {connectionsQuery.error instanceof Error ? connectionsQuery.error.message : 'tente novamente'}
        </p>
      ) : connections.length === 0 ? (
        <EmptyState title="Nenhuma conexão cadastrada" description="Crie sua primeira conexão para inspecionar uma instância Redis." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border dark:border-dark-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nome</th>
                <th className="px-4 py-3 text-left font-medium">Host</th>
                <th className="px-4 py-3 text-left font-medium">DB</th>
                <th className="px-4 py-3 text-left font-medium">TLS</th>
                <th className="px-4 py-3 text-left font-medium">Senha</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {connections.map((c) => (
                <tr key={c.id} className="bg-white dark:bg-slate-900">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.host}:{c.port}</td>
                  <td className="px-4 py-3">{c.database}</td>
                  <td className="px-4 py-3">{c.tls ? 'Ativo' : 'Inativo'}</td>
                  <td className="px-4 py-3">{c.hasPassword ? 'Configurada' : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => void handleTest(c)}
                        disabled={busyId === c.id}
                        title="Testar conexão (PING)"
                        aria-label={`Testar conexão com ${c.name}`}
                        className="rounded-md p-2 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-700"
                      >
                        {busyId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gauge className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleConnect(c)}
                        disabled={busyId === c.id}
                        title="Conectar"
                        aria-label={`Conectar em ${c.name}`}
                        className="rounded-md p-2 text-green-600 hover:bg-green-50 disabled:opacity-50 dark:hover:bg-green-900/30"
                      >
                        <Plug className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDisconnect(c)}
                        disabled={busyId === c.id}
                        title="Desconectar"
                        aria-label={`Desconectar de ${c.name}`}
                        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-700"
                      >
                        <Unplug className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(c)}
                        title="Editar"
                        aria-label={`Editar ${c.name}`}
                        className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(c)}
                        title="Excluir"
                        aria-label={`Excluir ${c.name}`}
                        className="rounded-md p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                      >
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

      <p className={cn('flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400')}>
        <CircleDot className="h-4 w-4 shrink-0" />
        Use <strong>Testar</strong> para verificar sem conectar, <strong>Conectar</strong> para manter o cliente ativo (reutilizado pelo Key Browser e console) e <strong>Desconectar</strong> para encerrar.
      </p>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Nova conexão Redis">
        <ConnectionForm onSubmit={async (input) => createMutation.mutateAsync(input as CreateConnectionInput)} isSaving={createMutation.isPending} />
      </Modal>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing ? `Editar: ${editing.name}` : 'Editar conexão'}>
        {editing && (
          <ConnectionForm
            initial={editing}
            onSubmit={async (input) => updateMutation.mutateAsync({ id: editing.id, input })}
            isSaving={updateMutation.isPending}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => { if (deleting) await deleteMutation.mutateAsync(deleting.id); }}
        title="Excluir conexão?"
        description={`A conexão "${deleting?.name}" será excluída permanentemente. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
      />
    </div>
  );
}
