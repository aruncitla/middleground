import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

let app: FirebaseApp;

/** True when Expo public env has the minimum fields Firebase needs (avoids auth/invalid-api-key from empty strings). */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey?.trim() &&
      firebaseConfig.projectId?.trim() &&
      firebaseConfig.appId?.trim(),
  );
}

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase env vars are missing. Add EXPO_PUBLIC_FIREBASE_API_KEY, PROJECT_ID, APP_ID (and the rest) to a .env file in the project root, then restart Expo.',
    );
  }
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  return app;
}

export function getDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

let auth: Auth | undefined;

export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  const app = getFirebaseApp();
  try {
    auth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    });
  } catch {
    auth = getAuth(app);
  }
  return auth;
}

export function getFirebaseFunctions(): Functions {
  const region = process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION ?? 'us-central1';
  return getFunctions(getFirebaseApp(), region);
}
