import { describe, it, expect } from 'vitest';
import { isHostAllowed } from '../src/common/utils/ssrf.js';

describe('ssrf', () => {
  it('bloqueia loopback/metadata sem allowlist', () => {
    expect(isHostAllowed('127.0.0.1', '')).toBe(false);
    expect(isHostAllowed('169.254.169.254', '')).toBe(false);
    expect(isHostAllowed('::1', '')).toBe(false);
  });

  it('permite rede privada (homelab) sem allowlist', () => {
    expect(isHostAllowed('192.168.1.100', '')).toBe(true);
    expect(isHostAllowed('10.0.0.5', '')).toBe(true);
    expect(isHostAllowed('redis', '')).toBe(true);
  });

  it('respeita allowlist quando definida', () => {
    expect(isHostAllowed('redis', 'redis, redis-externo:6379')).toBe(true);
    expect(isHostAllowed('192.168.1.100', 'redis')).toBe(false);
  });
});
