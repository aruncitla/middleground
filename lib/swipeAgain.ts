const KEY = 'mg.swipeAgain';

export function markSwipeAgain(code: string) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(KEY, code.toUpperCase());
}

export function isSwipeAgain(code: string) {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(KEY) === code.toUpperCase();
}

export function clearSwipeAgain(code: string) {
  if (typeof sessionStorage === 'undefined') return;
  if (sessionStorage.getItem(KEY) === code.toUpperCase()) sessionStorage.removeItem(KEY);
}
