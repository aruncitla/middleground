import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ConsensusSummaryCard } from '@/components/ConsensusSummaryCard';
import { Screen } from '@/components/Screen';
import { SeatGate } from '@/components/SeatGate';
import { VoteScale } from '@/components/VoteScale';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { useRoom } from '@/hooks/useRoom';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { ParticipationStats } from '@/components/ParticipationStats';
import { RoomStageBar } from '@/components/RoomStageBar';
import { CountdownPill } from '@/components/CountdownPill';
import { votableCardIdsForSeat, votingUnlocked } from '@/lib/entries';
import { isGenericFillerText } from '@/lib/cardQuality';
import { liveDeadline } from '@/lib/formatEnds';
import { notify } from '@/lib/notify';
import { shareConsensusCard } from '@/lib/shareConsensus';
import { isExampleCard } from '@/lib/starterCards';
import { avatarById } from '@/lib/theme';
import { containerCodeOf, closeVotingIfOpen, joinRoom, recordUnanimousAgreements, reopenThoughts, startRoundTwo } from '@/lib/roomService';
import {
  choiceForSeat,
  rosterSeatIds,
  seatsFinishedCount,
  seatsStartedCount,
  seatCompletedDeck,
  seatStartedVoting,
  sortCards,
  voteScreenForSeat,
  withVoteTallies,
} from '@/lib/voteTally';
import { discussionScore } from '@/lib/voteChoice';
import { colors, controls, type } from '@/lib/theme';
import type { Card } from '@/types/room';

