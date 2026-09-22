import packsJson from '@/data/promptPacks.json';

export type TopicMode = 'debate' | 'hot-takes' | 'bracket' | 'predictions';

export type PackSeason = {
  start: string;
  end: string;
  label: string;
};

export type PromptPack = {
  id: string;
  title: string;
  emoji: string;
  blurb: string;
  mode: TopicMode;
  season: PackSeason | null;
  prompts: string[];
};

export const PROMPT_PACKS = packsJson as PromptPack[];

const DAY_MS = 24 * 60 * 60 * 1000;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function monthDayKey(date: Date) {
  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseMonthDay(md: string) {
  const [month, day] = md.split('-').map((part) => Number(part));
  return { month, day };
}

function wrapsYear(season: PackSeason) {
  return season.start > season.end;
}

export function isPackInSeason(season: PackSeason | null, now = new Date()) {
  if (!season) return false;
  const key = monthDayKey(now);
  if (wrapsYear(season)) return key >= season.start || key <= season.end;
  return key >= season.start && key <= season.end;
}

function seasonEndDate(season: PackSeason, now: Date) {
  const end = parseMonthDay(season.end);
  const start = parseMonthDay(season.start);
  let year = now.getFullYear();
  if (wrapsYear(season)) {
    const key = monthDayKey(now);
    if (key >= season.start) year += 1;
  } else if (
    now.getMonth() + 1 > end.month ||
    (now.getMonth() + 1 === end.month && now.getDate() > end.day)
  ) {
    year += 1;
  }
  void start;
  return new Date(year, end.month - 1, end.day, 23, 59, 59, 999);
}

export function seasonDaysLeft(season: PackSeason, now = new Date()) {
  if (!isPackInSeason(season, now)) return 0;
  const end = seasonEndDate(season, now);
  return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / DAY_MS));
}

export function featuredPacks(now = new Date()) {
  return PROMPT_PACKS.filter((pack) => isPackInSeason(pack.season, now));
}

export function evergreenPacks() {
  return PROMPT_PACKS.filter((pack) => !pack.season);
}

export function pastSeasonPacks(now = new Date()) {
  return PROMPT_PACKS.filter((pack) => pack.season && !isPackInSeason(pack.season, now));
}

export function seasonalBanner(pack: PromptPack, now = new Date()) {
  if (!pack.season || !isPackInSeason(pack.season, now)) return null;
  const days = seasonDaysLeft(pack.season, now);
  const unit = days === 1 ? 'day' : 'days';
  return `${pack.emoji} Seasonal: ${pack.season.label} — ${days} ${unit} left`;
}
