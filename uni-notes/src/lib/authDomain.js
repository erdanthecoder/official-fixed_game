/**
 * Which domain sign-in happens on.
 *
 * Its own file so it can be tested without pulling in the Firebase SDK, and
 * because getting it wrong does not fail loudly — it fails as an account that
 * appears to sign in and then has nothing in it.
 *
 * Firebase points this at `<project>.firebaseapp.com` by default, so the app
 * signs in through a page on a domain that is not its own. Chrome tolerates
 * that. Safari does not: intelligent tracking prevention treats the auth
 * handler's storage as third-party and cuts it off, and the session never
 * survives — which looks, from the inside, exactly like an account with no
 * documents in it.
 *
 * Firebase Hosting serves `/__/auth/*` from every site in a project, so when
 * the app is served from one of those the handler is already on the same
 * origin. Using it makes sign-in first-party, which is what Safari needs, and
 * has a second benefit: a new hosting site no longer has to be added to the
 * authorized-domains list by hand before anyone can sign in on it.
 *
 * Anywhere else — a dev server, a desktop build, some other host — the
 * configured domain is the only thing that can work, so that is what is used.
 */

const FIREBASE_HOSTING = /(^|\.)web\.app$|(^|\.)firebaseapp\.com$/;

export function authDomainFor(configured, hostname) {
  if (!hostname) return configured;
  return FIREBASE_HOSTING.test(hostname) ? hostname : configured;
}
