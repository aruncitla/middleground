import type { VoteChoice } from '@/lib/voteChoice';

/** Fallback when the card has not been measured yet. */
export const SWIPE_THRESHOLD = 120;
export const MAYBE_THRESHOLD = 90;

/**
 * Finger/card travel on the screen X axis.
 * Positive = moved right = Works for me. Negative = moved left = Not for me.
 */
export function choiceFromSwipeDx(
  dx: number,
  threshold: number = SWIPE_THRESHOLD,
): 'agree' | 'disagree' | null {
  'worklet';
  if (dx > threshold) return 'agree';
  if (dx < -threshold) return 'disagree';
  return null;
}

export function swipeThresholdForWidth(width: number) {
  'worklet';
  if (!(width > 0)) return SWIPE_THRESHOLD;
  return width / 3;
}

export function maybeThresholdForHeight(height: number) {
  'worklet';
  if (!(height > 0)) return MAYBE_THRESHOLD;
  return Math.max(72, height / 4);
}

export function choiceFromSwipe(
  dx: number,
  dy: number,
  xThreshold: number = SWIPE_THRESHOLD,
  yThreshold: number = MAYBE_THRESHOLD,
): VoteChoice | null {
  'worklet';
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ay > ax && dy > yThreshold) return 'maybe';
  if (ax >= ay) return choiceFromSwipeDx(dx, xThreshold);
  return null;
}

export function stampOpacity(travel: number, threshold: number) {
  'worklet';
  const t = threshold > 0 ? Math.abs(travel) / threshold : 0;
  return Math.max(0, Math.min(1, t));
}

/** 1 = works-for-me, -1 = not-for-me, 2 = maybe, 0 = dead zone. */
export function armedSide(dx: number, dy: number, xThreshold: number, yThreshold: number) {
  'worklet';
  const choice = choiceFromSwipe(dx, dy, xThreshold, yThreshold);
  if (choice === 'agree') return 1;
  if (choice === 'disagree') return -1;
  if (choice === 'maybe') return 2;
  return 0;
}
