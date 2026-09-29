import type { Entry, Seat } from '@/types/room';

export function entryBelongsToSeat(entry: Pick<Entry, 'authorId' | 'seatId'>, seat: Pick<Seat, 'id'>) {
  if (entry.seatId) return entry.seatId === seat.id;
  return entry.authorId === seat.id;
}

export function seatEntryCount(entries: Entry[], seat: Pick<Seat, 'id'> | null) {
  if (!seat) return 0;
  return entries.filter((entry) => entryBelongsToSeat(entry, seat)).length;
}

export function seatsThatShared(seats: Seat[], entries: Entry[]) {
  return seats.filter((seat) => entries.some((entry) => entryBelongsToSeat(entry, seat))).length;
}

export function thoughtCount(entries: Pick<Entry, 'text'>[]) {
  return entries.filter((entry) => entry.text.trim().length > 0).length;
}

export const VOTE_UNLOCK_SEATS = 2;

export function sharingSeatCount(entries: Pick<Entry, 'authorId' | 'seatId' | 'text'>[]) {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (!entry.text.trim()) continue;
    ids.add(entry.seatId || entry.authorId);
  }
  return ids.size;
}

export function votingUnlocked(entries: Pick<Entry, 'authorId' | 'seatId' | 'text'>[]) {
  return sharingSeatCount(entries) >= VOTE_UNLOCK_SEATS;
}

export function mergeLiveEntries(prev: Entry[], incoming: Entry[]) {
  const ids = new Set(incoming.map((row) => row.id));
  const pending = prev.filter((row) => !ids.has(row.id));
  return pending.length ? [...incoming, ...pending] : incoming;
}

export function ownEntryIdsForSeat(entries: Entry[], seatId: string | null) {
  if (!seatId) return new Set<string>();
  return new Set(entries.filter((entry) => entryBelongsToSeat(entry, { id: seatId })).map((entry) => entry.id));
}

export function cardOwnedBySeat(card: { sourceEntryIds?: string[] }, ownEntryIds: Set<string>) {
  return Boolean(card.sourceEntryIds?.some((id) => ownEntryIds.has(id)));
}

export function votableCardIdsForSeat(
  cards: { id: string; sourceEntryIds?: string[] }[],
  entries: Entry[],
  seatId: string | null,
) {
  const own = ownEntryIdsForSeat(entries, seatId);
  return cards.filter((card) => !cardOwnedBySeat(card, own)).map((card) => card.id);
}
