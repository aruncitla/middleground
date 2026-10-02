import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { CountdownPill } from '@/components/CountdownPill';
import { MaybeShelf } from '@/components/MaybeShelf';
import { ParticipationStats } from '@/components/ParticipationStats';
import { RangeStrip } from '@/components/RangeStrip';
import { RoomStageBar } from '@/components/RoomStageBar';
import { Screen } from '@/components/Screen';
import { SeatGate } from '@/components/SeatGate';
import { SwipeCard } from '@/components/SwipeCard';
import { TopicCard } from '@/components/TopicCard';
import { VoteButtons } from '@/components/VoteButtons';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { cardOwnedBySeat, ownEntryIdsForSeat, votableCardIdsForSeat, votingUnlocked } from '@/lib/entries';
import { isGenericFillerText } from '@/lib/cardQuality';
import { orderByIds, sessionShuffleSeed, shuffleIds } from '@/lib/deckShuffle';
import { liveDeadline } from '@/lib/formatEnds';
import { notify } from '@/lib/notify';
import { isExampleCard, withStarterCards } from '@/lib/starterCards';
import { avatarById, colors, controls, type } from '@/lib/theme';
import { containerCodeOf, castVote, closeVotingIfOpen, ensureVoteDeadline, markFinishedSwiping, submitEntry } from '@/lib/roomService';
import { useRoom } from '@/hooks/useRoom';
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
import type { VoteChoice } from '@/lib/voteChoice';
import type { Card, Vote } from '@/types/room';

