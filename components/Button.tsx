import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, shadows, type } from '@/lib/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'coral' | 'maybe';

type Props = PressableProps & {
  label: string;
  variant?: ButtonVariant;
  selected?: boolean;
};

const GRADIENT = {
  primary: ['#5EEAD4', '#2DD4BF'] as const,
  coral: ['#FF8A7A', '#FF6B6B'] as const,
};

export function Button({
  label,
  variant = 'primary',
  selected,
  disabled,
  style,
  ...rest
}: Props) {
  const gradient = variant === 'primary' || variant === 'coral';
  const labelColor =
    variant === 'primary' ? colors.onTeal : variant === 'coral' ? colors.onCoral : colors.ink;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled), selected }}
      disabled={disabled}
      {...({ dataSet: { mgBtn: variant } } as object)}
      style={({ pressed }) => [
        styles.hit,
        !gradient && styles.flat,
        variant === 'primary' && styles.primary,
        variant === 'coral' && styles.coral,
        variant === 'secondary' && styles.secondary,
        variant === 'maybe' && styles.maybe,
        variant === 'maybe' && selected && styles.maybeOn,
        disabled && styles.disabled,
        pressed && !disabled && styles.active,
        style as StyleProp<ViewStyle>,
      ]}
      {...rest}
    >
      {gradient ? (
        <LinearGradient
          colors={[...GRADIENT[variant]]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.grad}
        >
          <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
        </LinearGradient>
      ) : (
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: '100%',
    minHeight: 52,
    borderRadius: radii.pill,
    overflow: 'visible',
  },
  flat: {
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grad: {
    minHeight: 52,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  primary: { boxShadow: shadows.primary },
  coral: { boxShadow: shadows.coral },
  secondary: {
    backgroundColor: '#17171C',
    borderWidth: 1,
    borderColor: colors.line,
    boxShadow: shadows.secondary,
  },
  maybe: {
    backgroundColor: colors.surface3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.12)',
    boxShadow: shadows.maybe,
  },
  maybeOn: {
    borderColor: 'rgba(251,191,36,.75)',
    boxShadow: shadows.maybeOn,
  },
  disabled: {
    opacity: 0.55,
    filter: 'saturate(.55)',
    boxShadow: shadows.disabled,
  },
  active: {
    transform: [{ translateY: 1 }, { scale: 0.99 }],
  },
  label: {
    ...type.button,
    textAlign: 'center',
  },
});
