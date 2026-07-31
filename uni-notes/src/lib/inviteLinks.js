/**
 * Sharing by link — the half that needs no server.
 *
 * Inviting by email address needs a Cloud Function, because turning an address
 * into an account id requires the Admin SDK and the browser must never have it.
 * Cloud Functions need a billing plan. So this is the other route: the owner
 * mints a code, sends it however they like, and whoever opens it joins.
 *
 * The code *is* the credential, which is the whole security model, so it has to
 * be worth guessing at:
 *
 *   26 characters from a 32-symbol alphabet = 130 bits.
 *
 * Drawn from `crypto.getRandomValues`, never `Math.random` — that is seeded
 * predictably and is not a place to economise. The alphabet leaves out I, L, O,
 * U and 0/1 so a code read aloud or copied by hand does not turn into a
 * different code.
 *
 * How joining passes the security rules is worth understanding, because it
 * looks impossible at first: someone opening a link is not a member yet, so
 * they cannot read the document, so they cannot be asked anything about it.
 * What they can do is *present* the code. They write it into their own member
 * entry as `via`, and the rule compares that against the code stored on the
 * document. Client-supplied data measured against server-held data — the only
 * kind of check that means anything when the client is a stranger.
 *
 * The whole membership write is one `updateDoc` using `arrayUnion` and dotted
 * field paths, so it never has to read the document first.
 *
 * See firestore.rules (`isJoiningWithCode`) and test/rules.test.mjs, which
 * exercises the refusals against the emulator.
 */

import {
  arrayUnion,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase.js';
import { ROLE } from './model.js';

const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
const CODE_LENGTH = 26;

export const LINK_ERROR = {
  notConfigured: 'not-configured',
  needSignIn: 'need-sign-in',
  notFound: 'no-such-link',
  expired: 'link-expired',
  alreadyMember: 'already-a-member',
  notOwner: 'not-owner',
  failed: 'failed',
};

export const areLinksAvailable = isFirebaseConfigured;

function newCode() {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  // Modulo bias across 30 symbols in 256 values is about 4% on six of them —
  // irrelevant against 130 bits, and not worth a rejection-sampling loop.
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
}

function need() {
  if (!isFirebaseConfigured || !db) {
    throw Object.assign(new Error('Links need an account.'), { code: LINK_ERROR.notConfigured });
  }
}

/** The shareable URL for a code, against whatever origin the app is served from. */
export function linkFor(code) {
  return `${window.location.origin}${window.location.pathname}#/join/${code}`;
}

/**
 * Mint a link for a document, replacing any previous one.
 *
 * Replacing rather than accumulating is deliberate: one live link per document
 * means "revoke" is a button rather than a list to audit, and a link someone
 * forwarded on a month ago stops working the moment the owner makes a new one.
 *
 * @param days 0 for no expiry.
 */
export async function createInviteLink({ docId, ownerUid, role = ROLE.editor, days = 30, previousCode = null }) {
  need();
  const code = newCode();
  const expiresAt = days > 0 ? Date.now() + days * 24 * 60 * 60 * 1000 : 0;

  // Pointer first. If the document write fails the pointer is harmless — it
  // names a document whose joinCode does not match, so it can never be used.
  // The role goes on the pointer as well as the document. The joiner can only
  // read the pointer, and has to send the role in their write — but the rule
  // checks it against the *document*, so a tampered pointer just makes the join
  // fail rather than granting anything.
  await setDoc(doc(db, 'joinCodes', code), {
    docId,
    ownerUid,
    role,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'docs', docId), {
    joinCode: code,
    joinRole: role,
    joinExpiresAt: expiresAt,
  });

  if (previousCode && previousCode !== code) {
    await deleteDoc(doc(db, 'joinCodes', previousCode)).catch(() => {});
  }

  return { code, role, expiresAt, url: linkFor(code) };
}

/** Turn the link off. The document keeps working; only the way in closes. */
export async function revokeInviteLink({ docId, code }) {
  need();
  await updateDoc(doc(db, 'docs', docId), {
    joinCode: '',
    joinRole: '',
    joinExpiresAt: 0,
  });
  if (code) await deleteDoc(doc(db, 'joinCodes', code)).catch(() => {});
}

/** What document does this code open? Readable by anyone holding the code. */
export async function resolveInviteLink(code) {
  need();
  const snapshot = await getDoc(doc(db, 'joinCodes', code));
  if (!snapshot.exists()) {
    throw Object.assign(new Error('No such link.'), { code: LINK_ERROR.notFound });
  }
  return snapshot.data();
}

/**
 * Join the document a code opens.
 *
 * Deliberately blind: no read of the document happens, because the joiner has
 * no right to one until this write succeeds. Everything the rule needs is in
 * the write itself.
 */
export async function joinWithCode({ code, user }) {
  need();
  if (!user?.uid) {
    throw Object.assign(new Error('Sign in first.'), { code: LINK_ERROR.needSignIn });
  }

  const pointer = await resolveInviteLink(code);
  const docId = pointer.docId;

  try {
    await updateDoc(doc(db, 'docs', docId), {
      memberUids: arrayUnion(user.uid),
      [`roles.${user.uid}`]: pointer.role ?? ROLE.editor,
      [`members.${user.uid}`]: {
        role: pointer.role ?? ROLE.editor,
        email: user.email ?? '',
        name: user.name ?? '',
        via: code,
      },
      updatedAt: Date.now(),
    });
    return { docId };
  } catch (error) {
    // The rule is one boolean, so a refusal cannot say why. These are the
    // reasons it can actually have refused, in the order worth guessing.
    if (error?.code === 'permission-denied') {
      const already = await getDoc(doc(db, 'docs', docId))
        .then((snap) => snap.exists())
        .catch(() => false);
      throw Object.assign(new Error('Could not join.'), {
        code: already ? LINK_ERROR.alreadyMember : LINK_ERROR.expired,
        docId,
      });
    }
    throw Object.assign(new Error('Could not join.'), { code: LINK_ERROR.failed });
  }
}

/** The link currently live on a document, if any. */
export function linkOn(document) {
  const code = document?.joinCode;
  if (!code) return null;
  const expiresAt = document.joinExpiresAt ?? 0;
  return {
    code,
    url: linkFor(code),
    role: document.joinRole ?? ROLE.editor,
    expiresAt,
    expired: expiresAt > 0 && Date.now() > expiresAt,
  };
}
