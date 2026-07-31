/**
 * Collaboration — the server half.
 *
 * These functions exist because two things must not happen in a browser:
 *   · turning an email address into a uid (needs admin privileges, and would
 *     otherwise let anyone enumerate accounts);
 *   · writing a document's membership (the rules only let members write a
 *     document, so a new collaborator could never add themselves).
 *
 * Every function re-checks the caller's rights server-side. A callable function
 * gives us a verified `request.auth`, but it says nothing about what that user
 * is allowed to do — that check is ours.
 */

import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { db } from './admin.js';

const DOCS = 'docs';
const INVITES = 'invites';
const ROLES = ['editor', 'viewer'];
const MAX_MEMBERS = 20;

const options = { region: 'us-central1', cors: true, maxInstances: 10 };

const normaliseEmail = (value) => String(value ?? '').trim().toLowerCase();

/** Loose on purpose: Firebase is the real validator, this just catches typos. */
const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

function requireAuth(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');
  return uid;
}

/** Load a document and confirm the caller owns it. */
async function loadOwned(docId, uid) {
  if (typeof docId !== 'string' || docId.length === 0 || docId.length > 200) {
    throw new HttpsError('invalid-argument', 'A document id is required.');
  }

  const reference = db.doc(`${DOCS}/${docId}`);
  const snapshot = await reference.get();
  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'That document no longer exists.', {
      reason: 'no-such-document',
    });
  }

  const data = snapshot.data();
  if (data.ownerUid !== uid) {
    throw new HttpsError('permission-denied', 'Only the owner can change who has access.');
  }
  return { reference, data };
}

/**
 * shareDocument — add a member by email, or change an existing member's role.
 *
 * With `email`: resolves the address. If an account exists it's added straight
 * away; if not, a pending invitation is stored and claimed when they first sign
 * in (see claimInvites).
 * With `memberUid`: changes that member's role.
 */
export const shareDocument = onCall(options, async (request) => {
  const uid = requireAuth(request);
  const { docId, email, memberUid, role = 'editor' } = request.data ?? {};

  if (!ROLES.includes(role)) {
    throw new HttpsError('invalid-argument', 'Role must be editor or viewer.');
  }

  const { reference, data } = await loadOwned(docId, uid);

  // Role change for someone already on the document.
  if (memberUid) {
    if (memberUid === data.ownerUid) {
      throw new HttpsError('invalid-argument', "The owner's role can't be changed.");
    }
    if (!(data.memberUids ?? []).includes(memberUid)) {
      throw new HttpsError('not-found', 'That person is not on this document.', {
        reason: 'not-a-member',
      });
    }
    await reference.update({
      [`roles.${memberUid}`]: role,
      [`members.${memberUid}.role`]: role,
      updatedAt: Date.now(),
    });
    return { status: 'role-changed', memberUid, role };
  }

  const address = normaliseEmail(email);
  if (!looksLikeEmail(address)) {
    throw new HttpsError('invalid-argument', 'That email address does not look right.');
  }
  if (address === normaliseEmail(request.auth.token?.email)) {
    throw new HttpsError('already-exists', 'That is your own account.');
  }
  if ((data.memberUids ?? []).length >= MAX_MEMBERS) {
    throw new HttpsError('resource-exhausted', 'This document already has the maximum members.');
  }

  let target = null;
  try {
    target = await getAuth().getUserByEmail(address);
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') {
      console.error('[uni-share] Could not look up an account.', error);
      throw new HttpsError('internal', 'Could not check that address.');
    }
  }

  // No account yet — park the invitation. Nothing about the document leaks:
  // the invite holds ids only, and the rules keep it readable by that address.
  if (!target) {
    await db.collection(INVITES).add({
      docId,
      email: address,
      role,
      invitedByUid: uid,
      invitedByName: request.auth.token?.name ?? '',
      createdAt: FieldValue.serverTimestamp(),
    });
    return { status: 'invited', email: address };
  }

  if ((data.memberUids ?? []).includes(target.uid)) {
    return { status: 'already-a-member', email: address, name: target.displayName ?? '' };
  }

  await reference.update({
    memberUids: FieldValue.arrayUnion(target.uid),
    [`roles.${target.uid}`]: role,
    [`members.${target.uid}`]: {
      role,
      email: address,
      name: target.displayName ?? '',
    },
    updatedAt: Date.now(),
  });

  return { status: 'added', email: address, name: target.displayName ?? '', role };
});

/** revokeAccess — remove a member, or withdraw a pending invitation. */
export const revokeAccess = onCall(options, async (request) => {
  const uid = requireAuth(request);
  const { docId, memberUid, email } = request.data ?? {};
  const { reference, data } = await loadOwned(docId, uid);

  if (memberUid) {
    if (memberUid === data.ownerUid) {
      throw new HttpsError('invalid-argument', 'The owner cannot be removed.');
    }
    await reference.update({
      memberUids: FieldValue.arrayRemove(memberUid),
      [`roles.${memberUid}`]: FieldValue.delete(),
      [`members.${memberUid}`]: FieldValue.delete(),
      updatedAt: Date.now(),
    });
    return { status: 'removed', memberUid };
  }

  const address = normaliseEmail(email);
  if (!looksLikeEmail(address)) {
    throw new HttpsError('invalid-argument', 'An email address or member is required.');
  }

  const pending = await db
    .collection(INVITES)
    .where('docId', '==', docId)
    .where('email', '==', address)
    .get();
  await Promise.all(pending.docs.map((invite) => invite.ref.delete()));
  return { status: 'invitation-withdrawn', email: address, count: pending.size };
});

/**
 * claimInvites — run on every sign-in.
 *
 * Turns invitations addressed to this account's email into real membership.
 * Cheap and idempotent: one indexed query, and nothing to do in the common case.
 */
export const claimInvites = onCall(options, async (request) => {
  const uid = requireAuth(request);
  const address = normaliseEmail(request.auth.token?.email);
  if (!address) return { claimed: 0 };

  const pending = await db.collection(INVITES).where('email', '==', address).limit(50).get();
  if (pending.empty) return { claimed: 0 };

  const name = request.auth.token?.name ?? '';
  let claimed = 0;

  for (const invite of pending.docs) {
    const { docId, role } = invite.data();
    const reference = db.doc(`${DOCS}/${docId}`);

    try {
      // One transaction per document: an invitation to a document that has
      // since been deleted shouldn't stop the others being claimed.
      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) {
          transaction.delete(invite.ref);
          return;
        }
        transaction.update(reference, {
          memberUids: FieldValue.arrayUnion(uid),
          [`roles.${uid}`]: ROLES.includes(role) ? role : 'editor',
          [`members.${uid}`]: {
            role: ROLES.includes(role) ? role : 'editor',
            email: address,
            name,
          },
        });
        transaction.delete(invite.ref);
      });
      claimed += 1;
    } catch (error) {
      console.warn('[uni-share] Could not claim an invitation.', invite.id, error);
    }
  }

  return { claimed };
});

/** listInvites — pending invitations on a document, for the share dialog. */
export const listInvites = onCall(options, async (request) => {
  const uid = requireAuth(request);
  const { docId } = request.data ?? {};
  await loadOwned(docId, uid);

  const pending = await db.collection(INVITES).where('docId', '==', docId).limit(50).get();
  return {
    invites: pending.docs.map((invite) => ({
      email: invite.data().email,
      role: invite.data().role,
    })),
  };
});
