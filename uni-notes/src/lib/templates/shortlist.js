/**
 * The shortlist: the universities you are actually choosing between.
 *
 * This is the one piece of an application that lives in a dozen browser tabs
 * and a note on a phone — course names, tuition, entry requirements, the
 * deadline, and whether the offer ever arrived. A spreadsheet can hold it, and
 * Sheets is right there, but a spreadsheet does not know what any of the
 * columns mean, so it cannot count the offers, sort by what is closest, or
 * colour the one that has gone quiet.
 *
 * Every row is a place. The shape is deliberately small: five fields somebody
 * will genuinely fill in beats fifteen they will not.
 */

import { createId } from '../ids.js';

/** Where an application has got to. Ordered as it is lived, not alphabetically. */
export const STAGES = [
  { id: 'looking', labelKey: 'shortlist.stageLooking', tone: 'neutral' },
  { id: 'applied', labelKey: 'shortlist.stageApplied', tone: 'accent' },
  { id: 'offer', labelKey: 'shortlist.stageOffer', tone: 'good' },
  { id: 'no', labelKey: 'shortlist.stageNo', tone: 'bad' },
];

export const STAGE_IDS = STAGES.map((s) => s.id);

export function makeEntry(fields = {}) {
  return {
    id: createId('uni'),
    name: '',
    course: '',
    city: '',
    tuition: '',
    deadline: '',
    stage: 'looking',
    ...fields,
  };
}

export function makeShortlist(fields = {}) {
  return {
    kind: 'shortlist',
    title: '',
    entries: [],
    ...fields,
  };
}

/**
 * Soonest deadline first, then the ones with no date at all.
 *
 * A shortlist is read to answer "what is next", so a row with a date always
 * outranks one without — sorting the undated in among them by name would bury
 * the thing that is due on Friday.
 */
export function sortEntries(entries = []) {
  return [...entries].sort((a, b) => {
    if (Boolean(a.deadline) !== Boolean(b.deadline)) return a.deadline ? -1 : 1;
    if (a.deadline && b.deadline && a.deadline !== b.deadline) {
      return a.deadline < b.deadline ? -1 : 1;
    }
    // Everything else keeps the order it was added in. Sorting the undated by
    // name looked tidier and was unusable: typing a university's name moved
    // its row out from under the cursor, letter by letter. Array sort is
    // stable, so returning 0 is what holds them still.
    return 0;
  });
}

/** Counts for the summary line: what is out, and what has come back. */
export function shortlistStats(shortlist) {
  const entries = shortlist?.entries ?? [];
  return {
    total: entries.length,
    applied: entries.filter((e) => e.stage === 'applied').length,
    offers: entries.filter((e) => e.stage === 'offer').length,
  };
}
