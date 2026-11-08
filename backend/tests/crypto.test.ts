import { describe, it, expect } from 'vitest';
import { encryptValue, decryptValue } from '../src/infrastructure/encryption/crypto.js';

const KEY = 'a'.repeat(64); // 32 bytes hex

describe('crypto AES-GCM', () => {
  it('criptografa e descriptografa', () => {
    const secret = 'minha-senha-secreta';
    const enc = encryptValue(secret, KEY);
    expect(enc).not.toContain(secret);
    expect(decryptValue(enc, KEY)).toBe(secret);
  });

  it('retorna vazio para entrada vazia', () => {
    expect(encryptValue('', KEY)).toBe('');
    expect(decryptValue('', KEY)).toBe('');
  });
});
