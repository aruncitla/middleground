import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import type {
  Agreement,
  Card,
  CloseReason,
  CloseWindowId,
  Entry,
  Participant,
  Room,
  RoomPreview,
  RoomStatus,
  SynthesisCard,
  Vote,
} from '@/types/room';

export const CLOSE_WINDOWS: Record<CloseWindowId, { id: CloseWindowId; label: string; ms: number }> = {
  '1h': { id: '1h', label: '1 hour', ms: 60 * 60 * 1000 },
  '1d': { id: '1d', label: '1 day', ms: 24 * 60 * 60 * 1000 },
};

export const DEFAULT_ENTRY_LIMIT = 10;
export const DECK_LIMIT = 20;

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomRoomCode() {
  return Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join(
    '',
  );
}

function roomRef(code: string) {
  return doc(getDb(), 'rooms', code);
}

export async function createRoom(
  hostId: string,
  topic: string,
  extras?: {
    round?: number;
    parentRoomId?: string;
    parentCardId?: string;
    closeWindow?: CloseWindowId;
  },
): Promise<string> {
  const trimmed = topic.trim();
  if (!trimmed) throw new Error('Topic is required');
  const window = CLOSE_WINDOWS[extras?.closeWindow ?? '1h'];

  for (let i = 0; i < 8; i++) {
    const code = randomRoomCode();
    const ref = roomRef(code);
    const snap = await getDoc(ref);
    if (snap.exists()) continue;
    await setDoc(ref, {
      topic: trimmed.slice(0, 280),
      hostId,
      status: 'lobby',
      entryLimit: DEFAULT_ENTRY_LIMIT,
      round: extras?.round ?? 1,
      createdAt: serverTimestamp(),
      closesAt: new Date(Date.now() + window.ms),
      closeWindow: window.id,
      ...(extras?.parentRoomId ? { parentRoomId: extras.parentRoomId } : {}),
      ...(extras?.parentCardId ? { parentCardId: extras.parentCardId } : {}),
    });
    return code;
  }
  throw new Error('Could not allocate a room code');
}

export async function joinRoom(code: string, uid: string, displayName: string, avatarId: string) {
  const normalized = code.trim().toUpperCase();
  const snap = await getDoc(roomRef(normalized));
  if (!snap.exists()) throw new Error('Room not found');
  const name = displayName.trim().slice(0, 40);
  if (!name) throw new Error('Pick a display name');
  const pRef = doc(getDb(), 'rooms', normalized, 'participants', uid);
  const existing = await getDoc(pRef);
  if (!existing.exists()) {
    await setDoc(pRef, {
      displayName: name,
      avatarId,
      joinedAt: serverTimestamp(),
      entryCount: 0,
      finishedSwiping: false,
    });
  }
  const room = snap.data() as Room;
  const status = room.status;
  try {
    await rememberJoinedRoom(uid, normalized, room);
  } catch {
    /* history is best-effort */
  }
  return { code: normalized, status };
}

export async function setRoomStatus(code: string, status: RoomStatus) {
  await updateDoc(roomRef(code), { status });
}

/** Returns true if this client moved the room from swiping to summary. */
export async function closeVotingIfOpen(code: string): Promise<boolean> {
  const db = getDb();
  const ref = roomRef(code);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Room not found');
    if (snap.data().status !== 'swiping') return false;
    tx.update(ref, { status: 'summary' });
    return true;
  });
}

/** Returns true if this client moved the room from lobby to synthesizing. */
export async function closeThoughts(code: string, uid: string, reason: CloseReason): Promise<boolean> {
  const db = getDb();
  const ref = roomRef(code);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Room not found');
    if (snap.data().status !== 'lobby') return false;
    tx.update(ref, {
      status: 'synthesizing',
      closedBy: uid,
      closeReason: reason,
    });
    return true;
  });
}

export async function submitEntry(code: string, uid: string, text: string) {
  const trimmed = text.trim().slice(0, 280);
  if (!trimmed) throw new Error('Write something first');
  const db = getDb();
  const rRef = roomRef(code);
  const pRef = doc(db, 'rooms', code, 'participants', uid);
  await runTransaction(db, async (tx) => {
    const roomSnap = await tx.get(rRef);
    const pSnap = await tx.get(pRef);
    if (!roomSnap.exists()) throw new Error('Room not found');
    if (!pSnap.exists()) throw new Error('Join the room first');
    const room = roomSnap.data() as Room;
    const participant = pSnap.data() as Participant;
    if (room.status !== 'lobby') throw new Error('Submissions are closed');
    const limit = typeof room.entryLimit === 'number' ? room.entryLimit : DEFAULT_ENTRY_LIMIT;
    if (participant.entryCount >= limit) throw new Error('Entry limit reached');
    const entryRef = doc(collection(db, 'rooms', code, 'entries'));
    tx.set(entryRef, { authorId: uid, text: trimmed, createdAt: serverTimestamp() });
    tx.update(pRef, { entryCount: increment(1) });
  });
}

