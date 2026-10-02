function hashSeed(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic Fisher–Yates so each viewer gets a stable shuffle for the session. */
export function shuffleIds(ids: string[], seed: string) {
  const next = [...ids];
  let state = hashSeed(seed || 'mg');
  for (let i = next.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    const a = next[i];
    const b = next[j];
    if (a == null || b == null) continue;
    next[i] = b;
    next[j] = a;
  }
  return next;
}

export function sessionShuffleSeed(code: string) {
  if (typeof sessionStorage === 'undefined') return `${code}-local`;
  const key = `mg.shuffle.${code}`;
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const seed = `${code}-${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem(key, seed);
  return seed;
}

export function orderByIds<T extends { id: string }>(rows: T[], ids: string[]) {
  const map = new Map(rows.map((row) => [row.id, row]));
  const out: T[] = [];
  for (const id of ids) {
    const row = map.get(id);
    if (row) out.push(row);
  }
  for (const row of rows) {
    if (!ids.includes(row.id)) out.push(row);
  }
  return out;
}
