import { useCallback, useState } from 'react';
import Dashboard from './components/Dashboard.jsx';
import EditorPage from './components/editor/EditorPage.jsx';
import Sidebar from './components/Sidebar.jsx';
import { useApp } from './context/AppContext.jsx';
import { useHashRoute } from './hooks/useHashRoute.js';

export default function App() {
  const { createDocument } = useApp();
  const { route, goToDashboard, goToDocument } = useHashRoute();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Remember which category the dashboard was showing so "back" returns there.
  const [lastFolderId, setLastFolderId] = useState(route.folderId ?? null);
  const folderId = route.name === 'dashboard' ? (route.folderId ?? null) : lastFolderId;

  const selectFolder = useCallback(
    (id) => {
      setLastFolderId(id);
      goToDashboard(id);
    },
    [goToDashboard],
  );

  const handleNewDocument = useCallback(() => {
    const doc = createDocument({ folderId: folderId === 'none' ? null : folderId });
    setDrawerOpen(false);
    goToDocument(doc.id);
  }, [createDocument, folderId, goToDocument]);

  return (
    <div className="app-shell">
      <Sidebar
        activeFolderId={folderId}
        onSelectFolder={selectFolder}
        onNewDocument={handleNewDocument}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <main className="app-main">
        <button
          type="button"
          className="drawer-toggle"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open categories"
        >
          ☰
        </button>

        {route.name === 'doc' ? (
          <EditorPage docId={route.docId} onBack={() => goToDashboard(folderId)} />
        ) : (
          <Dashboard
            folderId={folderId}
            onOpenDocument={goToDocument}
            onNewDocument={handleNewDocument}
          />
        )}
      </main>
    </div>
  );
}
