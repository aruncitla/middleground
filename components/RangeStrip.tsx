import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spectrum, type } from '@/lib/theme';
import { tickPosition } from '@/lib/voteChoice';
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
              {
                left: `${tickPosition(vote.choice, index + vote.cardId.length) * 100}%`,
                backgroundColor:
                  vote.choice === 'disagree' ? colors.coral : vote.choice === 'agree' ? colors.teal : colors.gold,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.labels}>
        <Text style={[styles.caption, { color: colors.coral }]}>Not for me</Text>
        <Text style={[styles.caption, { color: colors.gold }]}>Maybe</Text>
        <Text style={[styles.caption, { color: colors.teal }]}>Works for me</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginVertical: 6 },
  track: {
    height: 18,
    justifyContent: 'center',
    backgroundColor: '#18181B',
    borderRadius: 999,
    paddingHorizontal: 2,
  },
  bar: {
    height: 6,
    borderRadius: 999,
    opacity: 0.85,
  },
  tick: {
    position: 'absolute',
    width: 8,
    height: 8,
    marginLeft: -4,
    borderRadius: 4,
    top: 5,
    boxShadow: '0 0 8px rgba(255,255,255,0.25)',
  },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  caption: { ...type.kicker, fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase' },
});
