import { useCallback, useEffect, useState } from 'react';
import AiWorkspace from './components/ai/AiWorkspace.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import LandingPage from './components/landing/LandingPage.jsx';
import LanguagesModule from './components/languages/LanguagesModule.jsx';
import NotesModule from './components/notes/NotesModule.jsx';
import SettingsPage from './components/SettingsPage.jsx';
import SheetsModule from './components/sheets/SheetsModule.jsx';
import Sidebar from './components/Sidebar.jsx';
import SlidesModule from './components/slides/SlidesModule.jsx';
import TipLine from './components/TipLine.jsx';
import UniSaveModule from './components/unisave/UniSaveModule.jsx';
import { AUTH_STATUS, useAuth } from './context/AuthContext.jsx';
import { LANDING, SIGN_IN, useHashRoute } from './hooks/useHashRoute.js';
import { useData } from './context/DataContext.jsx';
import { useT } from './i18n/index.jsx';

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
  const { ready, recovered } = useData();
  const { route, goToModule, goToItem, goToFolder, goToLanding, goToSignIn } = useHashRoute();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [recoveryDismissed, setRecoveryDismissed] = useState(false);

  const { module, id, folderId } = route;
  const onLanding = module === LANDING;
  const onSignIn = module === SIGN_IN;

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

  // An app URL while signed out goes to sign-in, then on into the app.
  useEffect(() => {
    if (!onLanding && !onSignIn && status === AUTH_STATUS.signedOut) goToSignIn();
  }, [onLanding, onSignIn, status, goToSignIn]);

  if (status === AUTH_STATUS.loading) {
    return (
      <div className="boot-screen">
        <p>{t('common.loading')}</p>
        <TipLine className="on-dark" />
      </div>
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
          ☰
        </button>

        {/*
          If the last session ended with unsaved edits, they were replayed on
          load. Say so — silently restoring work is unsettling when you were
          expecting to have lost it.
        */}
        {recovered > 0 && !recoveryDismissed ? (
          <div className="recovery-banner" role="status">
            <span aria-hidden="true">💾</span>
            <p>{t('common.recovered', { count: recovered })}</p>
            <button type="button" className="icon-button small" onClick={() => setRecoveryDismissed(true)}>
              ✕
            </button>
          </div>
        ) : null}

        {!ready ? (
          <div className="module-loading">
            <p>{t('common.loading')}</p>
            <TipLine />
          </div>
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
        ) : module === 'unisave' ? (
          <UniSaveModule onOpen={(target, itemId) => goToItem(target, itemId)} />
        ) : module === 'languages' ? (
          <LanguagesModule
            deckId={id}
            onOpen={(deckId) => goToItem('languages', deckId)}
            onBack={() => goToModule('languages')}
          />
        ) : module === 'ai' ? (
          <AiWorkspace chatId={id} onOpenChat={(chatId) => goToItem('ai', chatId)} />
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
      </main>
    </div>
  );
}
