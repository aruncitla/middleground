import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, type } from '@/lib/theme';
import type { Card } from '@/types/room';

type Props = {
  cards: Card[];
  onOpen: (cardId: string) => void;
};

export function MaybeShelf({ cards, onOpen }: Props) {
  if (!cards.length) return null;
  return (
    <View style={styles.wrap} accessibilityLabel="Maybe shelf">
      <Text style={styles.label}>Maybe · tap to re-swipe</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {cards.map((card) => (
          <Pressable
            key={card.id}
            onPress={() => onOpen(card.id)}
            accessibilityRole="button"
            accessibilityLabel={`Reopen: ${card.text}`}
            style={styles.chip}
          >
            <Text numberOfLines={2} style={styles.chipText}>
              {card.text}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(24,24,27,0.85)',
    paddingTop: 8,
    paddingBottom: 6,
    gap: 6,
  },
  label: { ...type.kicker, paddingHorizontal: 16 },
  row: { paddingHorizontal: 16, gap: 8 },
  chip: {
    width: 132,
    minHeight: 56,
    borderRadius: 12,
    padding: 8,
    backgroundColor: colors.cardSolid,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  chipText: { ...type.footnote, color: colors.ink, fontSize: 12, lineHeight: 16 },
});
