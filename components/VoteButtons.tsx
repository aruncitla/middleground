import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, type } from '@/lib/theme';

type Props = {
  onDisagree: () => void;
  onAgree: () => void;
  current?: 'agree' | 'disagree';
  compact?: boolean;
};

export function VoteButtons({ onDisagree, onAgree, current, compact }: Props) {
  return (
    <View style={[styles.row, compact && styles.compact]}>
      <Pressable
        onPress={onDisagree}
        style={[styles.choice, current === 'disagree' && styles.choiceOn]}
        accessibilityRole="button"
        accessibilityState={{ selected: current === 'disagree' }}
      >
        <Text style={[styles.label, current === 'disagree' && styles.labelOn]}>← No</Text>
      </Pressable>
      <Pressable
        onPress={onAgree}
        style={[styles.choice, current === 'agree' && styles.choiceOn]}
        accessibilityRole="button"
        accessibilityState={{ selected: current === 'agree' }}
      >
        <Text style={[styles.label, current === 'agree' && styles.labelOn]}>Yes →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 20 },
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
