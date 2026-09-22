import type { SavedRoom } from '@/types/room';

const KEY = 'mg.history.rooms';

export type LocalSavedRoom = {
  code: string;
  name: string;
  savedAt: number;
};

function read(): LocalSavedRoom[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        if (!row || typeof row !== 'object') return null;
        const item = row as { code?: unknown; name?: unknown; savedAt?: unknown };
        const code = typeof item.code === 'string' ? item.code.trim().toUpperCase() : '';
        if (code.length !== 6) return null;
        return {
          code,
          name: typeof item.name === 'string' && item.name.trim() ? item.name.trim().slice(0, 80) : code,
          savedAt: typeof item.savedAt === 'number' ? item.savedAt : Date.now(),
        };
      })
      .filter((row): row is LocalSavedRoom => Boolean(row));
  } catch {
    return [];
  }
}

export function loadLocalHistory(): LocalSavedRoom[] {
  return read();
}

export function localHistoryCodes(): string[] {
  return read().map((row) => row.code);
}

export function rememberLocalRoom(code: string, name: string) {
  if (typeof localStorage === 'undefined') return;
  const normalized = code.trim().toUpperCase();
  if (normalized.length !== 6) return;
  const label = name.trim().slice(0, 80) || normalized;
  const rows = read().filter((row) => row.code !== normalized);
  rows.unshift({ code: normalized, name: label, savedAt: Date.now() });
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 40)));
}

export function stubSavedRoom(row: LocalSavedRoom): SavedRoom {
  return {
    code: row.code,
    name: row.name,
    created: new Date(row.savedAt),
    hostId: '',
    memberCount: 0,
    topicsDebated: 0,
    verdictsReached: 0,
    weekStreak: 0,
    pastTopics: [],
    pending: true,
  };
}
