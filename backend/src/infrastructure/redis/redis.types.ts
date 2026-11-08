/**
 * Tipos compartilhados da infraestrutura Redis.
 * Projetado para evolução futura (Sentinel/Cluster) sem quebrar as interfaces atuais.
 */
export interface RedisConnectionConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  database: number;
  tls: boolean;
}

export type RedisConnectionState = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface RedisConnectionStatus {
  connectionId: string;
  status: RedisConnectionState;
  latencyMs?: number;
  error?: string;
}

export interface RedisTestResult {
  ok: boolean;
  latencyMs?: number;
  error?: string;
}
