/**
 * The course engine. Pure functions, so tested directly — the streak and heart
 * arithmetic is exactly the kind of thing that looks right and is off by one.
 */
import assert from 'node:assert/strict';
import {
  MAX_HEARTS, buildLesson, checkTyped, completeLesson, courseState,
  heartsNow, heartsReturnIn, lessonsFor, loseHeart, today,
} from '../src/lib/course.js';

let pass = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); console.log('  PASS  ' + name); pass += 1; }
  catch (e) { console.log('  FAIL  ' + name + '\n        ' + e.message.split('\n')[0]); fail += 1; }
};

const card = (i) => ({ id: 'c' + i, front: 'word' + i, back: 'meaning' + i, example: `A word${i} in a sentence.` });
const deck = (n, progress) => ({ cards: Array.from({ length: n }, (_, i) => card(i)), progress });
const day = (d) => new Date(2026, 0, d, 10, 0, 0);

console.log('\nThe path');
t('splits into lessons of five', () => {
  assert.equal(lessonsFor(deck(12)).length, 3);
  assert.equal(lessonsFor(deck(12))[0].cards.length, 5);
  assert.equal(lessonsFor(deck(12))[2].cards.length, 2);
});
t('is deterministic — lesson 2 is always the same words', () => {
  const a = lessonsFor(deck(12))[1].cards.map((c) => c.id);
  const b = lessonsFor(deck(12))[1].cards.map((c) => c.id);
  assert.deepEqual(a, b);
});
t('an empty deck has no lessons and no crash', () => {
  assert.equal(lessonsFor(deck(0)).length, 0);
  assert.equal(courseState(deck(0)).percent, 0);
});

console.log('\nStreaks');
t('a first lesson starts a streak of 1', () => {
  const { progress } = completeLesson({ deck: deck(10), index: 0, correct: 5, total: 5, now: day(1) });
  assert.equal(progress.streak, 1);
});
t('the next day continues it', () => {
  const one = completeLesson({ deck: deck(10), index: 0, correct: 5, total: 5, now: day(1) }).progress;
  const two = completeLesson({ deck: deck(10, one), index: 1, correct: 5, total: 5, now: day(2) }).progress;
  assert.equal(two.streak, 2);
});
t('a second lesson the same day does not double it', () => {
  const one = completeLesson({ deck: deck(10), index: 0, correct: 5, total: 5, now: day(1) }).progress;
  const two = completeLesson({ deck: deck(10, one), index: 1, correct: 5, total: 5, now: day(1) }).progress;
  assert.equal(two.streak, 1);
});
t('missing a day resets it to 1', () => {
  const one = completeLesson({ deck: deck(10), index: 0, correct: 5, total: 5, now: day(1) }).progress;
  const two = completeLesson({ deck: deck(10, one), index: 1, correct: 5, total: 5, now: day(4) }).progress;
  assert.equal(two.streak, 1);
});

console.log('\nProgress only moves forward');
t('replaying an earlier lesson does not un-finish later ones', () => {
  const at3 = { done: 3, xp: 100 };
  const after = completeLesson({ deck: deck(20, at3), index: 0, correct: 5, total: 5 }).progress;
  assert.equal(after.done, 3);
});
t('finishing the next lesson advances by one', () => {
  const after = completeLesson({ deck: deck(20, { done: 3 }), index: 3, correct: 5, total: 5 }).progress;
  assert.equal(after.done, 4);
});

console.log('\nXP');
t('a perfect lesson pays the bonus', () => {
  const { earned } = completeLesson({ deck: deck(10), index: 0, correct: 5, total: 5 });
  assert.equal(earned, 5 * 10 + 20);
});
t('an imperfect one does not', () => {
  const { earned } = completeLesson({ deck: deck(10), index: 0, correct: 4, total: 5 });
  assert.equal(earned, 40);
});
t("today's XP resets on a new day", () => {
  const one = completeLesson({ deck: deck(10), index: 0, correct: 5, total: 5, now: day(1) }).progress;
  const two = completeLesson({ deck: deck(10, one), index: 1, correct: 5, total: 5, now: day(2) }).progress;
  assert.equal(two.todayXp, 70);
  assert.equal(two.xp, 140);
});

