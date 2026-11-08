import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { encryptValue, decryptValue } from '../../infrastructure/encryption/crypto.js';

export interface StoredConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username?: string;
  /** Senha criptografada (AES-GCM) — nunca retornar ao frontend */
  encryptedPassword?: string;
  database: number;
  tls: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicConnection {
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

export function toPublic(c: StoredConnection): PublicConnection {
  return {
    id: c.id,
    name: c.name,
    host: c.host,
    port: c.port,
    username: c.username,
    hasPassword: Boolean(c.encryptedPassword),
    database: c.database,
    tls: c.tls,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

/**
 * Repositório em arquivo JSON com escrita atômica (temp + rename).
 * Não exige banco externo — persiste em volume Docker.
 */
export class ConnectionsRepository {
  private filePath: string;
  private cache: StoredConnection[] | null = null;

  constructor(dataDir: string, fileName: string) {
    this.filePath = join(dataDir, fileName);
  }

  async list(): Promise<StoredConnection[]> {
    if (this.cache) return this.cache;
    try {
      const raw = await readFile(this.filePath, 'utf8');
      if (!raw.trim()) {
        this.cache = [];
        return this.cache;
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        this.cache = [];
        return this.cache;
      }
      this.cache = parsed as StoredConnection[];
      return this.cache;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        this.cache = [];
        return this.cache;
      }
      throw err;
    }
  }

  async getById(id: string): Promise<StoredConnection | undefined> {
    const all = await this.list();
    return all.find((c) => c.id === id);
  }

  async create(connection: StoredConnection): Promise<void> {
    const all = await this.list();
    all.push(connection);
    await this.persist(all);
  }

  async update(id: string, connection: StoredConnection): Promise<void> {
    const all = await this.list();
    const idx = all.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Conexão ${id} não encontrada`);
    all[idx] = connection;
    await this.persist(all);
  }

  async remove(id: string): Promise<boolean> {
    const all = await this.list();
    const idx = all.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    all.splice(idx, 1);
    await this.persist(all);
    return true;
  }

  async decryptPasswordForUse(stored: StoredConnection, envKey: string | undefined): Promise<string | undefined> {
    if (!stored.encryptedPassword) return undefined;
    return decryptValue(stored.encryptedPassword, envKey);
  }

  encryptPassword(password: string | undefined, envKey: string | undefined): string | undefined {
    if (!password) return undefined;
    return encryptValue(password, envKey);
  }

  private async persist(all: StoredConnection[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp-${process.pid}`;
    await writeFile(tmp, JSON.stringify(all, null, 2), 'utf8');
    await rename(tmp, this.filePath);
    this.cache = all;
  }
}
