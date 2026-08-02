/**
 * Sharing by email address, with no server.
 *
 * The textbook way to do this needs a Cloud Function: an email address is not
 * an account id, and only the Admin SDK can turn one into the other. Cloud
 * Functions need a billing plan, and this app should not require one to let two
 * people work on the same essay. That version of this file existed, was never
 * deployed, and so email sharing never once worked.
 *
 * This is the other way round, and it needs nothing but Firestore.
 *
 *   The owner does not add the person. The owner leaves an invitation, and the
 *   person picks it up when they next sign in.
 *
 * An invitation is a single string on the document — `editor:someone@x.com` —
 * so the role can never be separated from the address it was granted to.
 * Accepting it consumes it. The security rules do the checking, against
 * `request.auth.token.email`, which Firebase verified at sign-in rather than
 * taking anyone's word for; `email_verified` is required, so registering an
 * address you do not own is not a way in.
 *
 * What this trades away is honest and worth stating: someone who has never
 * signed in cannot be *added*, only *invited*, and the document appears for
 * them the moment they do. In exchange it works today, on the free plan, for
 * everyone.
 *
 * See firestore.rules — `isInvited`, `isAcceptingInvite` — and
 * test/invites.test.mjs, which runs the refusals against the emulator.
 */

import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase.js';
import { ROLE } from './model.js';

export const SHARE_ERROR = {
  notConfigured: 'not-configured',
  needSignIn: 'need-sign-in',
  notFound: 'no-such-account',
  notOwner: 'not-owner',
  self: 'thats-you',
  invalidEmail: 'invalid-email',
  failed: 'failed',
};

/** No Cloud Functions, no billing plan: an account is the only requirement. */
export const isSharingAvailable = isFirebaseConfigured;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(code) {
  return Object.assign(new Error(code), { code });
}

function need() {
  if (!isFirebaseConfigured || !db) throw fail(SHARE_ERROR.notConfigured);
  if (!auth?.currentUser) throw fail(SHARE_ERROR.needSignIn);
  return auth.currentUser;
}

/** `editor:someone@x.com` — one token, so role and address travel together. */
export function inviteToken(role, email) {
  return `${role}:${String(email).trim().toLowerCase()}`;
}

/** Split a stored invitation back into its parts. */
export function readInvite(token) {
  const at = String(token).indexOf(':');
  return at === -1
    ? { role: ROLE.editor, email: String(token) }
    : { role: token.slice(0, at), email: token.slice(at + 1) };
}

/**
 * Invite an address to a document.
 *
 * Always resolves to `{ status: 'invited', email }`. There is deliberately no
 * 'added' any more: without a server the app cannot know whether that address
 * has an account, and claiming it added someone who never appears would be
 * worse than saying plainly that an invitation is waiting.
 */
export async function shareDocument({ docId, email, role = ROLE.editor }) {
  const me = need();
  const address = String(email ?? '').trim().toLowerCase();

  if (!EMAIL.test(address)) throw fail(SHARE_ERROR.invalidEmail);
  if (address === (me.email ?? '').toLowerCase()) throw fail(SHARE_ERROR.self);

  try {
    // Any earlier invitation to the same person goes first, so changing your
    // mind about their role replaces it rather than offering both.
    await updateDoc(doc(db, 'docs', docId), {
      invitedEmails: arrayRemove(
        inviteToken(ROLE.editor, address),
        inviteToken(ROLE.viewer, address),
      ),
    });
    await updateDoc(doc(db, 'docs', docId), {
      invitedEmails: arrayUnion(inviteToken(role, address)),
      updatedAt: Date.now(),
    });
  } catch (error) {
    throw fail(error?.code === 'permission-denied' ? SHARE_ERROR.notOwner : SHARE_ERROR.failed);
  }

  return { status: 'invited', email: address };
}

/** Change what an existing member may do. Owner only, enforced by the rules. */
export async function updateMemberRole({ docId, memberUid, role }) {
  need();
  try {
    await updateDoc(doc(db, 'docs', docId), {
      [`roles.${memberUid}`]: role,
      [`members.${memberUid}.role`]: role,
      updatedAt: Date.now(),
    });
  } catch (error) {
    throw fail(error?.code === 'permission-denied' ? SHARE_ERROR.notOwner : SHARE_ERROR.failed);
  }
  return { status: 'updated' };
}

/**
 * Take someone's access away, or withdraw an invitation nobody took up. Which
 * one is decided by whether a uid or an address is given.
 */
export async function revokeAccess({ docId, memberUid, email }) {
  need();
  try {
    if (memberUid) {
      await updateDoc(doc(db, 'docs', docId), {
        memberUids: arrayRemove(memberUid),
        [`roles.${memberUid}`]: deleteField(),
        [`members.${memberUid}`]: deleteField(),
        updatedAt: Date.now(),
      });
    } else {
      const address = String(email ?? '').trim().toLowerCase();
      await updateDoc(doc(db, 'docs', docId), {
        invitedEmails: arrayRemove(
          inviteToken(ROLE.editor, address),
          inviteToken(ROLE.viewer, address),
        ),
        updatedAt: Date.now(),
      });
    }
  } catch (error) {
    throw fail(error?.code === 'permission-denied' ? SHARE_ERROR.notOwner : SHARE_ERROR.failed);
  }
  return { status: 'revoked' };
}

/**
 * Invitations waiting on a document, straight off the document.
 *
 * No round trip: the share dialog already holds the document, so this is a
 * shape change rather than a fetch. It stays async because that is what the
 * dialog was written against.
 */
export async function listInvites({ document: source }) {
  const tokens = source?.invitedEmails ?? [];
  return { invites: tokens.map(readInvite) };
}

/**
 * Pick up everything left for this address, and join it.
 *
 * Runs on every sign-in. The query is the piece that lets an invitation find
 * its way home without anyone being told where to look: the rules let an
 * invited address read the documents that named it, and nothing else.
 */
export async function claimInvites() {
  if (!isFirebaseConfigured || !db || !auth?.currentUser) return { claimed: 0 };

  const me = auth.currentUser;
  const address = (me.email ?? '').trim().toLowerCase();
  if (!address || !me.emailVerified) return { claimed: 0 };

  const tokens = [inviteToken(ROLE.editor, address), inviteToken(ROLE.viewer, address)];

  let waiting;
  try {
    waiting = await getDocs(
      query(collection(db, 'docs'), where('invitedEmails', 'array-contains-any', tokens)),
    );
  } catch (error) {
    // Old rules, or offline. Neither is worth interrupting a sign-in for.
    console.info('[Uni] Could not check for invitations.', error?.message ?? error);
    return { claimed: 0 };
  }

  let claimed = 0;
  for (const snapshot of waiting.docs) {
    const held = snapshot.data().invitedEmails ?? [];
    const mine = tokens.find((token) => held.includes(token));
    if (!mine) continue;
    const { role } = readInvite(mine);

    try {
      await updateDoc(snapshot.ref, {
        memberUids: arrayUnion(me.uid),
        [`roles.${me.uid}`]: role,
        [`members.${me.uid}`]: {
          role,
          email: me.email ?? '',
          name: me.displayName ?? '',
        },
        // Consumed, which is also what the rule insists on.
        invitedEmails: arrayRemove(mine),
        updatedAt: Date.now(),
      });
      claimed += 1;
    } catch (error) {
      console.info('[Uni] Could not accept an invitation.', error?.message ?? error);
    }
  }

  return { claimed };
}
