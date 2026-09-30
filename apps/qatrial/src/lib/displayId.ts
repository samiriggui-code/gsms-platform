/**
 * Affichage métier des IDs — jamais d’UUID brut dans l’UI.
 * Les UUID serveur deviennent REQ-001 / TST-001 (ordre stable de la liste).
 * Les codes locaux déjà lisibles (REQ-12, TST-3) sont conservés.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isTechnicalId(id: string): boolean {
  return UUID_RE.test(id.trim());
}

export function buildCodeMap(
  items: ReadonlyArray<{ id: string }>,
  prefix: 'REQ' | 'TST',
): Map<string, string> {
  const map = new Map<string, string>();
  let seq = 1;
  for (const item of items) {
    const id = item.id;
    if (!isTechnicalId(id) && id.length <= 32) {
      map.set(id, id);
    } else {
      map.set(id, `${prefix}-${String(seq).padStart(3, '0')}`);
      seq += 1;
    }
  }
  return map;
}

export function displayCode(
  id: string,
  codeMap?: Map<string, string>,
  fallbackPrefix: 'REQ' | 'TST' = 'REQ',
): string {
  if (codeMap?.has(id)) return codeMap.get(id)!;
  if (!isTechnicalId(id) && id.length <= 32) return id;
  return `${fallbackPrefix}-…`;
}

export function truncateLabel(text: string, max = 40): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(1, max - 1))}…`;
}
