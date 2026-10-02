import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spectrum, type } from '@/lib/theme';
import { tickPosition } from '@/lib/voteChoice';
import { VOTE_LABELS } from '@/lib/voteChoice';
import type { Vote } from '@/types/room';

type Props = {
  votes: Vote[];
};

export function RangeStrip({ votes }: Props) {
  return (
    <View style={styles.wrap} accessibilityLabel="Live vote range">
      <View style={styles.track}>
        <LinearGradient
          colors={[...spectrum]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.bar}
        />
        {votes.map((vote, index) => (
          <View
            key={vote.id || `${vote.seatId}-${vote.cardId}-${index}`}
            style={[
              styles.tick,
              { left: `${tickPosition(vote.choice, index + vote.cardId.length) * 100}%` },
            ]}
          />
        ))}
      </View>
      <View style={styles.labels}>
        <Text style={[styles.caption, { color: colors.coral }]}>{VOTE_LABELS.disagree}</Text>
        <Text style={[styles.caption, { color: colors.amber }]}>{VOTE_LABELS.maybe}</Text>
        <Text style={[styles.caption, { color: colors.teal }]}>{VOTE_LABELS.agree}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginVertical: 6 },
  track: {
    height: 10,
    justifyContent: 'center',
    borderRadius: 999,
    overflow: 'visible',
  },
  bar: {
    height: 10,
    borderRadius: 999,
  },
  tick: {
    position: 'absolute',
    width: 2,
    height: 14,
    marginLeft: -1,
    marginTop: -2,
    borderRadius: 999,
    top: 0,
    backgroundColor: '#FFFFFF',
  },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  caption: { ...type.kicker, fontSize: 10, letterSpacing: 0.4 },
});
