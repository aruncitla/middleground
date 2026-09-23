import { useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions, View, Platform } from 'react-native';
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
import { armedSide, choiceFromSwipeDx, stampOpacity, swipeThresholdForWidth } from '@/lib/swipeVote';
import { colors } from '@/lib/theme';
import type { Card } from '@/types/room';

type Props = {
  card: Card;
  stacked?: boolean;
  onVote: (choice: 'agree' | 'disagree') => void;
  mine?: boolean;
};

export function SwipeCard({ card, stacked, onVote, mine }: Props) {
  const { width: screenW } = useWindowDimensions();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const cardW = useSharedValue(Math.max(240, screenW - 32));
  const armed = useSharedValue(0);
  const committed = useSharedValue(0);

  useEffect(() => {
    x.value = 0;
    y.value = 0;
    armed.value = 0;
    committed.value = 0;
  }, [card.id, x, y, armed, committed]);

  const vote = (choice: 'agree' | 'disagree') => {
    onVote(choice);
  };

  const pan = Gesture.Pan()
    .enabled(!stacked)
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
      // Screen X/Y, not translationX: web touch translationX is inverted vs mouse.
      x.value = e.absoluteX - originX.value;
      y.value = e.absoluteY - originY.value;
      const threshold = swipeThresholdForWidth(cardW.value);
      const next = armedSide(x.value, threshold);
      if (next !== 0 && next !== armed.value) {
        armed.value = next;
        runOnJS(voteLockHaptic)();
      } else if (next === 0) {
        armed.value = 0;
      }
    })
    .onEnd(() => {
      if (committed.value !== 0) return;
      const threshold = swipeThresholdForWidth(cardW.value);
      const choice = choiceFromSwipeDx(x.value, threshold);
      if (choice) {
        committed.value = choice === 'agree' ? 1 : -1;
        const out = (choice === 'agree' ? 1 : -1) * Math.max(screenW, cardW.value) * 1.35;
        x.value = withTiming(out, { duration: 180 }, () => {
          runOnJS(vote)(choice);
        });
        return;
      }
      x.value = withSpring(0, { damping: 18, stiffness: 180 });
      y.value = withSpring(0, { damping: 18, stiffness: 180 });
      armed.value = 0;
    })
    .onFinalize(() => {
      if (committed.value !== 0) return;
      x.value = withSpring(0, { damping: 18, stiffness: 180 });
      y.value = withSpring(0, { damping: 18, stiffness: 180 });
      armed.value = 0;
    });

  const style = useAnimatedStyle(() => {
    const rotate = interpolate(x.value, [-cardW.value, 0, cardW.value], [-14, 0, 14]);
    return {
      transform: [
        { translateX: x.value },
        { translateY: stacked ? 10 : y.value },
        { rotate: `${rotate}deg` },
        { scale: stacked ? 0.96 : 1 },
      ],
    };
  });

  const yesStyle = useAnimatedStyle(() => {
    const threshold = swipeThresholdForWidth(cardW.value);
    const show = x.value > 0 || committed.value === 1;
    return {
      opacity: show ? stampOpacity(committed.value === 1 ? threshold : x.value, threshold) : 0,
    };
  });
  const nahStyle = useAnimatedStyle(() => {
    const threshold = swipeThresholdForWidth(cardW.value);
    const show = x.value < 0 || committed.value === -1;
    return {
      opacity: show ? stampOpacity(committed.value === -1 ? threshold : x.value, threshold) : 0,
    };
  });

  const merged = (card.sourceCount ?? card.sourceEntryIds?.length ?? 0) > 1;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        onLayout={(e) => {
          cardW.value = e.nativeEvent.layout.width;
        }}
        style={[
          styles.card,
          stacked ? styles.back : styles.front,
          Platform.OS === 'web' ? { touchAction: 'none', userSelect: 'none', cursor: stacked ? 'default' : 'grab' } : null,
          style,
        ]}
      >
        {mine ? <Text style={styles.note}>Your thought is on this card</Text> : null}
        {merged ? (
          <Text style={styles.note}>
            {card.sourceCount ?? card.sourceEntryIds?.length} similar thoughts merged
          </Text>
        ) : null}
        <Text style={styles.body}>{card.text}</Text>
        <Animated.Text pointerEvents="none" style={[styles.stamp, styles.yes, yesStyle]}>
          YES
        </Animated.Text>
        <Animated.Text pointerEvents="none" style={[styles.stamp, styles.nah, nahStyle]}>
          NO
        </Animated.Text>
        {stacked ? <View pointerEvents="none" style={styles.lock} /> : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 8,
    bottom: 8,
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  front: {
    zIndex: 2,
    boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
  },
  back: {
    zIndex: 1,
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
  },
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
    top: 28,
    fontSize: 42,
    fontFamily: 'Inter',
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    zIndex: 4,
  },
  yes: {
    left: 16,
    color: '#22c55e',
    borderWidth: 4,
    borderColor: '#22c55e',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 2,
    transform: [{ rotate: '-14deg' }],
  },
  nah: {
    right: 16,
    color: colors.danger,
    borderWidth: 4,
    borderColor: colors.danger,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 2,
    transform: [{ rotate: '14deg' }],
  },
  lock: { ...StyleSheet.absoluteFillObject },
});
