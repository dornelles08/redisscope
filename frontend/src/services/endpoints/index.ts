import { apiFetch } from '@/services/api-client';
import type {
  Connection,
  ConnectionStatus,
  CreateConnectionInput,
  CreateKeyPayload,
  InfoResponse,
  KeyDetail,
  ListKeysParams,
  ListKeysResponse,
  LoginInput,
  LoginResponse,
  MonitoringSummary,
  TestConnectionResult,
  UpdateConnectionInput,
} from '@/types/api';

export const authApi = {
  login: (input: LoginInput) => apiFetch<LoginResponse>('/api/auth/login', { method: 'POST', body: input }),
  logout: () => apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  me: () => apiFetch<{ username: string }>('/api/auth/me'),
};

export const connectionsApi = {
  list: () => apiFetch<{ connections: Connection[] }>('/api/connections'),
  get: (id: string) => apiFetch<Connection>(`/api/connections/${encodeURIComponent(id)}`),
  create: (input: CreateConnectionInput) => apiFetch<Connection>('/api/connections', { method: 'POST', body: input }),
  update: (id: string, input: UpdateConnectionInput) =>
    apiFetch<Connection>(`/api/connections/${encodeURIComponent(id)}`, { method: 'PUT', body: input }),
  remove: (id: string) => apiFetch<void>(`/api/connections/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  test: (id: string) => apiFetch<TestConnectionResult>(`/api/connections/${encodeURIComponent(id)}/test`, { method: 'POST' }),
  connect: (id: string) => apiFetch<ConnectionStatus>(`/api/connections/${encodeURIComponent(id)}/connect`, { method: 'POST' }),
  disconnect: (id: string) =>
    apiFetch<ConnectionStatus>(`/api/connections/${encodeURIComponent(id)}/disconnect`, { method: 'POST' }),
  status: (id: string) => apiFetch<ConnectionStatus>(`/api/connections/${encodeURIComponent(id)}/status`),
};

function k(id: string, key: string): string {
  return `/api/connections/${encodeURIComponent(id)}/keys/${encodeURIComponent(key)}`;
}

export const keysApi = {
  list: (id: string, params: ListKeysParams) => {
    const q = new URLSearchParams();
    if (params.cursor) q.set('cursor', params.cursor);
    if (params.count) q.set('count', String(params.count));
    if (params.match) q.set('match', params.match);
    if (params.type) q.set('type', params.type);
    const suffix = q.toString() ? `?${q.toString()}` : '';
    return apiFetch<ListKeysResponse>(`/api/connections/${encodeURIComponent(id)}/keys${suffix}`);
  },
  get: (id: string, key: string, query?: Record<string, string | number>) => {
    const q = new URLSearchParams();
    if (query) for (const [kk, vv] of Object.entries(query)) if (vv !== undefined) q.set(kk, String(vv));
    const suffix = q.toString() ? `?${q.toString()}` : '';
    return apiFetch<KeyDetail>(`${k(id, key)}${suffix}`);
  },
  create: (id: string, payload: CreateKeyPayload) =>
    apiFetch<KeyDetail>(`/api/connections/${encodeURIComponent(id)}/keys`, { method: 'POST', body: payload }),
  updateString: (id: string, key: string, body: { value: string; ttlSeconds?: number }) =>
    apiFetch<KeyDetail>(k(id, key), { method: 'PUT', body }),
  remove: (id: string, key: string) => apiFetch<{ deleted: boolean }>(k(id, key), { method: 'DELETE' }),
  rename: (id: string, key: string, newKey: string) =>
    apiFetch<KeyDetail>(`${k(id, key)}/rename`, { method: 'POST', body: { newKey } }),
  duplicate: (id: string, key: string, newKey: string) =>
    apiFetch<KeyDetail>(`${k(id, key)}/duplicate`, { method: 'POST', body: { newKey } }),
  getTtl: (id: string, key: string) => apiFetch<{ key: string; ttl: number }>(`${k(id, key)}/ttl`),
  setTtl: (id: string, key: string, ttlSeconds: number) =>
    apiFetch<{ key: string; ttl: number }>(`${k(id, key)}/ttl`, { method: 'PUT', body: { ttlSeconds } }),
  persist: (id: string, key: string) => apiFetch<{ key: string; ttl: number }>(`${k(id, key)}/ttl`, { method: 'DELETE' }),
  hashUpsert: (id: string, key: string, fields: Record<string, string>) =>
    apiFetch<KeyDetail>(`${k(id, key)}/hash`, { method: 'POST', body: { fields } }),
  hashDelete: (id: string, key: string, fields: string[]) =>
    apiFetch<KeyDetail | { deleted: true }>(`${k(id, key)}/hash`, { method: 'DELETE', body: { fields } }),
  listPush: (id: string, key: string, side: 'left' | 'right', values: string[]) =>
    apiFetch<KeyDetail>(`${k(id, key)}/list`, { method: 'POST', body: { side, values } }),
  listSet: (id: string, key: string, index: number, value: string) =>
    apiFetch<KeyDetail>(`${k(id, key)}/list/${index}`, { method: 'PUT', body: { value } }),
  listDelete: (id: string, key: string, index: number) =>
    apiFetch<KeyDetail | { deleted: true }>(`${k(id, key)}/list/${index}`, { method: 'DELETE' }),
  setAdd: (id: string, key: string, members: string[]) =>
    apiFetch<KeyDetail>(`${k(id, key)}/set`, { method: 'POST', body: { members } }),
  setRemove: (id: string, key: string, members: string[]) =>
    apiFetch<KeyDetail | { deleted: true }>(`${k(id, key)}/set`, { method: 'DELETE', body: { members } }),
  zsetUpsert: (id: string, key: string, members: Array<{ member: string; score: number }>) =>
    apiFetch<KeyDetail>(`${k(id, key)}/zset`, { method: 'POST', body: { members } }),
  zsetRemove: (id: string, key: string, members: string[]) =>
    apiFetch<KeyDetail | { deleted: true }>(`${k(id, key)}/zset`, { method: 'DELETE', body: { members } }),
  streamAdd: (id: string, key: string, fields: Record<string, string>, streamId?: string) =>
    apiFetch<KeyDetail>(`${k(id, key)}/stream`, { method: 'POST', body: { fields, id: streamId } }),
};

export const monitoringApi = {
  info: (id: string) => apiFetch<InfoResponse>(`/api/connections/${encodeURIComponent(id)}/info`),
  monitoring: (id: string) => apiFetch<MonitoringSummary>(`/api/connections/${encodeURIComponent(id)}/monitoring`),
  stats: (id: string) => apiFetch<MonitoringSummary>(`/api/connections/${encodeURIComponent(id)}/monitoring`),
};

export { commandsApi } from './commands';
