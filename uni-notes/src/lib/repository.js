/**
 * The only module that knows where data physically lives.
 *
 * Two interchangeable implementations behind one interface:
 *
 *   createCloudRepository(uid) → Firestore
 *   createLocalRepository()    → one localStorage blob
 *
 * Layout in the cloud:
 *   docs/{docId}                 shareable: notes, sheets, decks, vocab sets.
 *                                Queried by `memberUids array-contains uid`,
 *                                so a document reaches every account it's
 *                                shared with, with no per-user copies to keep
 *                                in sync.
 *   users/{uid}/folders/{id}     personal
 *   users/{uid}/chats/{id}       personal
 *   users/{uid}/meta/prefs       personal
 *
 * Interface:
 *   subscribe(collection, cb) → unsubscribe   cb receives the full array
 *   set(collection, id, data)                 upsert (shallow merge)
 *   remove(collection, id)
 *   subscribePrefs(cb) / setPrefs(patch)
 *   snapshot()                                everything, for export/migration
 *
 * Everything above this layer is storage-agnostic.
 */

import {
  collection as fsCollection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  ALL_COLLECTIONS,
  KIND_TO_COLLECTION,
  PRIVATE_COLLECTIONS,
  SHARED_KINDS,
  isShared,
} from './model.js';
import { db } from './firebase.js';

export const COLLECTIONS = ALL_COLLECTIONS;

const LOCAL_KEY = 'uni:v3';
const LEGACY_KEY = 'uni:v2';
const DOCS = 'docs';

/* ------------------------------ local storage ----------------------------- */

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { collections: parsed.collections ?? {}, prefs: parsed.prefs ?? {} };
    }

    // Upgrade in place from the pre-sharing layout, so an existing browser
    // keeps its work instead of starting empty.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      const upgraded = { collections: parsed.collections ?? {}, prefs: parsed.prefs ?? {} };
      localStorage.setItem(LOCAL_KEY, JSON.stringify(upgraded));
      return upgraded;
    }

    return { collections: {}, prefs: {} };
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

  const emit = (key, payload) => listeners.get(key)?.forEach((cb) => cb(payload));

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
    scope: 'local',

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

function privateCollection(uid, name) {
  return fsCollection(db, 'users', uid, name);
}

function prefsDoc(uid) {
  return doc(db, 'users', uid, 'meta', 'prefs');
}

