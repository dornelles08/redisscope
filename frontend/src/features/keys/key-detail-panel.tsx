import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Copy, Trash2, Pencil, Plus, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { pushToast } from '@/components/ui/toast';
import { keysApi } from '@/services/endpoints';
import { formatTtl } from '@/lib/format';
import type { KeyDetail } from '@/types/api';

interface DetailPanelProps {
  connectionId: string;
  detail: KeyDetail | undefined;
  isLoading: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function KeyDetailPanel({ connectionId, detail, isLoading, onClose, onRefresh }: DetailPanelProps) {
  const queryClient = useQueryClient();
  const [ttlInput, setTtlInput] = useState('');
  const [showTtl, setShowTtl] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [renameTo, setRenameTo] = useState('');
  const [showRename, setShowRename] = useState(false);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['keys'] });
    void queryClient.invalidateQueries({ queryKey: ['key-detail'] });
  };

  if (!detail && !isLoading) return null;

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      pushToast(`${label} copiado.`, 'success');
    } catch {
      pushToast('Erro ao copiar.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!detail) return;
    try {
      await keysApi.remove(connectionId, detail.key);
      pushToast('Chave excluída.', 'success');
      invalidate();
      onClose();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erro ao excluir.', 'error');
    }
  };

  const handleRename = async () => {
    if (!detail || !renameTo.trim()) return;
    try {
      await keysApi.rename(connectionId, detail.key, renameTo.trim());
      pushToast('Chave renomeada.', 'success');
      invalidate();
      onClose();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erro ao renomear.', 'error');
    }
  };

  const handleDuplicate = async () => {
    if (!detail) return;
    const newKey = `${detail.key}:copy`;
    try {
      await keysApi.duplicate(connectionId, detail.key, newKey);
      pushToast(`Duplicada como "${newKey}".`, 'success');
      invalidate();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erro ao duplicar.', 'error');
    }
  };

  const handleSetTtl = async () => {
    if (!detail) return;
    const seconds = Number(ttlInput);
    if (!Number.isInteger(seconds) || seconds <= 0) {
      pushToast('TTL deve ser um inteiro positivo (segundos).', 'error');
      return;
    }
    try {
      await keysApi.setTtl(connectionId, detail.key, seconds);
      pushToast('TTL atualizado.', 'success');
      setShowTtl(false);
      setTtlInput('');
      onRefresh();
      invalidate();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erro ao definir TTL.', 'error');
    }
  };

  const handlePersist = async () => {
    if (!detail) return;
    try {
      await keysApi.persist(connectionId, detail.key);
      pushToast('TTL removido (persistente).', 'success');
      onRefresh();
      invalidate();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erro ao remover TTL.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-label="Detalhe da chave">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-xl dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="min-w-0">
            <h2 className="truncate font-mono text-base font-semibold" title={detail?.key}>{detail?.key ?? '...'}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {detail ? `${detail.type} · DB ${detail.database} · TTL: ${formatTtl(detail.ttl)}` : 'Carregando...'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Fechar detalhe">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading || !detail ? (
            <p className="text-sm text-slate-500">Carregando dados da chave...</p>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Ações */}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void copy(detail.key, 'Nome da chave')}>
                  <Copy className="h-4 w-4" /> Copiar nome
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowRename((s) => !s)}>
                  <Pencil className="h-4 w-4" /> Renomear
                </Button>
                <Button size="sm" variant="outline" onClick={() => void handleDuplicate()}>
                  Duplicar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowTtl((s) => !s)}>
                  TTL
                </Button>
                {detail.ttl > 0 && (
                  <Button size="sm" variant="outline" onClick={() => void handlePersist()}>
                    Remover TTL
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={onRefresh}>
                  Atualizar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setDeleting(true)} className="ml-auto">
                  <Trash2 className="h-4 w-4" /> Excluir
                </Button>
              </div>

              {showRename && (
                <div className="flex gap-2">
                  <Input value={renameTo} onChange={(e) => setRenameTo(e.target.value)} placeholder="Novo nome..." />
                  <Button size="sm" onClick={() => void handleRename()} disabled={!renameTo.trim()}>
                    Salvar
                  </Button>
                </div>
              )}

              {showTtl && (
                <div className="flex gap-2">
                  <Input type="number" min={1} value={ttlInput} onChange={(e) => setTtlInput(e.target.value)} placeholder="Segundos" />
                  <Button size="sm" onClick={() => void handleSetTtl()} disabled={!ttlInput}>
                    Definir
                  </Button>
                </div>
              )}

              <TypeEditor connectionId={connectionId} detail={detail} onChanged={() => { onRefresh(); invalidate(); }} />
            </div>
          )}
        </div>

        <ConfirmDialog
          open={deleting}
          onClose={() => setDeleting(false)}
          onConfirm={handleDelete}
          title="Excluir chave?"
          description={`A chave "${detail?.key}" será excluída permanentemente. Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
        />
      </div>
    </div>
  );
}

function TypeEditor({ connectionId, detail, onChanged }: { connectionId: string; detail: KeyDetail; onChanged: () => void }) {
  if (detail.type === 'string') {
    return <StringEditor connectionId={connectionId} detail={detail as unknown as KeyDetail & { value: string; size?: number }} onChanged={onChanged} />;
  }
  if (detail.type === 'hash') {
    return <HashEditor connectionId={connectionId} detail={detail as unknown as KeyDetail & { fields: Array<{ field: string; value: string }>; totalFields?: number; cursor?: string; done?: boolean }} onChanged={onChanged} />;
  }
  if (detail.type === 'list') {
    return <ListEditor connectionId={connectionId} detail={detail as unknown as KeyDetail & { items: string[]; totalLength?: number; range?: { start: number; stop: number } }} onChanged={onChanged} />;
  }
  if (detail.type === 'set') {
    return <SetEditor connectionId={connectionId} detail={detail as unknown as KeyDetail & { members: string[]; totalMembers?: number }} onChanged={onChanged} />;
  }
  if (detail.type === 'zset') {
    return <ZSetEditor connectionId={connectionId} detail={detail as unknown as KeyDetail & { members: Array<{ member: string; score: number }>; totalMembers?: number; range?: { start: number; stop: number }; order?: string }} onChanged={onChanged} />;
  }
  if (detail.type === 'stream') {
    return <StreamEditor connectionId={connectionId} detail={detail as unknown as KeyDetail & { messages: Array<{ id: string; fields: Record<string, string> }>; totalMessages?: number }} onChanged={onChanged} />;
  }
  return <p className="text-sm text-slate-500">Tipo não suportado para edição: {detail.type}</p>;
}

function StringEditor({ connectionId, detail, onChanged }: { connectionId: string; detail: KeyDetail & { value: string; size?: number }; onChanged: () => void }) {
  const [value, setValue] = useState(detail.value);
  const [saving, setSaving] = useState(false);

  const copy = async () => {
    try { await navigator.clipboard.writeText(detail.value); pushToast('Valor copiado.', 'success'); } catch { pushToast('Erro ao copiar.', 'error'); }
  };

  const save = async () => {
    setSaving(true);
    try {
      await keysApi.updateString(connectionId, detail.key, { value });
      pushToast('Valor atualizado.', 'success');
      onChanged();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erro ao salvar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Valor (STRING)</h3>
        <span className="text-xs text-slate-500">{detail.size !== undefined ? `${detail.size} bytes` : ''}</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={6}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-900"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => void save()} disabled={saving || value === detail.value}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => void copy()}>
          <Copy className="h-4 w-4" /> Copiar valor
        </Button>
      </div>
    </div>
  );
}

function HashEditor({ connectionId, detail, onChanged }: { connectionId: string; detail: KeyDetail & { fields: Array<{ field: string; value: string }>; totalFields?: number; cursor?: string; done?: boolean }; onChanged: () => void }) {
  const [newField, setNewField] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editing, setEditing] = useState<Record<string, string>>({});

  const addField = async () => {
    if (!newField.trim()) return;
    try {
      await keysApi.hashUpsert(connectionId, detail.key, { [newField]: newValue });
      pushToast('Campo adicionado.', 'success');
      setNewField('');
      setNewValue('');
      onChanged();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erro.', 'error');
    }
  };

  const saveField = async (field: string) => {
    const value = editing[field];
    if (value === undefined) return;
    try {
      await keysApi.hashUpsert(connectionId, detail.key, { [field]: value });
      pushToast('Campo atualizado.', 'success');
      setEditing((prev) => { const next = { ...prev }; delete next[field]; return next; });
      onChanged();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erro.', 'error');
    }
  };

  const deleteField = async (field: string) => {
    try {
      await keysApi.hashDelete(connectionId, detail.key, [field]);
      pushToast('Campo excluído.', 'success');
      onChanged();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erro.', 'error');
    }
  };

  const copy = async (v: string) => {
    try { await navigator.clipboard.writeText(v); pushToast('Valor copiado.', 'success'); } catch { pushToast('Erro ao copiar.', 'error'); }
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-medium">Campos ({detail.totalFields ?? detail.fields.length})</h3>
      <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800"><tr><th className="px-3 py-2 text-left">Campo</th><th className="px-3 py-2 text-left">Valor</th><th className="px-3 py-2 text-right">Ações</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {detail.fields.map((f) => (
              <tr key={f.field}>
                <td className="px-3 py-2 font-mono text-xs">{f.field}</td>
                <td className="px-3 py-2">
                  {editing[f.field] !== undefined ? (
                    <input value={editing[f.field]} onChange={(e) => setEditing((p) => ({ ...p, [f.field]: e.target.value }))} className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900" />
                  ) : (
                    <span className="font-mono text-xs break-all">{f.value}</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    {editing[f.field] !== undefined ? (
                      <Button size="sm" onClick={() => void saveField(f.field)}>Salvar</Button>
                    ) : (
                      <button type="button" onClick={() => setEditing((p) => ({ ...p, [f.field]: f.value }))} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label={`Editar ${f.field}`}><Pencil className="h-4 w-4" /></button>
                    )}
                    <button type="button" onClick={() => void copy(f.value)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Copiar valor"><Copy className="h-4 w-4" /></button>
                    <button type="button" onClick={() => void deleteField(f.field)} className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30" aria-label={`Excluir ${f.field}`}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {detail.done === false && <p className="text-xs text-slate-500">Mostrando primeiros campos. Use a busca/paginação para ver mais (cursor: {detail.cursor}).</p>}
      <div className="flex gap-2">
        <Input placeholder="Campo" value={newField} onChange={(e) => setNewField(e.target.value)} />
        <Input placeholder="Valor" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
        <Button size="sm" onClick={() => void addField()} disabled={!newField.trim()}><Plus className="h-4 w-4" /> Adicionar</Button>
      </div>
    </div>
  );
}

function ListEditor({ connectionId, detail, onChanged }: { connectionId: string; detail: KeyDetail & { items: string[]; totalLength?: number; range?: { start: number; stop: number } }; onChanged: () => void }) {
  const [page, setPage] = useState(0);
  const [newValues, setNewValues] = useState('');
  const [side, setSide] = useState<'left' | 'right'>('right');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const total = detail.totalLength ?? detail.items.length;

  const refetchPage = async (newPage: number) => {
    setPage(newPage);
    onChanged();
  };

  const push = async () => {
    const values = newValues.split('\n').map((v) => v.trim()).filter(Boolean);
    if (values.length === 0) return;
    try {
      await keysApi.listPush(connectionId, detail.key, side, values);
      pushToast('Elementos inseridos.', 'success');
      setNewValues('');
      onChanged();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erro.', 'error');
    }
  };

  const saveAt = async (index: number, value: string) => {
    try {
      await keysApi.listSet(connectionId, detail.key, index, value);
      pushToast('Elemento atualizado.', 'success');
      onChanged();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erro.', 'error');
    }
  };

  const deleteAt = async (index: number) => {
    try {
      await keysApi.listDelete(connectionId, detail.key, index);
      pushToast('Elemento removido.', 'success');
      onChanged();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erro.', 'error');
    }
  };

  const range = detail.range ?? { start: 0, stop: detail.items.length - 1 };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-medium">Elementos ({total})</h3>
      <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800"><tr><th className="px-3 py-2 text-left w-16">Índice</th><th className="px-3 py-2 text-left">Valor</th><th className="px-3 py-2 text-right">Ações</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {detail.items.map((v, i) => {
              const idx = range.start + i;
              const isEditing = editingIndex === idx;
              return (
                <tr key={idx}>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{idx}</td>
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <input value={editingValue} onChange={(e) => setEditingValue(e.target.value)} className="w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs dark:border-slate-600 dark:bg-slate-900" />
                    ) : (
                      <span className="font-mono text-xs break-all">{v}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      {isEditing ? (
                        <>
                          <Button size="sm" onClick={() => { void saveAt(idx, editingValue); setEditingIndex(null); }}>Salvar</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingIndex(null)}>Cancelar</Button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => { setEditingIndex(idx); setEditingValue(v); }} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label={`Editar índice ${idx}`}><Pencil className="h-4 w-4" /></button>
                          <button type="button" onClick={() => void deleteAt(idx)} className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30" aria-label={`Remover índice ${idx}`}><Trash2 className="h-4 w-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Página {page + 1} · {range.start}–{range.stop} de {total}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => void refetchPage(Math.max(0, page - 1))}>Anterior</Button>
          <Button size="sm" variant="outline" disabled={range.stop + 1 >= total} onClick={() => void refetchPage(page + 1)}>Próxima</Button>
        </div>
      </div>
      <div className="flex flex-col gap-2 rounded-md border border-dashed border-slate-300 p-3 dark:border-slate-600">
        <h4 className="text-sm font-medium">Inserir elementos (um por linha)</h4>
        <textarea value={newValues} onChange={(e) => setNewValues(e.target.value)} rows={3} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-900" />
        <div className="flex items-center gap-2">
          <select value={side} onChange={(e) => setSide(e.target.value as 'left' | 'right')} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900">
            <option value="right">À direita (RPUSH)</option>
            <option value="left">À esquerda (LPUSH)</option>
          </select>
          <Button size="sm" onClick={() => void push()} disabled={!newValues.trim()}>Inserir</Button>
        </div>
      </div>
    </div>
  );
}

function SetEditor({ connectionId, detail, onChanged }: { connectionId: string; detail: KeyDetail & { members: string[]; totalMembers?: number }; onChanged: () => void }) {
  const [newMembers, setNewMembers] = useState('');

  const add = async () => {
    const members = newMembers.split('\n').map((v) => v.trim()).filter(Boolean);
    if (members.length === 0) return;
    try {
      await keysApi.setAdd(connectionId, detail.key, members);
      pushToast('Membros adicionados.', 'success');
      setNewMembers('');
      onChanged();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erro.', 'error');
    }
  };

  const remove = async (m: string) => {
    try {
      await keysApi.setRemove(connectionId, detail.key, [m]);
      pushToast('Membro removido.', 'success');
      onChanged();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erro.', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-medium">Membros ({detail.totalMembers ?? detail.members.length})</h3>
      <div className="flex flex-col gap-1">
        {detail.members.map((m) => (
          <div key={m} className="flex items-center justify-between gap-2 rounded-md border border-slate-100 px-3 py-2 dark:border-slate-700">
            <span className="font-mono text-xs break-all">{m}</span>
            <button type="button" onClick={() => void remove(m)} className="shrink-0 rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30" aria-label={`Remover ${m}`}><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {detail.members.length === 0 && <p className="text-sm text-slate-500">Nenhum membro nesta página.</p>}
      </div>
      <div className="flex flex-col gap-2 rounded-md border border-dashed border-slate-300 p-3 dark:border-slate-600">
        <h4 className="text-sm font-medium">Adicionar membros (um por linha)</h4>
        <textarea value={newMembers} onChange={(e) => setNewMembers(e.target.value)} rows={3} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-900" />
        <Button size="sm" onClick={() => void add()} disabled={!newMembers.trim()} className="self-start"><Plus className="h-4 w-4" /> Adicionar</Button>
      </div>
    </div>
  );
}

function ZSetEditor({ connectionId, detail, onChanged }: { connectionId: string; detail: KeyDetail & { members: Array<{ member: string; score: number }>; totalMembers?: number; range?: { start: number; stop: number }; order?: string }; onChanged: () => void }) {
  const [order, setOrder] = useState<'desc' | 'asc'>(detail.order === 'asc' ? 'asc' : 'desc');
  const [newMember, setNewMember] = useState('');
  const [newScore, setNewScore] = useState('');
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editingScore, setEditingScore] = useState('');

  const add = async () => {
    const score = Number(newScore);
    if (!newMember.trim() || !Number.isFinite(score)) return;
    try {
      await keysApi.zsetUpsert(connectionId, detail.key, [{ member: newMember.trim(), score }]);
      pushToast('Membro adicionado.', 'success');
      setNewMember('');
      setNewScore('');
      onChanged();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erro.', 'error');
    }
  };

  const editScore = async (member: string) => {
    const score = Number(editingScore);
    if (!Number.isFinite(score)) {
      pushToast('Score deve ser um número.', 'error');
      return;
    }
    try {
      await keysApi.zsetUpsert(connectionId, detail.key, [{ member, score }]);
      pushToast('Score atualizado.', 'success');
      setEditingMember(null);
      onChanged();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erro.', 'error');
    }
  };

  const remove = async (member: string) => {
    try {
      await keysApi.zsetRemove(connectionId, detail.key, [member]);
      pushToast('Membro removido.', 'success');
      onChanged();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erro.', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Membros ({detail.totalMembers ?? detail.members.length})</h3>
        <Button size="sm" variant="outline" onClick={() => setOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}>
          <ArrowUpDown className="h-4 w-4" /> {order === 'desc' ? 'Maior → menor' : 'Menor → maior'}
        </Button>
      </div>
      <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800"><tr><th className="px-3 py-2 text-left">Membro</th><th className="px-3 py-2 text-right">Score</th><th className="px-3 py-2 text-right">Ações</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {detail.members.map((m) => (
              <tr key={m.member}>
                <td className="px-3 py-2 font-mono text-xs break-all">{m.member}</td>
                <td className="px-3 py-2 text-right">
                  {editingMember === m.member ? (
                    <input type="number" value={editingScore} onChange={(e) => setEditingScore(e.target.value)} className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-right font-mono text-xs dark:border-slate-600 dark:bg-slate-900" />
                  ) : (
                    <span className="font-mono text-xs">{m.score}</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    {editingMember === m.member ? (
                      <>
                        <Button size="sm" onClick={() => void editScore(m.member)}>Salvar</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingMember(null)}>Cancelar</Button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => { setEditingMember(m.member); setEditingScore(String(m.score)); }} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Editar score"><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={() => void remove(m.member)} className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30" aria-label="Remover membro"><Trash2 className="h-4 w-4" /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <Input placeholder="Membro" value={newMember} onChange={(e) => setNewMember(e.target.value)} />
        <Input placeholder="Score" type="number" value={newScore} onChange={(e) => setNewScore(e.target.value)} />
        <Button size="sm" onClick={() => void add()} disabled={!newMember.trim() || !newScore}><Plus className="h-4 w-4" /> Adicionar</Button>
      </div>
    </div>
  );
}

function StreamEditor({ connectionId, detail, onChanged }: { connectionId: string; detail: KeyDetail & { messages: Array<{ id: string; fields: Record<string, string> }>; totalMessages?: number }; onChanged: () => void }) {
  const [field, setField] = useState('');
  const [value, setValue] = useState('');

  const add = async () => {
    if (!field.trim()) return;
    try {
      await keysApi.streamAdd(connectionId, detail.key, { [field.trim()]: value });
      pushToast('Mensagem adicionada.', 'success');
      setField('');
      setValue('');
      onChanged();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Erro.', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-medium">Mensagens ({detail.totalMessages ?? detail.messages.length})</h3>
      <div className="flex flex-col gap-2">
        {detail.messages.map((msg) => (
          <div key={msg.id} className="rounded-md border border-slate-100 px-3 py-2 dark:border-slate-700">
            <p className="font-mono text-xs text-slate-500">{msg.id}</p>
            <div className="mt-1 flex flex-col gap-0.5">
              {Object.entries(msg.fields).map(([k, v]) => (
                <p key={k} className="font-mono text-xs break-all"><strong>{k}</strong>: {v}</p>
              ))}
            </div>
          </div>
        ))}
        {detail.messages.length === 0 && <p className="text-sm text-slate-500">Nenhuma mensagem no intervalo.</p>}
      </div>
      <div className="flex gap-2">
        <Input placeholder="Campo" value={field} onChange={(e) => setField(e.target.value)} />
        <Input placeholder="Valor" value={value} onChange={(e) => setValue(e.target.value)} />
        <Button size="sm" onClick={() => void add()} disabled={!field.trim()}><Plus className="h-4 w-4" /> Adicionar</Button>
      </div>
    </div>
  );
}
