import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/lib/theme';

const STAGES = ['Thoughts', 'Vote', 'Results'] as const;

export type RoomStage = 'thoughts' | 'vote' | 'results';

function stageIndex(stage: RoomStage) {
  if (stage === 'vote') return 1;
  if (stage === 'results') return 2;
  return 0;
}

export function RoomStageBar({ stage }: { stage: RoomStage }) {
  const current = stageIndex(stage);
  const progress = current / (STAGES.length - 1);

  return (
    <View style={styles.wrap} accessibilityRole="progressbar">
      <View style={styles.rail}>
        <View style={[styles.railFill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.row}>
        {STAGES.map((label, i) => {
          const on = i === current;
          const done = i < current;
          return (
            <View key={label} style={styles.stage}>
              <View style={[styles.dot, done && styles.dotDone, on && styles.dotOn]} />
              <Text style={[styles.label, on && styles.labelOn, done && styles.labelDone]}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 4, paddingBottom: 2 },
  rail: {
    height: 2,
    marginHorizontal: '16%',
    marginBottom: -9,
    backgroundColor: 'rgba(63, 63, 70, 0.9)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  railFill: {
    height: 2,
    backgroundColor: colors.accentHover,
  },
  row: { flexDirection: 'row' },
  stage: { flex: 1, alignItems: 'center', gap: 8 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.faint,
  },
  dotDone: {
    backgroundColor: colors.accentHover,
    borderColor: colors.accentHover,
  },
  dotOn: {
    backgroundColor: colors.ink,
    borderColor: colors.accentHover,
    transform: [{ scale: 1.15 }],
  },
  label: {
    fontFamily: fonts.medium,
    fontWeight: '500',
    fontSize: 12,
    color: colors.faint,
  },
  labelOn: { color: colors.ink },
  labelDone: { color: colors.muted },
});
