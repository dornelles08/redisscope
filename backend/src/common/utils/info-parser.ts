/**
 * Parser do comando INFO do Redis.
 * Não expõe dados sensíveis por si só — o frontend filtra a exibição.
 */
export type InfoSections = Record<string, Record<string, string>>;

export function parseInfo(raw: string): InfoSections {
  const sections: InfoSections = {};
  let current: string | null = null;

  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) {
      const name = trimmed.replace(/^#\s*/, '').trim().toLowerCase();
      current = name.replace(/\s+/g, '_');
      if (!sections[current]) sections[current] = {};
      continue;
    }
    const idx = trimmed.indexOf(':');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!current) current = 'geral';
    if (!sections[current]) sections[current] = {};
    (sections[current] as Record<string, string>)[key] = value;
  }

  return sections;
}

/** Obtém valor de INFO com fallback entre seções comuns. */
export function getField(sections: InfoSections, section: string, key: string): string | undefined {
  return sections[section]?.[key];
}

export function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