function closeWindowMs(data: Record<string, unknown> | undefined) {
  const id = data?.closeWindow;
  if (id === '1h' || id === '1d') return CLOSE_WINDOWS[id].ms;
  return CLOSE_WINDOWS['1h'].ms;
}

function nextVoteDeadline(data: Record<string, unknown> | undefined) {
  const existing = toDate(data?.votesCloseAt);
  if (existing) return existing;
  return new Date(Date.now() + closeWindowMs(data));
}

export async function writeSynthesizedCards(code: string, cards: SynthesisCard[]) {
  const db = getDb();
  const roomSnap = await getDoc(roomRef(code));
  const roomData = roomSnap.data() as Record<string, unknown> | undefined;
  const votesCloseAt = nextVoteDeadline(roomData);
  const existing = await getDocs(collection(db, 'rooms', code, 'cards'));
  if (!existing.empty) {
    if (roomData?.status === 'synthesizing') {
      await updateDoc(roomRef(code), { status: 'swiping', votesCloseAt });
    }
    return;
  }
  const batch = writeBatch(db);
  const deck = cards.slice(0, DECK_LIMIT);
  deck.forEach((card, order) => {
    const ref = doc(collection(db, 'rooms', code, 'cards'));
    batch.set(ref, {
      text: card.text.slice(0, 280),
      kind: card.kind,
      order,
      agreeCount: 0,
      disagreeCount: 0,
      createdAt: serverTimestamp(),
    });
  });
  batch.update(roomRef(code), { status: 'swiping', votesCloseAt });
  await batch.commit();
}

export async function ensureVoteDeadline(code: string) {
  const snap = await getDoc(roomRef(code));
  if (!snap.exists()) return;
  const data = snap.data() as Record<string, unknown>;
  if (data.status !== 'swiping' || data.votesCloseAt) return;
  await updateDoc(roomRef(code), { votesCloseAt: nextVoteDeadline(data) });
}

export async function castVote(code: string, uid: string, cardId: string, choice: 'agree' | 'disagree') {
  const db = getDb();
  const voteRef = doc(db, 'rooms', code, 'votes', `${uid}_${cardId}`);
  const cardRef = doc(db, 'rooms', code, 'cards', cardId);
  await runTransaction(db, async (tx) => {
    const roomSnap = await tx.get(roomRef(code));
    const room = roomSnap.data();
    if (!room || room.status !== 'swiping') throw new Error('Voting is closed');
    const until = toDate(room.votesCloseAt);
    if (until && Date.now() > until.getTime()) throw new Error('Voting ended');
    const existing = await tx.get(voteRef);
    if (existing.exists()) {
      const prev = existing.data()?.choice as 'agree' | 'disagree';
      if (prev === choice) return;
      tx.update(voteRef, { choice });
      tx.update(cardRef, {
        [prev === 'agree' ? 'agreeCount' : 'disagreeCount']: increment(-1),
        [choice === 'agree' ? 'agreeCount' : 'disagreeCount']: increment(1),
      });
      return;
    }
    tx.set(voteRef, { uid, cardId, choice });
    tx.update(cardRef, {
      [choice === 'agree' ? 'agreeCount' : 'disagreeCount']: increment(1),
    });
  });
}

export async function markFinishedSwiping(code: string, uid: string) {
  await updateDoc(doc(getDb(), 'rooms', code, 'participants', uid), { finishedSwiping: true });
}

export async function startRoundTwo(
  parentCode: string,
  hostId: string,
  card: Card,
  people: Participant[],
) {
  const next = await createRoom(hostId, card.text, {
    round: 2,
    parentRoomId: parentCode,
    parentCardId: card.id,
  });
  const db = getDb();
  const batch = writeBatch(db);
  for (const person of people) {
    if (!person.id) continue;
    batch.set(doc(db, 'rooms', next, 'participants', person.id), {
      displayName: person.displayName.trim().slice(0, 40) || 'Guest',
      avatarId: (person.avatarId || 'fox').slice(0, 24),
      joinedAt: serverTimestamp(),
      entryCount: 0,
      finishedSwiping: false,
    });
  }
  batch.set(doc(db, 'rooms', parentCode, 'followUps', next), {
    topic: card.text.slice(0, 280),
    createdAt: serverTimestamp(),
  });
  await batch.commit();
  return next;
}

export async function recordUnanimousAgreements(opts: {
  targetCode: string;
  sourceCode: string;
  round: number;
  parentCardId?: string;
  cards: Card[];
}) {
  const unanimous = opts.cards.filter((c) => c.agreeCount > 0 && c.disagreeCount === 0);
  if (!unanimous.length) return;
  const db = getDb();
  const batch = writeBatch(db);
  for (const card of unanimous) {
    const id = `${opts.sourceCode}_${card.id}`;
    batch.set(
      doc(db, 'rooms', opts.targetCode, 'agreements', id),
      {
        text: card.text.slice(0, 280),
        sourceRoomId: opts.sourceCode,
        sourceCardId: card.id,
        round: opts.round,
        createdAt: serverTimestamp(),
        ...(opts.parentCardId ? { parentCardId: opts.parentCardId } : {}),
      },
      { merge: true },
    );
  }
  await batch.commit();
}

