/**
 * Presence rules, against the real emulator.
 *
 * The facepile is a small feature with one sharp edge: it puts a writable
 * subcollection under every shared document. Three things have to hold, and
 * only a real rules engine can say whether they do —
 *
 *   · a member may say "I am here", and only about themselves;
 *   · a stranger may neither read the room nor appear in it;
 *   · a row cannot be used as free storage under someone else's document.
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, getDocs, collection, setDoc } from 'firebase/firestore';
import fs from 'node:fs';

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

await env.clearFirestore();
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'docs/doc1'), {
    kind: 'note',
    title: 'Shortlist',
    ownerUid: OWNER,
    memberUids: [OWNER, FRIEND],
    roles: { [OWNER]: 'owner', [FRIEND]: 'editor' },
    members: {
      [OWNER]: { role: 'owner', email: 'o@x.com', name: 'O' },
      [FRIEND]: { role: 'editor', email: 'f@x.com', name: 'F' },
    },
    updatedAt: 1,
  });
  await setDoc(doc(db, 'docs/doc1/presence', OWNER), { name: 'O', at: 1 });
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const row = (db, uid) => doc(db, 'docs/doc1/presence', uid);

console.log('presence');

await check(
  'a member announces themselves',
  assertSucceeds(setDoc(row(as(FRIEND), FRIEND), { name: 'F', at: Date.now() })),
);

await check(
  'a member sees who else is here',
  assertSucceeds(getDocs(collection(as(FRIEND), 'docs/doc1/presence'))),
);

await check(
  'a member cannot write somebody else in',
  assertFails(setDoc(row(as(FRIEND), OWNER), { name: 'O', at: Date.now() })),
);

await check(
  'a member leaves by deleting their own row',
  assertSucceeds(deleteDoc(row(as(FRIEND), FRIEND))),
);

await check(
  'a member cannot evict anyone else',
  assertFails(deleteDoc(row(as(FRIEND), OWNER))),
);

await check(
  'a stranger cannot read the room',
  assertFails(getDoc(row(as(STRANGER), OWNER))),
);

await check(
  'a stranger cannot appear in it',
  assertFails(setDoc(row(as(STRANGER), STRANGER), { name: 'X', at: Date.now() })),
);

await check(
  'signed out is nobody',
  assertFails(
    setDoc(doc(env.unauthenticatedContext().firestore(), 'docs/doc1/presence', 'x'), {
      name: 'X',
      at: 1,
    }),
  ),
);

// A row is a heartbeat, not a drop box: two small fields and nothing else.
await check(
  'no extra fields',
  assertFails(setDoc(row(as(FRIEND), FRIEND), { name: 'F', at: 1, payload: 'x'.repeat(400) })),
);

await check(
  'no oversized name',
  assertFails(setDoc(row(as(FRIEND), FRIEND), { name: 'n'.repeat(400), at: 1 })),
);

await check(
  'the timestamp must be a number',
  assertFails(setDoc(row(as(FRIEND), FRIEND), { name: 'F', at: 'now' })),
);

console.log(`\npresence: ${passed} passed, ${failed} failed`);
await env.cleanup();
if (failed) process.exit(1);
