import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { colors, type } from '@/lib/theme';

type Props = {
  onDisagree: () => void;
  onAgree: () => void;
  current?: 'agree' | 'disagree';
  compact?: boolean;
};

function VoteHit({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onPress)();
  });
  return (
    <GestureDetector gesture={tap}>
      <View
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={[styles.choice, selected && styles.choiceOn]}
      >
        <Text style={[styles.label, selected && styles.labelOn]}>{label}</Text>
      </View>
    </GestureDetector>
  );
}

export function VoteButtons({ onDisagree, onAgree, current, compact }: Props) {
  return (
    <View style={[styles.row, compact && styles.compact]}>
      <VoteHit label="← No" selected={current === 'disagree'} onPress={onDisagree} />
      <VoteHit label="Yes →" selected={current === 'agree'} onPress={onAgree} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, zIndex: 20, elevation: 20 },
  compact: { paddingHorizontal: 0 },
  choice: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: 'transparent',
  },
  choiceOn: {
    borderColor: colors.accentHover,
    backgroundColor: colors.accent,
    boxShadow: '0 10px 28px rgba(99, 102, 241, 0.18)',
  },
  label: { ...type.button, color: colors.muted },
  labelOn: { color: colors.ink },
});
