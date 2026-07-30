/**
 * Single source of truth for documents, folders and the active profile.
 *
 * Components never touch localStorage directly — they call the actions here and
 * the provider handles persistence (debounced auto-save) plus the "Saved"
 * indicator state. Swapping localStorage for a real API later means editing
 * only `src/lib/storage.js` and the save effect below.
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
import { createId } from '../lib/ids.js';
import {
  PROFILES,
  getProfile,
  loadState,
  saveState,
} from '../lib/storage.js';

const AppContext = createContext(null);

const AUTOSAVE_DELAY = 1200; // ms of quiet before we write to storage
const SAVED_FLASH = 900; // ms the "Saving…" label stays up so it's readable

export const SAVE_STATUS = {
  saved: 'saved',
  pending: 'pending',
  saving: 'saving',
  error: 'error',
};

export function AppProvider({ children }) {
  const [state, setState] = useState(loadState);
  const [saveStatus, setSaveStatus] = useState(SAVE_STATUS.saved);
  const [lastSavedAt, setLastSavedAt] = useState(() => Date.now());

  // Skip the very first save: nothing has changed yet on mount.
  const isFirstRun = useRef(true);
  const latestState = useRef(state);
  latestState.current = state;

  /** Every mutation goes through here so "unsaved" is impossible to forget. */
  const update = useCallback((updater) => {
    setSaveStatus(SAVE_STATUS.pending);
    setState((current) => updater(current));
  }, []);

  // Debounced auto-save.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return undefined;
    }

    let flashTimer;
    const timer = setTimeout(() => {
      setSaveStatus(SAVE_STATUS.saving);
      const ok = saveState(state);
      flashTimer = setTimeout(() => {
        if (ok) {
          setLastSavedAt(Date.now());
          setSaveStatus(SAVE_STATUS.saved);
        } else {
          setSaveStatus(SAVE_STATUS.error);
        }
      }, SAVED_FLASH);
    }, AUTOSAVE_DELAY);

    return () => {
      clearTimeout(timer);
      clearTimeout(flashTimer);
    };
  }, [state]);

  // Don't lose the last keystrokes if the tab is closed mid-debounce.
  useEffect(() => {
    const flush = () => saveState(latestState.current);
    const flushIfHidden = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', flushIfHidden);
    return () => {
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', flushIfHidden);
    };
  }, []);

  const activeProfile = useMemo(() => {
    const base = getProfile(state.activeProfileId);
    return { ...base, name: state.profileNames?.[base.id] ?? base.name };
  }, [state.activeProfileId, state.profileNames]);

  const profiles = useMemo(
    () =>
      PROFILES.map((profile) => ({
        ...profile,
        name: state.profileNames?.[profile.id] ?? profile.name,
      })),
    [state.profileNames],
  );

  const profileById = useCallback(
    (profileId) => profiles.find((p) => p.id === profileId) ?? profiles[0],
    [profiles],
  );

  /* ----------------------------- actions ----------------------------- */

  const setActiveProfile = useCallback(
    (profileId) => update((current) => ({ ...current, activeProfileId: profileId })),
    [update],
  );

  const renameProfile = useCallback(
    (profileId, name) =>
      update((current) => ({
        ...current,
        profileNames: { ...current.profileNames, [profileId]: name.trim() || 'Someone' },
      })),
    [update],
  );

  const createDocument = useCallback(
    ({ folderId = null, title = 'Untitled document', content = '' } = {}) => {
      const now = Date.now();
      const doc = {
        id: createId('doc'),
        title,
        folderId,
        ownerId: latestState.current.activeProfileId,
        lastEditedBy: latestState.current.activeProfileId,
        createdAt: now,
        updatedAt: now,
        content: content || `<h1>${title}</h1><p><br /></p>`,
      };
      update((current) => ({ ...current, documents: [doc, ...current.documents] }));
      return doc;
    },
    [update],
  );

  const updateDocument = useCallback(
    (docId, patch) =>
      update((current) => ({
        ...current,
        documents: current.documents.map((doc) =>
          doc.id === docId
            ? {
                ...doc,
                ...patch,
                lastEditedBy: current.activeProfileId,
                updatedAt: Date.now(),
              }
            : doc,
        ),
      })),
    [update],
  );

  const renameDocument = useCallback(
    (docId, title) => updateDocument(docId, { title: title.trim() || 'Untitled document' }),
    [updateDocument],
  );

  const deleteDocument = useCallback(
    (docId) =>
      update((current) => ({
        ...current,
        documents: current.documents.filter((doc) => doc.id !== docId),
      })),
    [update],
  );

  const duplicateDocument = useCallback(
    (docId) => {
      const source = latestState.current.documents.find((doc) => doc.id === docId);
      if (!source) return null;
      const now = Date.now();
      const copy = {
        ...source,
        id: createId('doc'),
        title: `${source.title} (copy)`,
        ownerId: latestState.current.activeProfileId,
        lastEditedBy: latestState.current.activeProfileId,
        createdAt: now,
        updatedAt: now,
      };
      update((current) => ({ ...current, documents: [copy, ...current.documents] }));
      return copy;
    },
    [update],
  );

  const moveDocument = useCallback(
    (docId, folderId) => updateDocument(docId, { folderId }),
    [updateDocument],
  );

  const createFolder = useCallback(
    (name, emoji = '📁') => {
      const folder = { id: createId('folder'), name: name.trim() || 'New folder', emoji };
      update((current) => ({ ...current, folders: [...current.folders, folder] }));
      return folder;
    },
    [update],
  );

  const renameFolder = useCallback(
    (folderId, name) =>
      update((current) => ({
        ...current,
        folders: current.folders.map((folder) =>
          folder.id === folderId ? { ...folder, name: name.trim() || folder.name } : folder,
        ),
      })),
    [update],
  );

  const deleteFolder = useCallback(
    (folderId) =>
      update((current) => ({
        ...current,
        folders: current.folders.filter((folder) => folder.id !== folderId),
        // Documents survive — they just go back to "no category".
        documents: current.documents.map((doc) =>
          doc.folderId === folderId ? { ...doc, folderId: null } : doc,
        ),
      })),
    [update],
  );

  const value = useMemo(
    () => ({
      documents: state.documents,
      folders: state.folders,
      profiles,
      activeProfile,
      profileById,
      saveStatus,
      lastSavedAt,
      setActiveProfile,
      renameProfile,
      createDocument,
      updateDocument,
      renameDocument,
      deleteDocument,
      duplicateDocument,
      moveDocument,
      createFolder,
      renameFolder,
      deleteFolder,
    }),
    [
      state.documents,
      state.folders,
      profiles,
      activeProfile,
      profileById,
      saveStatus,
      lastSavedAt,
      setActiveProfile,
      renameProfile,
      createDocument,
      updateDocument,
      renameDocument,
      deleteDocument,
      duplicateDocument,
      moveDocument,
      createFolder,
      renameFolder,
      deleteFolder,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside <AppProvider>');
  return context;
}
