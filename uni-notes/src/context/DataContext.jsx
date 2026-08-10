/**
 * All application data, for every module.
 *
 * Reads come from live subscriptions (Firestore `onSnapshot`, or local storage
 * events). Writes are debounced and merged per item, so holding a key down in
 * an editor costs one write, not one per keystroke.
 *
 * Three things keep the UI honest between a keystroke and the write landing:
 *
 *   overlay  the optimistic value, so the view never lags the caret. An entry
 *            is dropped once a subscription delivers a version at least as new.
 *   journal  the same edit written synchronously to local storage, so a reload
 *            or crash inside the debounce window cannot lose it (see journal.js).
 *   flush    a best-effort write on pagehide, so most edits never need replay.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  COLLECTIONS,
  createCloudRepository,
  createLocalRepository,
} from '../lib/repository.js';
import { SEED_VERSION, seedWorkspace } from '../lib/seed.js';
import { VOCAB_TEMPLATES } from '../lib/templates/vocab.js';
import { canEdit, isShared, ownershipFor } from '../lib/model.js';
import { createId } from '../lib/ids.js';
import { pendingFor, record, settle } from '../lib/journal.js';
import { useAuth } from './AuthContext.jsx';

const DataContext = createContext(null);

const WRITE_DEBOUNCE = 1200;
const SAVED_FLASH = 700;

export const SAVE_STATUS = {
  saved: 'saved',
  pending: 'pending',
  saving: 'saving',
  error: 'error',
};

const emptyCollections = () => Object.fromEntries(COLLECTIONS.map((name) => [name, []]));

export function DataProvider({ children }) {
  const { uid, user, isCloud } = useAuth();

  const repository = useMemo(
    () => (isCloud && uid ? createCloudRepository(uid) : createLocalRepository()),
    [isCloud, uid],
  );

  const [collections, setCollections] = useState(emptyCollections);
  const [prefs, setPrefsState] = useState({});
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState(SAVE_STATUS.saved);
  const [recovered, setRecovered] = useState(0);

  // key `${collection}:${id}` → { data, deleted, at, isNew }
  const [overlay, setOverlay] = useState({});
  const pendingWrites = useRef(new Map());
  const flushTimer = useRef(null);
  const savedTimer = useRef(null);
  // How many times in a row the write queue has failed. Drives the backoff and
  // is reset by any success, so a single blip does not slow the next hour down.
  const failures = useRef(0);
  const retryTimer = useRef(null);

  // Identity for ownership stamping, read at write time rather than captured.
  const identity = useRef(user);
  identity.current = user;

  /* ---------------------------- subscriptions ---------------------------- */

  useEffect(() => {
    setCollections(emptyCollections());
    setOverlay({});
    setReady(false);

    const unsubscribers = COLLECTIONS.map((name) =>
      repository.subscribe(name, (items) => {
        setCollections((current) => ({ ...current, [name]: items }));

        // Retire overlay entries the backend has caught up with.
        setOverlay((current) => {
          let changed = false;
          const next = { ...current };
          items.forEach((item) => {
            const key = `${name}:${item.id}`;
            const entry = next[key];
            if (entry && !entry.deleted && (item.updatedAt ?? 0) >= entry.at) {
              delete next[key];
              changed = true;
            }
          });
          return changed ? next : current;
        });
      }),
    );

    const unsubscribePrefs = repository.subscribePrefs((next) => {
      setPrefsState(next ?? {});
      setReady(true);
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      unsubscribePrefs();
      repository.dispose();
    };
  }, [repository]);

  /* -------------------------------- writes ------------------------------- */

  const flush = useCallback(async () => {
    clearTimeout(flushTimer.current);
    if (pendingWrites.current.size === 0) return;

    const batch = [...pendingWrites.current.values()];
    pendingWrites.current.clear();
    setSaveStatus(SAVE_STATUS.saving);

    try {
      await Promise.all(
        batch.map(({ name, id, data, deleted }) =>
          deleted ? repository.remove(name, id) : repository.set(name, id, data),
        ),
      );
      // Written for real — the journal no longer needs to guard these.
      settle(batch.flatMap((item) => item.tickets ?? []));
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveStatus(SAVE_STATUS.saved), SAVED_FLASH);
      failures.current = 0;
    } catch (error) {
      console.warn('[Kadam] Save failed.', error);

      /*
       * Put the work back, and try again.
       *
       * The batch was taken out of the queue before the write started, so a
       * failure used to drop it: the edits survived only in the journal, and
       * the journal is replayed on load — meaning a five-second network blip
       * cost you your last paragraph until you happened to reload the page.
       * Nothing retried, and the only sign was a small "Couldn't save" label
       * in a corner.
       *
       * Anything typed since the attempt started is newer and wins; the failed
       * copy only fills in keys that have not been touched again.
       */
      for (const item of batch) {
        const key = `${item.name}:${item.id}`;
        if (!pendingWrites.current.has(key)) pendingWrites.current.set(key, item);
      }
      setSaveStatus(SAVE_STATUS.error);

      // 2s, 4s, 8s, 16s, then every 30s. Long enough not to hammer a server
      // that is struggling, short enough that a blip heals before you notice.
      failures.current += 1;
      const wait = Math.min(30000, 2000 * 2 ** (failures.current - 1));
      clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => flushRef.current?.(), wait);
    }
  }, [repository]);

  /*
   * A ref to the newest flush, so the retry timer and the online listener can
   * call it without either of them being rebuilt when `flush` changes identity.
   */
  const flushRef = useRef(flush);
  flushRef.current = flush;

  /*
   * Coming back online is the single best moment to retry, and it is free —
   * far better than waiting out whatever backoff happens to be running.
   */
  useEffect(() => {
    const onOnline = () => {
      failures.current = 0;
      if (pendingWrites.current.size > 0) flushRef.current?.();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  useEffect(() => () => clearTimeout(retryTimer.current), []);

  /** Try the queued writes again now, for the "Try again" button. */
  const retryNow = useCallback(() => {
    failures.current = 0;
    clearTimeout(retryTimer.current);
    flushRef.current?.();
  }, []);

  const queueWrite = useCallback(
    (name, id, data, { immediate = false, deleted = false, isNew = false, replay = false } = {}) => {
      const at = Date.now();
      const key = `${name}:${id}`;
      const payload = deleted ? { id } : { ...data, id, updatedAt: at };

      // Journal first. If everything after this line fails, the edit survives.
      // Replayed edits are already journalled — re-recording them would loop.
      const ticket = replay
        ? null
        : record({ scope: repository.scope, collection: name, id, data: payload, deleted });

      // Merge into any pending overlay entry rather than replacing it. Two quick
      // edits to different fields of the same item (add a slide, then change the
      // theme) must both stay visible until the backend confirms them —
      // replacing here would drop the first one from the optimistic view.
      setOverlay((current) => {
        const previous = current[key];
        return {
          ...current,
          [key]: {
            data: deleted ? payload : { ...(previous?.deleted ? {} : previous?.data ?? {}), ...payload },
            deleted,
            at,
            isNew: isNew || previous?.isNew,
          },
        };
      });

      const existing = pendingWrites.current.get(key);
      pendingWrites.current.set(key, {
        name,
        id,
        deleted,
        data: deleted ? null : { ...(existing?.data ?? {}), ...payload },
        tickets: [...(existing?.tickets ?? []), ...(ticket ? [ticket] : [])],
      });

      setSaveStatus(SAVE_STATUS.pending);
      clearTimeout(flushTimer.current);
      if (immediate) flush();
      else flushTimer.current = setTimeout(flush, WRITE_DEBOUNCE);
    },
    [flush, repository.scope],
  );

  // Best-effort write when the page goes away. The journal covers what this
  // misses; this just means most sessions never need a replay at all.
  useEffect(() => {
    const onHide = () => {
      if (pendingWrites.current.size > 0) flush();
    };
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onHide);
      document.removeEventListener('visibilitychange', onHide);
      clearTimeout(flushTimer.current);
      clearTimeout(savedTimer.current);
    };
  }, [flush]);

  /* --------------------------- journal recovery -------------------------- */

  const replayed = useRef(null);
  useEffect(() => {
    if (!ready) return;
    // Once per storage location per session.
    if (replayed.current === repository.scope) return;
    replayed.current = repository.scope;

    const outstanding = pendingFor(repository.scope);
    if (outstanding.length === 0) return;

    console.info(`[Kadam] Replaying ${outstanding.length} unsaved edit(s) from the last session.`);
    outstanding.forEach((entry) => {
      queueWrite(entry.collection, entry.id, entry.data, {
        deleted: entry.deleted,
        replay: true,
      });
    });
    // Hand the original tickets to the flush that will write them.
    outstanding.forEach((entry) => {
      const key = `${entry.collection}:${entry.id}`;
      const queued = pendingWrites.current.get(key);
      if (queued) queued.tickets = [...(queued.tickets ?? []), ...(entry.tickets ?? [])];
    });
    setRecovered(outstanding.length);
    flush();
  }, [ready, repository.scope, queueWrite, flush]);

  /* ------------------------------ derived data --------------------------- */

  const merged = useMemo(() => {
    const result = {};
    COLLECTIONS.forEach((name) => {
      const byId = new Map();
      (collections[name] ?? []).forEach((item) => byId.set(item.id, item));

      Object.entries(overlay).forEach(([key, entry]) => {
        const [collectionName, id] = key.split(':');
        if (collectionName !== name) return;
        if (entry.deleted) {
          byId.delete(id);
          return;
        }
        byId.set(id, { ...(byId.get(id) ?? {}), ...entry.data });
      });

      result[name] = [...byId.values()].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    });
    return result;
  }, [collections, overlay]);

  /* -------------------------------- actions ------------------------------ */

  const create = useCallback(
    (name, data, { idPrefix = 'item' } = {}) => {
      const now = Date.now();
      const item = {
        id: createId(idPrefix),
        createdAt: now,
        updatedAt: now,
        // Shareable documents carry their own membership; personal ones don't.
        ...(isShared(name) ? ownershipFor(identity.current) : {}),
        ...data,
      };
      queueWrite(name, item.id, item, { immediate: true, isNew: true });
      return item;
    },
    [queueWrite],
  );

  const update = useCallback(
    (name, id, patch, options) => queueWrite(name, id, patch, options),
    [queueWrite],
  );

  const remove = useCallback(
    (name, id) => queueWrite(name, id, null, { immediate: true, deleted: true }),
    [queueWrite],
  );

  const duplicate = useCallback(
    (name, id, { titleKey = 'title' } = {}) => {
      const source = merged[name]?.find((item) => item.id === id);
      if (!source) return null;
      const now = Date.now();
      const copy = {
        ...source,
        id: createId(name.slice(0, 4)),
        [titleKey]: `${source[titleKey] ?? 'Untitled'} (copy)`,
        createdAt: now,
        updatedAt: now,
        // A copy belongs to whoever made it, not to the original's members.
        ...(isShared(name) ? ownershipFor(identity.current) : {}),
      };
      queueWrite(name, copy.id, copy, { immediate: true, isNew: true });
      return copy;
    },
    [merged, queueWrite],
  );

  const setPrefs = useCallback(
    (patch) => {
      setPrefsState((current) => ({ ...current, ...patch }));
      setSaveStatus(SAVE_STATUS.pending);
      repository
        .setPrefs(patch)
        .then(() => setSaveStatus(SAVE_STATUS.saved))
        .catch((error) => {
          console.warn('[Kadam] Could not save settings.', error);
          setSaveStatus(SAVE_STATUS.error);
        });
    },
    [repository],
  );

  /** Deleting a folder keeps its notes — they fall back to "no category". */
  const deleteFolder = useCallback(
    (folderId) => {
      merged.notes
        ?.filter((note) => note.folderId === folderId)
        .forEach((note) => queueWrite('notes', note.id, { folderId: null }));
      remove('folders', folderId);
    },
    [merged.notes, queueWrite, remove],
  );

  /** Leave a document someone shared with you, without deleting it for them. */
  const leaveDocument = useCallback(
    (name, id) => {
      const document = merged[name]?.find((item) => item.id === id);
      if (!document || !uid || document.ownerUid === uid) return;
      const memberUids = (document.memberUids ?? []).filter((member) => member !== uid);
      const roles = { ...(document.roles ?? {}) };
      const members = { ...(document.members ?? {}) };
      delete roles[uid];
      delete members[uid];
      queueWrite(name, id, { memberUids, roles, members }, { immediate: true });
    },
    [merged, queueWrite, uid],
  );

  const exportAll = useCallback(
    () => ({
      exportedAt: new Date().toISOString(),
      mode: repository.mode,
      prefs,
      collections: Object.fromEntries(COLLECTIONS.map((name) => [name, merged[name] ?? []])),
    }),
    [merged, prefs, repository.mode],
  );

  /**
   * Merge a backup back in.
   *
   * Merge rather than replace, and skip anything whose id is already here.
   * Two consequences, both wanted: importing the same file twice does nothing
   * the second time, and importing a backup never destroys work done since it
   * was taken. "Restore" that silently deletes a week of notes is a data-loss
   * bug wearing a feature's clothes.
   *
   * Ownership is re-stamped rather than copied. A document exported from one
   * account and imported into another belongs to the account importing it —
   * carrying the old memberUids across would grant access to people who were
   * never invited to this copy.
   */
  const importAll = useCallback(
    (backup) => {
      const collections = backup?.collections ?? {};
      let count = 0;

      COLLECTIONS.forEach((name) => {
        const incoming = collections[name];
        if (!Array.isArray(incoming)) return;
        const existing = new Set((merged[name] ?? []).map((item) => item.id));

        incoming.forEach((item) => {
          if (!item?.id || existing.has(item.id)) return;
          const { ownerUid, memberUids, roles, members, joinCode, joinRole, joinExpiresAt, ...rest } =
            item;
          queueWrite(
            name,
            item.id,
            {
              ...rest,
              ...(isShared(name) ? ownershipFor(identity.current) : {}),
              updatedAt: Date.now(),
            },
            { immediate: true, isNew: true },
          );
          count += 1;
        });
      });

      return count;
    },
    [merged, queueWrite],
  );

  const mayEdit = useCallback((document) => canEdit(document, uid), [uid]);

  // First run for this account (or this browser in local mode): lay down the
  // starter folders, notes and vocab deck exactly once.
  const seeded = useRef(false);
  useEffect(() => {
    if (!ready || seeded.current) return;
    if (prefs.seedVersion === SEED_VERSION) {
      seeded.current = true;
      return;
    }
    seeded.current = true;
    seedWorkspace({ create, setPrefs }, { vocabTemplates: VOCAB_TEMPLATES });
  }, [ready, prefs.seedVersion, create, setPrefs]);

  const value = useMemo(
    () => ({
      notes: merged.notes ?? [],
      folders: merged.folders ?? [],
      sheets: merged.sheets ?? [],
      presentations: merged.presentations ?? [],
      vocabDecks: merged.decks ?? [],
      boards: merged.boards ?? [],
      plans: merged.plans ?? [],
      shortlists: merged.shortlists ?? [],
      prefs,
      ready,
      saveStatus,
      recovered,
      storageMode: repository.mode,
      mayEdit,
      create,
      update,
      remove,
      duplicate,
      deleteFolder,
      leaveDocument,
      setPrefs,
      flush,
      retryNow,
      exportAll,
      importAll,
    }),
    [
      merged,
      prefs,
      ready,
      saveStatus,
      recovered,
      repository.mode,
      mayEdit,
      create,
      update,
      remove,
      duplicate,
      deleteFolder,
      leaveDocument,
      setPrefs,
      flush,
      retryNow,
      exportAll,
      importAll,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used inside <DataProvider>');
  return context;
}
