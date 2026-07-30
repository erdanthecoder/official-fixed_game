import { useMemo, useState } from 'react';
import ConfirmDialog from './ui/ConfirmDialog.jsx';
import PromptDialog from './ui/PromptDialog.jsx';
import SaveIndicator from './SaveIndicator.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useT } from '../i18n/index.jsx';

const MODULE_ITEMS = [
  { id: 'notes', icon: '📝', labelKey: 'nav.notes', hintKey: 'nav.notesHint' },
  { id: 'sheets', icon: '📊', labelKey: 'nav.sheets', hintKey: 'nav.sheetsHint' },
  { id: 'slides', icon: '🖼️', labelKey: 'nav.slides', hintKey: 'nav.slidesHint' },
  { id: 'ai', icon: '✨', labelKey: 'nav.ai', hintKey: 'nav.aiHint' },
  { id: 'languages', icon: '🗣️', labelKey: 'nav.languages', hintKey: 'nav.languagesHint' },
];

/**
 * Suite navigation. The category list only appears inside Notes, since that's
 * the only module that uses folders.
 */
export default function Sidebar({
  activeModule,
  activeFolderId,
  onSelectModule,
  onSelectFolder,
  isOpen,
  onClose,
}) {
  const { t } = useT();
  const { notes, folders, create, update, deleteFolder, storageMode } = useData();
  const { user, signOut, isFirebaseConfigured } = useAuth();

  const [addingFolder, setAddingFolder] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [deletingFolder, setDeletingFolder] = useState(null);

  const counts = useMemo(() => {
    const map = { all: notes.length, uncategorised: 0 };
    notes.forEach((note) => {
      if (!note.folderId) map.uncategorised += 1;
      else map[note.folderId] = (map[note.folderId] ?? 0) + 1;
    });
    return map;
  }, [notes]);

  const pickModule = (module) => {
    onSelectModule(module);
    onClose?.();
  };

  const pickFolder = (folderId) => {
    onSelectFolder(folderId);
    onClose?.();
  };

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'is-open' : ''}`} aria-label={t('common.appName')}>
        <div className="sidebar-brand">
          <span className="sidebar-logo" aria-hidden="true">
            🎓
          </span>
          <div>
            <strong>{t('common.appName')}</strong>
            <small>{t('common.tagline')}</small>
          </div>
        </div>

        <nav className="module-nav" aria-label={t('common.appName')}>
          {MODULE_ITEMS.map((module) => (
            <button
              key={module.id}
              type="button"
              className={`module-item ${activeModule === module.id ? 'is-active' : ''}`}
              onClick={() => pickModule(module.id)}
              aria-current={activeModule === module.id ? 'page' : undefined}
            >
              <span className="module-icon" aria-hidden="true">
                {module.icon}
              </span>
              <span className="module-text">
                <strong>{t(module.labelKey)}</strong>
                <small>{t(module.hintKey)}</small>
              </span>
            </button>
          ))}
        </nav>

        {activeModule === 'notes' ? (
          <nav className="folder-list" aria-label={t('notes.categories')}>
            <p className="sidebar-heading">{t('notes.categories')}</p>

            <button
              type="button"
              className={`folder-item ${activeFolderId === null ? 'is-active' : ''}`}
              onClick={() => pickFolder(null)}
            >
              <span className="folder-emoji" aria-hidden="true">
                📚
              </span>
              <span className="folder-name">{t('notes.allDocs')}</span>
              <span className="folder-count">{counts.all}</span>
            </button>

            {folders
              .slice()
              .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
              .map((folder) => (
                <div key={folder.id} className="folder-row">
                  <button
                    type="button"
                    className={`folder-item ${activeFolderId === folder.id ? 'is-active' : ''}`}
                    onClick={() => pickFolder(folder.id)}
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
                      title={t('common.rename')}
                      aria-label={`${t('common.rename')} ${folder.name}`}
                      onClick={() => setRenamingFolder(folder)}
                    >
                      ✏️
                    </button>
                    {folder.locked ? null : (
                      <button
                        type="button"
                        className="icon-button small"
                        title={t('common.delete')}
                        aria-label={`${t('common.delete')} ${folder.name}`}
                        onClick={() => setDeletingFolder(folder)}
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
                onClick={() => pickFolder('none')}
              >
                <span className="folder-emoji" aria-hidden="true">
                  🗂️
                </span>
                <span className="folder-name">{t('common.noCategory')}</span>
                <span className="folder-count">{counts.uncategorised}</span>
              </button>
            ) : null}

            <button type="button" className="add-folder" onClick={() => setAddingFolder(true)}>
              ＋ {t('notes.newCategory')}
            </button>
          </nav>
        ) : (
          <div className="sidebar-spacer" />
        )}

        <div className="sidebar-footer">
          <button
            type="button"
            className={`module-item compact ${activeModule === 'settings' ? 'is-active' : ''}`}
            onClick={() => pickModule('settings')}
          >
            <span className="module-icon" aria-hidden="true">
              ⚙️
            </span>
            <span className="module-text">
              <strong>{t('nav.settings')}</strong>
            </span>
          </button>

          <div className="account-row">
            {user?.photoURL ? (
              <img className="account-avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="account-avatar placeholder" aria-hidden="true">
                {(user?.name ?? '·').charAt(0).toUpperCase()}
              </span>
            )}
            <div className="account-text">
              <strong>{user?.name ?? t('settings.localOnly')}</strong>
              <small>
                {storageMode === 'cloud' ? user?.email : t('settings.localOnlyHint')}
              </small>
            </div>
            {isFirebaseConfigured && user ? (
              <button
                type="button"
                className="icon-button small"
                title={t('common.signOut')}
                aria-label={t('common.signOut')}
                onClick={signOut}
              >
                ⏏
              </button>
            ) : null}
          </div>

          <div className="sidebar-save">
            <SaveIndicator />
          </div>
        </div>
      </aside>

      {isOpen ? <div className="sidebar-scrim" onClick={onClose} /> : null}

      {addingFolder ? (
        <PromptDialog
          title={t('notes.newCategory')}
          label={t('notes.categoryName')}
          confirmLabel={t('common.create')}
          onConfirm={(name) => {
            if (name.trim()) create('folders', { name: name.trim(), emoji: '📁' }, { idPrefix: 'folder' });
          }}
          onClose={() => setAddingFolder(false)}
        />
      ) : null}

      {renamingFolder ? (
        <PromptDialog
          title={t('notes.renameCategory')}
          label={t('notes.categoryName')}
          initialValue={renamingFolder.name}
          onConfirm={(name) => {
            if (name.trim()) update('folders', renamingFolder.id, { name: name.trim() }, { immediate: true });
          }}
          onClose={() => setRenamingFolder(null)}
        />
      ) : null}

      {deletingFolder ? (
        <ConfirmDialog
          title={t('notes.deleteCategoryTitle', { name: deletingFolder.name })}
          message={t('notes.deleteCategoryBody')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => {
            deleteFolder(deletingFolder.id);
            if (activeFolderId === deletingFolder.id) onSelectFolder(null);
          }}
          onClose={() => setDeletingFolder(null)}
        />
      ) : null}
    </>
  );
}