console.log('\nHearts');
t('start full', () => assert.equal(courseState(deck(10)).hearts, MAX_HEARTS));
t('a wrong answer costs one', () => {
  assert.equal(loseHeart(deck(10)).hearts, MAX_HEARTS - 1);
});
t('the refill clock starts only when the last one goes', () => {
  let p = { hearts: 2, heartsAt: 0 };
  p = loseHeart({ progress: p }, 1000);
  assert.equal(p.heartsAt, 0, 'not yet');
  p = loseHeart({ progress: p }, 2000);
  assert.equal(p.hearts, 0);
  assert.equal(p.heartsAt, 2000, 'clock starts here');
});
t('they come back after four hours', () => {
  const p = { hearts: 0, heartsAt: 1_000_000 };
  assert.equal(heartsNow(p, 1_000_000 + 3 * 3600_000), 0);
  assert.equal(heartsNow(p, 1_000_000 + 4 * 3600_000), MAX_HEARTS);
});
t('the wait is computed from a timestamp, so closing the app still counts', () => {
  const p = { hearts: 0, heartsAt: 0 };
  assert.equal(heartsReturnIn(p, 3600_000), 3 * 3600_000);
});
t('a clean lesson refills them', () => {
  const after = completeLesson({ deck: deck(10, { hearts: 1, heartsAt: 5 }), index: 0, correct: 5, total: 5 }).progress;
  assert.equal(after.hearts, MAX_HEARTS);
  assert.equal(after.heartsAt, 0);
});
t('a lesson with a mistake does not', () => {
  const after = completeLesson({ deck: deck(10, { hearts: 1, heartsAt: 5 }), index: 0, correct: 4, total: 5 }).progress;
  assert.equal(after.hearts, 1);
});

console.log('\nExercises');
const pool = deck(12).cards;
t('one exercise per card', () => {
  assert.equal(buildLesson({ cards: pool.slice(0, 5), pool }).length, 5);
});
t('every lesson ends on typing, not recognition', () => {
  const ex = buildLesson({ cards: pool.slice(0, 5), pool });
  assert.equal(ex[ex.length - 1].kind, 'type');
});
t('multiple choice always contains its own answer', () => {
  for (const ex of buildLesson({ cards: pool.slice(0, 5), pool })) {
    if (ex.options) assert.ok(ex.options.includes(ex.answer), ex.kind + ' missing its answer');
  }
});
t('four options, all different', () => {
  for (const ex of buildLesson({ cards: pool.slice(0, 5), pool })) {
    if (ex.options) assert.equal(new Set(ex.options).size, ex.options.length);
  }
});
t('a tiny deck still builds without duplicating options', () => {
  const small = deck(2).cards;
  for (const ex of buildLesson({ cards: small, pool: small })) {
    if (ex.options) assert.equal(new Set(ex.options).size, ex.options.length);
  }
});
t('gap exercises actually blank the word out', () => {
  const ex = buildLesson({ cards: pool.slice(0, 5), pool }).find((e) => e.kind === 'gap');
  if (ex) assert.ok(ex.prompt.includes('_____'), 'no gap in the prompt');
});

console.log('\nTyped answers');
t('exact', () => assert.ok(checkTyped('assess', 'assess')));
t('case and space forgiven', () => assert.ok(checkTyped('  ASSESS ', 'assess')));
t('a leading "to" forgiven either way', () => {
  assert.ok(checkTyped('assess', 'to assess'));
  assert.ok(checkTyped('to assess', 'assess'));
});
t('trailing punctuation forgiven', () => assert.ok(checkTyped('assess.', 'assess')));
t('a different word is still wrong', () => assert.ok(!checkTyped('asses', 'assess')));
t('empty is wrong', () => assert.ok(!checkTyped('', 'assess')));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
