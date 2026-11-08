export interface Connection {
  id: string;
  name: string;
  host: string;
  port: number;
  username?: string;
  hasPassword: boolean;
  database: number;
  tls: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConnectionInput {
  name: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  database: number;
  tls: boolean;
}

export type UpdateConnectionInput = Partial<CreateConnectionInput>;

export type ConnectionStatusState = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface ConnectionStatus {
  connectionId: string;
  status: ConnectionStatusState;
  latencyMs?: number;
  error?: string;
}

export interface TestConnectionResult {
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: { username: string };
}

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}

// ---- Keys (Fase 3) ----
export interface KeySummary {
  key: string;
  type: string;
  ttl: number;
}

export interface ListKeysResponse {
  keys: KeySummary[];
  cursor: string;
  done: boolean;
}

export interface ListKeysParams {
  cursor?: string;
  count?: number;
  match?: string;
  type?: string;
}

export interface KeyDetailBase {
  key: string;
  type: string;
  ttl: number;
  database: number;
}

export type KeyDetail =
  | (KeyDetailBase & { value: string; size?: number })
  | (KeyDetailBase & { fields: Array<{ field: string; value: string }>; totalFields?: number; cursor?: string; done?: boolean })
  | (KeyDetailBase & { items: string[]; totalLength?: number; range?: { start: number; stop: number } })
  | (KeyDetailBase & { members: string[]; totalMembers?: number; cursor?: string; done?: boolean })
  | (KeyDetailBase & { members: Array<{ member: string; score: number }>; totalMembers?: number; range?: { start: number; stop: number }; order?: string })
  | (KeyDetailBase & { messages: Array<{ id: string; fields: Record<string, string> }>; totalMessages?: number; range?: { from: string; to: string } })
  | (KeyDetailBase & { size?: number | null; value?: undefined });

export type CreateKeyPayload =
  | { key: string; type: 'string'; value: string; ttlSeconds?: number }
  | { key: string; type: 'hash'; fields: Record<string, string>; ttlSeconds?: number }
  | { key: string; type: 'list'; values: string[]; ttlSeconds?: number }
  | { key: string; type: 'set'; members: string[]; ttlSeconds?: number }
  | { key: string; type: 'zset'; members: Array<{ member: string; score: number }>; ttlSeconds?: number }
  | { key: string; type: 'stream'; fields: Record<string, string>; ttlSeconds?: number };

// ---- Monitoring / Info (Fase 4) ----
export interface MonitoringSummary {
  version: string;
  mode: string;
  uptimeSeconds: number;
  memoryUsedBytes: number;
  memoryUsedHuman: string;
  maxMemoryBytes: number;
  maxMemoryHuman: string;
  memoryFragmentationRatio: number | null;
  keysCount: number;
  connectedClients: number;
  databasesUsed: number;
  opsPerSecond: number;
  totalCommands: number;
  hits: number;
  misses: number;
  hitRate: number | null;
  expiredKeys: number;
  evictedKeys: number;
  osMonoTicks: number | null;
}

export interface InfoResponse {
  generatedAt: string;
  sections: Record<string, Record<string, string>>;
}
