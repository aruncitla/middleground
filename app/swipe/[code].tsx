import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { ParticipationStats } from '@/components/ParticipationStats';
import { RoomStageBar } from '@/components/RoomStageBar';
import { Screen } from '@/components/Screen';
import { SeatGate } from '@/components/SeatGate';
import { SwipeCard } from '@/components/SwipeCard';
import { VoteButtons } from '@/components/VoteButtons';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { useRoom } from '@/hooks/useRoom';
import { isGenericFillerText } from '@/lib/cardQuality';
import { formatVoteDeadline } from '@/lib/formatEnds';
import { avatarById, colors, controls, type } from '@/lib/theme';
import { containerCodeOf, castVote, closeVotingIfOpen, ensureVoteDeadline, markFinishedSwiping, reopenThoughts } from '@/lib/roomService';
import { voteBelongsToSeat, voterId } from '@/lib/seatsLocal';
import { mergeVotes, optimisticVote } from '@/lib/voteTally';
import type { Seat, Vote } from '@/types/room';

export default function SwipeCardScreen() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = String(raw ?? '').toUpperCase();
  const router = useRouter();
  const { user, loading: authLoading, error: authError } = useGuestAuth();
  const { room, participants, entries, cards, votes, seats, ready } = useRoom(code);
  const container = room ? containerCodeOf(room) : undefined;
  const [activeSeat, setActiveSeat] = useState<Seat | null>(null);
  const [localVotes, setLocalVotes] = useState<Vote[]>([]);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const endingRef = useRef(false);

  useEffect(() => {
    setLocalVotes([]);
  }, [code]);

  const mergedVotes = useMemo(() => mergeVotes(votes, localVotes), [votes, localVotes]);

  const myChoiceByCard = useMemo(() => {
    const map = new Map<string, 'agree' | 'disagree'>();
    for (const vote of mergedVotes) {
      if (voteBelongsToSeat(vote, activeSeat, user?.uid)) map.set(vote.cardId, vote.choice);
    }
    return map;
  }, [mergedVotes, activeSeat, user?.uid]);

  const visibleCards = useMemo(
    () => cards.filter((c) => !isGenericFillerText(c.text)),
    [cards],
  );

  const remaining = useMemo(() => {
    if (!user) return visibleCards;
    return visibleCards.filter((c) => !myChoiceByCard.has(c.id));
  }, [visibleCards, myChoiceByCard, user]);

  const top = remaining[0];
  const next = remaining[1];
  const myEntryIds = useMemo(() => {
    if (!user) return new Set<string>();
    return new Set(entries.filter((e) => e.authorId === user.uid).map((e) => e.id));
  }, [entries, user]);
  const cardIsMine = (card: (typeof remaining)[0] | undefined) =>
    Boolean(card?.sourceEntryIds?.some((id) => myEntryIds.has(id)));
  const isHost = Boolean(user && room && user.uid === room.hostId);
  const roster = seats.length ? seats : participants;
  const votedIds = useMemo(() => new Set(mergedVotes.map((v) => voterId(v))), [mergedVotes]);
  const allVoted = roster.length > 0 && votedIds.size >= roster.length;
  const myVoteCount = myChoiceByCard.size;
  const isLateJoiner = visibleCards.length > 0 && myVoteCount === 0;

  const voteEnds = room?.votesCloseAt;
  const voteTimedOut = Boolean(voteEnds && now >= voteEnds.getTime());
  const votingOpen = room?.status === 'swiping' && !voteTimedOut;

  useEffect(() => {
    if (!room) return;
    if (room.status === 'lobby' || room.status === 'synthesizing') router.replace(`/lobby/${code}`);
    if (room.status === 'summary') router.replace(`/summary/${code}`);
  }, [room, code, router]);

  useEffect(() => {
    if (room?.status !== 'swiping') return;
    void ensureVoteDeadline(code).catch(() => {});
  }, [room?.status, room?.votesCloseAt, code]);

  useEffect(() => {
    if (room?.status !== 'swiping' || !room.votesCloseAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [room?.status, room?.votesCloseAt]);

  useEffect(() => {
    if (!user || !voteTimedOut || room?.status !== 'swiping' || endingRef.current) return;
    endingRef.current = true;
    void closeVotingIfOpen(code).catch(() => {
      endingRef.current = false;
    });
  }, [user, voteTimedOut, room?.status, code]);

  useEffect(() => {
    if (!user || remaining.length > 0 || visibleCards.length === 0) return;
    void markFinishedSwiping(code, user.uid).catch(() => {});
    if (votingOpen) router.replace(`/summary/${code}`);
  }, [user, remaining.length, visibleCards.length, code, votingOpen, router]);

  const vote = async (cardId: string, choice: 'agree' | 'disagree', seatId?: string) => {
    const sid = seatId || activeSeat?.id;
    if (!user || !sid || busy || !votingOpen) return;
    const found = seats.find((s) => s.id === sid);
    if (found && found.id !== activeSeat?.id) setActiveSeat(found);
    const next = optimisticVote({ uid: user.uid, seatId: sid, cardId, choice });
    setLocalVotes((prev) => mergeVotes(prev, [next]));
    setBusy(true);
    try {
      await castVote(code, user.uid, cardId, choice, sid);
    } catch (e) {
      setLocalVotes((prev) => prev.filter((v) => v.id !== next.id));
      Alert.alert('Vote failed', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const toSummary = async () => {
    try {
      await closeVotingIfOpen(code);
    } catch (e) {
      Alert.alert('Could not open results', e instanceof Error ? e.message : String(e));
    }
  };

  const onReopen = async () => {
    setBusy(true);
    try {
      await reopenThoughts(code);
    } catch (e) {
      Alert.alert('Could not reopen', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen loading={authLoading || !ready} error={authError}>
      <SeatGate containerCode={container} topicCode={code} uid={user?.uid} onSeatChange={setActiveSeat}>
        {(session) => {
          const avatar = avatarById(session.seat.avatarId);
          return (
      <View style={styles.page}>
        <View style={styles.header}>
          <BrandMark size="sm" />
          <RoomStageBar stage="vote" />
          <Text style={type.kicker}>Vote</Text>
          <Pressable onPress={() => session.setSwitching(true)} accessibilityRole="button">
            <Text style={controls.ghostText}>
              {avatar.emoji} {session.seat.displayName} · Switch seat
            </Text>
          </Pressable>
          <Text style={type.title} numberOfLines={2}>
            {room?.topic}
          </Text>
          {isLateJoiner ? (
            <Text style={type.body}>You’re voting on what the group already wrote.</Text>
          ) : null}
          <Text style={type.body}>Swipe right for yes, left for no. Or tap the buttons. You can change a vote until time’s up.</Text>
          <Text style={type.body}>
            {Math.max(visibleCards.length - remaining.length, 0)} / {visibleCards.length} · {remaining.length} left
          </Text>
          {voteEnds ? (
            <Text style={voteTimedOut ? styles.closed : type.body}>
              {voteTimedOut ? 'Time’s up — wrapping up votes…' : formatVoteDeadline(voteEnds)}
            </Text>
          ) : null}
          <ParticipationStats participants={participants} seats={session.seats} votes={mergedVotes} showVotes />
        </View>

        <View style={styles.deck}>
          {voteTimedOut ? (
            <View style={styles.empty}>
              <Text style={type.title}>Voting ended</Text>
              <Text style={type.body}>Heading to results…</Text>
            </View>
          ) : top ? (
            <>
              {next ? <SwipeCard card={next} stacked mine={cardIsMine(next)} onVote={() => {}} /> : null}
              <SwipeCard card={top} mine={cardIsMine(top)} onVote={(c) => void vote(top.id, c, session.seat.id)} />
            </>
          ) : (
            <View style={styles.empty}>
              <Text style={type.title}>You’re in</Text>
              <Text style={type.body}>Opening results…</Text>
            </View>
          )}
        </View>

        {top && votingOpen ? (
          <VoteButtons onAgree={() => void vote(top.id, 'agree', session.seat.id)} onDisagree={() => void vote(top.id, 'disagree', session.seat.id)} />
        ) : null}

        {mergedVotes.length === 0 && votingOpen ? (
          <>
            <Button
              disabled={busy}
              variant="secondary"
              label={busy ? 'Working…' : 'Back to sharing thoughts'}
              onPress={() => void onReopen()}
              style={styles.results}
            />
            <Text style={[type.footnote, styles.hint]}>No one has voted yet. You can reopen thoughts for everyone.</Text>
          </>
        ) : null}

        {isHost && allVoted && votingOpen && remaining.length > 0 ? (
          <Button
            onPress={() => void toSummary()}
            variant="secondary"
            label="End voting"
            style={styles.results}
          />
        ) : null}
      </View>
          );
        }}
      </SeatGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingTop: 12, paddingBottom: 20, gap: 8 },
  header: { paddingHorizontal: 20, gap: 6 },
  closed: { ...type.footnote, color: colors.accentHover },
  deck: { flex: 1, minHeight: 280, marginTop: 8, overflow: 'hidden' },
  empty: {
    marginHorizontal: 20,
    ...controls.panel,
    minHeight: 220,
    justifyContent: 'center',
    gap: 12,
  },
  results: { marginHorizontal: 20, marginTop: 12 },
  hint: { marginHorizontal: 20 },
});
