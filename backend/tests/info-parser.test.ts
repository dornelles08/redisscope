import { describe, it, expect } from 'vitest';
import { parseInfo, parseNumber } from '../src/common/utils/info-parser.js';

describe('info-parser', () => {
  it('parseia seções e campos', () => {
    const raw = '# Server\r\nredis_version:7.0.0\r\nuptime_in_seconds:123\r\n\r\n# Clients\r\nconnected_clients:5\r\n';
    const sections = parseInfo(raw);
    expect(sections['server']?.['redis_version']).toBe('7.0.0');
    expect(parseNumber(sections['server']?.['uptime_in_seconds'])).toBe(123);
    expect(sections['clients']?.['connected_clients']).toBe('5');
  });

  it('ignora linhas vazias e comentários', () => {
    const raw = '# Memory\n\nused_memory:1024\n';
    const sections = parseInfo(raw);
    expect(sections['memory']?.['used_memory']).toBe('1024');
  });
});
