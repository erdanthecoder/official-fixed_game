/**
 * The course engine — lessons, exercises, hearts, XP and streaks.
 *
 * The old Languages module was a flashcard box: pick a deck, grade yourself,
 * done. That works if you are already disciplined, which is a strange thing to
 * require of a study app. This turns the same vocabulary into a course: a path
 * of short lessons, each a handful of exercises, with a reason to come back
 * tomorrow.
 *
 * ── What is stored, and what is computed ──────────────────────────────────
 * Progress is a small object per deck: which lessons are finished, XP, streak,
 * hearts and when they last refilled. Everything else — which lesson is next,
 * whether the path is unlocked, today's goal — is derived on read.
 *
 * That split matters because two devices can both be editing. Stored counters
 * merge badly (last write wins, and you silently lose a lesson); derived state
 * cannot conflict because there is nothing to conflict about. So the rule here
 * is: store the smallest set of facts that cannot be recomputed, and compute
 * the rest.
 *
 * ── Hearts ────────────────────────────────────────────────────────────────
 * Five, one lost per wrong answer, all five back after four hours or when a
 * lesson is finished cleanly. They exist to make a wrong answer *matter*
 * slightly — without that, multiple choice is just clicking until it goes
 * green, and nothing is learned.
 *
 * Refill is computed from a timestamp rather than counted down by a timer:
 * a timer stops when the app is closed, which is exactly when the waiting is
 * supposed to happen.
 */

import { createId } from './ids.js';

export const MAX_HEARTS = 5;
export const HEART_REFILL_MS = 4 * 60 * 60 * 1000;
export const WORDS_PER_LESSON = 5;
export const XP_PER_EXERCISE = 10;
export const XP_PERFECT_BONUS = 20;

export const DAILY_GOALS = [
  { id: 'casual', xp: 30, labelKey: 'course.goalCasual' },
  { id: 'regular', xp: 60, labelKey: 'course.goalRegular' },
  { id: 'serious', xp: 120, labelKey: 'course.goalSerious' },
];

/* ------------------------------- the path --------------------------------- */

/**
 * Split a deck's cards into lessons of five.
 *
 * Deterministic — lesson 3 is always the same five words — because a path that
 * reshuffles itself is not a path. Progress is stored as "lessons 0..n done",
 * which only means anything if the numbering is stable.
 */
export function lessonsFor(deck) {
  const cards = deck?.cards ?? [];
  const lessons = [];
  for (let i = 0; i < cards.length; i += WORDS_PER_LESSON) {
    lessons.push({
      index: lessons.length,
      cards: cards.slice(i, i + WORDS_PER_LESSON),
    });
  }
  return lessons;
}

export function progressOf(deck) {
  const p = deck?.progress ?? {};
  return {
    done: p.done ?? 0,
    xp: p.xp ?? 0,
    streak: p.streak ?? 0,
    lastDay: p.lastDay ?? null,
    hearts: p.hearts ?? MAX_HEARTS,
    heartsAt: p.heartsAt ?? 0,
    goal: p.goal ?? 'regular',
    todayXp: p.todayXp ?? 0,
    todayDay: p.todayDay ?? null,
  };
}

