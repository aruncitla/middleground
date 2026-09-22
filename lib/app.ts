export const APP_URL = 'https://amane-middleground.web.app';
export const APP_HOST = 'amane-middleground.web.app';

export function roomShareUrl(code: string) {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : APP_URL;
  return `${origin}/room/${code}`;
}
