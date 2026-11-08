import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Criptografia AES-256-GCM para credenciais Redis persistidas.
 * Chave: 32 bytes em hex (64 caracteres) via ENCRYPTION_KEY.
 * Formato: base64(iv).base64(authTag).base64(ciphertext)
 */
const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getKey(envKey: string | undefined): Buffer {
  if (!envKey) {
    throw new Error('ENCRYPTION_KEY não configurada. Defina 32 bytes em hex (64 caracteres) para criptografar credenciais.');
  }
  const key = Buffer.from(envKey, 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY deve ter exatamente 32 bytes (64 caracteres hex).');
  }
  return key;
}

export function encryptValue(plaintext: string, envKey: string | undefined): string {
  if (plaintext.length === 0) return '';
  const key = getKey(envKey);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv, { authTagLength: TAG_BYTES });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptValue(payload: string, envKey: string | undefined): string {
  if (payload.length === 0) return '';
  const key = getKey(envKey);
  const parts = payload.split('.');
  if (parts.length !== 3) throw new Error('Payload criptografado inválido.');
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64 as string, 'base64');
  const tag = Buffer.from(tagB64 as string, 'base64');
  const data = Buffer.from(dataB64 as string, 'base64');
  const decipher = createDecipheriv(ALGO, key, iv, { authTagLength: TAG_BYTES });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

/** Gera uma chave nova para documentar/documentação de setup. */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex');
}
