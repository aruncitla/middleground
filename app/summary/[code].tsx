import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ConsensusSummaryCard, phraseFromCardText } from '@/components/ConsensusSummaryCard';
import { Screen } from '@/components/Screen';
import { SeatGate } from '@/components/SeatGate';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { useRoom } from '@/hooks/useRoom';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { ParticipationStats } from '@/components/ParticipationStats';
import { RoomStageBar } from '@/components/RoomStageBar';
import { VoteButtons } from '@/components/VoteButtons';
import { isGenericFillerText } from '@/lib/cardQuality';
import { formatVoteDeadline } from '@/lib/formatEnds';
import { notify } from '@/lib/notify';
import { shareConsensusCard } from '@/lib/shareConsensus';
import { avatarById } from '@/lib/theme';
import { containerCodeOf, castVote, closeVotingIfOpen, joinRoom, recordUnanimousAgreements, reopenThoughts, startRoundTwo } from '@/lib/roomService';
import {
  allSeatsCompletedDeck,
  cardVotingComplete,
  choiceForSeat,
  mergeVotes,
  optimisticVote,
  rosterSeatIds,
  seatsFinishedCount,
  seatsStartedCount,
  sortCards,
  voteKey,
  withVoteTallies,
} from '@/lib/voteTally';
import { colors, controls, type } from '@/lib/theme';
import type { Card, Vote } from '@/types/room';

type Bucket = 'everyone' | 'many' | 'some' | 'none';

function voteTotal(card: Card) {
  return card.agreeCount + card.disagreeCount;
}

function bucketFor(card: Card): Bucket | null {
  const total = voteTotal(card);
  if (total <= 0) return null;
  if (card.agreeCount === 0) return 'none';
  if (card.disagreeCount === 0) return 'everyone';
  if (card.agreeCount > card.disagreeCount) return 'many';
  return 'some';
}

const SECTIONS: { id: Bucket; title: string; hint: string; labelColor: string }[] = [
  { id: 'everyone', title: 'Everyone agrees', hint: 'No nos.', labelColor: colors.accentHover },
  { id: 'many', title: 'Many agree', hint: 'A majority said yes — still a split.', labelColor: colors.muted },
  { id: 'some', title: 'Some agree', hint: 'Tied or a minority yes.', labelColor: colors.muted },
  { id: 'none', title: 'No one agrees', hint: 'Every vote was no.', labelColor: colors.faint },
];

