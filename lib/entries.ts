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
