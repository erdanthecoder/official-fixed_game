/**
 * Firebase bootstrap.
 *
 * Config comes from Vite env vars (see .env.example). If they're missing the
 * app still runs — `isFirebaseConfigured` is false and everything falls back to
 * local storage, which keeps development and demos working without a project.
 */

import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { authDomainFor } from './authDomain.js';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // Always the configured domain — see authDomain.js for why the same-origin
  // version breaks Google sign-in.
  authDomain: authDomainFor(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const REQUIRED_KEYS = ['apiKey', 'authDomain', 'projectId', 'appId'];

export const isFirebaseConfigured = REQUIRED_KEYS.every(
  (key) => typeof config[key] === 'string' && config[key].length > 0,
);

export const FUNCTIONS_REGION = import.meta.env.VITE_FIREBASE_REGION || 'us-central1';

let app = null;
let auth = null;
let db = null;
let functions = null;

if (isFirebaseConfigured) {
  app = initializeApp(config);
  auth = getAuth(app);

  // Persistent cache means the app keeps working offline and syncs when the
  // connection comes back — important on a tablet with patchy wifi.
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });

  functions = getFunctions(app, FUNCTIONS_REGION);
} else {
  console.info(
    '[Uni] Firebase is not configured — running in local-only mode. See .env.example.',
  );
}

export const googleProvider = isFirebaseConfigured
  ? new GoogleAuthProvider()
  : null;

export { app, auth, db, functions };
