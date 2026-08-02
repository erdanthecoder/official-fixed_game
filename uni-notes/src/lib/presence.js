/**
 * Who else is in this document, right now.
 *
 * A Share button proves a document *can* be shared. It does not make an app
 * feel collaborative — that comes from seeing another person arrive while you
 * are typing. This is the piece that does that.
 *
 * The mechanism is deliberately the cheapest one that is honest:
 *
 *   docs/{docId}/presence/{uid}   { name, at }
 *
 * Each open editor writes its own row every 25 seconds and deletes it on the
 * way out. A row counts as live if its `at` is younger than 70 seconds, which
 * is two missed heartbeats — enough slack that a phone locking for a moment
 * does not make someone flicker out, short enough that a closed tab disappears
 * while you are still looking at the screen.
 *
 * Why not Realtime Database `onDisconnect`, which is the textbook answer? It is
 * a second database, a second set of rules, and a second thing that can be
 * misconfigured — for a feature whose worst failure is showing someone as
 * present for one extra minute. The timestamp is doing the same job with
 * nothing new to secure.
 *
 * Cost is bounded and small: one write per person per 25s while an editor is
 * open, and one listener on a collection that holds at most a handful of rows.
 * Nothing here runs at all when Firebase is not configured.
 */

import {
  collection as fsCollection,
  deleteDoc,
  doc as fsDoc,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase.js';

/** How often each client says "still here". */
const BEAT_MS = 25_000;

/** How stale a row may be before we stop counting it. Two missed beats. */
export const STALE_MS = 70_000;

export const isPresenceAvailable = isFirebaseConfigured;

/**
 * Announce yourself in a document and watch everyone else.
 *
 * `onChange` receives the live rows — including your own, so a caller can show
 * a complete picture — sorted so that you come first.
 *
 * Returns a function that stops the heartbeat and removes your row. Callers
 * must call it; the staleness window is the safety net for the cases where the
 * browser never lets us, like a phone being switched off mid-sentence.
 */
export function joinDocument(docId, me, onChange) {
  if (!isPresenceAvailable || !docId || !me?.uid) {
    onChange([]);
    return () => {};
  }

  const rows = fsCollection(db, 'docs', docId, 'presence');
  const mine = fsDoc(db, 'docs', docId, 'presence', me.uid);
  let stopped = false;

  const beat = () => {
    if (stopped) return;
    // Written from the client's clock rather than serverTimestamp(): a pending
    // server timestamp reads back as null from the local cache, so every
    // heartbeat would blink the writer out of their own list. Skew of a few
    // seconds is invisible against a 70-second window.
    setDoc(mine, { name: me.name ?? '', at: Date.now() }, { merge: true }).catch(() => {
      // Offline, or not a member. Either way there is nothing useful to say —
      // the list simply stays as it is.
    });
  };

  beat();
  const timer = setInterval(beat, BEAT_MS);

  const unsubscribe = onSnapshot(
    rows,
    (snapshot) => {
      const now = Date.now();
      const live = snapshot.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .filter((row) => typeof row.at === 'number' && now - row.at < STALE_MS)
        .sort((a, b) => (a.uid === me.uid ? -1 : b.uid === me.uid ? 1 : a.uid < b.uid ? -1 : 1));
      onChange(live);
    },
    () => onChange([]),
  );

  /*
   * A row left behind by a closed tab would show a ghost for a minute. `unload`
   * is unreliable on mobile — the browser may kill a backgrounded tab without
   * ever firing it — so `pagehide` is the one to listen to, and the staleness
   * window still covers the rest.
   */
  const leave = () => {
    deleteDoc(mine).catch(() => {});
  };
  window.addEventListener('pagehide', leave);

  return () => {
    stopped = true;
    clearInterval(timer);
    unsubscribe();
    window.removeEventListener('pagehide', leave);
    leave();
  };
}

/**
 * A stable colour per account.
 *
 * The same person must be the same colour on every device and in everyone
 * else's window, so it is derived from the uid rather than assigned in arrival
 * order. Eight hues, all legible against white and against the dark surface.
 */
export const PRESENCE_COLOURS = [
  '#1a73e8',
  '#d93025',
  '#188038',
  '#e37400',
  '#9334e6',
  '#0f8f8f',
  '#c5221f',
  '#3f51b5',
];

export function colourFor(uid) {
  let hash = 0;
  for (let index = 0; index < (uid ?? '').length; index += 1) {
    hash = (hash * 31 + uid.charCodeAt(index)) >>> 0;
  }
  return PRESENCE_COLOURS[hash % PRESENCE_COLOURS.length];
}

/**
 * Colours for one group of people, with no two the same.
 *
 * `colourFor` alone is stable but not distinct: with eight hues and a hash, two
 * of five people landing on the same colour is not rare, and two identical
 * circles side by side defeats the entire point of colouring them. Everyone
 * keeps their own colour where it is free, and a clash moves to the next
 * unused hue — deterministically, because the order comes from the sorted uids
 * rather than from who happened to arrive first, so every window agrees.
 */
export function assignColours(uids) {
  const order = [...uids].sort();
  const taken = new Set();
  const out = new Map();

  for (const uid of order) {
    const wanted = colourFor(uid);
    if (!taken.has(wanted)) {
      taken.add(wanted);
      out.set(uid, wanted);
      continue;
    }
    const free = PRESENCE_COLOURS.find((colour) => !taken.has(colour));
    // More people than colours: repeating is better than leaving one blank.
    const chosen = free ?? wanted;
    taken.add(chosen);
    out.set(uid, chosen);
  }
  return out;
}

/** First letter of a name, or of an email, or a question mark. */
export function initialOf(text) {
  return (text ?? '').trim().charAt(0).toUpperCase() || '?';
}
