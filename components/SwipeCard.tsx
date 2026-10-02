import { useEffect } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { voteLockHaptic } from '@/lib/haptic';
import { isExampleCard } from '@/lib/starterCards';
import { colors, shadows } from '@/lib/theme';
import {
  armedSide,
  choiceFromSwipe,
  maybeThresholdForHeight,
  stampOpacity,
  swipeThresholdForWidth,
} from '@/lib/swipeVote';
import { VOTE_LABELS, VOTE_STAMPS, type VoteChoice } from '@/lib/voteChoice';
import type { Card } from '@/types/room';

type Props = {
  card: Card;
  onVote: (choice: VoteChoice) => void;
  mine?: boolean;
  author?: string;
  priorChoice?: VoteChoice;
  onDrag?: (dx: number, dy: number) => void;
};

export function SwipeCard({ card, onVote, mine, author, priorChoice, onDrag }: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const cardW = useSharedValue(Math.max(240, screenW - 40));
  const cardH = useSharedValue(280);
  const armed = useSharedValue(0);
  const committed = useSharedValue(0);

  useEffect(() => {
    x.value = 0;
    y.value = 0;
    armed.value = 0;
    committed.value = 0;
  }, [card.id, x, y, armed, committed]);

  const vote = (choice: VoteChoice) => {
    onVote(choice);
  };

  const reportDrag = (dx: number, dy: number) => {
    onDrag?.(dx, dy);
  };

  const pan = Gesture.Pan()
    .maxPointers(1)
    .minDistance(0)
    .shouldCancelWhenOutside(false)
    .onBegin((e) => {
      originX.value = e.absoluteX;
      originY.value = e.absoluteY;
      armed.value = 0;
      committed.value = 0;
    })
    .onUpdate((e) => {
      if (committed.value !== 0) return;
      x.value = e.absoluteX - originX.value;
      y.value = e.absoluteY - originY.value;
      const xT = swipeThresholdForWidth(cardW.value);
      const yT = maybeThresholdForHeight(cardH.value);
      const next = armedSide(x.value, y.value, xT, yT);
      if (next !== 0 && next !== armed.value) {
        armed.value = next;
        runOnJS(voteLockHaptic)();
      } else if (next === 0) {
        armed.value = 0;
      }
      runOnJS(reportDrag)(x.value, y.value);
    })
    .onEnd(() => {
      if (committed.value !== 0) return;
      const xT = swipeThresholdForWidth(cardW.value);
      const yT = maybeThresholdForHeight(cardH.value);
      const choice = choiceFromSwipe(x.value, y.value, xT, yT);
      if (choice) {
        committed.value = choice === 'agree' ? 1 : choice === 'disagree' ? -1 : 2;
        if (choice === 'maybe') {
          y.value = withTiming(Math.max(screenH, 420) * 0.55, { duration: 200 }, () => {
            runOnJS(vote)(choice);
          });
        } else {
          const out = (choice === 'agree' ? 1 : -1) * Math.max(screenW, cardW.value) * 1.35;
          x.value = withTiming(out, { duration: 180 }, () => {
            runOnJS(vote)(choice);
          });
        }
        return;
      }
      x.value = withSpring(0, { damping: 18, stiffness: 180 });
      y.value = withSpring(0, { damping: 18, stiffness: 180 });
      armed.value = 0;
      runOnJS(reportDrag)(0, 0);
    })
    .onFinalize(() => {
      if (committed.value !== 0) return;
      x.value = withSpring(0, { damping: 18, stiffness: 180 });
      y.value = withSpring(0, { damping: 18, stiffness: 180 });
      armed.value = 0;
      runOnJS(reportDrag)(0, 0);
    });

  const style = useAnimatedStyle(() => {
    const rotate = interpolate(x.value, [-cardW.value, 0, cardW.value], [-14, 0, 14]);
    return {
      transform: [{ translateX: x.value }, { translateY: y.value }, { rotate: `${rotate}deg` }],
    };
  });

  const yesStyle = useAnimatedStyle(() => {
    const threshold = swipeThresholdForWidth(cardW.value);
    const show = x.value > 20 || committed.value === 1;
    return { opacity: show ? stampOpacity(committed.value === 1 ? threshold : x.value, threshold) : 0 };
  });
  const nahStyle = useAnimatedStyle(() => {
    const threshold = swipeThresholdForWidth(cardW.value);
    const show = x.value < -20 || committed.value === -1;
    return { opacity: show ? stampOpacity(committed.value === -1 ? threshold : x.value, threshold) : 0 };
  });
  const maybeStyle = useAnimatedStyle(() => {
    const threshold = maybeThresholdForHeight(cardH.value);
    const show = y.value > 24 || committed.value === 2;
    return { opacity: show ? stampOpacity(committed.value === 2 ? threshold : y.value, threshold) : 0 };
  });

  const merged = (card.sourceCount ?? card.sourceEntryIds?.length ?? 0) > 1;
  const example = isExampleCard(card);
  const authorLine = author ?? (mine ? 'You' : merged ? `${card.sourceCount ?? card.sourceEntryIds?.length} people` : 'From the group');

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        onLayout={(e) => {
          cardW.value = e.nativeEvent.layout.width;
          cardH.value = e.nativeEvent.layout.height;
        }}
        style={[
          styles.card,
          Platform.OS === 'web'
            ? ({
                backgroundImage: 'linear-gradient(180deg, #202027, #131318)',
                touchAction: 'none',
                userSelect: 'none',
                cursor: 'grab',
              } as object)
            : null,
          style,
        ]}
      >
        <Text style={styles.kicker}>THOUGHT</Text>
        {example ? (
          <Text style={styles.note}>Example · doesn’t count toward the verdict</Text>
        ) : priorChoice ? (
          <Text style={styles.note}>
            You voted {VOTE_LABELS[priorChoice]} — swipe to change
          </Text>
        ) : mine ? (
          <Text style={styles.note}>Your thought is on this card</Text>
        ) : merged ? (
          <Text style={styles.note}>
            {card.sourceCount ?? card.sourceEntryIds?.length} similar thoughts merged
          </Text>
        ) : null}
        <Text style={styles.body}>{card.text}</Text>
        <Text style={styles.author}>{authorLine}</Text>
        <Animated.Text pointerEvents="none" style={[styles.stamp, styles.yes, yesStyle]}>
          {VOTE_STAMPS.agree}
        </Animated.Text>
        <Animated.Text pointerEvents="none" style={[styles.stamp, styles.nah, nahStyle]}>
          {VOTE_STAMPS.disagree}
        </Animated.Text>
        <Animated.Text pointerEvents="none" style={[styles.stamp, styles.maybe, maybeStyle]}>
          {VOTE_STAMPS.maybe}
        </Animated.Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 280,
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#202027',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.10)',
    boxShadow: shadows.thought,
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 3,
  },
  kicker: {
    position: 'absolute',
    top: 24,
    left: 24,
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1.32,
    color: colors.faint,
  },
  note: {
    position: 'absolute',
    top: 44,
    left: 24,
    right: 24,
    color: colors.faint,
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 12,
  },
  body: {
    color: colors.ink,
    fontSize: 24,
    fontFamily: 'Inter',
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 32.4,
    marginTop: 28,
    marginBottom: 28,
  },
  author: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 24,
    fontFamily: 'Inter',
    fontSize: 13,
    color: colors.muted,
  },
  stamp: {
    position: 'absolute',
    top: 28,
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '800',
    letterSpacing: 0.96,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 2,
    overflow: 'hidden',
    zIndex: 4,
  },
  yes: {
    left: 16,
    color: colors.teal,
    borderColor: colors.teal,
  },
  nah: {
    right: 16,
    color: colors.coral,
    borderColor: colors.coral,
  },
  maybe: {
    alignSelf: 'center',
    left: 48,
    right: 48,
    top: 'auto',
    bottom: 52,
    textAlign: 'center',
    color: colors.amber,
    borderColor: colors.amber,
  },
});
