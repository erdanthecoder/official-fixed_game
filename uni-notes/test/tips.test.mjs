/**
 * Tips that need a keyboard must not be shown to a device that has none.
 *
 * This is not a nicety. Teaching Ctrl+B to somebody holding a tablet is
 * teaching them a thing they cannot do, on the one screen they have to sit and
 * read, and this app is used on a tablet more than anything else.
 */
import { tipsFor } from '../src/i18n/tips.js';

const NEEDS_KEYBOARD = /ctrl|cmd|⌘|\bF2\b|\bEsc\b|\bTab\b|arrow keys|стрелк|клавиш|жебелер/i;
const GONE = /\bИИ\b|\bAI\b|UniSave/;

let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) {
    console.log('  PASS  ' + name);
    passed += 1;
  } else {
    console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`);
    failed += 1;
  }
};

for (const language of ['en', 'ru', 'ky']) {
  const all = tipsFor(language);
  const touch = tipsFor(language, { touch: true });

  check(`${language}: has tips at all`, all.length > 8, `${all.length} tips`);

  const leaked = touch.filter((tip) => NEEDS_KEYBOARD.test(tip));
  check(`${language}: no keyboard tips on touch`, leaked.length === 0, leaked.join(' | '));

  check(
    `${language}: touch list is shorter, not empty`,
    touch.length > 0 && touch.length < all.length,
    `${touch.length} of ${all.length}`,
  );

  const stale = all.filter((tip) => GONE.test(tip));
  check(`${language}: nothing about removed features`, stale.length === 0, stale.join(' | '));
}

check('an unknown language falls back', tipsFor('fr').length > 0);

console.log(`\ntips: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
