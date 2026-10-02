const KEY = 'mg.seenPlayHint';

export function shouldShowPlayHint() {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(KEY) !== '1';
}

export function markPlayHintSeen() {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(KEY, '1');
}
