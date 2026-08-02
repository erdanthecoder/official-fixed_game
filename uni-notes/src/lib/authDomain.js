/**
 * Which domain sign-in happens on.
 *
 * The answer is: the one Firebase was configured with, always. This file
 * exists to record why, because the alternative looks obviously better and is
 * not.
 *
 * Firebase signs in through `<project>.firebaseapp.com`, a different domain
 * from the app. Safari's tracking prevention treats that domain's storage as
 * third-party and cuts it off, so a sign-in can complete and leave no session
 * behind — which looks, from the inside, exactly like an account with no
 * documents in it.
 *
 * The tempting fix is to sign in on whatever Firebase Hosting site the app is
 * being served from, since Hosting serves `/__/auth/*` from all of them. It
 * was tried here and it breaks Google sign-in outright: Google checks the
 * redirect against the OAuth client's authorised list, and Firebase only ever
 * registers `<project>.firebaseapp.com` there. Every other site gets
 * redirect_uri_mismatch — the whole sign-in refused, on every browser, rather
 * than a session lost on one.
 *
 * Making a second site work is therefore a console job, not a code one:
 * Google Cloud Console → APIs & Services → Credentials → the Web client
 * → Authorised redirect URIs → add `https://<site>/__/auth/handler`. Until
 * that exists for a domain, signing in has to go through the configured one.
 */

export function authDomainFor(configured) {
  return configured;
}
