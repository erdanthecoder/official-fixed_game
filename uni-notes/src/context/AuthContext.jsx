/**
 * Sign-in state: Google, or email and password.
 *
 * Four states the UI cares about:
 *   'loading'  — still asking Firebase who's signed in
 *   'signedIn' — `user` is set, data syncs to that account
 *   'signedOut'— show the landing page and the sign-in card
 *   'local'    — Firebase isn't configured; the app works, saving to this
 *                browser only. That keeps the suite usable (and testable)
 *                before a project exists.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../lib/firebase.js';
import { migrateIntoAccount } from '../lib/repository.js';
import { claimInvites } from '../lib/sharing.js';

const AuthContext = createContext(null);

export const AUTH_STATUS = {
  loading: 'loading',
  signedIn: 'signedIn',
  signedOut: 'signedOut',
  local: 'local',
};

/**
 * Firebase error codes are not for humans. Map the ones a real person can
 * actually hit; everything else falls back to a generic message.
 */
const MESSAGES = {
  'auth/invalid-email': 'auth.errorInvalidEmail',
  'auth/missing-password': 'auth.errorNoPassword',
  'auth/weak-password': 'auth.errorWeakPassword',
  'auth/email-already-in-use': 'auth.errorEmailInUse',
  'auth/invalid-credential': 'auth.errorWrongDetails',
  'auth/wrong-password': 'auth.errorWrongDetails',
  'auth/user-not-found': 'auth.errorWrongDetails',
  'auth/too-many-requests': 'auth.errorTooMany',
  'auth/network-request-failed': 'auth.errorNetwork',
  'auth/popup-blocked': 'auth.errorPopupBlocked',
  'auth/operation-not-allowed': 'auth.errorMethodOff',
  'auth/unauthorized-domain': 'auth.errorDomain',
};

/*
 * When a popup is not possible at all, as opposed to merely dismissed.
 *
 * A popup is the better experience — the app stays where it is and the page is
 * never reloaded — and it is also the thing Safari is most likely to refuse: on
 * iPad it can be blocked outright, and a home-screen app has no window to open
 * one in. The refusal arrives as a code rather than a hang, so it can be
 * answered with a redirect instead of a message telling someone to go and
 * change a browser setting.
 */
const CANNOT_POPUP = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
]);

/** Popup dismissals are not errors worth showing anyone. */
const SILENT = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
]);

export function AuthProvider({ children }) {
  const [status, setStatus] = useState(
    isFirebaseConfigured ? AUTH_STATUS.loading : AUTH_STATUS.local,
  );
  const [user, setUser] = useState(null);
  const [errorKey, setErrorKey] = useState(null);
  const [noticeKey, setNoticeKey] = useState(null);
  const [busy, setBusy] = useState(false);

  // Coming back from a redirect sign-in. The listener below reports the result
  // either way; this is only here so a failure is not swallowed in silence.
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    getRedirectResult(auth).catch((error) => {
      console.warn('[Uni] Sign-in did not complete.', error?.code ?? error);
      setErrorKey(MESSAGES[error?.code] ?? 'auth.errorGeneric');
    });
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;

    /*
     * Never wait forever.
     *
     * The whole app is behind this one callback: until Firebase says who is
     * signed in, the screen is the word "Loading". That is correct for the
     * half-second it normally takes and indefensible after that — and it can
     * genuinely never arrive. A tablet on hotel wifi, a network that accepts
     * the connection and then drops it, a domain Firebase has not been told
     * about: in each case the callback simply does not come, and the app is a
     * spinner with no way out and nothing to read.
     *
     * After six seconds, stop waiting and show the sign-in screen. Nothing is
     * lost by being wrong: if the answer arrives late, the listener below still
     * fires and moves straight on to the workspace.
     */
    const giveUp = setTimeout(() => {
      setStatus((current) => (current === AUTH_STATUS.loading ? AUTH_STATUS.signedOut : current));
    }, 6000);

    const stop = onAuthStateChanged(
      auth,
      async (nextUser) => {
        clearTimeout(giveUp);
        if (!nextUser) {
          setUser(null);
          setStatus(AUTH_STATUS.signedOut);
          return;
        }

        setUser({
          uid: nextUser.uid,
          name: nextUser.displayName || nextUser.email?.split('@')[0] || 'You',
          email: nextUser.email ?? '',
          photoURL: nextUser.photoURL ?? '',
        });
        setStatus(AUTH_STATUS.signedIn);

        // Both of these are safe to re-run on every sign-in and no-op when
        // there's nothing to do, so neither needs its own guard.
        try {
          await migrateIntoAccount({
            uid: nextUser.uid,
            email: nextUser.email ?? '',
            name: nextUser.displayName ?? '',
          });
        } catch (error) {
          console.warn('[Uni] Could not move earlier work into the account.', error);
        }

        try {
          await claimInvites();
        } catch (error) {
          // Whatever went wrong looking for invitations, it must not stand
          // between someone and their own documents.
          console.info('[Uni] Skipped checking for invitations.', error?.message ?? error);
        }
      },
      // Firebase can fail this listener outright rather than call it back.
      // Without this the failure is silent and the screen stays on "Loading".
      (error) => {
        clearTimeout(giveUp);
        console.warn('[Uni] Could not check who is signed in.', error);
        setUser(null);
        setStatus(AUTH_STATUS.signedOut);
      },
    );

    return () => {
      clearTimeout(giveUp);
      stop();
    };
  }, []);

  const run = useCallback(async (action) => {
    if (!isFirebaseConfigured) return false;
    setBusy(true);
    setErrorKey(null);
    setNoticeKey(null);
    try {
      await action();
      return true;
    } catch (error) {
      const code = error?.code ?? '';
      if (!SILENT.has(code)) {
        console.warn('[Uni] Sign-in problem.', code || error);
        setErrorKey(MESSAGES[code] ?? 'auth.errorGeneric');
      }
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const signInWithGoogle = useCallback(
    () =>
      run(async () => {
        try {
          await signInWithPopup(auth, googleProvider);
        } catch (error) {
          if (!CANNOT_POPUP.has(error?.code)) throw error;
          // Leaves the page and comes back signed in; picked up below.
          await signInWithRedirect(auth, googleProvider);
        }
      }),
    [run],
  );

  const signInWithEmail = useCallback(
    (email, password) => run(() => signInWithEmailAndPassword(auth, email.trim(), password)),
    [run],
  );

  const signUpWithEmail = useCallback(
    (email, password, name) =>
      run(async () => {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const displayName = name.trim();
        if (displayName) {
          await updateProfile(credential.user, { displayName });
          // onAuthStateChanged has already fired with the pre-update profile,
          // so reflect the name locally rather than waiting for a reload.
          setUser((current) => (current ? { ...current, name: displayName } : current));
        }
      }),
    [run],
  );

  const resetPassword = useCallback(
    async (email) => {
      const ok = await run(() => sendPasswordResetEmail(auth, email.trim()));
      if (ok) setNoticeKey('auth.resetSent');
      return ok;
    },
    [run],
  );

  const leave = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    await signOut(auth);
  }, []);

  const clearMessages = useCallback(() => {
    setErrorKey(null);
    setNoticeKey(null);
  }, []);

  const value = useMemo(
    () => ({
      status,
      user,
      uid: user?.uid ?? null,
      errorKey,
      noticeKey,
      busy,
      isCloud: status === AUTH_STATUS.signedIn,
      isFirebaseConfigured,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      resetPassword,
      clearMessages,
      signOut: leave,
    }),
    [
      status,
      user,
      errorKey,
      noticeKey,
      busy,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      resetPassword,
      clearMessages,
      leave,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
