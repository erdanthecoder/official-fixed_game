/**
 * Sign-in stays on the configured domain, whatever host the app is served
 * from. The regression this guards against was live: signing in on the site
 * the app was served from is not registered with Google's OAuth client, so
 * Google refused the whole sign-in with redirect_uri_mismatch.
 */
import { authDomainFor } from '../src/lib/authDomain.js';

const CONFIGURED = 'unisave-e8483.firebaseapp.com';
let passed = 0;
let failed = 0;

const check = (name, got) => {
  if (got === CONFIGURED) {
    console.log('  PASS  ' + name);
    passed += 1;
  } else {
    console.log(`  FAIL  ${name}\n        got ${got}, wanted ${CONFIGURED}`);
    failed += 1;
  }
};

for (const host of [
  'getuni.web.app',
  'unisave-e8483.web.app',
  'unisave-e8483.firebaseapp.com',
  'localhost',
  'erdanthecoder.github.io',
  '',
]) {
  check(`served from ${host || 'nowhere in particular'}`, authDomainFor(CONFIGURED, host));
}

console.log(`\nauth domain: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
