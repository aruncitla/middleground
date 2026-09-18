import { StyleSheet, Text, View } from 'react-native';
import { colors, type } from '@/lib/theme';
import type { Participant, Vote } from '@/types/room';

type Props = {
  participants: Participant[];
  votes?: Vote[];
  showVotes?: boolean;
};

function Bar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

export function ParticipationStats({ participants, votes = [], showVotes = false }: Props) {
  const total = participants.length;
  const shared = participants.filter((p) => (p.entryCount ?? 0) > 0).length;
  const voted = new Set(votes.map((v) => v.uid)).size;
  if (total === 0) return null;

  const waitingShare = total - shared;
  const waitingVote = total - voted;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={type.body}>
          {shared} of {total} shared thoughts
          {waitingShare > 0 ? ` · ${waitingShare === 1 ? '1 hasn’t yet' : `${waitingShare} haven’t yet`}` : ''}
        </Text>
        <Bar value={shared} total={total} />
      </View>
      {showVotes ? (
        <View style={styles.row}>
          <Text style={type.body}>
            {voted} of {total} voted
            {waitingVote > 0 ? ` · ${waitingVote === 1 ? '1 hasn’t yet' : `${waitingVote} haven’t yet`}` : ''}
          </Text>
          <Bar value={voted} total={total} />
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
