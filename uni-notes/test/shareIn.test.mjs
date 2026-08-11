/**
 * What arrives when another app shares into Kadam.
 *
 * Worth testing rather than eyeballing, because every sender fills the three
 * fields differently and there is no way to try them all by hand: a browser
 * sends title and url and usually repeats the url in text, a notes app sends
 * text alone, a messaging app sends neither title nor url. The awkward cases
 * below are the real ones.
 */

import assert from 'node:assert/strict';
import { takeSharedText } from '../src/lib/shareIn.js';

let passed = 0;
let failed = 0;

function test(name, run) {
  try {
    run();
    console.log(`  PASS  ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`  FAIL  ${name}\n        ${error.message}`);
    failed += 1;
  }
}

// `replace: false` keeps this out of the DOM entirely — the function only
// touches history when asked to.
const share = (query) => takeSharedText(query, false);

console.log('shareIn');

test('nothing shared is nothing to do', () => {
  assert.equal(share(''), null);
  assert.equal(share('?other=1'), null);
});

test('a browser share: title, url, and the url again in text', () => {
  const out = share('?title=Open%20day&text=https%3A%2F%2Fx.ac.uk&url=https%3A%2F%2Fx.ac.uk');
  assert.equal(out.title, 'Open day');
  // Printed once, not twice: the sender repeated itself, the note should not.
  assert.equal(out.html.match(/x\.ac\.uk/g).length, 1);
});

test('text alone becomes both the name and the body', () => {
  const out = share('?text=Book%20the%20test%20before%20Friday');
  assert.equal(out.title, 'Book the test before Friday');
  assert.match(out.html, /<p>Book the test before Friday<\/p>/);
});

test('blank lines become separate paragraphs, single ones become breaks', () => {
  const out = share('?text=' + encodeURIComponent('One.\n\nTwo.\nStill two.'));
  assert.equal((out.html.match(/<p>/g) ?? []).length, 2);
  assert.match(out.html, /Two\.<br \/>Still two\./);
});

test('a very long first line is cut short for the name, not for the body', () => {
  const line = 'a'.repeat(200);
  const out = share('?text=' + encodeURIComponent(line));
  assert.ok(out.title.length <= 60, `title was ${out.title.length}`);
  assert.match(out.title, /…$/);
  assert.ok(out.html.includes(line), 'the body must keep every character');
});

test('a url with no text still makes a usable note', () => {
  const out = share('?url=' + encodeURIComponent('https://example.com/a?b=1&c=2'));
  assert.match(out.html, /<a href="https:\/\/example\.com\/a\?b=1&amp;c=2"/);
});

test('html in a shared message is escaped, not run', () => {
  const out = share('?title=' + encodeURIComponent('<img src=x onerror=alert(1)>'));
  assert.ok(!out.html.includes('<img'), out.html);
  assert.match(out.html, /&lt;img/);
});

test('shared quotes and ampersands survive as themselves', () => {
  const out = share('?text=' + encodeURIComponent('Fish & chips — "cheap"'));
  assert.match(out.html, /Fish &amp; chips — "cheap"/);
});

console.log(`\nshareIn: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
