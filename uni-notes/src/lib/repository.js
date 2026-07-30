/**
 * The only module that knows where data physically lives.
 *
 * Two interchangeable implementations behind one interface:
 *
 *   createCloudRepository(uid) → Firestore, under users/{uid}/…
 *   createLocalRepository()    → one localStorage blob (no Firebase config, or
 *                                signed out)
 *
 * Interface:
 *   subscribe(collection, cb) → unsubscribe   cb receives the full array
 *   set(collection, id, data)                 upsert
 *   remove(collection, id)
 *   subscribePrefs(cb) / setPrefs(patch)
 *   snapshot()                                everything, for export/migration
 *
 * Everything above this layer is storage-agnostic, so swapping backends never
 * touches a component.
 */

import {
  collection as fsCollection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase.js';

export const COLLECTIONS = ['folders', 'notes', 'sheets', 'presentations', 'decks', 'chats'];

const LOCAL_KEY = 'uni:v2';

/* ------------------------------ local storage ----------------------------- */

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return { collections: {}, prefs: {} };
    const parsed = JSON.parse(raw);
    return {
      collections: parsed.collections ?? {},
      prefs: parsed.prefs ?? {},
    };
  } catch (error) {
    console.warn('[Uni] Could not read local data, starting fresh.', error);
    return { collections: {}, prefs: {} };
  }
}

function writeLocal(state) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.warn('[Uni] Could not save locally.', error);
    return false;
  }
}

export function createLocalRepository() {
  let state = readLocal();
  const listeners = new Map(); // collection name (or ':prefs') → Set<cb>

  const emit = (key, payload) => {
    listeners.get(key)?.forEach((cb) => cb(payload));
  };

  const listenersFor = (key) => {
    if (!listeners.has(key)) listeners.set(key, new Set());
    return listeners.get(key);
  };

  const itemsOf = (name) => Object.values(state.collections[name] ?? {});

  // Another tab writing the same key should update this one too.
  const onStorage = (event) => {
    if (event.key !== LOCAL_KEY) return;
    state = readLocal();
    COLLECTIONS.forEach((name) => emit(name, itemsOf(name)));
    emit(':prefs', state.prefs);
  };
  window.addEventListener('storage', onStorage);

  return {
    mode: 'local',

    subscribe(name, callback) {
      const set = listenersFor(name);
      set.add(callback);
      callback(itemsOf(name));
      return () => set.delete(callback);
    },

    async set(name, id, data) {
      // Shallow-merge, matching Firestore's `{ merge: true }`. Writes are
      // patches — `{ theme: 'night' }` must not wipe the document's other
      // fields — so the two backends have to agree on this or the same call
      // loses data locally and doesn't in the cloud.
      const existing = state.collections[name]?.[id] ?? {};
      state = {
        ...state,
        collections: {
          ...state.collections,
          [name]: { ...(state.collections[name] ?? {}), [id]: { ...existing, ...data, id } },
        },
      };
      const ok = writeLocal(state);
      emit(name, itemsOf(name));
      if (!ok) throw new Error('local-write-failed');
    },

    async remove(name, id) {
      const next = { ...(state.collections[name] ?? {}) };
      delete next[id];
      state = { ...state, collections: { ...state.collections, [name]: next } };
      writeLocal(state);
      emit(name, itemsOf(name));
    },

    subscribePrefs(callback) {
      const set = listenersFor(':prefs');
      set.add(callback);
      callback(state.prefs);
      return () => set.delete(callback);
    },

    async setPrefs(patch) {
      state = { ...state, prefs: { ...state.prefs, ...patch } };
      writeLocal(state);
      emit(':prefs', state.prefs);
    },

    snapshot() {
      return {
        prefs: state.prefs,
        collections: Object.fromEntries(COLLECTIONS.map((name) => [name, itemsOf(name)])),
      };
    },

    dispose() {
      window.removeEventListener('storage', onStorage);
      listeners.clear();
    },
  };
}

/* -------------------------------- Firestore ------------------------------- */

function userCollection(uid, name) {
  return fsCollection(db, 'users', uid, name);
}

function prefsDoc(uid) {
  return doc(db, 'users', uid, 'meta', 'prefs');
}

export function createCloudRepository(uid) {
  const unsubscribers = new Set();

  return {
    mode: 'cloud',
    uid,

    subscribe(name, callback) {
      const unsubscribe = onSnapshot(
        userCollection(uid, name),
        (snapshot) => callback(snapshot.docs.map((d) => ({ ...d.data(), id: d.id }))),
        (error) => console.warn(`[Uni] Sync failed for ${name}.`, error),
      );
      unsubscribers.add(unsubscribe);
      return () => {
        unsubscribers.delete(unsubscribe);
        unsubscribe();
      };
    },

    async set(name, id, data) {
      await setDoc(doc(userCollection(uid, name), id), { ...data, id }, { merge: true });
    },

    async remove(name, id) {
      await deleteDoc(doc(userCollection(uid, name), id));
    },

    subscribePrefs(callback) {
      const unsubscribe = onSnapshot(
        prefsDoc(uid),
        (snapshot) => callback(snapshot.exists() ? snapshot.data() : {}),
        (error) => console.warn('[Uni] Sync failed for settings.', error),
      );
      unsubscribers.add(unsubscribe);
      return () => {
        unsubscribers.delete(unsubscribe);
        unsubscribe();
      };
    },

    async setPrefs(patch) {
      await setDoc(prefsDoc(uid), patch, { merge: true });
    },

    async snapshot() {
      const entries = await Promise.all(
        COLLECTIONS.map(async (name) => {
          const snapshot = await getDocs(userCollection(uid, name));
          return [name, snapshot.docs.map((d) => ({ ...d.data(), id: d.id }))];
        }),
      );
      return { collections: Object.fromEntries(entries) };
    },

    dispose() {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      unsubscribers.clear();
    },
  };
}

/**
 * First sign-in on a device that already has local work: copy it up, but only
 * when the account is genuinely empty, so signing in never overwrites what's
 * already in the cloud.
 */
export async function migrateLocalDataToCloud(uid) {
  const local = createLocalRepository();
  try {
    const localData = local.snapshot();
    const localCount = COLLECTIONS.reduce(
      (total, name) => total + (localData.collections[name]?.length ?? 0),
      0,
    );
    if (localCount === 0) return { migrated: 0 };

    const cloudCounts = await Promise.all(
      COLLECTIONS.map(async (name) => (await getDocs(userCollection(uid, name))).size),
    );
    if (cloudCounts.some((size) => size > 0)) return { migrated: 0, reason: 'account-not-empty' };

    const batch = writeBatch(db);
    COLLECTIONS.forEach((name) => {
      (localData.collections[name] ?? []).forEach((item) => {
        batch.set(doc(userCollection(uid, name), item.id), item);
      });
    });
    batch.set(prefsDoc(uid), localData.prefs ?? {}, { merge: true });
    await batch.commit();
    return { migrated: localCount };
  } finally {
    local.dispose();
  }
}
