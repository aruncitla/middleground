import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ConsensusSummaryCard, phraseFromCardText } from '@/components/ConsensusSummaryCard';
import { Screen } from '@/components/Screen';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { useRoom } from '@/hooks/useRoom';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { ParticipationStats } from '@/components/ParticipationStats';
import { RoomStageBar } from '@/components/RoomStageBar';
import { VoteButtons } from '@/components/VoteButtons';
import { isGenericFillerText } from '@/lib/cardQuality';
import { formatVoteDeadline } from '@/lib/formatEnds';
import { shareConsensusCard } from '@/lib/shareConsensus';
import { castVote, closeVotingIfOpen, joinRoom, recordUnanimousAgreements, startRoundTwo } from '@/lib/roomService';
import { colors, controls, type } from '@/lib/theme';
import type { Card } from '@/types/room';

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
  const { room, cards, participants, votes, agreements, ready } = useRoom(code);
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [pendingDiscussionId, setPendingDiscussionId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const cardRef = useRef<View>(null);
  const endingRef = useRef(false);

  const reportCards = useMemo(
    () => cards.filter((c) => !isGenericFillerText(c.text)),
    [cards],
  );

  const grouped = useMemo(() => {
    const next: Record<Bucket, Card[]> = { everyone: [], many: [], some: [], none: [] };
    for (const card of reportCards) {
      const bucket = bucketFor(card);
      if (bucket) next[bucket].push(card);
    }
    return next;
  }, [reportCards]);
  const me = participants.find((p) => p.id === user?.uid);
  const isHost = Boolean(user && room && user.uid === room.hostId);
  const isEarly = room?.status === 'swiping';
  const resultsLocked = room?.status === 'summary';
  const voteEnds = room?.votesCloseAt;
  const voteTimedOut = Boolean(voteEnds && now >= voteEnds.getTime());
  const votingOpen = isEarly && !voteTimedOut;
  const votedIds = useMemo(() => new Set(votes.map((v) => v.uid)), [votes]);
  const waitingVote = Math.max(0, participants.length - votedIds.size);
  const allVoted = participants.length > 0 && waitingVote === 0;
  const canHostEnd = isHost && isEarly && (allVoted || voteTimedOut);
  const myChoiceByCard = useMemo(() => {
    const map = new Map<string, 'agree' | 'disagree'>();
    if (!user) return map;
    for (const vote of votes) {
      if (vote.uid === user.uid) map.set(vote.cardId, vote.choice);
    }
    return map;
  }, [votes, user]);
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

  useEffect(() => {
    if (!room) return;
    if (room.status === 'lobby' || room.status === 'synthesizing') router.replace(`/lobby/${code}`);
  }, [room, code, router]);

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
    setBusy(true);
    try {
      await closeVotingIfOpen(code);
    } catch (e) {
      Alert.alert('Could not end voting', e instanceof Error ? e.message : String(e));
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
        Alert.alert('Ready to share', 'Link copied. If an image downloaded, attach it in WhatsApp or any chat.');
      }
    } catch (e) {
      Alert.alert('Could not share', e instanceof Error ? e.message : String(e));
    } finally {
      setSharing(false);
    }
  };

  const onVote = async (cardId: string, choice: 'agree' | 'disagree') => {
    if (!user || busy || !votingOpen) return;
    setBusy(true);
    try {
      await castVote(code, user.uid, cardId, choice);
    } catch (e) {
      Alert.alert('Vote failed', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
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
      Alert.alert('Could not start', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onAskStartDiscussion = (card: Card) => {
    setPendingDiscussionId(card.id);
  };

  return (
    <Screen loading={authLoading || !ready} error={authError}>
      <ScrollView contentContainerStyle={styles.page}>
        <BrandMark size="sm" />
        <RoomStageBar stage="results" />
        <Text style={type.kicker}>{isEarly ? 'Early results' : 'Results'}</Text>
        <Text style={type.title}>{room?.topic}</Text>
        {isEarly ? (
          <>
            <Text style={type.body}>
              {voteTimedOut
                ? 'Time’s up — locking results…'
                : waitingVote === 0
                  ? isHost
                    ? 'Everyone has voted. You can close this out.'
                    : 'Everyone has voted.'
                  : waitingVote === 1
                    ? 'Voting is still open · 1 person hasn’t voted yet.'
                    : `Voting is still open · ${waitingVote} people haven’t voted yet.`}
            </Text>
            {voteEnds ? <Text style={type.body}>{formatVoteDeadline(voteEnds, now)}</Text> : null}
            <ParticipationStats participants={participants} votes={votes} showVotes />
            {isHost ? (
              <>
                <Button
                  disabled={busy || !canHostEnd}
                  onPress={() => void onEndVoting()}
                  label={busy ? 'Closing…' : voteTimedOut ? 'Lock results' : 'End voting'}
                />
                {!allVoted && !voteTimedOut ? (
                  <Text style={type.footnote}>You can end voting once everyone has voted, or when time runs out.</Text>
                ) : null}
              </>
            ) : null}
            {votingOpen ? (
              <Text style={type.footnote}>Change any vote below until voting ends.</Text>
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
              participantCount={participants.length}
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

        {SECTIONS.map((section) => {
          const rows = grouped[section.id];
          if (rows.length === 0) return null;
          if (!isEarly && !isFollowUp && section.id === 'everyone') return null;
          const canStart = !isEarly && section.id !== 'everyone';
          return (
            <View key={section.id} style={styles.section}>
              <Text style={[type.section, { color: section.labelColor }]}>{section.title}</Text>
              <Text style={type.footnote}>{isEarly ? 'Your vote is highlighted.' : section.hint}</Text>
              {rows.map((card) => (
                  <View key={card.id} style={styles.card}>
                    <Text style={[styles.kind, { color: section.labelColor }]}>
                      {card.agreeCount} yes · {card.disagreeCount} no
                    </Text>
                    <Text style={styles.body}>{card.text}</Text>
                    {votingOpen ? (
                      <VoteButtons
                        compact
                        current={myChoiceByCard.get(card.id)}
                        onAgree={() => void onVote(card.id, 'agree')}
                        onDisagree={() => void onVote(card.id, 'disagree')}
                      />
                    ) : canStart && pendingDiscussionId === card.id ? (
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
                    ) : canStart ? (
                      <Button
                        disabled={busy}
                        variant="secondary"
                        onPress={() => onAskStartDiscussion(card)}
                        label="Discuss this further"
                      />
                    ) : null}
                  </View>
                ))}
            </View>
          );
        })}
      </ScrollView>
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
