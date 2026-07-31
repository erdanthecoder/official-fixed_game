/**
 * Security rules, exercised against the real Firestore emulator.
 *
 * These are the boundary between one account's work and another's, so they are
 * tested rather than reasoned about. The invite-link path especially: it lets a
 * non-member write to a document they cannot read, which is exactly the kind of
 * rule that is easy to get subtly wrong.
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc,
} from 'firebase/firestore';
import fs from 'node:fs';

const CODE = 'K7M2QX9RTVB4NHJ8CDFW5PZ3LY'; // 26 chars, as the app generates
const OWNER = 'owner-uid';
const FRIEND = 'friend-uid';
const STRANGER = 'stranger-uid';

const env = await initializeTestEnvironment({
  projectId: 'uni-rules-test',
  firestore: { rules: fs.readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
});

let passed = 0;
let failed = 0;
const check = async (name, promise) => {
  try {
    await promise;
    console.log('  PASS  ' + name);
    passed += 1;
  } catch (error) {
    console.log('  FAIL  ' + name + '\n        ' + (error?.message ?? error).split('\n')[0]);
    failed += 1;
  }
};

/** A document owned by OWNER, with a live invite link at `role`. */
async function seed({ joinCode = CODE, joinRole = 'editor', joinExpiresAt = 0 } = {}) {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'docs/doc1'), {
      kind: 'note',
      title: 'Shortlist',
      content: 'hello',
      ownerUid: OWNER,
      memberUids: [OWNER],
      roles: { [OWNER]: 'owner' },
      members: { [OWNER]: { role: 'owner', email: 'o@x.com', name: 'O' } },
      joinCode,
      joinRole,
      joinExpiresAt,
      updatedAt: 1,
    });
    await setDoc(doc(db, `joinCodes/${joinCode}`), { docId: 'doc1', ownerUid: OWNER });
  });
}

/** Exactly what src/lib/inviteLinks.js sends when someone opens a link. */
const joinPayload = (uid, code, role) => ({
  memberUids: arrayUnion(uid),
  [`roles.${uid}`]: role,
  [`members.${uid}`]: { role, email: 'f@x.com', name: 'F', via: code },
  updatedAt: 2,
});

const as = (uid) => env.authenticatedContext(uid).firestore();

console.log('\nBaseline isolation');
await seed();
await check('a stranger cannot read the document',
  assertFails(getDoc(doc(as(STRANGER), 'docs/doc1'))));
await check('a stranger cannot read another account\'s folders',
  assertFails(getDoc(doc(as(STRANGER), `users/${OWNER}/folders/f1`))));
await check('the owner can read their own document',
  assertSucceeds(getDoc(doc(as(OWNER), 'docs/doc1'))));

console.log('\nInvite links — the happy path');
await seed();
await check('the code resolves to its document for any signed-in account',
  assertSucceeds(getDoc(doc(as(FRIEND), `joinCodes/${CODE}`))));
await check('presenting the right code joins the document',
  assertSucceeds(updateDoc(doc(as(FRIEND), 'docs/doc1'), joinPayload(FRIEND, CODE, 'editor'))));
await check('and afterwards they can read it',
  assertSucceeds(getDoc(doc(as(FRIEND), 'docs/doc1'))));

console.log('\nInvite links — what must not work');
await seed();
await check('joining without the code fails',
  assertFails(updateDoc(doc(as(STRANGER), 'docs/doc1'), joinPayload(STRANGER, '', 'editor'))));
await seed();
await check('joining with a wrong code fails',
  assertFails(updateDoc(doc(as(STRANGER), 'docs/doc1'),
    joinPayload(STRANGER, 'WRONGWRONGWRONGWRONGWRONG9', 'editor'))));
await seed({ joinRole: 'viewer' });
await check('a viewer link cannot be used to join as an editor',
  assertFails(updateDoc(doc(as(FRIEND), 'docs/doc1'), joinPayload(FRIEND, CODE, 'editor'))));
