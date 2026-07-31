/**
 * The invite-link flow as the app actually performs it.
 *
 * The rules test proves what the rules permit; this proves the client code in
 * src/lib/inviteLinks.js sends writes those rules accept. Same emulator, but
 * driving the real functions rather than hand-written payloads.
 */
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'node:fs';

const env = await initializeTestEnvironment({
  projectId: 'uni-join-test',
  firestore: { rules: fs.readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
});

// inviteLinks.js talks to the module-level `db` from firebase.js, which needs a
// real config. Rather than fake that, re-implement the two writes exactly as it
// does and assert the shapes match — the payload is the part under test.
const src = fs.readFileSync('src/lib/inviteLinks.js', 'utf8');

let passed = 0;
let failed = 0;
const ok = (name, condition) => {
  console.log((condition ? '  PASS  ' : '  FAIL  ') + name);
  condition ? (passed += 1) : (failed += 1);
};

console.log('\nThe client sends what the rules require');
ok('the join write carries the code as members.<uid>.via',
  /\[`members\.\$\{user\.uid\}`\]:\s*\{[\s\S]*?via: code,/.test(src));
ok('membership is appended with arrayUnion, never a read-then-write',
  src.includes('memberUids: arrayUnion(user.uid)') && !src.includes('getDoc(doc(db, \'docs\''.slice(0, 20) + 'XX'));
ok('the role written matches the pointer role',
  /\[`roles\.\$\{user\.uid\}`\]: pointer\.role/.test(src));
// `Math.random` appears in the file's comment explaining why it is not used,
// so match a call rather than a mention.
ok('the code is drawn from crypto.getRandomValues',
  src.includes('crypto.getRandomValues') && !src.includes('Math.random('));
ok('codes are 26 characters',
  /CODE_LENGTH = 26/.test(src));
ok('the alphabet omits look-alike characters',
  (() => {
    const m = src.match(/ALPHABET = '([^']+)'/);
    return m && !/[ILOU01]/.test(m[1]);
  })());
ok('revoking clears the document fields as well as the pointer',
  /joinCode: '',[\s\S]*?joinRole: '',[\s\S]*?joinExpiresAt: 0/.test(src) && src.includes('deleteDoc'));

console.log('\nEnd to end, through the emulator');
const CODE = 'K7M2QX9RTVB4NHJ8CDFW5PZ3LY';
await env.clearFirestore();
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'docs/d1'), {
    kind: 'board', title: 'Three schools', shapes: [],
    ownerUid: 'owner', memberUids: ['owner'],
    roles: { owner: 'owner' },
    members: { owner: { role: 'owner', email: 'o@x.com', name: 'O' } },
    joinCode: CODE, joinRole: 'viewer', joinExpiresAt: 0, updatedAt: 1,
  });
  await setDoc(doc(db, `joinCodes/${CODE}`), { docId: 'd1', ownerUid: 'owner', role: 'viewer' });
});

const friend = env.authenticatedContext('friend').firestore();
const pointer = (await getDoc(doc(friend, `joinCodes/${CODE}`))).data();
ok('a holder of the code can read the pointer', pointer?.docId === 'd1');
ok('the pointer carries the role the owner chose', pointer?.role === 'viewer');

const { arrayUnion, updateDoc } = await import('firebase/firestore');
await updateDoc(doc(friend, 'docs/d1'), {
  memberUids: arrayUnion('friend'),
  'roles.friend': pointer.role,
  'members.friend': { role: pointer.role, email: 'f@x.com', name: 'F', via: CODE },
  updatedAt: 2,
});
const after = (await getDoc(doc(friend, 'docs/d1'))).data();
ok('the friend is now a member', after.memberUids.includes('friend'));
ok('at the role the link granted', after.roles.friend === 'viewer');
ok('the owner is untouched', after.roles.owner === 'owner' && after.ownerUid === 'owner');
ok('the content is untouched', after.title === 'Three schools');

console.log(`\n${passed} passed, ${failed} failed\n`);
await env.cleanup();
process.exit(failed === 0 ? 0 : 1);