/** Local calendar day, as `YYYY-MM-DD`. Same reasoning as task due dates. */
export function today(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

function daysBetween(a, b) {
  if (!a || !b) return null;
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round(
    (new Date(by, bm - 1, bd, 12) - new Date(ay, am - 1, ad, 12)) / 86400000,
  );
}

/** Hearts, after however long has actually passed since they ran out. */
export function heartsNow(progress, now = Date.now()) {
  if (progress.hearts >= MAX_HEARTS) return MAX_HEARTS;
  if (!progress.heartsAt) return progress.hearts;
  return now - progress.heartsAt >= HEART_REFILL_MS ? MAX_HEARTS : progress.hearts;
}

export function heartsReturnIn(progress, now = Date.now()) {
  if (heartsNow(progress, now) >= MAX_HEARTS) return 0;
  return Math.max(0, progress.heartsAt + HEART_REFILL_MS - now);
}

/** Everything the path screen needs, derived rather than stored. */
export function courseState(deck, now = new Date()) {
  const lessons = lessonsFor(deck);
  const progress = progressOf(deck);
  const day = today(now);
  const hearts = heartsNow(progress, now.getTime());

  // A streak survives one missed day only if today is the day after the last.
  const gap = daysBetween(progress.lastDay, day);
  const streak = gap === null ? 0 : gap === 0 ? progress.streak : gap === 1 ? progress.streak : 0;

  const goalXp = DAILY_GOALS.find((g) => g.id === progress.goal)?.xp ?? 60;
  const todayXp = progress.todayDay === day ? progress.todayXp : 0;

  return {
    lessons,
    progress,
    hearts,
    streak,
    goalXp,
    todayXp,
    goalMet: todayXp >= goalXp,
    nextLesson: Math.min(progress.done, Math.max(0, lessons.length - 1)),
    finished: lessons.length > 0 && progress.done >= lessons.length,
    percent: lessons.length === 0 ? 0 : Math.round((progress.done / lessons.length) * 100),
  };
}

/**
 * The patch to write after finishing a lesson.
 *
 * Returns a whole `progress` object rather than a delta. Deltas need a read
 * first, and two devices reading the same value and each adding 10 XP produce
 * 10, not 20 — so the read has to happen where the state already is, which is
 * here, in the caller's hands.
 */
export function completeLesson({ deck, index, correct, total, now = new Date() }) {
  const progress = progressOf(deck);
  const day = today(now);
  const gap = daysBetween(progress.lastDay, day);

  const streak =
    gap === 0 ? Math.max(1, progress.streak) : gap === 1 ? progress.streak + 1 : 1;

  const earned = correct * XP_PER_EXERCISE + (correct === total ? XP_PERFECT_BONUS : 0);
  const todayXp = (progress.todayDay === day ? progress.todayXp : 0) + earned;

  return {
    progress: {
      ...progress,
      // Only ever forward: replaying an old lesson must not un-finish later ones.
      done: Math.max(progress.done, index + 1),
      xp: progress.xp + earned,
      streak,
      lastDay: day,
      todayXp,
      todayDay: day,
      // A clean run gives the hearts back — the reward for care is not waiting.
      hearts: correct === total ? MAX_HEARTS : progress.hearts,
      heartsAt: correct === total ? 0 : progress.heartsAt,
    },
    earned,
  };
}

export function loseHeart(deck, now = Date.now()) {
  const progress = progressOf(deck);
  const hearts = Math.max(0, heartsNow(progress, now) - 1);
  return {
    ...progress,
    hearts,
    // The clock starts when the last heart goes, not on the first mistake.
    heartsAt: hearts === 0 ? now : progress.heartsAt,
  };
}

/* ------------------------------- exercises -------------------------------- */

/**
 * Build the exercises for one lesson.
 *
 * Four kinds, mixed deliberately. Multiple choice alone teaches recognition,
 * which feels like progress and is not: you can pass every question without
 * being able to produce a single word. Typing is where recall actually gets
 * tested, so every lesson ends on one.
 *
 * `pool` is the whole deck, used for plausible wrong answers — distractors
 * drawn from unrelated words make the right answer obvious by elimination.
 */
export function buildLesson({ cards, pool, random = Math.random }) {
  const pick = (n, exclude) => {
    const others = pool.filter((c) => c.id !== exclude.id);
    const out = [];
    while (out.length < n && others.length > 0) {
      out.push(...others.splice(Math.floor(random() * others.length), 1));
    }
    return out;
  };

  const shuffle = (list) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const exercises = cards.map((card, index) => {
    const kind = index === cards.length - 1 ? 'type' : ['choose', 'reverse', 'gap'][index % 3];

    if (kind === 'choose') {
      return {
        id: createId('ex'),
        kind: 'choose',
        card,
        prompt: card.front,
        answer: card.back,
        options: shuffle([card.back, ...pick(3, card).map((c) => c.back)]),
      };
    }

    if (kind === 'reverse') {
      return {
        id: createId('ex'),
        kind: 'reverse',
        card,
        prompt: card.back,
        answer: card.front,
        options: shuffle([card.front, ...pick(3, card).map((c) => c.front)]),
      };
    }

    if (kind === 'gap' && card.example) {
      // Blank the word out of its own example sentence, so the meaning has to
      // come from context rather than from the shape of the answer list.
      const blanked = blankOut(card.example, card.front);
      if (blanked) {
        return {
          id: createId('ex'),
          kind: 'gap',
          card,
          prompt: blanked,
          answer: card.front,
          options: shuffle([card.front, ...pick(3, card).map((c) => c.front)]),
        };
      }
    }

    return {
      id: createId('ex'),
      kind: 'choose',
      card,
      prompt: card.front,
      answer: card.back,
      options: shuffle([card.back, ...pick(3, card).map((c) => c.back)]),
    };
  });

  // Always finish on production rather than recognition.
  const last = cards[cards.length - 1];
  if (last) {
    exercises[exercises.length - 1] = {
      id: createId('ex'),
      kind: 'type',
      card: last,
      prompt: last.back,
      answer: last.front,
    };
  }

  return exercises;
}

/** Replace a word with a gap, matching the first form that actually appears. */
function blankOut(sentence, word) {
  const stem = word.replace(/^to\s+/i, '').split(/\s+/)[0];
  if (stem.length < 3) return null;
  const pattern = new RegExp(`\\b${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*`, 'i');
  if (!pattern.test(sentence)) return null;
  return sentence.replace(pattern, '_____');
}

/**
 * Is a typed answer right?
 *
 * Forgiving on the things that are not the point — case, surrounding space, a
 * leading "to" on a verb, a trailing full stop — and strict on the word itself.
 * Marking someone wrong for "assess" when the card says "to assess" teaches
 * them nothing except that the app is annoying.
 */
export function checkTyped(given, expected) {
  const clean = (s) =>
    String(s ?? '')
      .toLowerCase()
      .trim()
      .replace(/^to\s+/, '')
      .replace(/[.,!?;:]+$/, '')
      .replace(/\s+/g, ' ');
  return clean(given) === clean(expected);
}
