/**
 * The ZIP writer, checked against a real unzipper.
 *
 * A hand-written ZIP that is subtly wrong does not fail loudly — it downloads
 * happily and then Word says the file is corrupt, which is the worst possible
 * place to find out. So this builds an archive, writes it to disk, and hands
 * it to the system `unzip`, which is the same code path every real reader uses.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32, zipBytes } from '../src/lib/zip.js';

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

console.log('zip');

test('crc32 matches the known value for "123456789"', () => {
  // The check value every CRC-32 implementation is tested against.
  const bytes = new TextEncoder().encode('123456789');
  assert.equal(crc32(bytes), 0xcbf43926);
});

test('an empty archive is still a valid archive', () => {
  const bytes = zipBytes({});
  // End-of-central-directory record only: 22 bytes.
  assert.equal(bytes.length, 22);
  assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x05, 0x06]);
});

test('the same content produces the same bytes twice', () => {
  const a = zipBytes({ 'a.txt': 'hello' });
  const b = zipBytes({ 'a.txt': 'hello' });
  assert.deepEqual([...a], [...b], 'timestamps must not leak into the output');
});

const dir = mkdtempSync(join(tmpdir(), 'kadam-zip-'));

test('unzip accepts the archive and the contents survive', () => {
  const files = {
    'word/document.xml': '<?xml version="1.0"?><w:document>Hello — привет</w:document>',
    'nested/deep/note.txt': 'line one\nline two\n',
    '[Content_Types].xml': '<Types/>',
  };
  const path = join(dir, 'test.zip');
  writeFileSync(path, zipBytes(files));

  // -t is the unzipper's own integrity check: headers, CRCs and sizes.
  const report = execFileSync('unzip', ['-t', path], { encoding: 'utf8' });
  assert.match(report, /No errors detected/, report);

  execFileSync('unzip', ['-o', '-q', path, '-d', join(dir, 'out')]);
  for (const [name, content] of Object.entries(files)) {
    const written = readFileSync(join(dir, 'out', name), 'utf8');
    assert.equal(written, content, `${name} came back different`);
  }
});

test('a file large enough to cross a buffer boundary round-trips', () => {
  const big = 'x'.repeat(200000) + 'END';
  const path = join(dir, 'big.zip');
  writeFileSync(path, zipBytes({ 'big.txt': big }));
  execFileSync('unzip', ['-o', '-q', path, '-d', join(dir, 'big')]);
  assert.equal(readFileSync(join(dir, 'big', 'big.txt'), 'utf8'), big);
});

rmSync(dir, { recursive: true, force: true });

console.log(`\nzip: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
