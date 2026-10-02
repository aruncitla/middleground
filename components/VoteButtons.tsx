import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, type } from '@/lib/theme';
import { VOTE_LABELS, type VoteChoice } from '@/lib/voteChoice';

type Props = {
  onChoice: (choice: VoteChoice) => void;
  current?: VoteChoice;
};

function Hit({
  choice,
  selected,
  onPress,
}: {
  choice: VoteChoice;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={VOTE_LABELS[choice]}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        choice === 'agree' && styles.yes,
        choice === 'disagree' && styles.no,
        choice === 'maybe' && styles.mid,
        selected && styles.choiceOn,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.label,
          choice === 'agree' && styles.yesLabel,
          choice === 'disagree' && styles.noLabel,
          choice === 'maybe' && styles.midLabel,
        ]}
      >
        {choice === 'disagree' ? '← No' : choice === 'maybe' ? '↓ Maybe' : 'Yes →'}
      </Text>
    </Pressable>
  );
}

export function VoteButtons({ onChoice, current }: Props) {
  return (
    <View style={styles.row}>
      <Hit choice="disagree" selected={current === 'disagree'} onPress={() => onChoice('disagree')} />
      <Hit choice="maybe" selected={current === 'maybe'} onPress={() => onChoice('maybe')} />
      <Hit choice="agree" selected={current === 'agree'} onPress={() => onChoice('agree')} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, zIndex: 20, elevation: 20 },
  choice: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yes: { backgroundColor: colors.teal },
  no: { backgroundColor: '#3A1518' },
  mid: { backgroundColor: '#2A2416' },
  choiceOn: { opacity: 1, boxShadow: '0 0 0 2px rgba(255,255,255,0.25)' },
  pressed: { opacity: 0.85 },
  label: { ...type.button, fontSize: 13, letterSpacing: 0.1, textAlign: 'center' },
  yesLabel: { color: colors.onTeal },
  noLabel: { color: colors.coral },
  midLabel: { color: colors.gold },
});
