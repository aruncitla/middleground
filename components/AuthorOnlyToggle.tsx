import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, type } from '@/lib/theme';

type Props = {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
};

export function AuthorOnlyToggle({ value, onChange, disabled }: Props) {
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: value, disabled: Boolean(disabled) }}
        disabled={disabled}
        onPress={() => onChange(!value)}
        style={styles.row}
      >
        <View style={[styles.box, value && styles.boxOn]}>
          {value ? <Text style={styles.mark}>✓</Text> : null}
        </View>
        <Text style={type.body}>Only author can add thoughts</Text>
      </Pressable>
      <Text style={type.footnote}>Structured feedback mode: you add the statements; everyone else just votes.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: {
    borderColor: colors.accentHover,
    backgroundColor: colors.teal,
  },
  mark: { color: colors.onTeal, fontSize: 14, fontWeight: '700' },
});
