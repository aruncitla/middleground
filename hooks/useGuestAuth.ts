import { onAuthStateChanged, type User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { formatAnonymousAuthError, signInAsGuest } from '@/lib/auth-guest';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase';

export function useGuestAuth() {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      setError('Firebase env not loaded. Add EXPO_PUBLIC_FIREBASE_* to .env and restart Expo.');
      return;
    }
    const auth = getFirebaseAuth();
    if (auth.currentUser) {
      setUser(auth.currentUser);
      setLoading(false);
    }
    const unsub = onAuthStateChanged(auth, (next) => {
      setUser(next);
      if (next) {
        setLoading(false);
        setError(null);
        return;
      }
      void (async () => {
        try {
          await signInAsGuest();
        } catch (e) {
          setError(formatAnonymousAuthError(e));
          setLoading(false);
        }
      })();
    });
    return () => unsub();
  }, [configured]);

  return { user, loading, error, configured };
}
