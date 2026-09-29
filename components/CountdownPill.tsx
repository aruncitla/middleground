import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatClosesIn, isClosingSoon } from '@/lib/formatEnds';
import { colors, fonts } from '@/lib/theme';

export function CountdownPill({ endsAt }: { endsAt?: Date | null }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return null;
  const label = formatClosesIn(endsAt, now);
  const remaining = endsAt.getTime() - now;
  const soon = isClosingSoon(endsAt, now);
  const closed = remaining <= 0;

  return (
    <View
      accessibilityRole="timer"
      accessibilityLabel={label}
      style={[styles.pill, soon && styles.soon, closed && styles.closed]}
    >
      <Text style={[styles.text, soon && styles.soonText, closed && styles.closedText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  soon: {
    borderColor: 'rgba(251, 191, 36, 0.55)',
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
  },
  closed: {
    borderColor: colors.border,
    backgroundColor: colors.cardAlt,
  },
  text: {
    fontFamily: fonts.medium,
    fontWeight: '500',
    fontSize: 12,
    color: colors.muted,
  },
  soonText: { color: '#fbbf24' },
  closedText: { color: colors.faint },
});
