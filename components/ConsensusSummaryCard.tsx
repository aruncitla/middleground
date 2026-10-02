import { forwardRef } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandMark } from '@/components/BrandMark';
import { VoteScale } from '@/components/VoteScale';
import { APP_HOST, APP_URL } from '@/lib/app';
import { colors, controls, type } from '@/lib/theme';
import { discussionScore } from '@/lib/voteChoice';
import type { Card, Vote } from '@/types/room';

export type GravityPhrase = {
  label: string;
  yes: number;
  total: number;
};

export type ConsensusSummaryCardProps = {
  topic: string;
  subtopic?: string;
  phrases?: GravityPhrase[];
  cards?: Card[];
  votes?: Vote[];
  agreedCount?: number;
  pointCount?: number;
  participantCount?: number;
  elapsedLabel?: string;
  score?: number;
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

const SHARE_THOUGHTS = 3;

export const ConsensusSummaryCard = forwardRef<View, ConsensusSummaryCardProps>(function ConsensusSummaryCard(
  { topic, cards = [], votes = [], participantCount, elapsedLabel, score },
  ref,
) {
  const discussion = score ?? discussionScore(cards);
  const shown = cards.slice(0, SHARE_THOUGHTS);
  const extra = Math.max(0, cards.length - shown.length);
  return (
    <View ref={ref} collapsable={false} style={styles.frame}>
      <BrandMark size="sm" toHome={false} fromMark />
      <Text style={styles.title} numberOfLines={3}>
        {topic}
      </Text>
      <View style={styles.scoreWrap}>
        <Text style={styles.scoreKicker}>Discussion score</Text>
        <Text style={styles.score}>{discussion}</Text>
      </View>
      <View style={styles.scales}>
        {shown.map((card) => (
          <VoteScale key={card.id} card={card} votes={votes} compact />
        ))}
        {extra > 0 ? (
          <Text style={styles.more}>
            + {extra} {extra === 1 ? 'thought' : 'thoughts'}
          </Text>
        ) : null}
      </View>
      <View style={styles.footer}>
        <Pressable onPress={() => void Linking.openURL(APP_URL)} accessibilityRole="link">
          <Text style={styles.appLink}>{APP_HOST}</Text>
        </Pressable>
        <Text style={styles.meta}>
          {[elapsedLabel, participantCount != null ? `${participantCount} people in` : null]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    ...controls.panel,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    minHeight: 280,
    overflow: 'hidden',
  },
  title: {
    ...type.title,
    fontSize: 22,
    lineHeight: 26,
    marginTop: 4,
  },
  scoreWrap: {
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.surface3,
    borderWidth: 1,
    borderColor: colors.line,
  },
  scoreKicker: { ...type.kicker, color: colors.amber },
  score: {
    color: colors.ink,
    fontSize: 48,
    fontFamily: 'Inter',
    fontWeight: '700',
    letterSpacing: -1.4,
  },
  scales: { gap: 12 },
  more: { ...type.footnote, color: colors.muted, marginTop: 2 },
  footer: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
  },
  appLink: {
    color: colors.teal,
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 11,
  },
  meta: { ...type.footnote, textAlign: 'right', flexShrink: 0 },
});
