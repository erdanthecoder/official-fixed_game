/**
 * Starter vocabulary decks and the spaced-repetition schedule.
 *
 * Each card carries its own review state:
 *   box    0 = new, 1..5 = progressively better known
 *   dueAt  when it should come back (ms since epoch)
 *
 * A Leitner-style ladder: getting a card right moves it up a box and pushes it
 * further out; getting it wrong drops it to box 1 and brings it back today.
 * Simple, predictable, and it doesn't need a scheduler running anywhere.
 */

import { createId } from '../ids.js';

const DAY = 24 * 60 * 60 * 1000;

/** Days until the next review for each box. */
export const BOX_INTERVALS = [0, 1, 2, 4, 8, 21];
export const MAX_BOX = BOX_INTERVALS.length - 1;

export function makeCard({ front, back, example = '' }) {
  return {
    id: createId('card'),
    front,
    back,
    example,
    box: 0,
    dueAt: Date.now(),
    seen: 0,
    correct: 0,
  };
}

export function isDue(card, now = Date.now()) {
  return (card.dueAt ?? 0) <= now;
}

/**
 * Apply a review grade to a card.
 * grade: 'again' | 'hard' | 'good' | 'easy'
 */
export function reviewCard(card, grade, now = Date.now()) {
  const wasCorrect = grade !== 'again';
  let box = card.box ?? 0;

  if (grade === 'again') box = 1;
  else if (grade === 'hard') box = Math.max(1, box);
  else if (grade === 'good') box = Math.min(MAX_BOX, Math.max(1, box + 1));
  else box = Math.min(MAX_BOX, Math.max(2, box + 2));

  // "Again" and "hard" come back in the same session rather than tomorrow.
  const intervalDays = grade === 'again' ? 0 : grade === 'hard' ? 0.5 : BOX_INTERVALS[box];

  return {
    ...card,
    box,
    dueAt: now + intervalDays * DAY,
    seen: (card.seen ?? 0) + 1,
    correct: (card.correct ?? 0) + (wasCorrect ? 1 : 0),
    lastReviewedAt: now,
  };
}

export function deckStats(deck, now = Date.now()) {
  const cards = deck?.cards ?? [];
  return {
    total: cards.length,
    due: cards.filter((card) => isDue(card, now)).length,
    fresh: cards.filter((card) => (card.box ?? 0) === 0).length,
    learning: cards.filter((card) => (card.box ?? 0) > 0 && (card.box ?? 0) < MAX_BOX).length,
    known: cards.filter((card) => (card.box ?? 0) >= MAX_BOX).length,
  };
}

const academicEnglish = [
  ['to assess', 'to judge the quality or value of something', 'The committee assesses every application.'],
  ['criteria', 'the standards used to judge something', 'Their criteria include grades and essays.'],
  ['to demonstrate', 'to show clearly, with evidence', 'Demonstrate your interest with specifics.'],
  ['significant', 'important enough to matter', 'A significant improvement in my grades.'],
  ['to analyse', 'to examine something in detail', 'Analyse the question before writing.'],
  ['perspective', 'a particular way of seeing something', 'My perspective changed after the trip.'],
  ['to contribute', 'to give something useful to a group', 'I want to contribute to the robotics club.'],
  ['evidence', 'facts that support a claim', 'Give evidence, not just opinions.'],
  ['to prioritise', 'to decide what matters most', 'I had to prioritise my deadlines.'],
  ['coherent', 'clear and logically connected', 'A coherent argument is easy to follow.'],
  ['to elaborate', 'to explain in more detail', 'Elaborate on your role in the project.'],
  ['initiative', 'doing something without being told', 'She showed initiative organising the event.'],
];

const applicationVocabulary = [
  ['deadline', 'the last moment something can be submitted', 'The deadline is 5 January.'],
  ['transcript', 'the official record of your school grades', 'Ask your school for a transcript.'],
  ['personal statement', 'the essay about you in your application', 'My personal statement is about robotics.'],
  ['letter of recommendation', 'a letter from a teacher supporting you', 'I need two letters of recommendation.'],
  ['tuition', 'the money the university charges to teach you', 'Tuition is separate from living costs.'],
  ['scholarship', 'money awarded that you do not repay', 'I applied for three scholarships.'],
  ['financial aid', 'help paying for study', 'Financial aid can cover part of tuition.'],
  ['acceptance rate', 'the share of applicants who get in', 'Their acceptance rate is 18%.'],
  ['major', 'your main subject of study', 'My intended major is computer science.'],
  ['prerequisite', 'something required before you can take a course', 'Calculus is a prerequisite.'],
  ['waitlist', 'a list of maybes, if places free up', 'I was put on the waitlist.'],
  ['enrol', 'to officially join a course or school', 'You enrol after accepting the offer.'],
];

function buildDeck(rows) {
  return rows.map(([front, back, example]) => makeCard({ front, back, example }));
}

export const VOCAB_TEMPLATES = [
  {
    id: 'academic-english',
    labelKey: 'templates.academicWords',
    hintKey: 'templates.academicWordsHint',
    icon: 'book',
    build: () => ({ cards: buildDeck(academicEnglish) }),
  },
  {
    id: 'application-vocabulary',
    labelKey: 'templates.applicationWords',
    hintKey: 'templates.applicationWordsHint',
    icon: 'tabs',
    build: () => ({ cards: buildDeck(applicationVocabulary) }),
  },
];
