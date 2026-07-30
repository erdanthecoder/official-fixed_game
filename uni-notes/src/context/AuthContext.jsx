/**
 * Google sign-in state.
 *
 * Three states the UI cares about:
 *   status 'loading'  — still asking Firebase who's signed in
 *   status 'signedIn' — `user` is set, data syncs to that account
 *   status 'signedOut'— show the sign-in screen
 *
 * When Firebase isn't configured we jump straight to 'local': the app works,
 * saving to this browser only. That keeps the suite usable (and testable)
 * before the project exists.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../lib/firebase.js';
import { migrateLocalDataToCloud } from '../lib/repository.js';

const AuthContext = createContext(null);

export const AUTH_STATUS = {
  loading: 'loading',
  signedIn: 'signedIn',
  signedOut: 'signedOut',
  local: 'local',
};

export function AuthProvider({ children }) {
  const [status, setStatus] = useState(
    isFirebaseConfigured ? AUTH_STATUS.loading : AUTH_STATUS.local,
  );
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;

    return onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setUser(null);
        setStatus(AUTH_STATUS.signedOut);
        return;
      }

      setUser({
        uid: nextUser.uid,
        name: nextUser.displayName || nextUser.email || 'You',
        email: nextUser.email ?? '',
        photoURL: nextUser.photoURL ?? '',
      });
      setStatus(AUTH_STATUS.signedIn);

      // Lift work created before signing in — no-op if the account already has data.
      try {
        await migrateLocalDataToCloud(nextUser.uid);
      } catch (migrationError) {
        console.warn('[Uni] Could not copy local work into the account.', migrationError);
      }
    });
  }, []);

  const signIn = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    setBusy(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (signInError) {
      // Closing the popup isn't an error worth shouting about.
      if (
        signInError?.code !== 'auth/popup-closed-by-user' &&
        signInError?.code !== 'auth/cancelled-popup-request'
      ) {
        console.warn('[Uni] Sign-in failed.', signInError);
        setError(signInError?.code ?? 'unknown');
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const leave = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    await signOut(auth);
  }, []);

  const value = useMemo(
    () => ({
      status,
      user,
      uid: user?.uid ?? null,
      error,
      busy,
      isCloud: status === AUTH_STATUS.signedIn,
      isFirebaseConfigured,
      signIn,
      signOut: leave,
    }),
    [status, user, error, busy, signIn, leave],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
