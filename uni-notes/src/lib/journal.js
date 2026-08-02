/**
 * The write journal — why a reload can't lose your work.
 *
 * Writes are debounced (one save per pause in typing, not one per keystroke),
 * which leaves a window where an edit exists only in memory. Reloading, closing
 * the tab, a crash, or losing power inside that window would drop it.
 *
 * So every queued edit is appended here *synchronously* first. localStorage
 * writes are synchronous and survive the page dying mid-task. Once the real
 * write lands the entry is dropped; anything still in the journal at startup is
 * an edit that never made it, and gets replayed.
 *
 * This is deliberately dumb and separate from the repository: it must keep
 * working even when the thing it's protecting against is broken.
 */

const KEY = 'uni:journal:v1';
const MAX_ENTRIES = 400;

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // A corrupt journal must never block startup — drop it and carry on.
    return [];
  }
}

function write(entries) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch (error) {
    // Out of quota or private-browsing: the app still works, it just loses the
    // extra safety net. Not worth interrupting the user over.
    console.warn('[Kadam] Could not journal a pending edit.', error);
  }
}

/**
 * Record an edit that has not been persisted yet. Returns its ticket.
 *
 * Successive edits to the same document collapse into one entry rather than
 * appending: typing a sentence should cost one journal slot, not forty. Without
 * this, every keystroke re-serialises a growing array — which is quadratic work
 * in the exact case that matters, editing a long document.
 */
export function record({ scope, collection, id, data, deleted = false }) {
  const entries = read();
  const at = Date.now();
  const index = entries.findIndex(
    (entry) => entry.scope === scope && entry.collection === collection && entry.id === id,
  );

  // Reuse the ticket when collapsing, so the pending write still settles the
  // entry it replaced.
  const ticket =
    index >= 0
      ? entries[index].ticket
      : `${at.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const merged = {
    ticket,
    scope,
    collection,
    id,
    // A delete supersedes anything queued before it; otherwise merge, so a
    // title change and a body change made seconds apart both survive.
    data: deleted ? null : { ...(index >= 0 ? (entries[index].data ?? {}) : {}), ...data },
    deleted,
    at,
  };

  if (index >= 0) entries[index] = merged;
  else entries.push(merged);

  write(entries);
  return ticket;
}

/** Drop entries that have now been written for real. */
export function settle(tickets) {
  if (!tickets?.length) return;
  const done = new Set(tickets);
  write(read().filter((entry) => !done.has(entry.ticket)));
}

/**
 * Edits still outstanding for this storage scope, oldest first, collapsed to
 * one entry per document so a long typing session replays as a single write.
 */
export function pendingFor(scope) {
  const byDocument = new Map();
  read()
    .filter((entry) => entry.scope === scope)
    .sort((a, b) => a.at - b.at)
    .forEach((entry) => {
      const key = `${entry.collection}:${entry.id}`;
      const existing = byDocument.get(key);
      byDocument.set(key, {
        ...entry,
        // Later edits win, but merge so a title change and a body change that
        // were journalled separately both survive.
        data: entry.deleted ? null : { ...(existing?.data ?? {}), ...(entry.data ?? {}) },
        tickets: [...(existing?.tickets ?? []), entry.ticket],
      });
    });
  return [...byDocument.values()];
}

/** Everything still outstanding, any scope — used by the recovery notice. */
export function pendingCount() {
  return read().length;
}

export function clearScope(scope) {
  write(read().filter((entry) => entry.scope !== scope));
}
