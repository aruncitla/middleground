type VoteCard = { text: string; agreeCount: number; disagreeCount: number };
type RoomStatus = 'lobby' | 'synthesizing' | 'swiping' | 'summary' | string;

function clip(text: string) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return 'this';
  let out = '';
  for (const word of words) {
    const next = out ? `${out} ${word}` : word;
    if (next.length > 36 || next.split(' ').length > 5) break;
    out = next;
  }
  return out || words[0];
}

export function topicIsLive(status: RoomStatus | string | undefined) {
  return status === 'lobby' || status === 'synthesizing' || status === 'swiping';
}

export function topicIsArchived(status: RoomStatus | string | undefined) {
  return status === 'summary';
}

export function verdictLine(cards: VoteCard[]): string {
  const voted = cards.filter((c) => c.agreeCount + c.disagreeCount > 0);
  if (!voted.length) return 'No votes yet';

  const locked = voted
    .filter((c) => c.agreeCount > 0 && c.disagreeCount === 0)
    .sort((a, b) => b.agreeCount - a.agreeCount);
  const splits = voted
    .filter((c) => c.agreeCount > 0 && c.disagreeCount > 0)
    .sort((a, b) => b.agreeCount + b.disagreeCount - (a.agreeCount + a.disagreeCount));
  const rejected = voted.filter((c) => c.agreeCount === 0);

  const parts: string[] = [];
  if (locked[0]) {
    const total = locked[0].agreeCount + locked[0].disagreeCount;
    parts.push(`✅ Locked in: ${clip(locked[0].text)} (${locked[0].agreeCount}/${total})`);
  }
  if (splits[0]) {
    parts.push(`🤝 Split: ${clip(splits[0].text)} (${splits[0].agreeCount}/${splits[0].disagreeCount})`);
  }
  if (!parts.length && rejected[0]) {
    parts.push(`No lock-in: ${clip(rejected[0].text)}`);
  }
  return parts.join(' · ') || 'No votes yet';
}

export function weekKey(date: Date) {
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const day = new Date(utc).getUTCDay() || 7;
  const thursday = new Date(utc);
  thursday.setUTCDate(thursday.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((thursday.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function weekStreak(dates: Date[], now = new Date()) {
  const weeks = new Set(dates.map((d) => weekKey(d)));
  if (!weeks.size) return 0;
  let cursor = new Date(now);
  let streak = 0;
  for (let i = 0; i < 52; i++) {
    const key = weekKey(cursor);
    if (!weeks.has(key)) {
      if (i === 0) {
        cursor.setDate(cursor.getDate() - 7);
        continue;
      }
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}
