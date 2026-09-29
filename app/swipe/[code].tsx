import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { CountdownPill } from '@/components/CountdownPill';
import { ParticipationStats } from '@/components/ParticipationStats';
import { RoomStageBar } from '@/components/RoomStageBar';
import { Screen } from '@/components/Screen';
import { SeatGate } from '@/components/SeatGate';
import { SwipeCard } from '@/components/SwipeCard';
import { VoteButtons } from '@/components/VoteButtons';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { useRoom } from '@/hooks/useRoom';
import { cardOwnedBySeat, ownEntryIdsForSeat, seatEntryCount, votableCardIdsForSeat, votingUnlocked } from '@/lib/entries';
import { isGenericFillerText } from '@/lib/cardQuality';
import { liveDeadline } from '@/lib/formatEnds';
import { notify } from '@/lib/notify';
import { avatarById, colors, controls, type } from '@/lib/theme';
import { containerCodeOf, castVote, closeVotingIfOpen, ensureVoteDeadline, markFinishedSwiping, reopenThoughts } from '@/lib/roomService';
import {
  choiceForSeat,
  mergeVotes,
  optimisticVote,
  rosterSeatIds,
  seatCompletedDeck,
  seatStartedVoting,
  sortCards,
  voteKey,
  voteScreenForSeat,
} from '@/lib/voteTally';
import type { Card, Vote } from '@/types/room';

