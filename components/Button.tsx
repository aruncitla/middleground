import { Pressable, Text, type PressableProps } from 'react-native';
import { controls } from '@/lib/theme';

type Props = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary';
};

export function Button({ label, variant = 'primary', disabled, style, ...rest }: Props) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={[isPrimary ? controls.primary : controls.secondary, disabled && { opacity: 0.45 }, style]}
      {...rest}
    >
      <Text style={isPrimary ? controls.primaryText : controls.secondaryText}>{label}</Text>
    </Pressable>
  );
}