export default function SummaryScreen() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = String(raw ?? '').toUpperCase();
  const router = useRouter();
  const { user, loading: authLoading, error: authError } = useGuestAuth();
  const { room, cards, participants, entries, votes, agreements, seats, ready } = useRoom(code);
  const container = room ? containerCodeOf(room) : undefined;
  const [activeSeatId, setActiveSeatId] = useState<string | null>(null);
  const [localVotes, setLocalVotes] = useState<Vote[]>([]);
  const [busy, setBusy] = useState(false);
  const [ending, setEnding] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [pendingDiscussionId, setPendingDiscussionId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const cardRef = useRef<View>(null);
  const endingRef = useRef(false);

  useEffect(() => {
    setLocalVotes([]);
  }, [code]);

  const mergedVotes = useMemo(() => mergeVotes(votes, localVotes), [votes, localVotes]);
  const talliedCards = useMemo(() => withVoteTallies(cards, mergedVotes), [cards, mergedVotes]);
  const reportCards = useMemo(
    () => sortCards(talliedCards.filter((c) => !isGenericFillerText(c.text))),
    [talliedCards],
  );
  const cardIds = useMemo(() => reportCards.map((card) => card.id), [reportCards]);
  const rosterIds = useMemo(() => rosterSeatIds(seats, participants), [seats, participants]);
  const me = participants.find((p) => p.id === user?.uid);
  const isHost = Boolean(user && room && user.uid === room.hostId);
  const isEarly = room?.status === 'swiping';
  const resultsLocked = room?.status === 'summary';
  const voteEnds = room?.votesCloseAt;
  const voteTimedOut = Boolean(voteEnds && now >= voteEnds.getTime());
  const votingOpen = isEarly && !voteTimedOut;
  const finishedCount = seatsFinishedCount(rosterIds, mergedVotes, cardIds);
  const startedCount = seatsStartedCount(rosterIds, mergedVotes, cardIds);
  const waitingVote = Math.max(0, rosterIds.length - finishedCount);
  const allVoted = allSeatsCompletedDeck(rosterIds, mergedVotes, cardIds);
  const canHostEnd = isHost && isEarly && (allVoted || voteTimedOut);
  const grouped = useMemo(() => {
    const next: Record<Bucket, Card[]> = { everyone: [], many: [], some: [], none: [] };
    for (const card of reportCards) {
      const bucket = bucketFor(card);
      if (bucket) next[bucket].push(card);
    }
    return next;
  }, [reportCards]);
  const hasVotes = reportCards.some((c) => voteTotal(c) > 0);
  const isFollowUp = Boolean(room?.parentRoomId);
  const splitCount = grouped.many.length + grouped.some.length + grouped.none.length;
  const agreedCount = grouped.everyone.length;
  const pointCount = agreedCount + splitCount;
  const sharePhrases = (isFollowUp ? reportCards : [...grouped.everyone, ...grouped.many, ...grouped.some, ...grouped.none])
    .filter((c) => voteTotal(c) > 0)
    .map((c) => ({
      label: phraseFromCardText(c.text),
      yes: c.agreeCount,
      total: voteTotal(c),
    }));
  const finalAgreement = useMemo(() => {
    const seen = new Set<string>();
    const rows: { id: string; text: string; note?: string }[] = [];
    const add = (id: string, text: string, note?: string) => {
      const key = text.trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      rows.push({ id, text, note });
    };
    if (!isFollowUp) {
      for (const card of grouped.everyone) add(card.id, card.text);
      for (const item of agreements) add(item.id, item.text, item.sourceRoomId !== code ? 'from a follow-up' : undefined);
    }
    return rows;
  }, [agreements, code, grouped.everyone, isFollowUp]);

  const leftoverForActive = useMemo(() => {
    if (!activeSeatId) return 0;
    return cardIds.filter((id) => !choiceForSeat(mergedVotes, activeSeatId, id)).length;
  }, [cardIds, mergedVotes, activeSeatId]);

  useEffect(() => {
    if (!room) return;
    if (room.status === 'lobby' || room.status === 'synthesizing') router.replace(`/lobby/${code}`);
  }, [room, code, router]);

  useEffect(() => {
    if (!votingOpen || !activeSeatId || cardIds.length === 0) return;
    if (leftoverForActive > 0) router.replace(`/swipe/${code}`);
  }, [votingOpen, activeSeatId, leftoverForActive, cardIds.length, code, router]);

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

  const onVote = async (cardId: string, choice: 'agree' | 'disagree', seatId?: string) => {
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

  const renderCard = (
    card: Card,
    opts: { seatId: string; label?: string; labelColor?: string; canStart?: boolean },
  ) => (
    <View key={card.id} style={styles.card}>
      {opts.label ? (
        <Text style={[styles.kind, { color: opts.labelColor || colors.accentHover }]}>{opts.label}</Text>
      ) : null}
      <Text style={[styles.kind, { color: opts.labelColor || colors.accentHover }]}>
        {card.agreeCount} yes · {card.disagreeCount} no
      </Text>
      {(card.sourceCount ?? card.sourceEntryIds?.length ?? 0) > 1 ? (
        <Text style={type.footnote}>
          {card.sourceCount ?? card.sourceEntryIds?.length} similar thoughts merged
        </Text>
      ) : null}
      <Text style={styles.body}>{card.text}</Text>
      {votingOpen ? (
        <VoteButtons
          compact
          current={choiceForSeat(mergedVotes, opts.seatId, card.id)}
          onAgree={() => void onVote(card.id, 'agree', opts.seatId)}
          onDisagree={() => void onVote(card.id, 'disagree', opts.seatId)}
        />
      ) : opts.canStart && pendingDiscussionId === card.id ? (
        <View style={styles.confirm}>
          <Text style={type.footnote}>
            Start a sub-discussion on this split? Everyone from this room is already in it.
          </Text>
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
      ) : opts.canStart ? (
        <Button
          disabled={busy}
          variant="secondary"
          onPress={() => setPendingDiscussionId(card.id)}
          label="Discuss this further"
        />
      ) : null}
    </View>
  );

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
          const seatId = session.seat.id;
          return (
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
        <BrandMark size="sm" />
        <RoomStageBar stage="results" />
        <Text style={type.kicker}>{isEarly ? 'Early results' : 'Results'}</Text>
        <Pressable
          onPress={() =>
            router.push(`/room/${room?.containerId || room?.parentRoomId || code}${code !== (room?.containerId || room?.parentRoomId || code) ? `?topic=${code}` : ''}`)
          }
          accessibilityRole="button"
        >
          <Text style={controls.ghostText}>Room home</Text>
        </Pressable>
        <Pressable onPress={() => session.setSwitching(true)} accessibilityRole="button">
          <Text style={controls.ghostText}>
            {avatar.emoji} {session.seat.displayName} · Switch seat
          </Text>
        </Pressable>
        <Text style={type.title}>{room?.topic}</Text>
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
            {voteEnds ? <Text style={type.body}>{formatVoteDeadline(voteEnds, now)}</Text> : null}
            <ParticipationStats
              participants={participants}
              seats={session.seats}
              entries={entries}
              votes={mergedVotes}
              cardIds={cardIds}
              showVotes
            />
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
            {votingOpen ? (
              <Text style={type.footnote}>Change any vote below until voting ends. Your vote is highlighted.</Text>
            ) : null}
          </>
        ) : null}
        {room && hasVotes && resultsLocked ? (
          <>
            <ConsensusSummaryCard
              ref={cardRef}
              topic={room.topic}
              subtopic={isEarly ? 'Early results' : room.round > 1 ? 'Consensus report · follow-up round' : 'Consensus report'}
              phrases={sharePhrases}
              agreedCount={agreedCount}
              pointCount={pointCount}
              participantCount={seats.length || participants.length}
              elapsedLabel={isFollowUp ? 'Follow-up session' : 'Group session'}
            />
            <Button
              onPress={() => void onShare()}
              disabled={sharing}
              label={sharing ? 'Preparing…' : 'Share card'}
              style={styles.share}
            />
            <Text style={styles.shareHint}>Opens WhatsApp and other chats with a link to the app. On phones it can attach the card image too.</Text>
          </>
        ) : null}
        {isFollowUp ? (
          <Pressable onPress={() => router.replace(`/summary/${room?.parentRoomId}`)} accessibilityRole="button">
            <Text style={controls.ghostText}>Unanimous yeses save to the original room · Open {room?.parentRoomId}</Text>
          </Pressable>
        ) : null}

        {!hasVotes ? <Text style={type.body}>No votes yet.</Text> : null}

        {finalAgreement.length > 0 && !isEarly ? (
          <View style={styles.section}>
            <Text style={type.section}>Final agreement</Text>
            <Text style={type.footnote}>What the group has locked in so far.</Text>
            {finalAgreement.map((item) => (
              <View key={item.id} style={styles.card}>
                {item.note ? <Text style={styles.kind}>{item.note}</Text> : (
                  <Text style={styles.kind}>Locked in</Text>
                )}
                <Text style={styles.body}>{item.text}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {isEarly
          ? reportCards.map((card) => {
              const complete = resultsLocked || cardVotingComplete(mergedVotes, rosterIds, card.id);
              const bucket = complete ? bucketFor(card) : null;
              const section = bucket ? SECTIONS.find((row) => row.id === bucket) : null;
              return renderCard(card, {
                seatId,
                label: section?.title,
                labelColor: section?.labelColor,
              });
            })
          : SECTIONS.map((section) => {
          const rows = grouped[section.id];
          if (rows.length === 0) return null;
          if (!isFollowUp && section.id === 'everyone') return null;
          const canStart = section.id !== 'everyone';
          return (
            <View key={section.id} style={styles.section}>
              <Text style={[type.section, { color: section.labelColor }]}>{section.title}</Text>
              <Text style={type.footnote}>{section.hint}</Text>
              {rows.map((card) =>
                renderCard(card, {
                  seatId,
                  labelColor: section.labelColor,
                  canStart,
                }),
              )}
            </View>
          );
        })}
      </ScrollView>
          );
        }}
      </SeatGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 48, gap: 10 },
  section: { gap: 8, marginTop: 8 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    backdropFilter: 'blur(24px)',
  },
  kind: { ...type.kicker, color: colors.accentHover },
  body: { ...type.section, fontSize: 16, lineHeight: 22 },
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
