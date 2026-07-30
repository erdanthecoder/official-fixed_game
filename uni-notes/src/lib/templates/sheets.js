/**
 * Starter spreadsheets.
 *
 * A sheet is `{ rows, cols, cells }` where `cells` maps "A1" → { v, b, a }:
 *   v = raw value (a formula if it starts with "=")
 *   b = bold, a = alignment
 *
 * Formulas are stored exactly as a user would type them, so the templates
 * double as worked examples of what the formula engine can do.
 */

const header = (v) => ({ v, b: true });

function grid(rows, cols, cells) {
  return { rows, cols, cells };
}

function tuitionComparison() {
  return grid(12, 7, {
    A1: header('School'),
    B1: header('Tuition / year'),
    C1: header('Years'),
    D1: header('Total tuition'),
    E1: header('Living / year'),
    F1: header('Total cost'),
    G1: header('Deadline'),

    A2: { v: 'Example University' },
    B2: { v: '12000' },
    C2: { v: '4' },
    D2: { v: '=B2*C2' },
    E2: { v: '3600' },
    F2: { v: '=D2+E2*C2' },
    G2: { v: '2027-01-05' },

    // The IF guards keep unfilled rows empty instead of showing 0, so the
    // summary formulas below report real numbers from the first row you fill in.
    A3: { v: '' },
    B3: { v: '' },
    C3: { v: '4' },
    D3: { v: '=IF(B3="", "", B3*C3)' },
    F3: { v: '=IF(B3="", "", D3+E3*C3)' },

    A4: { v: '' },
    C4: { v: '4' },
    D4: { v: '=IF(B4="", "", B4*C4)' },
    F4: { v: '=IF(B4="", "", D4+E4*C4)' },

    A6: header('Cheapest total'),
    B6: { v: '=MIN(F2:F4)' },
    A7: header('Most expensive'),
    B7: { v: '=MAX(F2:F4)' },
    A8: header('Average total'),
    B8: { v: '=IF(COUNT(F2:F4)=0, "", ROUND(AVERAGE(F2:F4), 0))' },
  });
}

function budgetPlanner() {
  return grid(16, 4, {
    A1: header('Budget planner'),
    A3: header('Money in'),
    B3: header('Per month'),
    A4: { v: 'Family support' },
    B4: { v: '0' },
    A5: { v: 'Part-time work' },
    B5: { v: '0' },
    A6: { v: 'Scholarship' },
    B6: { v: '0' },
    A7: header('Total in'),
    B7: { v: '=SUM(B4:B6)' },

    A9: header('Money out'),
    B9: header('Per month'),
    A10: { v: 'Rent / dorm' },
    B10: { v: '0' },
    A11: { v: 'Food' },
    B11: { v: '0' },
    A12: { v: 'Transport' },
    B12: { v: '0' },
    A13: { v: 'Books and supplies' },
    B13: { v: '0' },
    A14: { v: 'Fun' },
    B14: { v: '0' },
    A15: header('Total out'),
    B15: { v: '=SUM(B10:B14)' },

    A16: header('Left over'),
    B16: { v: '=B7-B15' },
  });
}

function deadlineTracker() {
  return grid(12, 5, {
    A1: header('What'),
    B1: header('School'),
    C1: header('Due date'),
    D1: header('Days left'),
    E1: header('Done?'),

    A2: { v: 'Personal statement' },
    B2: { v: 'Example University' },
    C2: { v: '2027-01-05' },
    D2: { v: '=DAYS(C2)' },
    E2: { v: 'no' },

    A3: { v: 'Recommendation letters' },
    C3: { v: '2026-12-15' },
    D3: { v: '=DAYS(C3)' },
    E3: { v: 'no' },

    A4: { v: 'Test scores sent' },
    C4: { v: '2026-12-01' },
    D4: { v: '=DAYS(C4)' },
    E4: { v: 'no' },

    A6: header('Soonest deadline in'),
    B6: { v: '=MIN(D2:D4)' },
    C6: { v: 'days' },
  });
}

function gradeTracker() {
  return grid(14, 5, {
    A1: header('Subject'),
    B1: header('Term 1'),
    C1: header('Term 2'),
    D1: header('Term 3'),
    E1: header('Average'),

    // COUNT guards stop an empty row from showing #DIV/0! before any mark is in.
    A2: { v: 'Maths' },
    E2: { v: '=IF(COUNT(B2:D2)=0, "", ROUND(AVERAGE(B2:D2), 1))' },
    A3: { v: 'English' },
    E3: { v: '=IF(COUNT(B3:D3)=0, "", ROUND(AVERAGE(B3:D3), 1))' },
    A4: { v: 'Physics' },
    E4: { v: '=IF(COUNT(B4:D4)=0, "", ROUND(AVERAGE(B4:D4), 1))' },
    A5: { v: 'History' },
    E5: { v: '=IF(COUNT(B5:D5)=0, "", ROUND(AVERAGE(B5:D5), 1))' },

    A7: header('Overall average'),
    B7: { v: '=IF(COUNT(E2:E5)=0, "", ROUND(AVERAGE(E2:E5), 2))' },
  });
}

export const SHEET_TEMPLATES = [
  {
    id: 'tuition-compare',
    labelKey: 'templates.tuitionCompare',
    hintKey: 'templates.tuitionCompareHint',
    icon: '🏫',
    build: tuitionComparison,
  },
  {
    id: 'budget-planner',
    labelKey: 'templates.budgetPlanner',
    hintKey: 'templates.budgetPlannerHint',
    icon: '💰',
    build: budgetPlanner,
  },
  {
    id: 'deadline-tracker',
    labelKey: 'templates.deadlineTracker',
    hintKey: 'templates.deadlineTrackerHint',
    icon: '📅',
    build: deadlineTracker,
  },
  {
    id: 'grade-tracker',
    labelKey: 'templates.gradeTracker',
    hintKey: 'templates.gradeTrackerHint',
    icon: '🎯',
    build: gradeTracker,
  },
];

export const DEFAULT_ROWS = 20;
export const DEFAULT_COLS = 7;

export function blankSheet() {
  return grid(DEFAULT_ROWS, DEFAULT_COLS, {});
}
