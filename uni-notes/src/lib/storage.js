/**
 * Everything that touches localStorage lives here.
 *
 * The whole app state is one JSON blob under a single key, which keeps reads
 * and writes atomic and makes it easy to swap in a real backend later: replace
 * `loadState` / `saveState` with fetch calls and nothing else has to change.
 */

import { createId } from './ids.js';

const STORAGE_KEY = 'uni-notes:v1';

export const PROFILES = [
  {
    id: 'profile_one',
    name: 'Cousin A',
    initial: 'A',
    color: '#2563eb',
    softColor: '#dbeafe',
    highlight: '#cfe4ff',
  },
  {
    id: 'profile_two',
    name: 'Cousin B',
    initial: 'B',
    color: '#c2410c',
    softColor: '#ffedd5',
    highlight: '#ffe0c2',
  },
];

export function getProfile(profileId) {
  return PROFILES.find((profile) => profile.id === profileId) ?? PROFILES[0];
}

/**
 * Letter shown in the round avatar. "Cousin A" → A, "Maya Smith" → M, so the
 * two default profiles never collide on the same letter.
 */
export function profileInitial(profile) {
  const name = (profile?.name ?? '').trim();
  if (!name) return profile?.initial ?? '?';
  const words = name.split(/\s+/);
  const last = words[words.length - 1];
  const source = words.length > 1 && last.length === 1 ? last : name;
  return source.charAt(0).toUpperCase();
}

export const DEFAULT_FOLDERS = [
  { id: 'folder_universities', name: 'University List', emoji: '🏫', locked: true },
  { id: 'folder_essays', name: 'Essay Drafts', emoji: '✏️', locked: true },
  { id: 'folder_scholarships', name: 'Scholarship Notes', emoji: '💸', locked: true },
  { id: 'folder_charts', name: 'Comparison Charts', emoji: '📊', locked: true },
];

function seedState() {
  const now = Date.now();
  return {
    version: 1,
    activeProfileId: PROFILES[0].id,
    profileNames: {
      [PROFILES[0].id]: PROFILES[0].name,
      [PROFILES[1].id]: PROFILES[1].name,
    },
    folders: DEFAULT_FOLDERS.map((folder) => ({ ...folder })),
    documents: [
      {
        id: createId('doc'),
        title: 'Schools I actually want to visit',
        folderId: 'folder_universities',
        ownerId: PROFILES[0].id,
        lastEditedBy: PROFILES[0].id,
        createdAt: now - 1000 * 60 * 60 * 26,
        updatedAt: now - 1000 * 60 * 60 * 3,
        content: `
          <h1>Schools I actually want to visit</h1>
          <p>Starting a shortlist. Add anything that looks interesting — we can cut it later.</p>
          <ul>
            <li>Somewhere with a good <b>computer science</b> department</li>
            <li>Close enough to get home for the holidays</li>
            <li>Has a club for literally anything (fencing? baking?)</li>
          </ul>
          <p><br /></p>
        `,
      },
      {
        id: createId('doc'),
        title: 'Personal statement — messy first draft',
        folderId: 'folder_essays',
        ownerId: PROFILES[1].id,
        lastEditedBy: PROFILES[1].id,
        createdAt: now - 1000 * 60 * 60 * 10,
        updatedAt: now - 1000 * 60 * 45,
        content: `
          <h1>Personal statement — messy first draft</h1>
          <p>Rule for this doc: no deleting, only adding. Fix it later.</p>
          <h2>Ideas for the opening</h2>
          <ol>
            <li>The summer I tried to build a robot and it caught fire</li>
            <li>Teaching my little sister to read</li>
            <li>Why I keep a notebook of questions I can't answer</li>
          </ol>
          <p><br /></p>
        `,
      },
    ],
  };
}

function isValidState(state) {
  return (
    state &&
    typeof state === 'object' &&
    Array.isArray(state.documents) &&
    Array.isArray(state.folders)
  );
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw);
    if (!isValidState(parsed)) return seedState();

    // Make sure the four starter categories always exist, even if an older
    // save is missing one of them.
    const folders = [...parsed.folders];
    DEFAULT_FOLDERS.forEach((preset) => {
      if (!folders.some((folder) => folder.id === preset.id)) {
        folders.push({ ...preset });
      }
    });

    return {
      ...seedState(),
      ...parsed,
      folders,
      profileNames: { ...seedState().profileNames, ...(parsed.profileNames ?? {}) },
    };
  } catch (error) {
    console.warn('Could not read saved notes, starting fresh.', error);
    return seedState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.warn('Could not save notes.', error);
    return false;
  }
}