await seed({ joinRole: 'viewer' });
await check('a viewer link joins as a viewer',
  assertSucceeds(updateDoc(doc(as(FRIEND), 'docs/doc1'), joinPayload(FRIEND, CODE, 'viewer'))));
await seed({ joinExpiresAt: 1000 }); // long past
await check('an expired link is refused',
  assertFails(updateDoc(doc(as(FRIEND), 'docs/doc1'), joinPayload(FRIEND, CODE, 'editor'))));
await seed();
await check('a joiner cannot add somebody else at the same time',
  assertFails(updateDoc(doc(as(FRIEND), 'docs/doc1'), {
    ...joinPayload(FRIEND, CODE, 'editor'),
    [`roles.${STRANGER}`]: 'editor',
    memberUids: arrayUnion(FRIEND, STRANGER),
  })));
await seed();
await check('a joiner cannot edit the content on the way in',
  assertFails(updateDoc(doc(as(FRIEND), 'docs/doc1'), {
    ...joinPayload(FRIEND, CODE, 'editor'),
    content: 'defaced',
  })));
await seed();
await check('a joiner cannot make themselves the owner',
  assertFails(updateDoc(doc(as(FRIEND), 'docs/doc1'), {
    ...joinPayload(FRIEND, CODE, 'editor'),
    ownerUid: FRIEND,
  })));
await seed();
await check('a joiner cannot demote the real owner',
  assertFails(updateDoc(doc(as(FRIEND), 'docs/doc1'), {
    ...joinPayload(FRIEND, CODE, 'editor'),
    [`roles.${OWNER}`]: 'viewer',
  })));
await seed();
await check('signed-out visitors cannot join at all',
  assertFails(updateDoc(doc(env.unauthenticatedContext().firestore(), 'docs/doc1'),
    joinPayload(FRIEND, CODE, 'editor'))));
await seed();
await check('the code collection cannot be listed',
  assertFails(getDocs(collection(as(STRANGER), 'joinCodes'))));

console.log('\nInvite links — who controls them');
await seed();
await check('a stranger cannot mint a code for a document they do not own',
  assertFails(setDoc(doc(as(STRANGER), 'joinCodes/AAAAAAAAAAAAAAAAAAAAAAAAAA'),
    { docId: 'doc1', ownerUid: STRANGER })));
await seed();
await check('the owner can mint a code',
  assertSucceeds(setDoc(doc(as(OWNER), 'joinCodes/BBBBBBBBBBBBBBBBBBBBBBBBBB'),
    { docId: 'doc1', ownerUid: OWNER })));
await seed();
await check('a stranger cannot revoke a link',
  assertFails(deleteDoc(doc(as(STRANGER), `joinCodes/${CODE}`))));
await seed();
await check('the owner can revoke a link',
  assertSucceeds(deleteDoc(doc(as(OWNER), `joinCodes/${CODE}`))));

console.log('\nEditors still cannot touch access');
await seed();
await env.withSecurityRulesDisabled(async (ctx) => {
  await updateDoc(doc(ctx.firestore(), 'docs/doc1'), {
    memberUids: [OWNER, FRIEND],
    [`roles.${FRIEND}`]: 'editor',
    [`members.${FRIEND}`]: { role: 'editor', email: 'f@x.com', name: 'F' },
  });
});
await check('an editor can edit the content',
  assertSucceeds(updateDoc(doc(as(FRIEND), 'docs/doc1'), { content: 'edited', updatedAt: 3 })));
await check('an editor cannot rewrite the invite role',
  assertFails(updateDoc(doc(as(FRIEND), 'docs/doc1'), { joinRole: 'owner' })));
await check('an editor cannot mint their own invite code onto the doc',
  assertFails(updateDoc(doc(as(FRIEND), 'docs/doc1'), { joinCode: 'ZZZZZZZZZZZZZZZZZZZZZZZZZZ' })));
await check('an editor can still leave',
  assertSucceeds(updateDoc(doc(as(FRIEND), 'docs/doc1'), { memberUids: [OWNER] })));

console.log(`\n${passed} passed, ${failed} failed\n`);
await env.cleanup();
process.exit(failed === 0 ? 0 : 1);
