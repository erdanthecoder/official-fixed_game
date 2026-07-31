/**
 * Collaboration — the client half.
 *
 * Adding someone to a document means turning an email address into a uid, and
 * only the server can do that: `admin.auth().getUserByEmail` needs privileges
 * the browser must never have, and letting clients write each other's
 * membership would be a hole in the security rules. So every membership change
 * goes through a Cloud Function.
 */

import { httpsCallable } from 'firebase/functions';
import { functions, isFirebaseConfigured } from './firebase.js';

export const SHARE_ERROR = {
  notConfigured: 'not-configured',
  needSignIn: 'need-sign-in',
  notFound: 'no-such-account',
  notOwner: 'not-owner',
  self: 'thats-you',
  invalidEmail: 'invalid-email',
  failed: 'failed',
};

export const isSharingAvailable = isFirebaseConfigured;

function call(name, payload) {
  if (!isFirebaseConfigured || !functions) {
    throw Object.assign(new Error('Sharing is not configured.'), {
      code: SHARE_ERROR.notConfigured,
    });
  }
  return httpsCallable(functions, name, { timeout: 30000 })(payload).then((result) => result.data);
}

function mapError(error) {
  switch (error?.code) {
    case 'functions/unauthenticated':
      return SHARE_ERROR.needSignIn;
    case 'functions/not-found':
      // Either the function isn't deployed, or the email has no account. The
      // function sends `details.reason` so we can tell them apart.
      return error?.details?.reason === 'no-such-account'
        ? SHARE_ERROR.notFound
        : SHARE_ERROR.notConfigured;
    case 'functions/permission-denied':
      return SHARE_ERROR.notOwner;
    case 'functions/already-exists':
      return SHARE_ERROR.self;
    case 'functions/invalid-argument':
      return SHARE_ERROR.invalidEmail;
    case 'functions/failed-precondition':
      return SHARE_ERROR.notConfigured;
    default:
      return error?.code === SHARE_ERROR.notConfigured ? error.code : SHARE_ERROR.failed;
  }
}

async function guarded(name, payload) {
  try {
    return await call(name, payload);
  } catch (error) {
    throw Object.assign(new Error(error?.message ?? 'Sharing failed.'), {
      code: mapError(error),
    });
  }
}

/**
 * Invite an account to a document.
 * Returns `{ status: 'added' | 'invited', name?, email }` — 'invited' means no
 * account exists for that address yet, so the invitation waits for them.
 */
export function shareDocument({ docId, email, role = 'editor' }) {
  return guarded('shareDocument', { docId, email, role });
}

export function updateMemberRole({ docId, memberUid, role }) {
  return guarded('shareDocument', { docId, memberUid, role });
}

export function revokeAccess({ docId, memberUid, email }) {
  return guarded('revokeAccess', { docId, memberUid, email });
}

/**
 * Pick up documents shared with this address before the account existed.
 * Called on every sign-in; a no-op when there's nothing waiting.
 */
export function claimInvites() {
  if (!isFirebaseConfigured || !functions) return Promise.resolve({ claimed: 0 });
  return guarded('claimInvites', {});
}

/** Pending invitations on a document, for the share dialog's list. */
export function listInvites({ docId }) {
  return guarded('listInvites', { docId });
}