export function createCloudRepository(uid) {
  const unsubscribers = new Set();

  // One listener covers every shareable document this account can see, split
  // by kind on arrival. A separate listener per module would each need its own
  // composite index and would multiply the read cost for no benefit.
  const sharedListeners = new Map(); // collection → Set<cb>
  let sharedCache = null;
  let sharedUnsubscribe = null;

  const fanOut = () => {
    if (!sharedCache) return;
    sharedListeners.forEach((callbacks, name) => {
      const items = sharedCache.filter((item) => KIND_TO_COLLECTION[item.kind] === name);
      callbacks.forEach((cb) => cb(items));
    });
  };

  const ensureSharedListener = () => {
    if (sharedUnsubscribe) return;
    sharedUnsubscribe = onSnapshot(
      query(fsCollection(db, DOCS), where('memberUids', 'array-contains', uid)),
      (snapshot) => {
        sharedCache = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
        fanOut();
      },
      (error) => console.warn('[Uni] Sync failed for shared documents.', error),
    );
    unsubscribers.add(sharedUnsubscribe);
  };

  return {
    mode: 'cloud',
    scope: `cloud:${uid}`,
    uid,

    subscribe(name, callback) {
      if (isShared(name)) {
        if (!sharedListeners.has(name)) sharedListeners.set(name, new Set());
        sharedListeners.get(name).add(callback);
        ensureSharedListener();
        // Serve what we already have so a late subscriber isn't left empty.
        if (sharedCache) {
          callback(sharedCache.filter((item) => KIND_TO_COLLECTION[item.kind] === name));
        }
        return () => sharedListeners.get(name)?.delete(callback);
      }

      const unsubscribe = onSnapshot(
        privateCollection(uid, name),
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
      const reference = isShared(name)
        ? doc(db, DOCS, id)
        : doc(privateCollection(uid, name), id);
      const payload = isShared(name) ? { ...data, id, kind: SHARED_KINDS[name] } : { ...data, id };
      await setDoc(reference, payload, { merge: true });
    },

    async remove(name, id) {
      const reference = isShared(name)
        ? doc(db, DOCS, id)
        : doc(privateCollection(uid, name), id);
      await deleteDoc(reference);
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
      const shared = await getDocs(
        query(fsCollection(db, DOCS), where('memberUids', 'array-contains', uid)),
      );
      const sharedItems = shared.docs.map((d) => ({ ...d.data(), id: d.id }));

      const privateEntries = await Promise.all(
        PRIVATE_COLLECTIONS.map(async (name) => {
          const snap = await getDocs(privateCollection(uid, name));
          return [name, snap.docs.map((d) => ({ ...d.data(), id: d.id }))];
        }),
      );

      return {
        collections: {
          ...Object.fromEntries(
            Object.keys(SHARED_KINDS).map((name) => [
              name,
              sharedItems.filter((item) => KIND_TO_COLLECTION[item.kind] === name),
            ]),
          ),
          ...Object.fromEntries(privateEntries),
        },
      };
    },

    dispose() {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      unsubscribers.clear();
      sharedListeners.clear();
      sharedUnsubscribe = null;
      sharedCache = null;
    },
  };
}

/* -------------------------------- migration ------------------------------- */

/**
 * Lift work into the account, and out of the pre-sharing layout.
 *
 * Runs on sign-in and does two things, both only when they're safe:
 *   1. moves documents from the old users/{uid}/{collection} layout into the
 *      shared `docs` collection, stamped with ownership;
 *   2. copies anything created before signing in (local mode) up to the cloud,
 *      but only into an account with no documents — signing in must never
 *      overwrite what's already there.
 */
export async function migrateIntoAccount(user) {
  const uid = user.uid;
  const ownership = {
    ownerUid: uid,
    memberUids: [uid],
    roles: { [uid]: 'owner' },
    members: { [uid]: { role: 'owner', email: user.email ?? '', name: user.name ?? '' } },
  };

  const existingShared = await getDocs(
    query(fsCollection(db, DOCS), where('memberUids', 'array-contains', uid)),
  );
  const accountHasDocuments = existingShared.size > 0;

  let moved = 0;
  const batch = writeBatch(db);

  // 1. Old per-user document collections → shared docs.
  for (const [name, kind] of Object.entries(SHARED_KINDS)) {
    const legacy = await getDocs(privateCollection(uid, name));
    legacy.forEach((legacyDoc) => {
      const data = legacyDoc.data();
      batch.set(doc(db, DOCS, legacyDoc.id), { ...data, id: legacyDoc.id, kind, ...ownership });
      batch.delete(legacyDoc.ref);
      moved += 1;
    });
  }

  // 2. Local-mode work → the account, only if the account is otherwise empty.
  let uploaded = 0;
  if (!accountHasDocuments && moved === 0) {
    const local = createLocalRepository();
    try {
      const localData = local.snapshot();
      Object.entries(SHARED_KINDS).forEach(([name, kind]) => {
        (localData.collections[name] ?? []).forEach((item) => {
          batch.set(doc(db, DOCS, item.id), { ...item, kind, ...ownership });
          uploaded += 1;
        });
      });
      PRIVATE_COLLECTIONS.forEach((name) => {
        (localData.collections[name] ?? []).forEach((item) => {
          batch.set(doc(privateCollection(uid, name), item.id), item);
          uploaded += 1;
        });
      });
      if (uploaded > 0 && localData.prefs) {
        batch.set(prefsDoc(uid), localData.prefs, { merge: true });
      }
    } finally {
      local.dispose();
    }
  }

  if (moved > 0 || uploaded > 0) await batch.commit();
  return { moved, uploaded };
}
