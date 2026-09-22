import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, type } from '@/lib/theme';

type Props = {
  onDisagree: () => void;
  onAgree: () => void;
  current?: 'agree' | 'disagree';
  compact?: boolean;
};

function VoteHit({
  label,
  hint,
  selected,
  tone,
  onPress,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  tone: 'yes' | 'no';
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        tone === 'yes' ? styles.yes : styles.no,
        selected && styles.choiceOn,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, tone === 'yes' ? styles.yesLabel : styles.noLabel, selected && styles.labelOn]}>
        {label}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </Pressable>
  );
}

export function VoteButtons({ onDisagree, onAgree, current, compact }: Props) {
  return (
    <View style={[styles.row, compact && styles.compact]}>
      <VoteHit
        label="NO"
        hint={compact ? undefined : '← swipe left'}
        selected={current === 'disagree'}
        tone="no"
        onPress={onDisagree}
      />
      <VoteHit
        label="YES"
        hint={compact ? undefined : 'swipe right →'}
        selected={current === 'agree'}
        tone="yes"
        onPress={onAgree}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, zIndex: 20, elevation: 20 },
  compact: { paddingHorizontal: 0 },
  choice: {
    flex: 1,
    minHeight: 56,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    backgroundColor: colors.card,
  },
  yes: { borderColor: 'rgba(34, 197, 94, 0.55)' },
  no: { borderColor: 'rgba(239, 68, 68, 0.55)' },
  choiceOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accentHover,
  },
  pressed: { opacity: 0.85 },
  label: { ...type.button, fontSize: 16, letterSpacing: 0.8 },
  yesLabel: { color: '#4ade80' },
  noLabel: { color: '#f87171' },
  labelOn: { color: colors.ink },
  hint: { ...type.footnote, fontSize: 11, marginTop: 2, color: colors.muted },
});
