/**
 * Plans for Kadam Tasks.
 *
 * A plan is `{ title, tasks: [...] }` and a task is:
 *
 *   { id, text, school, due, priority, notes, done, doneAt }
 *
 * `due` is a plain `YYYY-MM-DD` string, not a timestamp. A deadline is a date
 * in a calendar, not an instant: "5 January" means the same thing in Bishkek
 * and in Boston, and storing it as a timestamp would shift it across a time
 * zone and start telling someone their essay was late a day early.
 *
 * The cost of that choice is that comparisons have to be done against *local*
 * midnight, which is what `daysUntil` below does.
 */

import { createId } from '../ids.js';

export const PRIORITIES = [
  { id: 'high', labelKey: 'tasks.priorityHigh', colour: '#c5372c' },
  { id: 'normal', labelKey: 'tasks.priorityNormal', colour: '#1a73e8' },
  { id: 'low', labelKey: 'tasks.priorityLow', colour: '#5f6368' },
];

/** Sort order for priorities, highest first. */
const PRIORITY_RANK = { high: 0, normal: 1, low: 2 };

export function makeTask(fields = {}) {
  return {
    id: createId('task'),
    text: '',
    school: '',
    due: '',
    priority: 'normal',
    notes: '',
    done: false,
    doneAt: null,
    ...fields,
  };
}

/** Today as `YYYY-MM-DD`, in the user's own time zone. */
export function today(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Whole days from today until `due`, negative if it has passed.
 *
 * Both dates are pinned to local midday before subtracting. Midday, not
 * midnight: a daylight-saving change moves the clock by an hour, and an hour
 * either side of midnight is enough to turn a 7-day gap into 6.96 and floor it
 * to the wrong answer.
 */
export function daysUntil(due, now = new Date()) {
  if (!due) return null;
  const [year, month, day] = due.split('-').map(Number);
  if (!year || !month || !day) return null;
  const target = new Date(year, month - 1, day, 12, 0, 0, 0);
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  return Math.round((target - from) / 86400000);
}

/** 'done' | 'overdue' | 'today' | 'soon' | 'later' | 'none' */
export function taskState(task, now = new Date()) {
  if (task.done) return 'done';
  const days = daysUntil(task.due, now);
  if (days === null) return 'none';
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 7) return 'soon';
  return 'later';
}

/**
 * Sort: unfinished before finished, then by due date, then by priority.
 * Tasks with no date sort after dated ones — an undated task is not urgent,
 * it is unscheduled, and putting it at the top would bury real deadlines.
 */
export function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (Boolean(a.due) !== Boolean(b.due)) return a.due ? -1 : 1;
    if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
    const rank = (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
    if (rank !== 0) return rank;
    return String(a.text).localeCompare(String(b.text));
  });
}

export function planStats(plan, now = new Date()) {
  const tasks = plan?.tasks ?? [];
  const done = tasks.filter((task) => task.done).length;
  return {
    total: tasks.length,
    done,
    open: tasks.length - done,
    overdue: tasks.filter((task) => taskState(task, now) === 'overdue').length,
    soon: tasks.filter((task) => ['today', 'soon'].includes(taskState(task, now))).length,
    percent: tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100),
  };
}

/** Group by school, with undated-school tasks last under an empty key. */
export function groupBySchool(tasks) {
  const groups = new Map();
  sortTasks(tasks).forEach((task) => {
    const key = task.school?.trim() || '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(task);
  });
  return [...groups.entries()].sort(([a], [b]) => {
    if (a === b) return 0;
    if (a === '') return 1;
    if (b === '') return -1;
    return a.localeCompare(b);
  });
}

/* ------------------------------- templates -------------------------------- */

/** `days` from today, as a due date. Templates should open with live dates. */
function inDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return today(date);
}

function oneApplication() {
  return {
    tasks: [
      makeTask({ text: 'Shortlist the schools I actually want', due: inDays(7), priority: 'high' }),
      makeTask({ text: 'Ask two teachers for recommendation letters', due: inDays(14), priority: 'high', notes: 'Ask in person first, then send the details by email.' }),
      makeTask({ text: 'Book the test date', due: inDays(21), priority: 'high' }),
      makeTask({ text: 'First draft of the personal statement', due: inDays(30), priority: 'normal' }),
      makeTask({ text: 'Get the essay read by someone else', due: inDays(45), priority: 'normal' }),
      makeTask({ text: 'Request the transcript from school', due: inDays(50), priority: 'normal' }),
      makeTask({ text: 'Check every deadline one last time', due: inDays(60), priority: 'high' }),
      makeTask({ text: 'Submit', due: inDays(65), priority: 'high' }),
    ],
  };
}

function scholarshipRound() {
  return {
    tasks: [
      makeTask({ text: 'List every scholarship I am eligible for', due: inDays(5), priority: 'high' }),
      makeTask({ text: 'Check what each one actually requires', due: inDays(10), priority: 'normal', notes: 'Some want a separate essay. Some want proof of income.' }),
      makeTask({ text: 'Write the first scholarship essay', due: inDays(20), priority: 'high' }),
      makeTask({ text: 'Reuse and adapt it for the others', due: inDays(28), priority: 'normal' }),
      makeTask({ text: 'Collect the financial documents', due: inDays(30), priority: 'normal' }),
      makeTask({ text: 'Submit the first application', due: inDays(35), priority: 'high' }),
    ],
  };
}

function testPrep() {
  return {
    tasks: [
      makeTask({ text: 'Take one full practice test, timed', due: inDays(3), priority: 'high', notes: 'Do it properly. A relaxed practice test tells you nothing.' }),
      makeTask({ text: 'Mark it and write down what I got wrong', due: inDays(4), priority: 'high' }),
      makeTask({ text: 'Study the weakest section for a week', due: inDays(11), priority: 'normal' }),
      makeTask({ text: 'Second practice test', due: inDays(14), priority: 'normal' }),
      makeTask({ text: 'Register for the real test', due: inDays(18), priority: 'high' }),
      makeTask({ text: 'Final review, then stop studying', due: inDays(28), priority: 'low' }),
    ],
  };
}

export const PLAN_TEMPLATES = [
  {
    id: 'one-application',
    shape: 'list',
    labelKey: 'templates.applicationPlan',
    hintKey: 'templates.applicationPlanHint',
    icon: 'checklist',
    build: oneApplication,
  },
  {
    id: 'scholarship-round',
    shape: 'list',
    labelKey: 'templates.scholarshipPlan',
    hintKey: 'templates.scholarshipPlanHint',
    icon: 'money',
    build: scholarshipRound,
  },
  {
    id: 'test-prep',
    shape: 'list',
    labelKey: 'templates.testPlan',
    hintKey: 'templates.testPlanHint',
    icon: 'target',
    build: testPrep,
  },
];

export function blankPlan() {
  return { tasks: [] };
}
