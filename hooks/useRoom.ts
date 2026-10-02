import { useEffect, useMemo, useState } from 'react';
import { getFirebaseAuth } from '@/lib/firebase';
import {
  rememberJoinedRoom,
  subscribeAgreements,
  subscribeCards,
  subscribeEntries,
  subscribeParticipants,
  subscribeRoom,
  subscribeSeats,
  subscribeVotes,
  containerCodeOf,
} from '@/lib/roomService';
import { mergeLiveEntries } from '@/lib/entries';
import type { Agreement, Card, Entry, Participant, Room, Seat, Vote } from '@/types/room';

export function useRoom(code: string | undefined) {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [ready, setReady] = useState(false);
  const [uid, setUid] = useState<string | undefined>();

  useEffect(() => {
    try {
      return getFirebaseAuth().onAuthStateChanged((user) => setUid(user?.uid));
    } catch {
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (!code || !uid) return;
    setReady(false);
    setEntries([]);
    setCards([]);
    setVotes([]);
    setAgreements([]);
    const unsubs = [
      subscribeRoom(code, (next) => {
        setRoom(next);
        setReady(true);
      }),
      subscribeParticipants(code, setParticipants),
      subscribeAgreements(code, setAgreements),
    ];
    return () => unsubs.forEach((u) => u());
  }, [code, uid]);

  useEffect(() => {
    if (!code || !uid) return;
    const unsubs = [
      subscribeEntries(code, (rows) => {
        setEntries((prev) => mergeLiveEntries(prev, rows));
      }),
      subscribeCards(code, setCards),
      subscribeVotes(code, setVotes),
    ];
    return () => unsubs.forEach((u) => u());
  }, [code, uid]);

  const container = room ? containerCodeOf(room) : undefined;

  useEffect(() => {
    if (!container) {
      setSeats([]);
      return;
    }
    return subscribeSeats(container, setSeats);
  }, [container]);

  const me = useMemo(
    () => (memberId: string | undefined) => participants.find((p) => p.id === memberId) ?? null,
    [participants],
  );

  useEffect(() => {
    if (!uid || !code || !room) return;
    if (!participants.some((p) => p.id === uid)) return;
    void rememberJoinedRoom(uid, code, room).catch(() => {});
  }, [code, room, participants, uid]);

  const rememberEntry = (entry: Entry) => {
    setEntries((prev) => (prev.some((row) => row.id === entry.id) ? prev : [...prev, entry]));
  };

  return { room, participants, entries, cards, votes, agreements, seats, ready, me, rememberEntry };
}
