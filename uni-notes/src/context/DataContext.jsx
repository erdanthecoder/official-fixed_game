/**
 * All application data, for every module.
 *
 * Reads come from live subscriptions (Firestore `onSnapshot`, or local storage
 * events). Writes are debounced and merged per item, so holding a key down in
 * an editor costs one write, not one per keystroke.
 *
 * Between a keystroke and the write landing, an "overlay" holds the optimistic
 * value so the UI never lags behind the caret. An overlay entry is dropped once
 * a subscription delivers a version at least as new as the pending patch.
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
import { createId } from '../lib/ids.js';
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
  const { uid, isCloud } = useAuth();

  const repository = useMemo(
    () => (isCloud && uid ? createCloudRepository(uid) : createLocalRepository()),
    [isCloud, uid],
  );

  const [collections, setCollections] = useState(emptyCollections);
  const [prefs, setPrefsState] = useState({});
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState(SAVE_STATUS.saved);

  // key `${collection}:${id}` → { data, deleted, at, isNew }
  const [overlay, setOverlay] = useState({});
  const pendingWrites = useRef(new Map());
  const flushTimer = useRef(null);
  const savedTimer = useRef(null);

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
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveStatus(SAVE_STATUS.saved), SAVED_FLASH);
    } catch (error) {
      console.warn('[Uni] Save failed.', error);
      setSaveStatus(SAVE_STATUS.error);
    }
  }, [repository]);

  const queueWrite = useCallback(
    (name, id, data, { immediate = false, deleted = false, isNew = false } = {}) => {
      const at = Date.now();
      const key = `${name}:${id}`;
      const payload = deleted ? { id } : { ...data, id, updatedAt: at };

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
      });

      setSaveStatus(SAVE_STATUS.pending);
      clearTimeout(flushTimer.current);
      if (immediate) flush();
      else flushTimer.current = setTimeout(flush, WRITE_DEBOUNCE);
    },
    [flush],
  );

  // Never lose the last edit to a closing tab.
  useEffect(() => {
    const onHide = () => {
      if (pendingWrites.current.size > 0) flush();
    };
    window.addEventListener('beforeunload', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('beforeunload', onHide);
      document.removeEventListener('visibilitychange', onHide);
      clearTimeout(flushTimer.current);
      clearTimeout(savedTimer.current);
    };
  }, [flush]);

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
      const item = { id: createId(idPrefix), createdAt: now, updatedAt: now, ...data };
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
          console.warn('[Uni] Could not save settings.', error);
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

  const exportAll = useCallback(
    () => ({
      exportedAt: new Date().toISOString(),
      mode: repository.mode,
      prefs,
      collections: Object.fromEntries(COLLECTIONS.map((name) => [name, merged[name] ?? []])),
    }),
    [merged, prefs, repository.mode],
  );

  const value = useMemo(
    () => ({
      notes: merged.notes ?? [],
      folders: merged.folders ?? [],
      sheets: merged.sheets ?? [],
      presentations: merged.presentations ?? [],
      vocabDecks: merged.decks ?? [],
      chats: merged.chats ?? [],
      prefs,
      ready,
      saveStatus,
      storageMode: repository.mode,
      create,
      update,
      remove,
      duplicate,
      deleteFolder,
      setPrefs,
      flush,
      exportAll,
    }),
    [merged, prefs, ready, saveStatus, repository.mode, create, update, remove, duplicate, deleteFolder, setPrefs, flush, exportAll],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used inside <DataProvider>');
  return context;
}