export default function SwipeCardScreen() {
  const { code: raw, again: rawAgain } = useLocalSearchParams<{ code: string; again?: string }>();
  const code = String(raw ?? '').toUpperCase();
  const againParam = Array.isArray(rawAgain) ? rawAgain[0] : String(rawAgain ?? '');
  const swipeAgain = againParam === '1';
  const reviewVotes = againParam === 'review';
  const router = useRouter();
  const { user, loading: authLoading, error: authError } = useGuestAuth();
  const { room, participants, entries, cards, votes, seats, ready, rememberEntry } = useRoom(code);
  const container = room ? containerCodeOf(room) : undefined;
  const [activeSeatId, setActiveSeatId] = useState<string | null>(null);
  const [localVotes, setLocalVotes] = useState<Vote[]>([]);
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const [dismissedExamples, setDismissedExamples] = useState<string[]>([]);
  const [reopenedId, setReopenedId] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [now, setNow] = useState(Date.now());
  const endingRef = useRef(false);

  useEffect(() => {
    setLocalVotes([]);
    setReviewedIds([]);
    setReopenedId(null);
  }, [code, againParam]);

  const mergedVotes = useMemo(() => mergeVotes(votes, localVotes), [votes, localVotes]);
  const genuineCards = useMemo(
    () => sortCards(cards.filter((c) => !isGenericFillerText(c.text) && !isExampleCard(c))),
    [cards],
  );
  const shuffled = useMemo(() => {
    const withExamples = withStarterCards(genuineCards, room?.topic ?? '').filter(
      (card) => !dismissedExamples.includes(card.id),
    );
    const ids = shuffleIds(
      withExamples.map((card) => card.id),
      sessionShuffleSeed(code),
    );
    return orderByIds(withExamples, ids);
  }, [genuineCards, room?.topic, dismissedExamples, code]);
  const cardIds = useMemo(() => genuineCards.map((card) => card.id), [genuineCards]);
  const rosterIds = useMemo(() => rosterSeatIds(seats, participants), [seats, participants]);
  const ownEntryIds = useMemo(() => ownEntryIdsForSeat(entries, activeSeatId), [entries, activeSeatId]);
  const votableCards = useMemo(
    () => shuffled.filter((card) => isExampleCard(card) || !cardOwnedBySeat(card, ownEntryIds)),
    [shuffled, ownEntryIds],
  );
  const leftoverForActive = useMemo(() => {
    if (!activeSeatId) return votableCards.filter((card) => !isExampleCard(card)).length;
    return votableCards.filter((card) => !isExampleCard(card) && !choiceForSeat(mergedVotes, activeSeatId, card.id)).length;
  }, [votableCards, mergedVotes, activeSeatId]);
  const hasStarted = Boolean(
    activeSeatId && seatStartedVoting(mergedVotes, activeSeatId, votableCardIdsForSeat(genuineCards, entries, activeSeatId)),
  );
  const unlocked = votingUnlocked(entries);
  const inPlay = room?.status === 'swiping' || (room?.status === 'lobby' && unlocked);

  const cardIsMine = (card: Card | undefined) => Boolean(card && cardOwnedBySeat(card, ownEntryIds));
  const isHost = Boolean(user && room && user.uid === room.hostId);
  const allVoted =
    rosterIds.length > 0 &&
    rosterIds.every((id) => {
      const needed = votableCardIdsForSeat(genuineCards, entries, id);
      return needed.length === 0 || seatCompletedDeck(mergedVotes, id, needed);
    });

  const voteEnds = liveDeadline(room);
  const voteTimedOut = Boolean(voteEnds && now >= voteEnds.getTime());
  const votingOpen = Boolean(inPlay && !voteTimedOut);

  useEffect(() => {
    if (!room) return;
    if (room.status === 'synthesizing') router.replace(`/lobby/${code}`);
    if (room.status === 'lobby' && !unlocked) router.replace(`/lobby/${code}`);
    if (room.status === 'summary') router.replace(`/summary/${code}`);
  }, [room, unlocked, code, router]);

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
    if (!user || !activeSeatId || leftoverForActive > 0 || votableCards.filter((c) => !isExampleCard(c)).length === 0) return;
    void markFinishedSwiping(code, user.uid).catch(() => {});
  }, [user, activeSeatId, leftoverForActive, votableCards, code]);

  useEffect(() => {
    if (!votingOpen || !activeSeatId || reopenedId) return;
    if (reviewVotes) {
      if (!hasStarted) return;
      const reviewLeft = votableCards.filter(
        (card) =>
          !isExampleCard(card) &&
          choiceForSeat(mergedVotes, activeSeatId, card.id) &&
          !reviewedIds.includes(card.id),
      );
      if (reviewLeft.length === 0) router.replace(`/summary/${code}`);
      return;
    }
    if (leftoverForActive === 0 && votableCards.filter((c) => !isExampleCard(c)).length === 0 && !hasStarted) return;
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
    reopenedId,
    code,
    router,
  ]);

  const vote = async (card: Card, choice: VoteChoice, seatId?: string | null) => {
    if (isExampleCard(card)) {
      setDismissedExamples((prev) => (prev.includes(card.id) ? prev : [...prev, card.id]));
      setDrag({ x: 0, y: 0 });
      return;
    }
    const sid = seatId;
    if (!sid) return;
    if (!user || !votingOpen) return;
    setActiveSeatId(sid);
    setReopenedId(null);
    const nextVote = optimisticVote({ uid: user.uid, seatId: sid, cardId: card.id, choice });
    setLocalVotes((prev) => mergeVotes(prev, [nextVote]));
    if (reviewVotes) setReviewedIds((prev) => (prev.includes(card.id) ? prev : [...prev, card.id]));
    setDrag({ x: 0, y: 0 });
    try {
      await castVote(code, user.uid, card.id, choice, sid);
    } catch (e) {
      setLocalVotes((prev) => prev.filter((v) => voteKey(v) !== voteKey(nextVote)));
      if (reviewVotes) setReviewedIds((prev) => prev.filter((id) => id !== card.id));
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

  const onSubmitThought = async (seatId: string) => {
    if (!user) return;
    setSubmitting(true);
    try {
      const created = await submitEntry(code, user.uid, draft, seatId);
      rememberEntry(created);
      setDraft('');
      setComposerOpen(false);
    } catch (e) {
      notify('Could not submit', e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen loading={authLoading || !ready} error={authError}>
      <SeatGate
        containerCode={container}
        topicCode={code}
        uid={user?.uid}
        required={false}
        onSeatChange={(seat) => setActiveSeatId(seat?.id ?? null)}
      >
        {(session) => {
          const avatar = session.seat ? avatarById(session.seat.avatarId) : null;
          const remaining = reviewVotes
            ? votableCards.filter(
                (card) =>
                  Boolean(choiceForSeat(mergedVotes, session.seat?.id, card.id)) &&
                  !reviewedIds.includes(card.id),
              )
            : votableCards.filter((card) => {
                if (reopenedId && card.id === reopenedId) return true;
                const choice = choiceForSeat(mergedVotes, session.seat?.id, card.id);
                if (isExampleCard(card)) return !choice;
                return !choice;
              });
          const parked = votableCards.filter((card) => {
            if (card.id === reopenedId) return false;
            return choiceForSeat(mergedVotes, session.seat?.id, card.id) === 'maybe';
          });
          const top = remaining[0];
          const priorChoice = top ? choiceForSeat(mergedVotes, session.seat?.id, top.id) : undefined;
          const needIdentity = () => session.setSwitching(true);
          const onPick = (choice: VoteChoice) => {
            if (!top) return;
            if (!session.seat) {
              needIdentity();
              return;
            }
            void vote(top, choice, session.seat.id);
          };
          return (
      <View style={styles.page}>
        <View style={styles.header}>
          <RoomStageBar stage="vote" />
          {session.seat ? (
            <Pressable onPress={() => session.setSwitching(true)} accessibilityRole="button">
              <Text style={controls.ghostText}>
                {avatar?.emoji} {session.seat.displayName} · Switch
              </Text>
            </Pressable>
          ) : (
            <Pressable onPress={needIdentity} accessibilityRole="button">
              <Text style={controls.ghostText}>Add a name to vote</Text>
            </Pressable>
          )}
          <TopicCard>
            <Text style={type.title} numberOfLines={2}>
              {room?.topic}
            </Text>
          </TopicCard>
          <ParticipationStats
            participants={participants}
            seats={session.seats}
            entries={entries}
            votes={mergedVotes}
            cardIds={cardIds}
            showVotes
          />
          {voteEnds ? <CountdownPill endsAt={voteEnds} /> : null}
          <RangeStrip votes={mergedVotes} />
        </View>

        <View style={styles.deck}>
          {voteTimedOut ? (
            <View style={styles.empty}>
              <Text style={type.title}>Voting ended</Text>
              <Text style={type.body}>Heading to the verdict…</Text>
            </View>
          ) : top ? (
            <>
              <View pointerEvents="none" style={styles.stack2} />
              <View pointerEvents="none" style={styles.stack1} />
              <SwipeCard
                card={top}
                mine={cardIsMine(top)}
                author={
                  cardIsMine(top)
                    ? session.seat?.displayName
                    : (top.sourceCount ?? top.sourceEntryIds?.length ?? 0) > 1
                      ? `${top.sourceCount ?? top.sourceEntryIds?.length} people`
                      : 'From the group'
                }
                priorChoice={reviewVotes ? priorChoice : undefined}
                onDrag={(dx, dy) => setDrag({ x: dx, y: dy })}
                onVote={(c) => onPick(c)}
              />
            </>
          ) : (
            <View style={styles.empty}>
              <Text style={type.title}>{parked.length ? 'Maybes parked' : 'You’re in'}</Text>
              <Text style={type.body}>
                {parked.length
                  ? 'Tap a maybe chip to re-swipe it. Maybe is a real vote.'
                  : allVoted || voteTimedOut
                    ? 'Everyone in so far has voted.'
                    : 'This seat is caught up. The verdict is next.'}
              </Text>
              {votingOpen ? (
                <Button
                  variant="secondary"
                  label="See the verdict"
                  onPress={() => router.replace(`/summary/${code}`)}
                />
              ) : null}
            </View>
          )}
        </View>

        {room?.status === 'lobby' && votingOpen ? (
          <View style={styles.composer}>
            {composerOpen ? (
              <>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Add your thought"
                  placeholderTextColor={colors.faint}
                  style={[controls.input, styles.area]}
                  multiline
                  {...({ dataSet: { mgInput: true } } as object)}
                />
                <Button
                  disabled={submitting || !draft.trim()}
                  label={submitting ? 'Submitting…' : 'Add thought'}
                  onPress={() => {
                    if (!session.seat) {
                      needIdentity();
                      return;
                    }
                    void onSubmitThought(session.seat.id);
                  }}
                />
              </>
            ) : (
              <Button variant="secondary" label="Add your thought" onPress={() => setComposerOpen(true)} />
            )}
          </View>
        ) : null}

        <MaybeShelf cards={parked} onOpen={setReopenedId} />

        {isHost && allVoted && votingOpen ? (
          <Button
            disabled={ending}
            onPress={() => void toSummary()}
            variant="secondary"
            label={ending ? 'Closing…' : 'End voting'}
            style={styles.results}
          />
        ) : null}

        {top && votingOpen ? (
          <View style={styles.footer} {...({ dataSet: { mgVoteBar: true } } as object)}>
            <VoteButtons onChoice={onPick} current={priorChoice} />
          </View>
        ) : null}
      </View>
          );
        }}
      </SeatGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingTop: 4, paddingBottom: 0 },
  header: { gap: 6, flexShrink: 0 },
  deck: { flex: 1, minHeight: 300, marginTop: 8, position: 'relative' },
  stack1: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 280,
    borderRadius: 24,
    backgroundColor: '#101014',
    opacity: 0.55,
    transform: [{ translateY: 10 }, { scale: 0.96 }],
    zIndex: 1,
  },
  stack2: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 280,
    borderRadius: 24,
    backgroundColor: '#0C0C0F',
    opacity: 0.3,
    transform: [{ translateY: 20 }, { scale: 0.92 }],
    zIndex: 0,
  },
  empty: {
    ...controls.panel,
    minHeight: 180,
    justifyContent: 'center',
    gap: 12,
  },
  footer: {
    position: 'sticky' as 'relative',
    bottom: 0,
    zIndex: 20,
    backgroundColor: 'rgba(9,9,11,.96)',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  composer: { paddingVertical: 8, gap: 8 },
  area: { minHeight: 72, textAlignVertical: 'top' },
  results: { marginTop: 12, marginBottom: 12 },
});
