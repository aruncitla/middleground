export const APP_URL = 'https://amane-middleground.web.app';
export const APP_HOST = 'amane-middleground.web.app';
export const DEMO_ROOM_CODE = (process.env.EXPO_PUBLIC_DEMO_ROOM || 'WMF5KU').toUpperCase();
export const FEEDBACK_ROOM_CODE = (process.env.EXPO_PUBLIC_FEEDBACK_ROOM || 'FEEDBK').toUpperCase();
export const FEEDBACK_TOPIC_CODE = (process.env.EXPO_PUBLIC_FEEDBACK_TOPIC || 'FDBACK').toUpperCase();

export function roomShareUrl(code: string) {
  return appShareUrl(`/room/${code}`);
}

export function thoughtShareUrl(code: string) {
  return appShareUrl(`/lobby/${code}`);
}

function appShareUrl(path: string) {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : APP_URL;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}