function mapRoom(id: string, data: Record<string, unknown>): Room {
  const closeReason = data.closeReason;
  return {
    id,
    topic: String(data.topic ?? ''),
    hostId: String(data.hostId ?? ''),
    status: data.status as RoomStatus,
    entryLimit: typeof data.entryLimit === 'number' ? data.entryLimit : DEFAULT_ENTRY_LIMIT,
    round: typeof data.round === 'number' ? data.round : 1,
    parentRoomId: data.parentRoomId ? String(data.parentRoomId) : undefined,
    parentCardId: data.parentCardId ? String(data.parentCardId) : undefined,
    closesAt: toDate(data.closesAt) ?? undefined,
    votesCloseAt: toDate(data.votesCloseAt) ?? undefined,
    closeWindow: data.closeWindow === '1h' || data.closeWindow === '1d' ? data.closeWindow : undefined,
    closedBy: data.closedBy ? String(data.closedBy) : undefined,
    closeReason: closeReason === 'manual' || closeReason === 'timeout' ? closeReason : undefined,
  };
}

export function subscribeRoom(code: string, cb: (room: Room | null) => void): Unsubscribe {
  return onSnapshot(roomRef(code), (snap) => {
    cb(snap.exists() ? mapRoom(snap.id, snap.data() as Record<string, unknown>) : null);
  });
}

export function subscribeParticipants(code: string, cb: (rows: Participant[]) => void): Unsubscribe {
  return onSnapshot(collection(getDb(), 'rooms', code, 'participants'), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Participant)));
  });
}

export function subscribeEntries(code: string, cb: (rows: Entry[]) => void): Unsubscribe {
  return onSnapshot(collection(getDb(), 'rooms', code, 'entries'), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Entry)));
  });
}

export function subscribeCards(code: string, cb: (rows: Card[]) => void): Unsubscribe {
  const q = query(collection(getDb(), 'rooms', code, 'cards'), orderBy('order', 'asc'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Card)));
  });
}

export function subscribeVotes(code: string, cb: (rows: Vote[]) => void): Unsubscribe {
  return onSnapshot(collection(getDb(), 'rooms', code, 'votes'), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vote)));
  });
}

export function subscribeAgreements(code: string, cb: (rows: Agreement[]) => void): Unsubscribe {
  return onSnapshot(collection(getDb(), 'rooms', code, 'agreements'), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Agreement)));
  });
}

function toDate(value: unknown): Date | null {
  if (!value || typeof value !== 'object') return null;
  if ('toDate' in value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate();
  }
  return null;
}

export async function rememberJoinedRoom(uid: string, code: string, room: Room) {
  const historyRef = doc(getDb(), 'users', uid, 'middlegroundRooms', code);
  const existing = await getDoc(historyRef);
  await setDoc(
    historyRef,
    {
      topic: room.topic.slice(0, 280),
      ...(room.parentRoomId ? { parentRoomId: room.parentRoomId } : {}),
      ...(existing.exists() ? {} : { joinedAt: serverTimestamp() }),
    },
    { merge: true },
  );
}

export function subscribeMyRoomCodes(uid: string, cb: (codes: string[]) => void): Unsubscribe {
  return onSnapshot(collection(getDb(), 'users', uid, 'middlegroundRooms'), (snap) => {
    cb(snap.docs.map((d) => d.id));
  });
}

export async function loadFollowUpCodes(parentCode: string): Promise<string[]> {
  const snap = await getDocs(collection(getDb(), 'rooms', parentCode, 'followUps'));
  return snap.docs.map((d) => d.id);
}

export async function loadRoomPreview(code: string): Promise<RoomPreview | null> {
  const db = getDb();
  const snap = await getDoc(roomRef(code));
  if (!snap.exists()) return null;
  const data = snap.data();
  const [people, cards, agreements] = await Promise.all([
    getDocs(collection(db, 'rooms', code, 'participants')),
    getDocs(collection(db, 'rooms', code, 'cards')),
    getDocs(collection(db, 'rooms', code, 'agreements')),
  ]);
  const texts = new Set<string>();
  for (const d of cards.docs) {
    const card = d.data() as Card;
    if (card.agreeCount > 0 && card.disagreeCount === 0 && card.text) {
      texts.add(card.text.trim().toLowerCase());
    }
  }
  for (const d of agreements.docs) {
    const text = String((d.data() as Agreement).text ?? '')
      .trim()
      .toLowerCase();
    if (text) texts.add(text);
  }
  return {
    code,
    topic: String(data.topic ?? 'Untitled'),
    people: people.size,
    agreed: texts.size,
    total: Math.max(cards.size, texts.size),
    status: data.status as RoomStatus,
    date: toDate(data.createdAt),
    parentRoomId: data.parentRoomId ? String(data.parentRoomId) : undefined,
  };
}
