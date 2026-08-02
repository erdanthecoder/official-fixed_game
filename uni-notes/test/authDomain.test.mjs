/**
 * Which domain sign-in happens on.
 *
 * Worth testing because the failure is quiet: pick the wrong host and Safari
 * signs someone in to nothing, with no error anywhere.
 */
import { authDomainFor } from '../src/lib/authDomain.js';

const CONFIGURED = 'unisave-e8483.firebaseapp.com';
let passed = 0;
let failed = 0;

const check = (name, got, want) => {
  if (got === want) {
    console.log('  PASS  ' + name);
    passed += 1;
  } else {
    console.log(`  FAIL  ${name}\n        got ${got}, wanted ${want}`);
    failed += 1;
  }
};

// Served from a Firebase Hosting site: sign in on that same site, so the auth
// handler is first-party and Safari keeps the session.
check('the friendly site', authDomainFor(CONFIGURED, 'getuni.web.app'), 'getuni.web.app');
check('the project site', authDomainFor(CONFIGURED, 'unisave-e8483.web.app'), 'unisave-e8483.web.app');
check('the firebaseapp site', authDomainFor(CONFIGURED, CONFIGURED), CONFIGURED);

// Anywhere else the configured domain is the only thing that can work.
check('a dev server', authDomainFor(CONFIGURED, 'localhost'), CONFIGURED);
check('an IP address', authDomainFor(CONFIGURED, '127.0.0.1'), CONFIGURED);
check('GitHub Pages', authDomainFor(CONFIGURED, 'erdanthecoder.github.io'), CONFIGURED);
check('the desktop shell', authDomainFor(CONFIGURED, ''), CONFIGURED);

// A lookalike domain must not be trusted into first-party sign-in.
check('a lookalike host', authDomainFor(CONFIGURED, 'notweb.app.evil.com'), CONFIGURED);
check('a suffix impostor', authDomainFor(CONFIGURED, 'evilweb.app.attacker.net'), CONFIGURED);

console.log(`\nauth domain: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
