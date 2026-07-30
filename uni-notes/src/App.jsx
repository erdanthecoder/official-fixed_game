import { useCallback, useState } from 'react';
import AiWorkspace from './components/ai/AiWorkspace.jsx';
import LanguagesModule from './components/languages/LanguagesModule.jsx';
import NotesModule from './components/notes/NotesModule.jsx';
import SettingsPage from './components/SettingsPage.jsx';
import SheetsModule from './components/sheets/SheetsModule.jsx';
import Sidebar from './components/Sidebar.jsx';
import SignInScreen from './components/SignInScreen.jsx';
import SlidesModule from './components/slides/SlidesModule.jsx';
import { AUTH_STATUS, useAuth } from './context/AuthContext.jsx';
import { useData } from './context/DataContext.jsx';
import { useHashRoute } from './hooks/useHashRoute.js';
import { useT } from './i18n/index.jsx';

export default function App() {
  const { t } = useT();
  const { status } = useAuth();
  const { ready } = useData();
  const { route, goToModule, goToItem, goToFolder } = useHashRoute();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openItem = useCallback((module, id) => goToItem(module, id), [goToItem]);

  if (status === AUTH_STATUS.loading) {
    return (
      <div className="boot-screen">
        <span className="boot-logo" aria-hidden="true">
          🎓
        </span>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (status === AUTH_STATUS.signedOut) return <SignInScreen />;

  const { module, id, folderId } = route;

  return (
    <div className="app-shell">
      <Sidebar
        activeModule={module}
        activeFolderId={folderId}
        onSelectModule={goToModule}
        onSelectFolder={goToFolder}
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

        {!ready ? (
          <div className="module-loading">{t('common.loading')}</div>
        ) : module === 'sheets' ? (
          <SheetsModule
            sheetId={id}
            onOpen={(sheetId) => openItem('sheets', sheetId)}
            onBack={() => goToModule('sheets')}
          />
        ) : module === 'slides' ? (
          <SlidesModule
            deckId={id}
            onOpen={(deckId) => openItem('slides', deckId)}
            onBack={() => goToModule('slides')}
          />
        ) : module === 'languages' ? (
          <LanguagesModule
            deckId={id}
            onOpen={(deckId) => openItem('languages', deckId)}
            onBack={() => goToModule('languages')}
          />
        ) : module === 'ai' ? (
          <AiWorkspace chatId={id} onOpenChat={(chatId) => openItem('ai', chatId)} />
        ) : module === 'settings' ? (
          <SettingsPage />
        ) : (
          <NotesModule
            noteId={id}
            folderId={folderId}
            onOpen={(noteId) => openItem('notes', noteId)}
            onBack={() => goToFolder(folderId)}
          />
        )}
      </main>
    </div>
  );
}
