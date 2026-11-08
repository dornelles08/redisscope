import { timingSafeEqual } from 'node:crypto';
import { createHmac, randomBytes } from 'node:crypto';

/**
 * Auth JWT HS256 minimalista (sem dependência extra).
 * Payload: { sub: username, iat, exp }
 */
export interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
}

export class AuthService {
  constructor(
    private readonly username: string,
    private readonly password: string,
    private readonly secret: string,
    private readonly expirySeconds: number,
  ) {}

  verifyCredentials(username: string, password: string): boolean {
    const userOk = safeEqual(username, this.username);
    const passOk = safeEqual(password, this.password);
    // Compara ambos sempre para não vazar por timing
    return userOk && passOk;
  }

  signToken(username: string): { token: string; expiresAt: string } {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.expirySeconds;
    const payload: JwtPayload = { sub: username, iat: now, exp };
    const headerB64 = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payloadB64 = base64UrlEncode(JSON.stringify(payload));
    const data = `${headerB64}.${payloadB64}`;
    const signature = sign(data, this.secret);
    return { token: `${data}.${signature}`, expiresAt: new Date(exp * 1000).toISOString() };
  }

  verifyToken(token: string): JwtPayload {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Token inválido.');
    const [headerB64, payloadB64, sig] = parts;
    const data = `${headerB64}.${payloadB64}`;
    const expected = sign(data, this.secret);
    if (!safeEqual(sig as string, expected)) throw new Error('Assinatura inválida.');
    let payload: JwtPayload;
    try {
      payload = JSON.parse(base64UrlDecode(payloadB64 as string)) as JwtPayload;
    } catch {
      throw new Error('Payload inválido.');
    }
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp < now) throw new Error('Token expirado.');
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) throw new Error('Token inválido.');
    return payload;
  }
}

function sign(data: string, secret: string): string {
  return base64UrlEncode(createHmac('sha256', secret).update(data).digest());
}

function base64UrlEncode(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLen), 'base64').toString('utf8');
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Gera carga comparável e retorna false
    const dummy = randomBytes(Math.max(ab.length, bb.length));
    timingSafeEqual(dummy, dummy);
    return false;
  }
  return timingSafeEqual(ab, bb);
}
