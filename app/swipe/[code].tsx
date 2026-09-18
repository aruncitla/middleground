import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { ParticipationStats } from '@/components/ParticipationStats';
import { RoomStageBar } from '@/components/RoomStageBar';
import { Screen } from '@/components/Screen';
import { SwipeCard } from '@/components/SwipeCard';
import { VoteButtons } from '@/components/VoteButtons';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { useRoom } from '@/hooks/useRoom';
import { isGenericFillerText } from '@/lib/cardQuality';
import { formatVoteDeadline } from '@/lib/formatEnds';
import { castVote, closeVotingIfOpen, ensureVoteDeadline, markFinishedSwiping } from '@/lib/roomService';
import { colors, controls, type } from '@/lib/theme';

export default function SwipeCardScreen() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = String(raw ?? '').toUpperCase();
  const router = useRouter();
  const { user, loading: authLoading, error: authError } = useGuestAuth();
  const { room, participants, cards, votes, ready } = useRoom(code);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const endingRef = useRef(false);

  const myChoiceByCard = useMemo(() => {
    const map = new Map<string, 'agree' | 'disagree'>();
    if (!user) return map;
    for (const vote of votes) {
      if (vote.uid === user.uid) map.set(vote.cardId, vote.choice);
    }
    return map;
  }, [votes, user]);

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
  const isHost = Boolean(user && room && user.uid === room.hostId);
  const votedIds = useMemo(() => new Set(votes.map((v) => v.uid)), [votes]);
  const allVoted = participants.length > 0 && votedIds.size >= participants.length;
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

  const vote = async (cardId: string, choice: 'agree' | 'disagree') => {
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

  const toSummary = async () => {
    try {
      await closeVotingIfOpen(code);
    } catch (e) {
      Alert.alert('Could not open results', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Screen loading={authLoading || !ready} error={authError}>
      <View style={styles.page}>
        <View style={styles.header}>
          <BrandMark size="sm" />
          <RoomStageBar stage="vote" />
          <Text style={type.kicker}>Vote</Text>
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
          <ParticipationStats participants={participants} votes={votes} showVotes />
        </View>

        <View style={styles.deck}>
          {voteTimedOut ? (
            <View style={styles.empty}>
              <Text style={type.title}>Voting ended</Text>
              <Text style={type.body}>Heading to results…</Text>
            </View>
          ) : top ? (
            <>
              {next ? <SwipeCard card={next} stacked onVote={() => {}} /> : null}
              <SwipeCard card={top} onVote={(c) => void vote(top.id, c)} />
            </>
          ) : (
            <View style={styles.empty}>
              <Text style={type.title}>You’re in</Text>
              <Text style={type.body}>Opening results…</Text>
            </View>
          )}
        </View>

        {top && votingOpen ? (
          <VoteButtons onAgree={() => void vote(top.id, 'agree')} onDisagree={() => void vote(top.id, 'disagree')} />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingTop: 12, paddingBottom: 20, gap: 8 },
  header: { paddingHorizontal: 20, gap: 6 },
  closed: { ...type.footnote, color: colors.accentHover },
  deck: { flex: 1, minHeight: 280, marginTop: 8 },
  empty: {
    marginHorizontal: 20,
    ...controls.panel,
    minHeight: 220,
    justifyContent: 'center',
    gap: 12,
  },
  results: { marginHorizontal: 20, marginTop: 12 },
});
