import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import { notify } from '@/lib/notify';
import { avatarById, colors, controls, type } from '@/lib/theme';
import { containerCodeOf, castVote, closeVotingIfOpen, ensureVoteDeadline, markFinishedSwiping, reopenThoughts } from '@/lib/roomService';
import {
  allSeatsCompletedDeck,
  choiceForSeat,
  mergeVotes,
  optimisticVote,
  rosterSeatIds,
  sortCards,
  voteKey,
} from '@/lib/voteTally';
import type { Card, Vote } from '@/types/room';

export default function SwipeCardScreen() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = String(raw ?? '').toUpperCase();
  const router = useRouter();
  const { user, loading: authLoading, error: authError } = useGuestAuth();
  const { room, participants, entries, cards, votes, seats, ready } = useRoom(code);
  const container = room ? containerCodeOf(room) : undefined;
  const [activeSeatId, setActiveSeatId] = useState<string | null>(null);
  const [localVotes, setLocalVotes] = useState<Vote[]>([]);
  const [ending, setEnding] = useState(false);
  const [now, setNow] = useState(Date.now());
  const endingRef = useRef(false);

  useEffect(() => {
    setLocalVotes([]);
  }, [code]);

  const mergedVotes = useMemo(() => mergeVotes(votes, localVotes), [votes, localVotes]);
  const visibleCards = useMemo(
    () => sortCards(cards.filter((c) => !isGenericFillerText(c.text))),
    [cards],
  );
  const cardIds = useMemo(() => visibleCards.map((card) => card.id), [visibleCards]);
  const rosterIds = useMemo(() => rosterSeatIds(seats, participants), [seats, participants]);

  const remainingForActive = useMemo(() => {
    if (!activeSeatId) return visibleCards;
    return visibleCards.filter((card) => !choiceForSeat(mergedVotes, activeSeatId, card.id));
  }, [visibleCards, mergedVotes, activeSeatId]);

  const myEntryIds = useMemo(() => {
    if (!user) return new Set<string>();
    return new Set(entries.filter((e) => e.authorId === user.uid).map((e) => e.id));
  }, [entries, user]);
  const cardIsMine = (card: Card | undefined) =>
    Boolean(card?.sourceEntryIds?.some((id) => myEntryIds.has(id)));
  const isHost = Boolean(user && room && user.uid === room.hostId);
  const allVoted = allSeatsCompletedDeck(rosterIds, mergedVotes, cardIds);

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
    if (!user || !activeSeatId || remainingForActive.length > 0 || visibleCards.length === 0) return;
    void markFinishedSwiping(code, user.uid).catch(() => {});
  }, [user, activeSeatId, remainingForActive.length, visibleCards.length, code]);

  const vote = async (cardId: string, choice: 'agree' | 'disagree', seatId?: string) => {
    const sid = seatId;
    if (!user || !sid || !votingOpen) return;
    setActiveSeatId(sid);
    const nextVote = optimisticVote({ uid: user.uid, seatId: sid, cardId, choice });
    setLocalVotes((prev) => mergeVotes(prev, [nextVote]));
    try {
      await castVote(code, user.uid, cardId, choice, sid);
    } catch (e) {
      setLocalVotes((prev) => prev.filter((v) => voteKey(v) !== voteKey(nextVote)));
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
          const remaining = visibleCards.filter(
            (card) => !choiceForSeat(mergedVotes, session.seat.id, card.id),
          );
          const top = remaining[0];
          const next = remaining[1];
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
          {remaining.length === visibleCards.length && mergedVotes.length > 0 ? (
            <Text style={type.footnote}>You’re voting on what the group already wrote.</Text>
          ) : null}
          <Text style={type.body}>
            {Math.max(visibleCards.length - remaining.length, 0)} / {visibleCards.length} · {remaining.length} left
          </Text>
          {voteEnds ? (
            <Text style={voteTimedOut ? styles.closed : type.footnote}>
              {voteTimedOut ? 'Time’s up — wrapping up votes…' : formatVoteDeadline(voteEnds)}
            </Text>
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
              <Text style={type.body}>
                {allVoted || voteTimedOut
                  ? 'Everyone in so far has voted.'
                  : 'This seat is done. Switch seat to keep voting as someone else, or peek at early results.'}
              </Text>
              {votingOpen ? (
                <Button
                  variant="secondary"
                  label={allVoted ? 'See results' : 'See early results'}
                  onPress={() => router.push(`/summary/${code}`)}
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
