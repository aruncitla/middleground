import type { Seat, Vote } from '@/types/room';

type RoomSeatState = {
  activeId: string | null;
  ids: string[];
};

const PREFIX = 'mg.seats.';

function read(roomCode: string): RoomSeatState {
  if (typeof localStorage === 'undefined') return { activeId: null, ids: [] };
  try {
    const raw = localStorage.getItem(PREFIX + roomCode);
    if (!raw) return { activeId: null, ids: [] };
    const parsed = JSON.parse(raw) as RoomSeatState;
    return {
      activeId: parsed.activeId || null,
      ids: Array.isArray(parsed.ids) ? parsed.ids.filter((id) => typeof id === 'string') : [],
    };
  } catch {
    return { activeId: null, ids: [] };
  }
}

function write(roomCode: string, state: RoomSeatState) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(PREFIX + roomCode, JSON.stringify(state));
}

export function loadLocalSeats(roomCode: string) {
  return read(roomCode);
}

export function rememberSeat(roomCode: string, seatId: string, makeActive = true) {
  const current = read(roomCode);
  const ids = current.ids.includes(seatId) ? current.ids : [...current.ids, seatId];
  write(roomCode, {
    ids,
    activeId: makeActive ? seatId : current.activeId ?? seatId,
  });
}

export function setActiveSeat(roomCode: string, seatId: string) {
  const current = read(roomCode);
  const ids = current.ids.includes(seatId) ? current.ids : [...current.ids, seatId];
  write(roomCode, { ids, activeId: seatId });
}

export function matchSeat(seats: Seat[], name: string, avatarId: string) {
  const key = name.trim().toLowerCase();
  return seats.find((s) => s.displayName.trim().toLowerCase() === key && s.avatarId === avatarId) ?? null;
}

export function voterId(vote: Pick<Vote, 'uid' | 'seatId'>) {
  return vote.seatId || vote.uid;
}

export function voteBelongsToSeat(vote: Vote, seat: Seat | null, uid?: string) {
  if (!seat) return false;
  if (vote.seatId) return vote.seatId === seat.id;
  return Boolean(uid) && vote.uid === uid && seat.id === uid;
}
