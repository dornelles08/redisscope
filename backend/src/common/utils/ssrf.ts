/**
 * Proteção SSRF — validação de destino Redis.
 *
 * Política (v1):
 * - Se ALLOWED_HOSTS definido (comma-separated): apenas esses hosts são permitidos (host ou host:porta).
 * - Caso contrário: bloqueia IPs loopback/link-local/unspecified e metadata cloud (169.254.169.254),
 *   mas PERMITE redes privadas (192.168.x.x, 10.x.x.x, 172.16-31.x.x) e hostnames (docker networks, LAN).
 */
export function isHostAllowed(host: string, allowedHostsRaw: string): boolean {
  const hostClean = host.trim().toLowerCase();
  if (!hostClean) return false;

  const allowed = allowedHostsRaw
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length > 0) {
    return allowed.some((a) => a === hostClean || a === hostClean);
  }

  // Sem allowlist explícita: bloqueia apenas categorias proibidas
  if (isIPv4(hostClean)) return !isProhibitedIPv4(hostClean);
  if (isIPv6OrMapped(hostClean)) return !isProhibitedIPv6(hostClean);
  // Hostname: permitir (ex.: redis, redis-local, host.docker.internal, DNS da LAN)
  // Bloqueia apenas metadata cloud por hostname comum
  const blockedNames = new Set(['metadata.google.internal', 'metadata.google', 'instance-data']);
  return !blockedNames.has(hostClean);
}

function isIPv4(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function isProhibitedIPv4(ip: string): boolean {
  const octets = ip.split('.').map(Number);
  const [a, b] = octets;
  if (octets.some((o) => o < 0 || o > 255)) return true;
  // 0.0.0.0/8, 127.0.0.0/8 (loopback), 169.254.0.0/16 (link-local + metadata 169.254.169.254), 255.255.255.255
  if ((a === 0 && b === 0 && octets[2] === 0 && octets[3] === 0) || a === 0) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 255 && b === 255 && octets[2] === 255 && octets[3] === 255) return true;
  return false;
}

function isIPv6OrMapped(host: string): boolean {
  return host.includes(':');
}

function isProhibitedIPv6(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === '::' || h === '::1') return true;
  if (h.startsWith('fe80:') || h.startsWith('fc00:') || h.startsWith('fd00:')) return true;
  // IPv4-mapped IPv6 ::ffff:x.x.x.x
  const mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isProhibitedIPv4(mapped[1] as string);
  return false;
}

export function assertHostAllowed(host: string, allowedHostsRaw: string): void {
  if (!isHostAllowed(host, allowedHostsRaw)) {
    throw new Error('Destino Redis não permitido pela política de segurança.');
  }
}
