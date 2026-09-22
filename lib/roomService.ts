import {
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
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
import { matchSeat, rememberSeat } from '@/lib/seatsLocal';
import { topicIsArchived, topicIsLive, verdictLine, weekStreak } from '@/lib/verdict';
import type {
  Agreement,
  Card,
  CloseReason,
  CloseWindowId,
  Entry,
  Participant,
  Room,
  RoomKind,
  RoomPreview,
  RoomStatus,
  SavedRoom,
  Seat,
  SynthesisCard,
  TopicMode,
  TopicPreview,
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

export function randomSeatId() {
  return `s${randomRoomCode()}`;
}

export class SeatTakenError extends Error {
  seat: Seat;
  constructor(seat: Seat) {
    super('SEAT_TAKEN');
    this.name = 'SeatTakenError';
    this.seat = seat;
  }
}

export function isSeatTakenError(error: unknown): error is SeatTakenError {
  return Boolean(
    error &&
      typeof error === 'object' &&
      (error as SeatTakenError).name === 'SeatTakenError' &&
      (error as SeatTakenError).seat,
  );
}

function mapSeat(id: string, data: Record<string, unknown>): Seat {
  const claimers = data.claimerUids;
  return {
    id,
    displayName: String(data.displayName ?? 'Guest').slice(0, 40) || 'Guest',
    avatarId: String(data.avatarId ?? 'fox').slice(0, 24) || 'fox',
    claimerUids: Array.isArray(claimers)
      ? claimers.filter((uid): uid is string => typeof uid === 'string')
      : [],
  };
}

function roomRef(code: string) {
  return doc(getDb(), 'rooms', code);
}

function inferKind(extras?: {
  kind?: RoomKind;
  parentRoomId?: string;
  containerId?: string;
}): RoomKind {
  if (extras?.kind) return extras.kind;
  if (extras?.parentRoomId) return 'subtopic';
  if (extras?.containerId) return 'topic';
  return 'group';
}

export function containerCodeOf(room: Pick<Room, 'id' | 'containerId' | 'parentRoomId' | 'kind'>) {
  if (room.kind === 'group' || (!room.kind && !room.parentRoomId && !room.containerId)) return room.id;
  return room.containerId || room.parentRoomId || room.id;
}

export async function createRoom(
  hostId: string,
  topic: string,
  extras?: {
    round?: number;
    parentRoomId?: string;
    parentCardId?: string;
    closeWindow?: CloseWindowId;
    name?: string;
    kind?: RoomKind;
    containerId?: string;
    mode?: TopicMode;
  },
): Promise<string> {
  const trimmed = topic.trim();
  if (!trimmed) throw new Error('Topic is required');
  const window = CLOSE_WINDOWS[extras?.closeWindow ?? '1h'];
  const kind = inferKind(extras);
  const name = (extras?.name ?? trimmed).trim().slice(0, 80) || 'Room';

  for (let i = 0; i < 8; i++) {
    const code = randomRoomCode();
    const ref = roomRef(code);
    const snap = await getDoc(ref);
    if (snap.exists()) continue;
    await setDoc(ref, {
      topic: trimmed.slice(0, 280),
      name,
      hostId,
      status: 'lobby',
      entryLimit: DEFAULT_ENTRY_LIMIT,
      round: extras?.round ?? 1,
      kind,
      createdAt: serverTimestamp(),
      closesAt: new Date(Date.now() + window.ms),
      closeWindow: window.id,
      ...(extras?.mode ? { mode: extras.mode } : {}),
      ...(extras?.containerId ? { containerId: extras.containerId } : {}),
      ...(extras?.parentRoomId ? { parentRoomId: extras.parentRoomId } : {}),
      ...(extras?.parentCardId ? { parentCardId: extras.parentCardId } : {}),
    });
    if (kind === 'group') {
      try {
        await setDoc(doc(getDb(), 'rooms', code, 'secrets', 'admin'), {
          token: `${randomRoomCode()}${randomRoomCode()}`.slice(0, 12),
        });
      } catch {
        /* secret is host-only metadata */
      }
    }
    return code;
  }
  throw new Error('Could not allocate a room code');
}

async function copyParticipants(fromCode: string, toCode: string, people?: Participant[]) {
  const db = getDb();
  const batch = writeBatch(db);
  const source =
    people ??
    (await getDocs(collection(db, 'rooms', fromCode, 'participants'))).docs.map(
      (d) => ({ id: d.id, ...d.data() }) as Participant,
    );
  if (!source.length) return;
  for (const person of source) {
    if (!person.id) continue;
    batch.set(doc(db, 'rooms', toCode, 'participants', person.id), {
      displayName: person.displayName.trim().slice(0, 40) || 'Guest',
      avatarId: (person.avatarId || 'fox').slice(0, 24),
      joinedAt: serverTimestamp(),
      entryCount: 0,
      finishedSwiping: false,
    });
  }
  await batch.commit();
}

export async function createTopicInRoom(
  containerCode: string,
  hostId: string,
  prompt: string,
  extras?: { closeWindow?: CloseWindowId; mode?: TopicMode },
) {
  const next = await createRoom(hostId, prompt, {
    kind: 'topic',
    containerId: containerCode,
    closeWindow: extras?.closeWindow,
    mode: extras?.mode,
    round: 1,
  });
  await copyParticipants(containerCode, next);
  await setDoc(doc(getDb(), 'rooms', containerCode, 'topics', next), {
    prompt: prompt.trim().slice(0, 280),
    kind: 'topic',
    createdAt: serverTimestamp(),
  });
  return next;
}

export async function renameRoom(code: string, name: string) {
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) throw new Error('Name is required');
  await updateDoc(roomRef(code), { name: trimmed });
}

export async function loadAdminToken(code: string): Promise<string | null> {
  const snap = await getDoc(doc(getDb(), 'rooms', code, 'secrets', 'admin'));
  if (!snap.exists()) return null;
  const token = snap.data()?.token;
  return typeof token === 'string' ? token : null;
}

export async function peekRoom(code: string) {
  const normalized = code.trim().toUpperCase();
  const snap = await getDoc(roomRef(normalized));
  if (!snap.exists()) return null;
  return mapRoom(normalized, snap.data() as Record<string, unknown>);
}

export async function createSeat(
  containerCode: string,
  uid: string,
  displayName: string,
  avatarId: string,
  opts?: { id?: string; forceNew?: boolean },
): Promise<Seat> {
  const name = displayName.trim().slice(0, 40) || 'Guest';
  const avatar = (avatarId || 'fox').slice(0, 24);
  const existing = await collectionDocsFresh('rooms', containerCode, 'seats');
  const seats = existing.map((d) => mapSeat(d.id, d.data() as Record<string, unknown>));
  const match = matchSeat(seats, name, avatar);
  if (match && !opts?.forceNew) {
    if (match.id === uid || match.claimerUids.includes(uid)) {
      rememberSeat(containerCode, match.id);
      return match;
    }
    throw new SeatTakenError(match);
  }
  const mine = seats.filter((s) => s.id === uid || s.claimerUids.includes(uid));
  const seatId = opts?.id || (!opts?.forceNew && mine.length === 0 ? uid : randomSeatId());
  await setDoc(doc(getDb(), 'rooms', containerCode, 'seats', seatId), {
    displayName: name,
    avatarId: avatar,
    claimerUids: [uid],
    createdAt: serverTimestamp(),
  });
  rememberSeat(containerCode, seatId);
  return { id: seatId, displayName: name, avatarId: avatar, claimerUids: [uid] };
}

export async function reclaimSeat(containerCode: string, seatId: string, uid: string) {
  await updateDoc(doc(getDb(), 'rooms', containerCode, 'seats', seatId), {
    claimerUids: arrayUnion(uid),
  });
  rememberSeat(containerCode, seatId);
}

export async function grandfatherOwnSeat(
  containerCode: string,
  uid: string,
  participant: Pick<Participant, 'id' | 'displayName' | 'avatarId'> | undefined,
  seats: Seat[],
) {
  if (seats.some((s) => s.id === uid || s.claimerUids.includes(uid))) return;
  if (!participant) return;
  await createSeat(containerCode, uid, participant.displayName, participant.avatarId, { id: uid });
}

export function subscribeSeats(code: string, cb: (rows: Seat[]) => void): Unsubscribe {
  return onSnapshot(collection(getDb(), 'rooms', code, 'seats'), (snap) => {
    cb(snap.docs.map((d) => mapSeat(d.id, d.data() as Record<string, unknown>)));
  });
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
  const room = mapRoom(normalized, snap.data() as Record<string, unknown>);
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

/** Reopen sharing if voting has not started. Clears the unused vote deck. */
export async function reopenThoughts(code: string) {
  const db = getDb();
  const votes = await getDocsFromServer(collection(db, 'rooms', code, 'votes'));
  if (!votes.empty) throw new Error('Someone already voted');
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Room not found');
    const status = String(snap.data()?.status ?? '');
    if (status !== 'swiping' && status !== 'synthesizing') return;
    tx.update(ref, {
      status: 'lobby',
      closedBy: deleteField(),
      closeReason: deleteField(),
      votesCloseAt: deleteField(),
    });
  });
  const cards = await getDocs(collection(db, 'rooms', code, 'cards'));
  if (cards.empty) return;
  const batch = writeBatch(db);
  cards.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
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
  if (!existing.empty && roomData?.status !== 'synthesizing') return;
  const batch = writeBatch(db);
  if (!existing.empty) {
    existing.docs.forEach((d) => batch.delete(d.ref));
  }
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
      ...(card.sourceEntryIds?.length
        ? { sourceEntryIds: card.sourceEntryIds, sourceCount: card.sourceEntryIds.length }
        : {}),
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

export async function castVote(
  code: string,
  uid: string,
  cardId: string,
  choice: 'agree' | 'disagree',
  seatId: string,
) {
  if (!seatId) throw new Error('Claim a seat first');
  const db = getDb();
  const voteRef = doc(db, 'rooms', code, 'votes', `${seatId}_${cardId}`);
  const cardRef = doc(db, 'rooms', code, 'cards', cardId);
  await runTransaction(db, async (tx) => {
    const roomSnap = await tx.get(roomRef(code));
    const room = roomSnap.data();
    if (!room || room.status !== 'swiping') throw new Error('Voting is closed');
    const until = toDate(room.votesCloseAt);
    if (until && Date.now() > until.getTime()) throw new Error('Voting ended');
    const existing = await tx.get(voteRef);
    const cardSnap = await tx.get(cardRef);
    if (!cardSnap.exists()) throw new Error('Card not found');
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
    tx.set(voteRef, { uid, seatId, cardId, choice });
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
  const parentSnap = await getDoc(roomRef(parentCode));
  const parent = parentSnap.exists()
    ? mapRoom(parentCode, parentSnap.data() as Record<string, unknown>)
    : null;
  const parentTopicId = parent?.parentRoomId ?? parentCode;
  const containerId = parent ? containerCodeOf(parent) : parentCode;
  const next = await createRoom(hostId, card.text, {
    round: 2,
    kind: 'subtopic',
    parentRoomId: parentTopicId,
    parentCardId: card.id,
    containerId,
  });
  await copyParticipants(parentCode, next, people);
  const db = getDb();
  await setDoc(doc(db, 'rooms', parentTopicId, 'followUps', next), {
    topic: card.text.slice(0, 280),
    createdAt: serverTimestamp(),
  });
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

function mapKind(value: unknown): RoomKind | undefined {
  if (value === 'group' || value === 'topic' || value === 'subtopic') return value;
  return undefined;
}

function mapMode(value: unknown): TopicMode | undefined {
  if (value === 'debate' || value === 'hot-takes' || value === 'bracket' || value === 'predictions') {
    return value;
  }
  return undefined;
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
    name: data.name ? String(data.name) : undefined,
    kind: mapKind(data.kind),
    containerId: data.containerId ? String(data.containerId) : undefined,
    mode: mapMode(data.mode),
    parentRoomId: data.parentRoomId ? String(data.parentRoomId) : undefined,
    parentCardId: data.parentCardId ? String(data.parentCardId) : undefined,
    closesAt: toDate(data.closesAt) ?? undefined,
    votesCloseAt: toDate(data.votesCloseAt) ?? undefined,
    closeWindow: data.closeWindow === '1h' || data.closeWindow === '1d' ? data.closeWindow : undefined,
    closedBy: data.closedBy ? String(data.closedBy) : undefined,
    closeReason: closeReason === 'manual' || closeReason === 'timeout' ? closeReason : undefined,
    createdAt: toDate(data.createdAt) ?? undefined,
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
  const containerId = containerCodeOf(room);
  const historyRef = doc(getDb(), 'users', uid, 'middlegroundRooms', containerId);
  const existing = await getDoc(historyRef);
  await setDoc(
    historyRef,
    {
      topic: (room.name || room.topic).slice(0, 280),
      containerId,
      ...(room.parentRoomId ? { parentRoomId: room.parentRoomId } : {}),
      ...(existing.exists() ? {} : { joinedAt: serverTimestamp() }),
      lastSeenAt: serverTimestamp(),
    },
    { merge: true },
  );
  if (containerId !== code) {
    const childRef = doc(getDb(), 'users', uid, 'middlegroundRooms', code);
    const childExisting = await getDoc(childRef);
    await setDoc(
      childRef,
      {
        topic: room.topic.slice(0, 280),
        containerId,
        ...(room.parentRoomId ? { parentRoomId: room.parentRoomId } : {}),
        ...(childExisting.exists() ? {} : { joinedAt: serverTimestamp() }),
        lastSeenAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
}

export function subscribeMyRoomCodes(uid: string, cb: (codes: string[]) => void): Unsubscribe {
  return onSnapshot(collection(getDb(), 'users', uid, 'middlegroundRooms'), (snap) => {
    cb(snap.docs.map((d) => d.id));
  });
}

async function collectionDocs(...path: [string, ...string[]]) {
  return collectionDocsMaybeFresh(path, false);
}

async function collectionDocsFresh(...path: [string, ...string[]]) {
  return collectionDocsMaybeFresh(path, true);
}

async function collectionDocsMaybeFresh(path: [string, ...string[]], fresh: boolean) {
  try {
    const ref = collection(getDb(), ...path);
    const snap = fresh ? await getDocsFromServer(ref) : await getDocs(ref);
    return snap.docs;
  } catch {
    if (!fresh) return [];
    try {
      return (await getDocs(collection(getDb(), ...path))).docs;
    } catch {
      return [];
    }
  }
}

export async function loadFollowUpCodes(parentCode: string): Promise<string[]> {
  return (await collectionDocsFresh('rooms', parentCode, 'followUps')).map((d) => d.id);
}

export async function loadRoomPreview(code: string): Promise<RoomPreview | null> {
  const snap = await getDoc(roomRef(code));
  if (!snap.exists()) return null;
  const data = snap.data();
  const [people, cards, agreements] = await Promise.all([
    collectionDocs('rooms', code, 'participants'),
    collectionDocs('rooms', code, 'cards'),
    collectionDocs('rooms', code, 'agreements'),
  ]);
  const texts = new Set<string>();
  for (const d of cards) {
    const card = d.data() as Card;
    if (card.agreeCount > 0 && card.disagreeCount === 0 && card.text) {
      texts.add(card.text.trim().toLowerCase());
    }
  }
  for (const d of agreements) {
    const text = String((d.data() as Agreement).text ?? '')
      .trim()
      .toLowerCase();
    if (text) texts.add(text);
  }
  const room = mapRoom(code, data as Record<string, unknown>);
  return {
    code,
    topic: room.topic || 'Untitled',
    people: people.length,
    agreed: texts.size,
    total: Math.max(cards.length, texts.size),
    status: room.status,
    date: room.createdAt ?? toDate(data.createdAt),
    parentRoomId: room.parentRoomId,
    containerId: containerCodeOf(room),
    kind: room.kind,
  };
}

export async function loadTopicCodes(containerCode: string): Promise<string[]> {
  return (await collectionDocsFresh('rooms', containerCode, 'topics')).map((d) => d.id);
}

async function roomSnap(code: string) {
  try {
    return await getDocFromServer(roomRef(code));
  } catch {
    return await getDoc(roomRef(code));
  }
}

async function loadTopicPreview(code: string): Promise<TopicPreview | null> {
  const snap = await roomSnap(code);
  if (!snap.exists()) return null;
  const room = mapRoom(code, snap.data() as Record<string, unknown>);
  const [people, cards, childCodes] = await Promise.all([
    collectionDocs('rooms', code, 'participants'),
    collectionDocs('rooms', code, 'cards'),
    loadFollowUpCodes(code),
  ]);
  const cardRows = cards.map((d) => ({ id: d.id, ...d.data() }) as Card);
  const nested = (
    await Promise.all(
      childCodes.map(async (child) => {
        if (child === code) return null;
        const row = await loadTopicLeaf(child);
        return row;
      }),
    )
  ).filter((row): row is TopicPreview => Boolean(row));
  return {
    code,
    prompt: room.topic,
    date: room.createdAt ?? null,
    status: room.status,
    people: people.length,
    cardCount: cardRows.length,
    subtopicCount: nested.length,
    verdict: verdictLine(cardRows),
    parentRoomId: room.parentRoomId,
    subtopics: nested,
  };
}

async function loadTopicLeaf(code: string): Promise<TopicPreview | null> {
  const snap = await roomSnap(code);
  if (!snap.exists()) return null;
  const room = mapRoom(code, snap.data() as Record<string, unknown>);
  const [people, cards] = await Promise.all([
    collectionDocs('rooms', code, 'participants'),
    collectionDocs('rooms', code, 'cards'),
  ]);
  const cardRows = cards.map((d) => ({ id: d.id, ...d.data() }) as Card);
  return {
    code,
    prompt: room.topic,
    date: room.createdAt ?? null,
    status: room.status,
    people: people.length,
    cardCount: cardRows.length,
    subtopicCount: 0,
    verdict: verdictLine(cardRows),
    parentRoomId: room.parentRoomId,
    subtopics: [],
  };
}

export async function loadSavedRoom(code: string): Promise<SavedRoom | null> {
  const snap = await roomSnap(code);
  if (!snap.exists()) return null;
  const room = mapRoom(code, snap.data() as Record<string, unknown>);
  const container = containerCodeOf(room);
  if (container !== code) return loadSavedRoom(container);

  const [people, seatDocs, extraTopicCodes, followUpCodes] = await Promise.all([
    collectionDocsFresh('rooms', code, 'participants'),
    collectionDocsFresh('rooms', code, 'seats'),
    loadTopicCodes(code),
    loadFollowUpCodes(code),
  ]);

  const topicIds = [...new Set([code, ...extraTopicCodes])].filter((id) => !followUpCodes.includes(id));
  const previews = (await Promise.all(topicIds.map((id) => loadTopicPreview(id)))).filter(
    (row): row is TopicPreview => Boolean(row),
  );

  const byDate = (a: TopicPreview, b: TopicPreview) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0);
  const live = previews.filter((row) => topicIsLive(row.status)).sort(byDate);
  const past = previews.filter((row) => topicIsArchived(row.status)).sort(byDate);
  const dates = previews.map((row) => row.date).filter((d): d is Date => Boolean(d));

  return {
    code,
    name: room.name || room.topic || 'Room',
    created: room.createdAt ?? null,
    hostId: room.hostId,
    memberCount: Math.max(seatDocs.length, people.length),
    topicsDebated: previews.length,
    verdictsReached: past.length,
    weekStreak: weekStreak(dates),
    liveTopic: live[0],
    pastTopics: past,
  };
}
