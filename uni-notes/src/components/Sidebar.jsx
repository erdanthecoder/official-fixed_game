import { useMemo, useState } from 'react';
import AppLauncher from './AppLauncher.jsx';
import Icon from './ui/Icon.jsx';
import Logo from './brand/Logo.jsx';
import ConfirmDialog from './ui/ConfirmDialog.jsx';
import ProductIcon, { PRODUCTS } from './brand/ProductIcon.jsx';
import PromptDialog from './ui/PromptDialog.jsx';
import SaveIndicator from './SaveIndicator.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useT } from '../i18n/index.jsx';

/**
 * Suite navigation.
 *
 * The apps live behind the nine-dot launcher rather than in a list down the
 * side: eight modules took the whole column and had to be re-read every time,
 * and the sidebar is more useful given over to the thing that changes while you
 * work. The category list only appears inside Notes, since that is the only
 * module with folders.
 */
export default function Sidebar({
  activeModule,
  activeFolderId,
  onSelectModule,
  onSelectFolder,
  onGoHome,
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

  // Notes is the only module with categories. Everywhere else the sidebar has
  // nothing left to hold now that the app list has moved into the launcher, so
  // it collapses to a rail rather than standing there as an empty column.
  const showFolders = activeModule === 'notes';

  return (
    <>
      <aside
        className={`sidebar ${isOpen ? 'is-open' : ''} ${showFolders ? '' : 'is-rail'}`}
        aria-label={t('common.appName')}
      >
        <div className="sidebar-brand">
          <button type="button" className="brand-home" onClick={onGoHome} title={t('nav.home')}>
            {showFolders ? (
              <Logo size={32} sub={t(PRODUCTS[activeModule]?.labelKey ?? 'common.tagline')} />
            ) : (
              <Logo variant="mark" size={32} />
            )}
          </button>

          <AppLauncher active={activeModule} onPick={pickModule} />
        </div>

        {showFolders ? (
          <nav className="folder-list" aria-label={t('notes.categories')}>
            <p className="sidebar-heading">{t('notes.categories')}</p>

            <button
              type="button"
              className={`folder-item ${activeFolderId === null ? 'is-active' : ''}`}
              onClick={() => pickFolder(null)}
            >
              <Icon name="library" size={17} className="folder-icon" />
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
                    <Icon name={folder.icon ?? 'folder'} size={17} className="folder-icon" />
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
                      <Icon name="edit" size={15} />
                    </button>
                    {folder.locked ? null : (
                      <button
                        type="button"
                        className="icon-button small"
                        title={t('common.delete')}
                        aria-label={`${t('common.delete')} ${folder.name}`}
                        onClick={() => setDeletingFolder(folder)}
                      >
                        <Icon name="trash" size={15} />
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
                <Icon name="inbox" size={17} className="folder-icon" />
                <span className="folder-name">{t('common.noCategory')}</span>
                <span className="folder-count">{counts.uncategorised}</span>
              </button>
            ) : null}

            <button type="button" className="add-folder" onClick={() => setAddingFolder(true)}>
              <Icon name="plus" size={16} />
              {t('notes.newCategory')}
            </button>
          </nav>
        ) : (
          <div className="sidebar-spacer" />
        )}

        <div className="sidebar-footer">
          <button
            type="button"
            className={`module-item compact ${activeModule === 'settings' ? 'is-active' : ''}`}
            style={{ '--module-accent': PRODUCTS.settings.colour }}
            title={t('nav.settings')}
            aria-label={t('nav.settings')}
            onClick={() => pickModule('settings')}
          >
            <ProductIcon product="settings" size={26} />
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
              <small>{storageMode === 'cloud' ? user?.email : t('settings.localOnlyHint')}</small>
            </div>
            {isFirebaseConfigured && user ? (
              <button
                type="button"
                className="icon-button small"
                title={t('common.signOut')}
                aria-label={t('common.signOut')}
                onClick={signOut}
              >
                <Icon name="leave" size={16} />
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
          cancelLabel={t('common.cancel')}
          onConfirm={(name) => {
            if (name.trim()) create('folders', { name: name.trim(), icon: 'folder' }, { idPrefix: 'folder' });
          }}
          onClose={() => setAddingFolder(false)}
        />
      ) : null}

      {renamingFolder ? (
        <PromptDialog
          title={t('notes.renameCategory')}
          label={t('notes.categoryName')}
          initialValue={renamingFolder.name}
          confirmLabel={t('common.save')}
          cancelLabel={t('common.cancel')}
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
