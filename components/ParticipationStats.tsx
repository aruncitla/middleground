import { StyleSheet, Text, View } from 'react-native';
import { seatsThatShared, thoughtCount } from '@/lib/entries';
import { rosterSeatIds, seatsStartedCount } from '@/lib/voteTally';
import { colors, type } from '@/lib/theme';
import type { Entry, Participant, Seat, Vote } from '@/types/room';

type Props = {
  participants: Participant[];
  seats?: Seat[];
  entries?: Entry[];
  votes?: Vote[];
  cardIds?: string[];
  showVotes?: boolean;
  showShare?: boolean;
};

function Bar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

export function ParticipationStats({
  participants,
  seats,
  entries = [],
  votes = [],
  cardIds = [],
  showVotes = false,
  showShare = true,
}: Props) {
  const roster = seats?.length ? seats : participants;
  const total = roster.length;
  const thoughts = thoughtCount(entries);
  const shared = seats?.length
    ? seatsThatShared(seats, entries)
    : participants.filter((p) => entries.some((entry) => entry.authorId === p.id)).length;
  const voted = seatsStartedCount(rosterSeatIds(seats ?? [], participants), votes, cardIds);
  if (total === 0 && thoughts === 0) return null;

  const waitingShare = Math.max(0, total - shared);
  const waitingVote = Math.max(0, total - voted);

  return (
    <View style={styles.wrap}>
      {showShare ? (
        <View style={styles.row}>
          <Text style={type.body}>
            {thoughts} {thoughts === 1 ? 'thought' : 'thoughts'}
            {total > 0 ? ` · ${shared} of ${total} shared` : ''}
            {waitingShare > 0 ? ` · ${waitingShare === 1 ? '1 hasn’t yet' : `${waitingShare} haven’t yet`}` : ''}
          </Text>
          <Bar value={shared} total={Math.max(total, 1)} />
        </View>
      ) : thoughts > 0 ? (
        <Text style={type.body}>
          {thoughts} {thoughts === 1 ? 'thought' : 'thoughts'}
        </Text>
      ) : null}
      {showVotes ? (
        <View style={styles.row}>
          <Text style={type.body}>
            {voted} of {total} voted
            {waitingVote > 0 ? ` · ${waitingVote === 1 ? '1 hasn’t yet' : `${waitingVote} haven’t yet`}` : ''}
          </Text>
          <Bar value={voted} total={Math.max(total, 1)} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { gap: 6 },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(63, 63, 70, 0.85)',
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentHover,
  },
});
