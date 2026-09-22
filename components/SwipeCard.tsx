import { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/lib/theme';
import type { Card } from '@/types/room';

const SCREEN_W = Dimensions.get('window').width;
const THRESHOLD = 120;

type Props = {
  card: Card;
  stacked?: boolean;
  onVote: (choice: 'agree' | 'disagree') => void;
  mine?: boolean;
};

export function SwipeCard({ card, stacked, onVote, mine }: Props) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const originX = useSharedValue(0);
  const started = useSharedValue(0);
  const committed = useSharedValue(0);

  useEffect(() => {
    x.value = 0;
    y.value = 0;
    started.value = 0;
    committed.value = 0;
  }, [card.id, x, y, started, committed]);

  const vote = (choice: 'agree' | 'disagree') => {
    onVote(choice);
  };

  const pan = Gesture.Pan()
    .enabled(!stacked)
    .activeOffsetX([-16, 16])
    .failOffsetY([-28, 28])
    .onBegin((e) => {
      originX.value = e.absoluteX;
      started.value = 1;
      committed.value = 0;
    })
    .onUpdate((e) => {
      if (started.value === 0) {
        originX.value = e.absoluteX;
        started.value = 1;
        return;
      }
      // Screen X, not translationX: web touch translationX is inverted vs mouse.
      x.value = e.absoluteX - originX.value;
      y.value = e.translationY * 0.25;
    })
    .onEnd(() => {
      const dx = x.value;
      if (dx > THRESHOLD) {
        committed.value = 1;
        x.value = withTiming(SCREEN_W, { duration: 220 }, () => runOnJS(vote)('agree'));
      } else if (dx < -THRESHOLD) {
        committed.value = -1;
        x.value = withTiming(-SCREEN_W, { duration: 220 }, () => runOnJS(vote)('disagree'));
      } else {
        x.value = withSpring(0);
        y.value = withSpring(0);
      }
    });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${interpolate(x.value, [-200, 0, 200], [-12, 0, 12])}deg` },
      { scale: stacked ? 0.94 : 1 },
    ],
  }));

  const yesStyle = useAnimatedStyle(() => ({
    opacity: committed.value === 1 ? 1 : interpolate(x.value, [40, THRESHOLD], [0, 1]),
  }));
  const nahStyle = useAnimatedStyle(() => ({
    opacity: committed.value === -1 ? 1 : interpolate(x.value, [-THRESHOLD, -40], [1, 0]),
  }));

  const merged = (card.sourceCount ?? card.sourceEntryIds?.length ?? 0) > 1;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, stacked && styles.back, style]}>
        {mine ? <Text style={styles.note}>Your thought is on this card</Text> : null}
        {merged ? (
          <Text style={styles.note}>
            {card.sourceCount ?? card.sourceEntryIds?.length} similar thoughts merged
          </Text>
        ) : null}
        <Text style={styles.body}>{card.text}</Text>
        <Animated.Text style={[styles.stamp, styles.yes, yesStyle]}>Yes</Animated.Text>
        <Animated.Text style={[styles.stamp, styles.nah, nahStyle]}>No</Animated.Text>
        {stacked ? null : (
          <>
            <Text style={styles.edgeHintLeft}>← No</Text>
            <Text style={styles.edgeHintRight}>Yes →</Text>
          </>
        )}
        {stacked ? <View pointerEvents="none" style={styles.lock} /> : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 340,
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
    backdropFilter: 'blur(24px)',
    justifyContent: 'center',
  },
  back: { top: 14 },
  note: {
    position: 'absolute',
    top: 18,
    left: 24,
    right: 24,
    color: colors.muted,
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 13,
  },
  body: {
    color: colors.ink,
    fontSize: 24,
    fontFamily: 'Inter',
    fontWeight: '600',
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  stamp: {
    position: 'absolute',
    top: 56,
    fontSize: 44,
    fontFamily: 'Inter',
    fontWeight: '700',
    letterSpacing: -0.8,
    textTransform: 'uppercase',
  },
  yes: { right: 18, color: colors.accentHover, transform: [{ rotate: '12deg' }] },
  nah: { left: 18, color: colors.muted, transform: [{ rotate: '-12deg' }] },
  edgeHintLeft: {
    position: 'absolute',
    left: 24,
    bottom: 22,
    color: colors.faint,
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 13,
  },
  edgeHintRight: {
    position: 'absolute',
    right: 24,
    bottom: 22,
    color: colors.faint,
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 13,
  },
  lock: { ...StyleSheet.absoluteFillObject },
});
