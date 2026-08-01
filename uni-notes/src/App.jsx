import { useCallback, useEffect, useState } from 'react';
import Icon from './components/ui/Icon.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import CanvasModule from './components/canvas/CanvasModule.jsx';
import JoinPage from './components/JoinPage.jsx';
import Skeleton from './components/shared/Skeleton.jsx';
import LandingPage from './components/landing/LandingPage.jsx';
import LanguagesModule from './components/languages/LanguagesModule.jsx';
import NotesModule from './components/notes/NotesModule.jsx';
import AppsPage from './components/apps/AppsPage.jsx';
import SettingsPage from './components/SettingsPage.jsx';
import SheetsModule from './components/sheets/SheetsModule.jsx';
import Sidebar from './components/Sidebar.jsx';
import SlidesModule from './components/slides/SlidesModule.jsx';
import TasksModule from './components/tasks/TasksModule.jsx';
import TipLine from './components/TipLine.jsx';
import UniSaveModule from './components/unisave/UniSaveModule.jsx';
import { AUTH_STATUS, useAuth } from './context/AuthContext.jsx';
import { JOIN, LANDING, SIGN_IN, useHashRoute } from './hooks/useHashRoute.js';
import { useAppUpdate } from './hooks/useInstall.js';
import { useStandalone } from './hooks/useStandalone.js';
import { useAppearance } from './hooks/useAppearance.js';
import { useData } from './context/DataContext.jsx';
import { useT } from './i18n/index.jsx';

/** Fires a navigation once, on mount, and shows nothing while it happens. */
function Redirect({ to }) {
  useEffect(to, [to]);
  return null;
}

/** Which module opens a shared document, by the collection it lives in. */
const SHARED_MODULES = [
  ['notes', 'notes'],
  ['sheets', 'sheets'],
  ['presentations', 'slides'],
  ['boards', 'canvas'],
  ['plans', 'tasks'],
  ['vocabDecks', 'languages'],
];

/** Take down the pre-React splash once there's something real to look at. */
function useHideBootSplash(ready) {
  useEffect(() => {
    if (!ready) return;
    const splash = document.getElementById('boot');
    if (!splash) return;
    splash.classList.add('is-gone');
    const timer = setTimeout(() => splash.remove(), 320);
    return () => clearTimeout(timer);
  }, [ready]);
}

