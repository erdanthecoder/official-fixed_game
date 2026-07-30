import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import ConfirmDialog from './ui/ConfirmDialog.jsx';
import ProfileSwitcher from './ProfileSwitcher.jsx';
import PromptDialog from './ui/PromptDialog.jsx';

/**
 * Category list. Doubles as the mobile/tablet drawer — the parent controls
 * whether it's on screen via `isOpen`.
 */
export default function Sidebar({ activeFolderId, onSelectFolder, onNewDocument, isOpen, onClose }) {
  const { documents, folders, createFolder, renameFolder, deleteFolder } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const counts = useMemo(() => {
    const map = { all: documents.length, uncategorised: 0 };
    documents.forEach((doc) => {
      if (!doc.folderId) map.uncategorised += 1;
      else map[doc.folderId] = (map[doc.folderId] ?? 0) + 1;
    });
    return map;
  }, [documents]);

  const select = (folderId) => {
    onSelectFolder(folderId);
    onClose?.();
  };

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'is-open' : ''}`} aria-label="Categories">
        <div className="sidebar-brand">
          <span className="sidebar-logo" aria-hidden="true">
            🎓
          </span>
          <div>
            <strong>Uni Notes</strong>
            <small>Plan it together</small>
          </div>
        </div>

        <button type="button" className="button primary new-doc" onClick={onNewDocument}>
          <span aria-hidden="true">＋</span> New document
        </button>

        <nav className="folder-list">
          <button
            type="button"
            className={`folder-item ${activeFolderId === null ? 'is-active' : ''}`}
            onClick={() => select(null)}
          >
            <span className="folder-emoji" aria-hidden="true">
              📚
            </span>
            <span className="folder-name">All documents</span>
            <span className="folder-count">{counts.all}</span>
          </button>

          <p className="sidebar-heading">Categories</p>

          {folders.map((folder) => (
            <div key={folder.id} className="folder-row">
              <button
                type="button"
                className={`folder-item ${activeFolderId === folder.id ? 'is-active' : ''}`}
                onClick={() => select(folder.id)}
              >
                <span className="folder-emoji" aria-hidden="true">
                  {folder.emoji ?? '📁'}
                </span>
                <span className="folder-name">{folder.name}</span>
                <span className="folder-count">{counts[folder.id] ?? 0}</span>
              </button>
              <div className="folder-actions">
                <button
                  type="button"
                  className="icon-button small"
                  title={`Rename ${folder.name}`}
                  aria-label={`Rename ${folder.name}`}
                  onClick={() => setRenaming(folder)}
                >
                  ✏️
                </button>
                {folder.locked ? null : (
                  <button
                    type="button"
                    className="icon-button small"
                    title={`Delete ${folder.name}`}
                    aria-label={`Delete ${folder.name}`}
                    onClick={() => setDeleting(folder)}
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}

          {counts.uncategorised > 0 ? (
            <button
              type="button"
              className={`folder-item ${activeFolderId === 'none' ? 'is-active' : ''}`}
              onClick={() => select('none')}
            >
              <span className="folder-emoji" aria-hidden="true">
                🗂️
              </span>
              <span className="folder-name">No category</span>
              <span className="folder-count">{counts.uncategorised}</span>
            </button>
          ) : null}

          <button type="button" className="add-folder" onClick={() => setIsAdding(true)}>
            ＋ New category
          </button>
        </nav>

        <div className="sidebar-footer">
          <ProfileSwitcher />
          <p className="sidebar-note">
            Everything is saved on this device only — nothing leaves your browser.
          </p>
        </div>
      </aside>

      {isOpen ? <div className="sidebar-scrim" onClick={onClose} /> : null}

      {isAdding ? (
        <PromptDialog
          title="New category"
          label="Category name"
          placeholder="e.g. Dorm Research"
          confirmLabel="Create"
          onConfirm={(name) => {
            if (name.trim()) createFolder(name);
          }}
          onClose={() => setIsAdding(false)}
        />
      ) : null}

      {renaming ? (
        <PromptDialog
          title="Rename category"
          label="Category name"
          initialValue={renaming.name}
          onConfirm={(name) => renameFolder(renaming.id, name)}
          onClose={() => setRenaming(null)}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={`Delete "${deleting.name}"?`}
          message="The category disappears but the documents inside it stay — they move to “No category”."
          confirmLabel="Delete category"
          onConfirm={() => {
            deleteFolder(deleting.id);
            if (activeFolderId === deleting.id) onSelectFolder(null);
          }}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </>
  );
}
