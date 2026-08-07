/**
 * The stylesheet, checked for the one kind of damage nothing else catches.
 *
 * Slides and Sheets were unusable for weeks and every check in this repository
 * passed the whole time. The build succeeded, the tests succeeded, nothing
 * threw in the console. What had happened was that removing a module deleted
 * `.ai-page { … }` and took a closing brace with it, which fused three page
 * containers onto the toolbar rule below:
 *
 *     .sheet-page,
 *     .deck-page,
 *     .deck-workspace,
 *     .sheet-toolbar {          <- these four now share one block
 *       display: flex;
 *       flex-wrap: wrap;         <- a page laid out as a toolbar
 *       align-items: center;
 *     }
 *
 * A CSS block that loses its brace is still valid CSS, so no tool complains;
 * the editor header, the slide strip and the editing panel simply wrapped
 * across the screen with the left half empty. Only opening the app showed it.
 *
 * These three checks are what would have caught it in a second.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const FILES = [
  'src/styles/global.css',
  'src/styles/suite.css',
  'src/styles/brand.css',
  'src/styles/motion.css',
];

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

/** Strip comments so a brace inside prose is not counted as code. */
function code(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Every `selector { … }` in a file, as [selectorText, body] pairs. */
function rules(css) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = re.exec(code(css)))) {
    out.push([match[1].trim(), match[2]]);
  }
  return out;
}

/*
 * The full-height page containers. Each one is the single child of the module
 * shell and must be a column — header at the top, body filling what is left.
 * A row here is the exact failure that made Slides look like a dropped tray.
 */
const PAGES = [
  'editor-page',
  'sheet-page',
  'deck-page',
  'deck-workspace',
  'board-page',
  'plan-page',
];

console.log('layout');

for (const file of FILES) {
  const css = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

  test(`${file}: braces balance`, () => {
    const body = code(css);
    const open = (body.match(/\{/g) ?? []).length;
    const close = (body.match(/\}/g) ?? []).length;
    assert.equal(open, close, `${open} { against ${close} }`);
  });

  /*
   * The specific shape of the bug: a rule that styles a page container and a
   * toolbar at the same time. Those two things want opposite layouts — one
   * fills the screen as a column, the other is a wrapping row — so a selector
   * naming both is always a merge accident, never a decision.
   */
  test(`${file}: no rule styles a page and a toolbar together`, () => {
    for (const [selector] of rules(css)) {
      const names = selector.split(',').map((part) => part.trim());
      const page = names.find((name) => PAGES.some((p) => name === `.${p}`));
      const bar = names.find((name) => /-toolbar$/.test(name));
      assert.ok(
        !(page && bar),
        `"${page}" shares a block with "${bar}" — a lost brace fuses rules exactly like this`,
      );
    }
  });
}

const all = FILES.map((file) =>
  readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'),
).join('\n');

for (const page of PAGES) {
  test(`.${page} is a column`, () => {
    const owning = rules(all).filter(([selector]) =>
      selector.split(',').some((part) => part.trim() === `.${page}`),
    );
    assert.ok(owning.length > 0, `.${page} has no rule at all`);
    const column = owning.some(([, body]) => /flex-direction:\s*column/.test(body));
    assert.ok(column, `.${page} never sets flex-direction: column`);
  });
}

console.log(`\nlayout: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
