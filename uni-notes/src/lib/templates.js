/**
 * Insertable document templates.
 *
 * Each template returns an HTML string that gets dropped straight into the
 * editor's contentEditable surface. Keep the markup simple (tables, lists,
 * headings) so the built-in formatting tools keep working on top of it.
 *
 * To add a template later: write a `html()` function and add an entry to
 * `TEMPLATES`. The toolbar picks it up automatically.
 */

const COMPARISON_COLUMNS = [
  'School',
  'Location',
  'Tuition',
  'Acceptance Rate',
  'Major',
  'Notes',
  'Deadline',
];

function comparisonRow(cells) {
  return `<tr>${cells.map((cell) => `<td>${cell || '&nbsp;'}</td>`).join('')}</tr>`;
}

function universityComparisonTable(rowCount = 4) {
  const head = `<tr>${COMPARISON_COLUMNS.map((c) => `<th>${c}</th>`).join('')}</tr>`;
  const example = comparisonRow([
    'Example University',
    'Boston, MA',
    '$24,000 / year',
    '18%',
    'Computer Science',
    'Loved the campus tour',
    'Jan 5',
  ]);
  const blanks = Array.from({ length: rowCount }, () =>
    comparisonRow(COMPARISON_COLUMNS.map(() => '')),
  ).join('');

  return `
    <h2>University Comparison</h2>
    <table class="uni-table">
      <thead>${head}</thead>
      <tbody>${example}${blanks}</tbody>
    </table>
    <p><br /></p>
  `;
}

function applicationChecklist() {
  const section = (title, items) => `
    <h3>${title}</h3>
    <ul class="uni-checklist">
      ${items.map((item) => `<li><span class="uni-check">☐</span> ${item}</li>`).join('')}
    </ul>
  `;

  return `
    <h2>Application Checklist</h2>
    <p>Tap a ☐ to tick it off.</p>
    ${section('Essays', [
      'Brainstorm personal statement topics',
      'Personal statement — first draft',
      'Personal statement — final draft',
      'Supplemental essays for each school',
      'Ask someone to proofread',
    ])}
    ${section('Recommendation letters', [
      'Pick 2 teachers to ask',
      'Ask them (at least 4 weeks ahead)',
      'Send them my resume / brag sheet',
      'Send a thank-you note',
    ])}
    ${section('Test scores', [
      'Register for test date',
      'Study plan / practice tests',
      'Take the test',
      'Send scores to each school',
    ])}
    ${section('Deadlines', [
      'Early application deadline: ______',
      'Regular application deadline: ______',
      'Financial aid / scholarship deadline: ______',
      'Housing deadline: ______',
    ])}
    <p><br /></p>
  `;
}

function essayOutline() {
  return `
    <h2>Essay Outline</h2>
    <h3>The prompt</h3>
    <p>Paste the exact essay question here.</p>
    <h3>Hook</h3>
    <p>The one sentence that makes someone want to keep reading.</p>
    <h3>Main points</h3>
    <ol>
      <li>Point one — and the story that proves it</li>
      <li>Point two — and the story that proves it</li>
      <li>Point three — and the story that proves it</li>
    </ol>
    <h3>What I learned</h3>
    <p>Why this changed how I think.</p>
    <h3>Ending</h3>
    <p>Tie it back to the hook.</p>
    <p><br /></p>
  `;
}

function scholarshipTracker() {
  const columns = ['Scholarship', 'Amount', 'Who can apply', 'What to submit', 'Deadline'];
  const head = `<tr>${columns.map((c) => `<th>${c}</th>`).join('')}</tr>`;
  const blanks = Array.from({ length: 5 }, () =>
    `<tr>${columns.map(() => '<td>&nbsp;</td>').join('')}</tr>`,
  ).join('');

  return `
    <h2>Scholarship Tracker</h2>
    <table class="uni-table">
      <thead>${head}</thead>
      <tbody>${blanks}</tbody>
    </table>
    <p><br /></p>
  `;
}

export const TEMPLATES = [
  {
    id: 'comparison-table',
    label: 'University Comparison Table',
    description: 'School, location, tuition, acceptance rate, major, notes, deadline.',
    icon: '🏫',
    html: universityComparisonTable,
  },
  {
    id: 'application-checklist',
    label: 'Application Checklist',
    description: 'Essays, recommendation letters, test scores and deadlines.',
    icon: '✅',
    html: applicationChecklist,
  },
  {
    id: 'essay-outline',
    label: 'Essay Outline',
    description: 'Hook, main points, what you learned, ending.',
    icon: '✏️',
    html: essayOutline,
  },
  {
    id: 'scholarship-tracker',
    label: 'Scholarship Tracker',
    description: 'Track amounts, requirements and deadlines.',
    icon: '💸',
    html: scholarshipTracker,
  },
];

/**
 * A template used as a whole new document rather than inserted into one: its
 * own opening <h2> becomes the document's <h1>, so there's exactly one title.
 */
export function templateAsDocument(template) {
  return template.html().replace(/<h2>/i, '<h1>').replace(/<\/h2>/i, '</h1>');
}
