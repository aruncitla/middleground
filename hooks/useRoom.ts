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

  useEffect(() => {
    if (!code) return;
    setReady(false);
    const unsubs = [
      subscribeRoom(code, (next) => {
        setRoom(next);
        setReady(true);
      }),
      subscribeParticipants(code, setParticipants),
      subscribeEntries(code, setEntries),
      subscribeAgreements(code, setAgreements),
    ];
    return () => unsubs.forEach((u) => u());
  }, [code]);

  const container = room ? containerCodeOf(room) : undefined;

  useEffect(() => {
    if (!container) {
      setSeats([]);
      return;
    }
    return subscribeSeats(container, setSeats);
  }, [container]);

  const pastLobby = room?.status === 'swiping' || room?.status === 'summary' || room?.status === 'synthesizing';

  useEffect(() => {
    if (!code || !pastLobby) {
      setCards([]);
      setVotes([]);
      return;
    }
    const unsubs = [subscribeCards(code, setCards), subscribeVotes(code, setVotes)];
    return () => unsubs.forEach((u) => u());
  }, [code, pastLobby]);

  const me = useMemo(
    () => (uid: string | undefined) => participants.find((p) => p.id === uid) ?? null,
    [participants],
  );

  useEffect(() => {
    let uid: string | undefined;
    try {
      uid = getFirebaseAuth().currentUser?.uid;
    } catch {
      return;
    }
    if (!uid || !code || !room) return;
    if (!participants.some((p) => p.id === uid)) return;
    void rememberJoinedRoom(uid, code, room).catch(() => {});
  }, [code, room, participants]);

  return { room, participants, entries, cards, votes, agreements, seats, ready, me };
}
