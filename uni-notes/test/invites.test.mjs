/**
 * Email invitations without a server, against the real emulator.
 *
 * This is the rule that lets a stranger write to a document they do not belong
 * to, so it gets the same treatment as the invite links: every refusal is
 * tested, not reasoned about.
 *
 * The claims that have to hold:
 *   · an invited, verified address may see the document and take exactly the
 *     role it was offered;
 *   · an unverified address may not, because otherwise registering somebody
 *     else's email is a way in;
 *   · nobody may upgrade themselves, add a second person, edit the contents on
 *     the way past, or claim the same invitation twice.
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { arrayRemove, arrayUnion, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import fs from 'node:fs';

const OWNER = 'owner-uid';
const FRIEND = 'friend-uid';
const STRANGER = 'stranger-uid';
const FRIEND_EMAIL = 'friend@example.com';

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

/** A document owned by OWNER with one invitation outstanding. */
async function seed(invited = [`editor:${FRIEND_EMAIL}`]) {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'docs/doc1'), {
      kind: 'note',
      title: 'Shortlist',
      content: 'hello',
      ownerUid: OWNER,
      memberUids: [OWNER],
      roles: { [OWNER]: 'owner' },
      members: { [OWNER]: { role: 'owner', email: 'o@x.com', name: 'O' } },
      invitedEmails: invited,
      updatedAt: 1,
    });
  });
}

/** Signed in with a verified address, the way Google sign-in leaves you. */
const verified = (uid, email) =>
  env.authenticatedContext(uid, { email, email_verified: true }).firestore();
const unverified = (uid, email) =>
  env.authenticatedContext(uid, { email, email_verified: false }).firestore();

/** The exact write the app makes when accepting. */
const accept = (db, uid, email, role = 'editor', extra = {}) =>
  updateDoc(doc(db, 'docs/doc1'), {
    memberUids: arrayUnion(uid),
    [`roles.${uid}`]: role,
    [`members.${uid}`]: { role, email, name: '' },
    invitedEmails: arrayRemove(`${role}:${email}`),
    updatedAt: 2,
    ...extra,
  });

console.log('email invitations');

await seed();
await check(
  'the owner may leave an invitation',
  assertSucceeds(
    updateDoc(doc(env.authenticatedContext(OWNER).firestore(), 'docs/doc1'), {
      invitedEmails: arrayUnion('viewer:someone@example.com'),
      updatedAt: 2,
    }),
  ),
);

await seed();
await check(
  'an invited address may see the document',
  assertSucceeds(getDoc(doc(verified(FRIEND, FRIEND_EMAIL), 'docs/doc1'))),
);

await seed();
await check(
  'an invited address may take the role it was offered',
  assertSucceeds(accept(verified(FRIEND, FRIEND_EMAIL), FRIEND, FRIEND_EMAIL, 'editor')),
);

await seed();
await check(
  'the address is matched whatever the capitalisation',
  assertSucceeds(accept(verified(FRIEND, 'Friend@Example.com'), FRIEND, FRIEND_EMAIL, 'editor')),
);

await seed([`viewer:${FRIEND_EMAIL}`]);
await check(
  'a viewer cannot promote themselves to editor',
  assertFails(accept(verified(FRIEND, FRIEND_EMAIL), FRIEND, FRIEND_EMAIL, 'editor')),
);

await seed();
await check(
  'an unverified address is refused',
  assertFails(accept(unverified(FRIEND, FRIEND_EMAIL), FRIEND, FRIEND_EMAIL)),
);

await seed();
await check(
  'an uninvited address is refused',
  assertFails(accept(verified(STRANGER, 'nobody@example.com'), STRANGER, 'nobody@example.com')),
);

await seed();
await check(
  'an uninvited address cannot read the document either',
  assertFails(getDoc(doc(verified(STRANGER, 'nobody@example.com'), 'docs/doc1'))),
);

await seed();
await check(
  'accepting cannot bring somebody else along',
  assertFails(
    updateDoc(doc(verified(FRIEND, FRIEND_EMAIL), 'docs/doc1'), {
      memberUids: arrayUnion(FRIEND, STRANGER),
      [`roles.${FRIEND}`]: 'editor',
      [`roles.${STRANGER}`]: 'editor',
      [`members.${FRIEND}`]: { role: 'editor', email: FRIEND_EMAIL, name: '' },
      [`members.${STRANGER}`]: { role: 'editor', email: 'x@x.com', name: '' },
      invitedEmails: arrayRemove(`editor:${FRIEND_EMAIL}`),
    }),
  ),
);

await seed();
await check(
  'accepting cannot edit the document on the way past',
  assertFails(accept(verified(FRIEND, FRIEND_EMAIL), FRIEND, FRIEND_EMAIL, 'editor', { content: 'mine now' })),
);

await seed();
await check(
  'accepting cannot take ownership',
  assertFails(accept(verified(FRIEND, FRIEND_EMAIL), FRIEND, FRIEND_EMAIL, 'editor', { ownerUid: FRIEND })),
);

await seed();
await check(
  'the invitation must be consumed, not left for a second use',
  assertFails(
    updateDoc(doc(verified(FRIEND, FRIEND_EMAIL), 'docs/doc1'), {
      memberUids: arrayUnion(FRIEND),
      [`roles.${FRIEND}`]: 'editor',
      [`members.${FRIEND}`]: { role: 'editor', email: FRIEND_EMAIL, name: '' },
      updatedAt: 2,
    }),
  ),
);

await seed();
await check(
  'a stranger cannot withdraw an invitation',
  assertFails(
    updateDoc(doc(verified(STRANGER, 'nobody@example.com'), 'docs/doc1'), {
      invitedEmails: arrayRemove(`editor:${FRIEND_EMAIL}`),
    }),
  ),
);

console.log(`\nemail invitations: ${passed} passed, ${failed} failed`);
await env.cleanup();
if (failed) process.exit(1);
