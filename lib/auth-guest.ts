import { FirebaseError } from 'firebase/app';
import { signInAnonymously } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase';

/** Anonymous Firebase Auth — enable “Anonymous” in Console → Authentication → Sign-in method. */
export async function signInAsGuest(): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured (missing EXPO_PUBLIC_FIREBASE_* in .env).');
  }
  await signInAnonymously(getFirebaseAuth());
}

export function formatAnonymousAuthError(e: unknown): string {
  const raw =
    e instanceof FirebaseError
      ? `${e.code} ${e.message}`
      : e instanceof Error
        ? e.message
        : JSON.stringify(e);

  if (raw.includes('CONFIGURATION_NOT_FOUND')) {
    return [
      'Firebase Authentication is not set up for this project yet.',
      '',
      '1) Firebase Console → Authentication → Get started',
      '2) Sign-in method → enable Anonymous',
      '3) Google Cloud → APIs & Services → enable Identity Toolkit API',
    ].join('\n');
  }

  if (raw.includes('auth/operation-not-allowed')) {
    return 'Enable Anonymous under Firebase Console → Authentication → Sign-in method.';
  }

  return raw.length > 400 ? `${raw.slice(0, 400)}…` : raw;
}
