import { forwardRef, useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandMark } from '@/components/BrandMark';
import { VennField } from '@/components/VennField';
import { APP_HOST, APP_URL } from '@/lib/app';
import { colors, fonts, type } from '@/lib/theme';

export type GravityPhrase = {
  label: string;
  yes: number;
  total: number;
};

export type ConsensusSummaryCardProps = {
  topic: string;
  subtopic?: string;
  phrases: GravityPhrase[];
  agreedCount: number;
  pointCount: number;
  participantCount?: number;
  elapsedLabel?: string;
};

const MAX_WORDS = 7;
const MAX_CHARS = 56;
const TRAILING_GLUE = new Set(['a', 'an', 'and', 'but', 'for', 'if', 'of', 'or', 'so', 'the', 'to', 'with']);

function tidy(s: string) {
  return s.replace(/\s+/g, ' ').replace(/^[,;:\s]+|[,;.\s]+$/g, '').trim();
}

function wordCount(s: string) {
  return s.split(' ').filter(Boolean).length;
}

function fitsPhrase(s: string) {
  return Boolean(s) && wordCount(s) <= MAX_WORDS && s.length <= MAX_CHARS;
}

function clipPhrase(s: string) {
  const words = s.split(' ').filter(Boolean);
  let out = '';
  for (const word of words) {
    const next = out ? `${out} ${word}` : word;
    if (wordCount(next) > MAX_WORDS || next.length > MAX_CHARS) break;
    out = next;
  }
  const parts = (out || words.slice(0, MAX_WORDS).join(' ')).split(' ').filter(Boolean);
  while (parts.length > 2 && TRAILING_GLUE.has((parts[parts.length - 1] ?? '').toLowerCase())) {
    parts.pop();
  }
  return parts.join(' ');
}

/** Short contiguous phrase from a swipe card — never a stemmed slogan. */
export function phraseFromCardText(text: string) {
  const sentence = tidy((text.replace(/\s+/g, ' ').trim().split(/[.?!]/)[0] ?? '').trim());
  if (!sentence) return '';

  const colon = sentence.indexOf(':');
  if (colon > 0) {
    const left = tidy(sentence.slice(0, colon));
    const rightHead = tidy((sentence.slice(colon + 1).split(',')[0] ?? '').trim());
    const titled = left && rightHead ? `${left}: ${rightHead}` : '';
    if (wordCount(left) === 1 && fitsPhrase(titled)) return titled;
    if (wordCount(left) >= 2 && fitsPhrase(left)) return left;
    if (fitsPhrase(rightHead)) return rightHead;
    if (fitsPhrase(titled)) return titled;
  }

  const commaHead = tidy(sentence.split(',')[0] ?? sentence);
  if (fitsPhrase(commaHead) && wordCount(commaHead) >= 2) return commaHead;
  if (fitsPhrase(sentence)) return sentence;
  return clipPhrase(sentence);
}

function ratio(p: GravityPhrase) {
  return p.total > 0 ? p.yes / p.total : 0;
}

function fontSizeFor(p: GravityPhrase, min: number, max: number) {
  return Math.round(min + ratio(p) * (max - min));
}

function ofPoints(n: number, total: number) {
  return `${Math.max(0, n)} of ${Math.max(0, total)}`;
}