export default function App() {
  const { t } = useT();
  const { status } = useAuth();
  const data = useData();
  const { ready, recovered, prefs } = data;
  const { route, goToModule, goToItem, goToFolder, goToLanding, goToSignIn } = useHashRoute();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [recoveryDismissed, setRecoveryDismissed] = useState(false);
  const { updateReady, applyUpdate } = useAppUpdate();
  const standalone = useStandalone();
  useAppearance(prefs);

  const { module, id, folderId } = route;
  const onLanding = module === LANDING;
  const onSignIn = module === SIGN_IN;
  const onJoin = module === JOIN;

  useHideBootSplash(status !== AUTH_STATUS.loading);

  /** "Let's go": into the app if we can, otherwise to sign-in. */
  const start = useCallback(() => {
    if (status === AUTH_STATUS.signedIn || status === AUTH_STATUS.local) goToModule('notes');
    else goToSignIn();
  }, [status, goToModule, goToSignIn]);

  // Signing in from the sign-in screen should land you in the app, not back on
  // a screen asking you to sign in.
  useEffect(() => {
    if (onSignIn && status === AUTH_STATUS.signedIn) goToModule('notes');
  }, [onSignIn, status, goToModule]);

  // An app URL while signed out goes to sign-in, then on into the app. An
  // invite link is exempt: it is a URL a stranger was sent, and it explains
  // itself before asking anyone to sign in.
  useEffect(() => {
    if (!onLanding && !onSignIn && !onJoin && status === AUTH_STATUS.signedOut) goToSignIn();
  }, [onLanding, onSignIn, onJoin, status, goToSignIn]);

  /**
   * Open whatever a freshly-joined document turns out to be.
   *
   * The join writes membership, and the document arrives through the normal
   * subscription a moment later — so it may not be in `data` yet. UniSave lists
   * every kind, which makes it the right place to land when we cannot yet say
   * which module owns it.
   */
  const openJoined = useCallback(
    (docId) => {
      const found = SHARED_MODULES.map(([collection, target]) =>
        (data[collection] ?? []).some((item) => item.id === docId) ? target : null,
      ).find(Boolean);
      if (found) goToItem(found, docId);
      else goToModule('unisave');
    },
    [data, goToItem, goToModule],
  );

  if (status === AUTH_STATUS.loading) {
    return (
      <div className="boot-screen">
        <p>{t('common.loading')}</p>
        <TipLine className="on-dark" />
      </div>
    );
  }

  /*
    An installed app opens straight into the workspace. The landing page is a
    sales pitch, and someone who tapped an icon on their home screen has
    already bought it.

    Rendered rather than navigated: replacing the hash on every cold start
    would put a landing entry in the history, so the back gesture would take
    them to the pitch instead of out of the app.
  */
  if (onLanding && standalone) {
    return status === AUTH_STATUS.signedOut ? (
      <AuthScreen onBack={goToLanding} />
    ) : (
      <Redirect to={() => goToModule(prefs?.startModule ?? 'notes')} />
    );
  }

  if (onJoin) {
    return (
      <JoinPage
        code={id}
        onOpenDocument={openJoined}
        onGoHome={goToLanding}
        onSignIn={goToSignIn}
      />
    );
  }

  if (onLanding) return <LandingPage onStart={start} />;
  if (onSignIn || status === AUTH_STATUS.signedOut) {
    return <AuthScreen onBack={goToLanding} />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeModule={module}
        activeFolderId={folderId}
        onSelectModule={goToModule}
        onSelectFolder={goToFolder}
        onGoHome={goToLanding}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <main className="app-main">
        <button
          type="button"
          className="drawer-toggle"
          onClick={() => setDrawerOpen(true)}
          aria-label={t('common.appName')}
        >
          <Icon name="menu" size={22} />
        </button>

        {/*
          If the last session ended with unsaved edits, they were replayed on
          load. Say so — silently restoring work is unsettling when you were
          expecting to have lost it.
        */}
        {recovered > 0 && !recoveryDismissed ? (
          <div className="recovery-banner" role="status">
            <Icon name="save" size={18} />
            <p>{t('common.recovered', { count: recovered })}</p>
            <button type="button" className="icon-button small" onClick={() => setRecoveryDismissed(true)}>
              <Icon name="close" size={16} />
            </button>
          </div>
        ) : null}

        {/*
          A new build is installed and waiting. The service worker deliberately
          does not swap itself mid-session, so this is the moment the user gets
          to say when — and it stays until they do rather than nagging.
        */}
        {updateReady ? (
          <div className="update-banner" role="status">
            <Icon name="cloud" size={17} />
            <p>{t('common.updateReady')}</p>
            <button type="button" className="button ghost small" onClick={applyUpdate}>
              {t('common.updateNow')}
            </button>
          </div>
        ) : null}

        <div className="view-enter" key={`${module}:${id ?? ''}:${folderId ?? ''}`}>
        {!ready ? (
          <Skeleton />
        ) : module === 'sheets' ? (
          <SheetsModule
            sheetId={id}
            onOpen={(sheetId) => goToItem('sheets', sheetId)}
            onBack={() => goToModule('sheets')}
          />
        ) : module === 'slides' ? (
          <SlidesModule
            deckId={id}
            onOpen={(deckId) => goToItem('slides', deckId)}
            onBack={() => goToModule('slides')}
          />
        ) : module === 'canvas' ? (
          <CanvasModule
            boardId={id}
            onOpen={(boardId) => goToItem('canvas', boardId)}
            onBack={() => goToModule('canvas')}
          />
        ) : module === 'tasks' ? (
          <TasksModule
            planId={id}
            onOpen={(planId) => goToItem('tasks', planId)}
            onBack={() => goToModule('tasks')}
          />
        ) : module === 'unisave' ? (
          <UniSaveModule onOpen={(target, itemId) => goToItem(target, itemId)} />
        ) : module === 'languages' ? (
          <LanguagesModule
            deckId={id}
            onOpen={(deckId) => goToItem('languages', deckId)}
            onBack={() => goToModule('languages')}
          />
        ) : module === 'apps' ? (
          <AppsPage />
        ) : module === 'settings' ? (
          <SettingsPage />
        ) : (
          <NotesModule
            noteId={id}
            folderId={folderId}
            onOpen={(noteId) => goToItem('notes', noteId)}
            onBack={() => goToFolder(folderId)}
          />
        )}
        </div>
      </main>
    </div>
  );
}
