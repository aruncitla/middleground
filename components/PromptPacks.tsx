import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  evergreenPacks,
  featuredPacks,
  pastSeasonPacks,
  seasonalBanner,
  type PromptPack,
  type TopicMode,
} from '@/lib/promptPacks';
import { colors, controls, type } from '@/lib/theme';

const MODE_LABEL: Record<TopicMode, string> = {
  debate: 'Debate',
  'hot-takes': 'Hot takes',
  bracket: 'Bracket',
  predictions: 'Predictions',
};

type Props = {
  onPick: (prompt: string, mode: TopicMode) => void;
  disabled?: boolean;
};

export function PromptPacks({ onPick, disabled }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const now = useMemo(() => new Date(), []);
  const featured = featuredPacks(now);
  const evergreen = evergreenPacks();
  const past = pastSeasonPacks(now);

  return (
    <View style={styles.stack}>
      {featured.map((pack) => (
        <View key={pack.id} style={styles.featuredWrap}>
          <Text style={styles.banner}>{seasonalBanner(pack, now)}</Text>
          <PackDeck
            pack={pack}
            open={openId === pack.id}
            disabled={disabled}
            onToggle={() => setOpenId((id) => (id === pack.id ? null : pack.id))}
            onPick={onPick}
          />
        </View>
      ))}

      <Text style={type.label}>Prompt packs</Text>
      {evergreen.map((pack) => (
        <PackDeck
          key={pack.id}
          pack={pack}
          open={openId === pack.id}
          disabled={disabled}
          onToggle={() => setOpenId((id) => (id === pack.id ? null : pack.id))}
          onPick={onPick}
        />
      ))}

      {past.length ? (
        <>
          <Text style={[type.label, styles.pastLabel]}>Past seasons</Text>
          <Text style={type.footnote}>Still playable — just not this week’s feature.</Text>
          {past.map((pack) => (
            <PackDeck
              key={pack.id}
              pack={pack}
              open={openId === pack.id}
              disabled={disabled}
              onToggle={() => setOpenId((id) => (id === pack.id ? null : pack.id))}
              onPick={onPick}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

function PackDeck({
  pack,
  open,
  disabled,
  onToggle,
  onPick,
}: {
  pack: PromptPack;
  open: boolean;
  disabled?: boolean;
  onToggle: () => void;
  onPick: (prompt: string, mode: TopicMode) => void;
}) {
  return (
    <View style={[styles.deck, open && styles.deckOpen]}>
      <Pressable onPress={onToggle} accessibilityRole="button" style={styles.deckHead}>
        <Text style={styles.emoji}>{pack.emoji}</Text>
        <View style={styles.deckCopy}>
          <Text style={styles.title}>{pack.title}</Text>
          <Text style={type.footnote}>{pack.blurb}</Text>
        </View>
        <Text style={styles.mode}>{MODE_LABEL[pack.mode]}</Text>
      </Pressable>
      {open
        ? pack.prompts.map((prompt) => (
            <Pressable
              key={prompt}
              disabled={disabled}
              onPress={() => onPick(prompt, pack.mode)}
              accessibilityRole="button"
              style={styles.prompt}
            >
              <Text style={styles.promptText}>{prompt}</Text>
              <Text style={styles.go}>Start</Text>
            </Pressable>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  featuredWrap: { gap: 6 },
  banner: { ...type.kicker, color: colors.accentHover },
  pastLabel: { marginTop: 8 },
  deck: {
    ...controls.panel,
    padding: 0,
    overflow: 'hidden',
  },
  deckOpen: { borderColor: colors.accentSoft },
  deckHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  emoji: { fontSize: 26, width: 36, textAlign: 'center' },
  deckCopy: { flex: 1, gap: 2 },
  title: { ...type.section, fontSize: 15 },
  mode: { ...type.footnote, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  prompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.cardAlt,
  },
  promptText: { ...type.body, color: colors.ink, flex: 1, fontSize: 14 },
  go: { ...type.kicker, color: colors.accentHover },
});
