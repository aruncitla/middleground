/** Fallback when the card has not been measured yet. */
export const SWIPE_THRESHOLD = 120;

/**
 * Finger/card travel on the screen X axis.
 * Positive = moved right = Yes. Negative = moved left = No.
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

export function stampOpacity(dx: number, threshold: number) {
  'worklet';
  const t = threshold > 0 ? Math.abs(dx) / threshold : 0;
  return Math.max(0, Math.min(1, t));
}

/** 1 = past YES threshold, -1 = past NO threshold, 0 = still in the dead zone. */
export function armedSide(dx: number, threshold: number) {
  'worklet';
  if (dx > threshold) return 1;
  if (dx < -threshold) return -1;
  return 0;
}
