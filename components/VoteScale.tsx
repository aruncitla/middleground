import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spectrum, type } from '@/lib/theme';
import { agreementScore, bucketCounts, percents, tickPosition } from '@/lib/voteChoice';
import type { Card, Vote } from '@/types/room';

type Props = {
  card: Card;
  votes?: Vote[];
  compact?: boolean;
};

export function VoteScale({ card, votes = [], compact }: Props) {
  const counts = bucketCounts(card);
  const pct = percents(counts);
  const score = agreementScore(counts);
  const ticks = votes.filter((vote) => vote.cardId === card.id);
  return (
    <View style={styles.row}>
      <View style={styles.head}>
        {counts.total > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{score}</Text>
          </View>
        ) : null}
        <Text style={styles.question}>{card.text}</Text>
      </View>
      <View style={styles.barWrap}>
        <LinearGradient
          colors={[...spectrum]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.bar}
        />
        {ticks.map((vote, index) => (
          <View
            key={vote.id || `${vote.seatId}-${index}`}
            style={[
              styles.tick,
              {
                left: `${tickPosition(vote.choice, index) * 100}%`,
                backgroundColor:
                  vote.choice === 'disagree' ? colors.coral : vote.choice === 'agree' ? colors.teal : colors.gold,
              },
            ]}
          />
        ))}
      </View>
      {!counts.total ? (
        <Text style={type.footnote}>No votes yet.</Text>
      ) : (
        <Text style={styles.pct}>
          {pct.agree}% works for me · {pct.maybe}% maybe · {pct.disagree}% not for me
        </Text>
      )}
      {!compact && counts.agree > 0 && counts.disagree > 0 && counts.agree === counts.disagree ? (
        <Text style={type.footnote}>Split — the edges stay visible.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  question: { ...type.section, fontSize: 15, lineHeight: 21, flex: 1 },
  barWrap: {
    height: 18,
    justifyContent: 'center',
    backgroundColor: '#18181B',
    borderRadius: 999,
    paddingHorizontal: 2,
  },
  bar: { height: 6, borderRadius: 999, opacity: 0.85 },
  tick: {
    position: 'absolute',
    width: 8,
    height: 8,
    marginLeft: -4,
    borderRadius: 4,
    top: 5,
  },
  pct: { ...type.footnote, color: colors.muted },
  badge: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 184, 74, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232, 184, 74, 0.4)',
  },
  badgeText: { ...type.kicker, color: colors.gold, fontSize: 13, fontWeight: '700' },
});