export default function SummaryScreen() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = String(raw ?? '').toUpperCase();
  const router = useRouter();
  const { user, loading: authLoading, error: authError } = useGuestAuth();
  const { room, cards, participants, entries, votes, seats, ready } = useRoom(code);
  const container = room ? containerCodeOf(room) : undefined;
  const [activeSeatId, setActiveSeatId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ending, setEnding] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [pendingDiscussionId, setPendingDiscussionId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const cardRef = useRef<View>(null);
  const endingRef = useRef(false);

  const mergedVotes = votes;
  const talliedCards = useMemo(() => withVoteTallies(cards, mergedVotes), [cards, mergedVotes]);
  const reportCards = useMemo(
    () => sortCards(talliedCards.filter((c) => !isGenericFillerText(c.text) && !isExampleCard(c))),
    [talliedCards],
  );
  const cardIds = useMemo(() => reportCards.map((card) => card.id), [reportCards]);
  const rosterIds = useMemo(() => rosterSeatIds(seats, participants), [seats, participants]);
  const me = participants.find((p) => p.id === user?.uid);
  const isHost = Boolean(user && room && user.uid === room.hostId);
  const unlocked = votingUnlocked(entries);
  const inPlay = room?.status === 'swiping' || (room?.status === 'lobby' && unlocked);
  const isEarly = Boolean(inPlay);
  const resultsLocked = room?.status === 'summary';
  const voteEnds = liveDeadline(room);
  const voteTimedOut = Boolean(voteEnds && now >= voteEnds.getTime());
  const votingOpen = Boolean(inPlay && !voteTimedOut);
  const finishedCount = seatsFinishedCount(rosterIds, mergedVotes, cardIds);
  const startedCount = seatsStartedCount(rosterIds, mergedVotes, cardIds);
  const waitingVote = Math.max(0, rosterIds.length - finishedCount);
  const allVoted =
    rosterIds.length > 0 &&
    rosterIds.every((id) => {
      const needed = votableCardIdsForSeat(reportCards, entries, id);
      return needed.length === 0 || seatCompletedDeck(mergedVotes, id, needed);
    });
  const canHostEnd = isHost && isEarly && (allVoted || voteTimedOut);
  const hasVotes = reportCards.some((c) => (c.agreeCount ?? 0) + (c.disagreeCount ?? 0) + (c.maybeCount ?? 0) > 0);
  const isFollowUp = Boolean(room?.parentRoomId);
  const score = discussionScore(reportCards);
  const people = seats.length || participants.length;

  const leftoverForActive = useMemo(() => {
    if (!activeSeatId) return 0;
    const needed = votableCardIdsForSeat(reportCards, entries, activeSeatId);
    return needed.filter((id) => !choiceForSeat(mergedVotes, activeSeatId, id)).length;
  }, [reportCards, entries, mergedVotes, activeSeatId]);

  useEffect(() => {
    if (!room) return;
    if (room.status === 'synthesizing') router.replace(`/lobby/${code}`);
    if (room.status === 'lobby' && !unlocked) router.replace(`/lobby/${code}`);
  }, [room, unlocked, code, router]);

  useEffect(() => {
    if (!votingOpen || !activeSeatId || cardIds.length === 0) return;
    const hasStarted = seatStartedVoting(mergedVotes, activeSeatId, votableCardIdsForSeat(reportCards, entries, activeSeatId));
    if (voteScreenForSeat({ leftover: leftoverForActive, hasStarted, again: false }) === 'swipe') {
      router.replace(`/swipe/${code}`);
    }
  }, [votingOpen, activeSeatId, leftoverForActive, cardIds, mergedVotes, entries, reportCards, code, router]);

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
    if (!room || !user || room.status !== 'summary') return;
    const target = room.parentRoomId ?? code;
    void recordUnanimousAgreements({
      targetCode: target,
      sourceCode: code,
      round: room.round,
      parentCardId: room.parentCardId,
      cards,
    }).catch(() => {});
  }, [room, user, code, cards]);

  const onEndVoting = async () => {
    if (!canHostEnd) return;
    setEnding(true);
    try {
      await closeVotingIfOpen(code);
    } catch (e) {
      notify('Could not end voting', e instanceof Error ? e.message : String(e));
    } finally {
      setEnding(false);
    }
  };

  const onReopen = async () => {
    setBusy(true);
    try {
      await reopenThoughts(code);
    } catch (e) {
      notify('Could not reopen', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onShare = async () => {
    if (!room) return;
    setSharing(true);
    try {
      const result = await shareConsensusCard(cardRef.current, room.topic);
      if (result === 'copied') {
        notify('Ready to share', 'Link copied. If an image downloaded, attach it in WhatsApp or any chat.');
      }
    } catch (e) {
      notify('Could not share', e instanceof Error ? e.message : String(e));
    } finally {
      setSharing(false);
    }
  };

  const onStartDiscussion = async (card: Card) => {
    if (!user) return;
    setBusy(true);
    try {
      const next = await startRoundTwo(code, user.uid, card, participants);
      await joinRoom(next, user.uid, me?.displayName || 'Host', me?.avatarId || 'fox');
      router.replace(`/lobby/${next}`);
    } catch (e) {
      notify('Could not start', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
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
          const seatId = session.seat?.id;
          return (
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
        <BrandMark size="sm" fromMark={!isEarly} />
        <RoomStageBar stage="results" />
        <Text style={type.kicker}>{isEarly ? 'Live verdict' : 'Verdict'}</Text>
        <Pressable
          onPress={() =>
            router.push(`/room/${room?.containerId || room?.parentRoomId || code}${code !== (room?.containerId || room?.parentRoomId || code) ? `?topic=${code}` : ''}`)
          }
          accessibilityRole="button"
        >
          <Text style={controls.ghostText}>Room home</Text>
        </Pressable>
        {session.seat ? (
          <Pressable onPress={() => session.setSwitching(true)} accessibilityRole="button">
            <Text style={controls.ghostText}>
              {avatar?.emoji} {session.seat.displayName} · Switch
            </Text>
          </Pressable>
        ) : null}
        <Text style={type.title}>{room?.topic}</Text>
        <View style={styles.scoreWrap}>
          <Text style={styles.scoreKicker}>Discussion score</Text>
          <Text style={styles.score}>{hasVotes ? score : '—'}</Text>
        </View>
        <ParticipationStats
          participants={participants}
          seats={session.seats}
          entries={entries}
          votes={mergedVotes}
          cardIds={cardIds}
          showVotes
        />
        {isEarly ? (
          <>
            <Text style={type.body}>
              {voteTimedOut
                ? 'Time’s up — locking results…'
                : allVoted
                  ? isHost
                    ? 'Everyone has voted. You can close this out.'
                    : 'Everyone has voted.'
                  : waitingVote === 1
                    ? startedCount > 0
                      ? 'Voting is still open · 1 person still has cards left.'
                      : 'Voting is still open · 1 person hasn’t voted yet.'
                    : startedCount > 0
                      ? `Voting is still open · ${waitingVote} people still have cards left.`
                      : `Voting is still open · ${waitingVote} people haven’t voted yet.`}
            </Text>
            {voteEnds ? <CountdownPill endsAt={voteEnds} /> : null}
            {votingOpen && leftoverForActive > 0 && seatId && seatStartedVoting(mergedVotes, seatId, cardIds) ? (
              <>
                <Text style={type.body}>New thoughts came up for voting</Text>
                <Button label="Swipe again" onPress={() => router.push(`/swipe/${code}?again=1`)} />
              </>
            ) : votingOpen && leftoverForActive === 0 && seatId && seatStartedVoting(mergedVotes, seatId, cardIds) ? (
              <Button
                variant="secondary"
                label="Swipe again"
                onPress={() => router.push(`/swipe/${code}?again=review`)}
              />
            ) : votingOpen && leftoverForActive > 0 ? (
              <Button
                label="Vote on the thoughts"
                onPress={() => {
                  if (!session.seat) {
                    session.setSwitching(true);
                    return;
                  }
                  router.push(`/swipe/${code}`);
                }}
              />
            ) : null}
            {mergedVotes.length === 0 && votingOpen ? (
              <>
                <Button
                  disabled={busy}
                  variant="secondary"
                  label={busy ? 'Working…' : 'Back to sharing thoughts'}
                  onPress={() => void onReopen()}
                />
                <Text style={type.footnote}>No one has voted yet. You can reopen thoughts for everyone.</Text>
              </>
            ) : null}
            {isHost ? (
              <>
                <Button
                  disabled={ending || !canHostEnd}
                  onPress={() => void onEndVoting()}
                  label={ending ? 'Closing…' : voteTimedOut ? 'Lock results' : 'End voting'}
                />
                {!allVoted && !voteTimedOut ? (
                  <Text style={type.footnote}>You can end voting once everyone has voted, or when time runs out.</Text>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}

        {room && hasVotes ? (
          <>
            <ConsensusSummaryCard
              ref={cardRef}
              topic={room.topic}
              cards={reportCards}
              votes={mergedVotes}
              score={score}
              participantCount={people}
              elapsedLabel={isFollowUp ? 'Follow-up session' : 'from Middleground'}
            />
            <Button
              onPress={() => void onShare()}
              disabled={sharing}
              label={sharing ? 'Preparing…' : 'Share card'}
              style={styles.share}
            />
            <Text style={styles.shareHint}>
              Opens WhatsApp and other chats with a link to the app. On phones it can attach the card image too.
            </Text>
          </>
        ) : null}

        {isFollowUp ? (
          <Pressable onPress={() => router.replace(`/summary/${room?.parentRoomId}`)} accessibilityRole="button">
            <Text style={controls.ghostText}>Open {room?.parentRoomId}</Text>
          </Pressable>
        ) : null}

        {!hasVotes ? <Text style={type.body}>No votes yet.</Text> : null}

        <View style={styles.section}>
          {reportCards.map((card) => (
            <View key={card.id} style={styles.card}>
              <VoteScale card={card} votes={mergedVotes} />
              {seatId ? (
                <Text style={type.footnote}>
                  {choiceForSeat(mergedVotes, seatId, card.id) === 'agree'
                    ? 'You voted works for me'
                    : choiceForSeat(mergedVotes, seatId, card.id) === 'disagree'
                      ? 'You voted not for me'
                      : choiceForSeat(mergedVotes, seatId, card.id) === 'maybe'
                        ? 'You voted maybe'
                        : 'You haven’t voted on this yet'}
                </Text>
              ) : null}
              {resultsLocked && pendingDiscussionId === card.id ? (
                <View style={styles.confirm}>
                  <Text style={type.footnote}>Start a sub-discussion on this split?</Text>
                  <View style={styles.confirmRow}>
                    <Button
                      disabled={busy}
                      variant="secondary"
                      onPress={() => setPendingDiscussionId(null)}
                      label="Not now"
                      style={styles.confirmBtn}
                    />
                    <Button
                      disabled={busy}
                      onPress={() => void onStartDiscussion(card)}
                      label={busy ? 'Starting…' : 'Start'}
                      style={styles.confirmBtn}
                    />
                  </View>
                </View>
              ) : resultsLocked ? (
                <Button
                  disabled={busy}
                  variant="secondary"
                  onPress={() => setPendingDiscussionId(card.id)}
                  label="Discuss this further"
                />
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
          );
        }}
      </SeatGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 48, gap: 10 },
  section: { gap: 12, marginTop: 8 },
  card: {
    ...controls.panel,
    gap: 8,
  },
  scoreWrap: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.28)',
  },
  scoreKicker: { ...type.kicker, color: colors.amber },
  score: {
    color: colors.ink,
    fontSize: 52,
    fontFamily: 'Inter',
    fontWeight: '700',
    letterSpacing: -1.6,
    textShadowColor: 'rgba(245, 158, 11, 0.55)',
    textShadowRadius: 18,
  },
  share: {
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  shareHint: { ...type.footnote, maxWidth: 420, alignSelf: 'center' },
  confirm: { gap: 8, marginTop: 4 },
  confirmRow: { flexDirection: 'row', gap: 8 },
  confirmBtn: { flex: 1 },
});
