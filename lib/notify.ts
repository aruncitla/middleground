import { Alert, Platform } from 'react-native';

/** RN `Alert.alert` is a no-op on web. Always surface a message. */
export function notify(title: string, message?: string) {
  const text = message ? `${title}\n\n${message}` : title;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(text);
    return;
  }
  Alert.alert(title, message);
}
