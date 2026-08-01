/**
 * First-run content.
 *
 * Runs once per storage location (per account, or per browser in local mode),
 * guarded by `prefs.seedVersion`. Bump SEED_VERSION only if new users should
 * get new starter content — existing users are never re-seeded, so nothing they
 * deleted ever comes back.
 */

export const SEED_VERSION = 1;

export const DEFAULT_FOLDERS = [
  { id: 'folder_universities', name: 'University List', icon: 'school', locked: true },
  { id: 'folder_essays', name: 'Essay Drafts', icon: 'essay', locked: true },
  { id: 'folder_scholarships', name: 'Scholarship Notes', icon: 'money', locked: true },
  { id: 'folder_charts', name: 'Comparison Charts', icon: 'target', locked: true },
];

const WELCOME_NOTE = `
  <h1>Start here</h1>
  <p>This is your workspace. Everything here syncs to your account:</p>
  <ul>
    <li><b>Notes</b> — essays, research, checklists. This document is one.</li>
    <li><b>Sheets</b> — compare tuition costs and track deadlines with real formulas.</li>
    <li><b>Slides</b> — build a presentation for a class or an interview.</li>
    <li><b>Canvas</b> — draw the idea out when writing it down is slower.</li>
    <li><b>Tasks</b> — every deadline in one place, counting down.</li>
    <li><b>Languages</b> — flashcards for the words that keep coming up.</li>
  </ul>
  <p>Try the <b>Insert</b> menu above — the University Comparison Table and the
  Application Checklist are both one click away.</p>
  <p><br /></p>
`;

const SHORTLIST_NOTE = `
  <h1>Schools I actually want to visit</h1>
  <p>Starting a shortlist. Add anything that looks interesting — we can cut it later.</p>
  <ul>
    <li>Somewhere with a good <b>computer science</b> department</li>
    <li>Close enough to get home for the holidays</li>
    <li>Has a club for literally anything (fencing? baking?)</li>
  </ul>
  <p><br /></p>
`;

/**
 * @param actions `create` and `setPrefs` from the data context.
 */
export function seedWorkspace({ create, setPrefs }, { vocabTemplates = [] } = {}) {
  DEFAULT_FOLDERS.forEach((folder) => {
    create('folders', { ...folder }, { idPrefix: 'folder' });
  });

  create(
    'notes',
    { title: 'Start here', folderId: null, content: WELCOME_NOTE },
    { idPrefix: 'note' },
  );
  create(
    'notes',
    {
      title: 'Schools I actually want to visit',
      folderId: 'folder_universities',
      content: SHORTLIST_NOTE,
    },
    { idPrefix: 'note' },
  );

  // One starter deck so Languages isn't an empty room on day one.
  const starter = vocabTemplates[0];
  if (starter) {
    create(
      'decks',
      { name: 'Academic English', ...starter.build() },
      { idPrefix: 'deck' },
    );
  }

  setPrefs({ seedVersion: SEED_VERSION });
}
