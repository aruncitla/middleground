/** Pixels of horizontal travel before a swipe counts as a vote. */
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
