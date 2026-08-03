/**
 * The invite someone was holding when we asked them to sign in.
 *
 * Opening a share link while signed out is the normal case, not the edge case:
 * a link goes to somebody who does not have an account yet, which is the whole
 * reason for sending one. So the journey is always
 *
 *     #/join/CODE  →  sign in  →  ???
 *
 * and until now the ??? was Notes, with the invitation gone. Signing in
 * replaces the hash, taking the code with it, and Safari makes it worse by
 * reloading the page entirely on a redirect sign-in. Either way the link
 * appeared not to work, which is exactly what it looks like from the outside.
 *
 * So the code is put somewhere that survives both. sessionStorage rather than
 * localStorage on purpose: an invitation belongs to this visit. A code left in
 * localStorage would still be sitting there next week, quietly hijacking a
 * sign-in that had nothing to do with it.
 */

const KEY = 'kadam:pending-join';

export function rememberJoin(code) {
  if (!code) return;
  try {
    sessionStorage.setItem(KEY, code);
  } catch {
    // Private mode, or storage full. The in-page path still works; only the
    // trip through a full-page redirect loses it.
  }
}

/** Read it and clear it — an invitation is claimed once. */
export function takeJoin() {
  try {
    const code = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return code || null;
  } catch {
    return null;
  }
}

export function forgetJoin() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to do, and nothing that depends on it.
  }
}
