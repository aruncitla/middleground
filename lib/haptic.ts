/** Short tick when a swipe crosses the vote threshold. No-ops where vibration is blocked. */
export function voteLockHaptic() {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(10);
  } catch {
    /* ignore */
  }
}