export const ConsensusSummaryCard = forwardRef<View, ConsensusSummaryCardProps>(function ConsensusSummaryCard(
  {
    topic,
    subtopic,
    phrases,
    agreedCount,
    pointCount,
    participantCount,
    elapsedLabel,
  },
  ref,
) {
  const total = Math.max(0, pointCount);
  const agreed = Math.min(Math.max(0, agreedCount), total);
  const open = Math.max(0, total - agreed);
  const rings = useMemo(() => {
    const seen = new Set<string>();
    const unique = phrases.filter((p) => {
      const key = p.label.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return p.total > 0;
    });
    unique.sort((a, b) => ratio(b) - ratio(a) || b.yes - a.yes);
    const top = unique.slice(0, 12);
    let core = top.filter((p) => ratio(p) >= 0.8).slice(0, 3);
    if (core.length === 0) core = top.slice(0, Math.min(2, top.length));
    const coreKeys = new Set(core.map((p) => p.label));
    const rest = top.filter((p) => !coreKeys.has(p.label));
    return {
      core,
      inner: rest.filter((p) => ratio(p) >= 0.5).slice(0, 5),
      outer: rest.filter((p) => ratio(p) < 0.5).slice(0, 6),
    };
  }, [phrases]);

  return (
    <View ref={ref} collapsable={false} style={styles.frame}>
      <LinearGradient
        colors={['#09090b', '#111113', '#18181b', '#09090b']}
        locations={[0, 0.35, 0.72, 1]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={styles.gradient}
      >
        <VennField variant="card" />

        <BrandMark size="sm" />
        <Text style={styles.title} numberOfLines={3}>
          {topic}
        </Text>
        {subtopic ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtopic}
          </Text>
        ) : null}

        <View style={styles.well}>
          <View style={styles.core}>
            {rings.core.map((p) => (
              <Text
                key={p.label}
                style={[styles.word, styles.wordCore, { fontSize: fontSizeFor(p, 16, 22) }]}
                numberOfLines={2}
              >
                {p.label}
              </Text>
            ))}
          </View>
          <View style={styles.inner}>
            {rings.inner.map((p) => (
              <Text
                key={p.label}
                style={[styles.word, styles.wordInner, { fontSize: fontSizeFor(p, 12, 14) }]}
                numberOfLines={2}
              >
                {p.label}
              </Text>
            ))}
          </View>
          <View style={styles.outer}>
            {rings.outer.map((p) => (
              <Text
                key={p.label}
                style={[styles.word, styles.wordOuter, { fontSize: fontSizeFor(p, 10, 12) }]}
                numberOfLines={2}
              >
                {p.label}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statAgree]}>
            <Text style={styles.statKicker}>Agreement</Text>
            <Text style={styles.statValueAccent}>{ofPoints(agreed, total)}</Text>
            <Text style={styles.statHint}>{total === 1 ? 'point agreed' : 'points agreed'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statKicker}>Open items</Text>
            <Text style={styles.statValueMuted}>{ofPoints(open, total)}</Text>
            <Text style={styles.statHint}>{total === 1 ? 'point still split' : 'points still split'}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerBrand}>
            <Text style={styles.watermark}>middleground</Text>
            <Pressable onPress={() => void Linking.openURL(APP_URL)} accessibilityRole="link">
              <Text style={styles.appLink}>{APP_HOST}</Text>
            </Pressable>
          </View>
          <Text style={styles.meta}>
            {[elapsedLabel, participantCount != null ? `${participantCount} participant${participantCount === 1 ? '' : 's'}` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    aspectRatio: 3 / 4.15,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0 0 40px rgba(99, 102, 241, 0.16)',
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  title: {
    ...type.title,
    fontSize: 22,
    lineHeight: 26,
    marginTop: 12,
  },
  subtitle: {
    ...type.body,
    marginTop: 6,
    fontSize: 13,
  },
  well: {
    flex: 1,
    marginTop: 10,
    minHeight: 210,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  core: {
    alignItems: 'center',
    gap: 2,
    zIndex: 2,
    maxWidth: 220,
  },
  inner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    zIndex: 2,
    maxWidth: 300,
  },
  outer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    zIndex: 2,
    maxWidth: 320,
    opacity: 0.85,
  },
  word: {
    fontFamily: fonts.medium,
    textAlign: 'center',
    paddingHorizontal: 5,
  },
  wordCore: {
    color: colors.accentHover,
    fontFamily: fonts.semibold,
    fontWeight: '600',
    letterSpacing: -0.6,
  },
  wordInner: {
    color: colors.ink,
    fontWeight: '500',
  },
  wordOuter: {
    color: colors.faint,
    fontWeight: '400',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(24,24,27,0.72)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statAgree: { borderColor: colors.accentSoft },
  statKicker: {
    ...type.kicker,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  statValueAccent: {
    color: colors.accentHover,
    fontSize: 26,
    fontFamily: fonts.semibold,
    fontWeight: '600',
    letterSpacing: -0.8,
    marginTop: 2,
  },
  statValueMuted: {
    color: colors.ink,
    fontSize: 26,
    fontFamily: fonts.semibold,
    fontWeight: '600',
    letterSpacing: -0.8,
    marginTop: 2,
  },
  statHint: { ...type.footnote, color: colors.muted },
  footer: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
  },
  footerBrand: { gap: 2, flexShrink: 1 },
  watermark: {
    color: colors.faint,
    fontFamily: fonts.medium,
    fontWeight: '500',
    letterSpacing: -0.2,
    fontSize: 11,
  },
  appLink: {
    color: colors.accentHover,
    fontFamily: fonts.medium,
    fontWeight: '500',
    fontSize: 11,
  },
  meta: { ...type.footnote, textAlign: 'right', flexShrink: 0 },
});