export default function SwipeCardScreen() {
  const { code: raw, again: rawAgain } = useLocalSearchParams<{ code: string; again?: string }>();
  const code = String(raw ?? '').toUpperCase();
  const againParam = Array.isArray(rawAgain) ? rawAgain[0] : String(rawAgain ?? '');
  const swipeAgain = againParam === '1';
  const reviewVotes = againParam === 'review';
  const router = useRouter();
  const { user, loading: authLoading, error: authError } = useGuestAuth();
  const { room, participants, entries, cards, votes, seats, ready } = useRoom(code);
  const container = room ? containerCodeOf(room) : undefined;
  const [activeSeatId, setActiveSeatId] = useState<string | null>(null);
  const [localVotes, setLocalVotes] = useState<Vote[]>([]);
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const [ending, setEnding] = useState(false);
  const [now, setNow] = useState(Date.now());
  const endingRef = useRef(false);

  useEffect(() => {
    setLocalVotes([]);
    setReviewedIds([]);
  }, [code, againParam]);

  const mergedVotes = useMemo(() => mergeVotes(votes, localVotes), [votes, localVotes]);
  const visibleCards = useMemo(
    () => sortCards(cards.filter((c) => !isGenericFillerText(c.text))),
    [cards],
  );
  const cardIds = useMemo(() => visibleCards.map((card) => card.id), [visibleCards]);
  const rosterIds = useMemo(() => rosterSeatIds(seats, participants), [seats, participants]);

  const ownEntryIds = useMemo(() => ownEntryIdsForSeat(entries, activeSeatId), [entries, activeSeatId]);
  const votableCards = useMemo(
    () => visibleCards.filter((card) => !cardOwnedBySeat(card, ownEntryIds)),
    [visibleCards, ownEntryIds],
  );
  const leftoverForActive = useMemo(() => {
    if (!activeSeatId) return votableCards.length;
    return votableCards.filter((card) => !choiceForSeat(mergedVotes, activeSeatId, card.id)).length;
  }, [votableCards, mergedVotes, activeSeatId]);
  const hasStarted = Boolean(activeSeatId && seatStartedVoting(mergedVotes, activeSeatId, votableCardIdsForSeat(visibleCards, entries, activeSeatId)));
  const unlocked = votingUnlocked(entries);
  const inPlay = room?.status === 'swiping' || (room?.status === 'lobby' && unlocked);

  const cardIsMine = (card: Card | undefined) => Boolean(card && cardOwnedBySeat(card, ownEntryIds));
  const isHost = Boolean(user && room && user.uid === room.hostId);
  const allVoted =
    rosterIds.length > 0 &&
    rosterIds.every((id) => {
      const needed = votableCardIdsForSeat(visibleCards, entries, id);
      return needed.length === 0 || seatCompletedDeck(mergedVotes, id, needed);
    });

  const voteEnds = liveDeadline(room);
  const voteTimedOut = Boolean(voteEnds && now >= voteEnds.getTime());
  const votingOpen = Boolean(inPlay && !voteTimedOut);

  useEffect(() => {
    if (!room) return;
    if (room.status === 'synthesizing') router.replace(`/lobby/${code}`);
    if (room.status === 'lobby' && !unlocked) router.replace(`/lobby/${code}`);
    if (room.status === 'lobby' && activeSeatId && seatEntryCount(entries, { id: activeSeatId }) === 0) {
      router.replace(`/lobby/${code}`);
    }
    if (room.status === 'summary') router.replace(`/summary/${code}`);
  }, [room, unlocked, activeSeatId, entries, code, router]);

  useEffect(() => {
    if (room?.status !== 'swiping') return;
    void ensureVoteDeadline(code).catch(() => {});
  }, [room?.status, room?.votesCloseAt, code]);

  useEffect(() => {
    if (!inPlay || !voteEnds) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [inPlay, voteEnds]);

  useEffect(() => {
    if (!user || !voteTimedOut || !inPlay || endingRef.current) return;
    endingRef.current = true;
    void closeVotingIfOpen(code).catch(() => {
      endingRef.current = false;
    });
  }, [user, voteTimedOut, inPlay, code]);

  useEffect(() => {
    if (!user || !activeSeatId || leftoverForActive > 0 || votableCards.length === 0) return;
    void markFinishedSwiping(code, user.uid).catch(() => {});
  }, [user, activeSeatId, leftoverForActive, votableCards.length, code]);

  useEffect(() => {
    if (!votingOpen || !activeSeatId) return;
    if (reviewVotes) {
      if (!hasStarted) return;
      const reviewLeft = votableCards.filter(
        (card) => choiceForSeat(mergedVotes, activeSeatId, card.id) && !reviewedIds.includes(card.id),
      );
      if (reviewLeft.length === 0) router.replace(`/summary/${code}`);
      return;
    }
    if (leftoverForActive === 0 && votableCards.length === 0 && !hasStarted) return;
    const screen = voteScreenForSeat({ leftover: leftoverForActive, hasStarted, again: swipeAgain });
    if (screen === 'summary') router.replace(`/summary/${code}`);
  }, [
    votingOpen,
    activeSeatId,
    leftoverForActive,
    votableCards,
    hasStarted,
    swipeAgain,
    reviewVotes,
    reviewedIds,
    mergedVotes,
    code,
    router,
  ]);

  const vote = async (cardId: string, choice: 'agree' | 'disagree', seatId?: string) => {
    const sid = seatId;
    if (!user || !sid || !votingOpen) return;
    setActiveSeatId(sid);
    const nextVote = optimisticVote({ uid: user.uid, seatId: sid, cardId, choice });
    setLocalVotes((prev) => mergeVotes(prev, [nextVote]));
    if (reviewVotes) setReviewedIds((prev) => (prev.includes(cardId) ? prev : [...prev, cardId]));
    try {
      await castVote(code, user.uid, cardId, choice, sid);
    } catch (e) {
      setLocalVotes((prev) => prev.filter((v) => voteKey(v) !== voteKey(nextVote)));
      if (reviewVotes) setReviewedIds((prev) => prev.filter((id) => id !== cardId));
      notify('Vote failed', e instanceof Error ? e.message : String(e));
    }
  };

  const toSummary = async () => {
    if (!allVoted && !voteTimedOut) return;
    setEnding(true);
    try {
      await closeVotingIfOpen(code);
    } catch (e) {
      notify('Could not open results', e instanceof Error ? e.message : String(e));
    } finally {
      setEnding(false);
    }
  };

  const onReopen = async () => {
    setEnding(true);
    try {
      await reopenThoughts(code);
    } catch (e) {
      notify('Could not reopen', e instanceof Error ? e.message : String(e));
    } finally {
      setEnding(false);
    }
  };

  return (
    <Screen loading={authLoading || !ready} error={authError}>
      <SeatGate
        containerCode={container}
        topicCode={code}
        uid={user?.uid}
        onSeatChange={(seat) => setActiveSeatId(seat?.id ?? null)}
      >
        {(session) => {
          const avatar = avatarById(session.seat.avatarId);
          const remaining = reviewVotes
            ? votableCards.filter(
                (card) =>
                  Boolean(choiceForSeat(mergedVotes, session.seat.id, card.id)) &&
                  !reviewedIds.includes(card.id),
              )
            : votableCards.filter((card) => !choiceForSeat(mergedVotes, session.seat.id, card.id));
          const top = remaining[0];
          const next = remaining[1];
          const priorChoice = top ? choiceForSeat(mergedVotes, session.seat.id, top.id) : undefined;
          return (
      <View style={styles.page}>
        <View style={styles.header}>
          <BrandMark size="sm" />
          <RoomStageBar stage="vote" />
          <Pressable onPress={() => session.setSwitching(true)} accessibilityRole="button">
            <Text style={controls.ghostText}>
              {avatar.emoji} {session.seat.displayName} · Switch seat
            </Text>
          </Pressable>
          <Text style={type.title} numberOfLines={1}>
            {room?.topic}
          </Text>
          {reviewVotes ? (
            <Text style={type.footnote}>Swipe again to change a vote.</Text>
          ) : swipeAgain ? (
            <Text style={type.footnote}>New thoughts came up for voting.</Text>
          ) : remaining.length === votableCards.length && mergedVotes.length > 0 ? (
            <Text style={type.footnote}>You’re voting on what the group already wrote.</Text>
          ) : null}
          <Text style={type.body}>
            {Math.max(votableCards.length - remaining.length, 0)} / {votableCards.length} · {remaining.length} left
          </Text>
          {voteEnds ? <CountdownPill endsAt={voteEnds} /> : null}
          {voteTimedOut ? (
            <Text style={styles.closed}>Time’s up — wrapping up votes…</Text>
          ) : null}
          <ParticipationStats
            participants={participants}
            seats={session.seats}
            entries={entries}
            votes={mergedVotes}
            cardIds={cardIds}
            showVotes
            showShare={false}
          />
          {room?.status === 'lobby' && votingOpen ? (
            <Pressable onPress={() => router.push(`/lobby/${code}`)} accessibilityRole="button">
              <Text style={controls.ghostText}>Share another thought</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.deck}>
          {voteTimedOut ? (
            <View style={styles.empty}>
              <Text style={type.title}>Voting ended</Text>
              <Text style={type.body}>Heading to results…</Text>
            </View>
          ) : top ? (
            <>
              {next ? (
                <SwipeCard
                  card={next}
                  stacked
                  mine={cardIsMine(next)}
                  priorChoice={reviewVotes ? choiceForSeat(mergedVotes, session.seat.id, next.id) : undefined}
                  onVote={() => {}}
                />
              ) : null}
              <SwipeCard
                card={top}
                mine={cardIsMine(top)}
                priorChoice={reviewVotes ? priorChoice : undefined}
                onVote={(c) => void vote(top.id, c, session.seat.id)}
              />
            </>
          ) : (
            <View style={styles.empty}>
              <Text style={type.title}>You’re in</Text>
              <Text style={type.body}>
                {allVoted || voteTimedOut
                  ? 'Everyone in so far has voted.'
                  : 'This seat is caught up. Early results are next.'}
              </Text>
              {votingOpen ? (
                <Button
                  variant="secondary"
                  label="See early results"
                  onPress={() => router.replace(`/summary/${code}`)}
                />
              ) : null}
            </View>
          )}
        </View>

        {top && votingOpen ? (
          <View style={styles.footer}>
            <VoteButtons onAgree={() => void vote(top.id, 'agree', session.seat.id)} onDisagree={() => void vote(top.id, 'disagree', session.seat.id)} />
          </View>
        ) : null}

        {mergedVotes.length === 0 && votingOpen ? (
          <>
            <Button
              disabled={ending}
              variant="secondary"
              label={ending ? 'Working…' : 'Back to sharing thoughts'}
              onPress={() => void onReopen()}
              style={styles.results}
            />
            <Text style={[type.footnote, styles.hint]}>No one has voted yet. You can reopen thoughts for everyone.</Text>
          </>
        ) : null}

        {isHost && allVoted && votingOpen ? (
          <Button
            disabled={ending}
            onPress={() => void toSummary()}
            variant="secondary"
            label={ending ? 'Closing…' : 'End voting'}
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
  page: { flex: 1, paddingTop: 8, paddingBottom: 8 },
  header: { paddingHorizontal: 20, gap: 4, flexShrink: 0 },
  closed: { ...type.footnote, color: colors.accentHover },
  deck: { flex: 1, minHeight: 200, marginTop: 4 },
  empty: {
    marginHorizontal: 20,
    ...controls.panel,
    minHeight: 180,
    justifyContent: 'center',
    gap: 12,
  },
  footer: { flexShrink: 0, paddingTop: 8, paddingBottom: 4, backgroundColor: colors.bg },
  results: { marginHorizontal: 20, marginTop: 12 },
  hint: { marginHorizontal: 20 },
});
