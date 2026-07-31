import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './ui/Icon.jsx';
import Logo from './brand/Logo.jsx';
import ConfirmDialog from './ui/ConfirmDialog.jsx';
import ProductIcon, { PRODUCTS } from './brand/ProductIcon.jsx';
import PromptDialog from './ui/PromptDialog.jsx';
import SaveIndicator from './SaveIndicator.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useT } from '../i18n/index.jsx';

const MODULES = ['notes', 'sheets', 'slides', 'unisave', 'ai', 'languages'];

/** The grid of products, the way a suite offers its apps. */
function AppSwitcher({ active, onPick, onClose }) {
  const { t } = useT();
  const panel = useRef(null);

  useEffect(() => {
    const onOutside = (event) => {
      if (!panel.current?.contains(event.target)) onClose();
    };
    const onEscape = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [onClose]);

  return (
    <div className="switcher-panel" ref={panel} role="menu" aria-label={t('nav.switcher')}>
      {[...MODULES, 'settings'].map((product) => (
        <button
          key={product}
          type="button"
          role="menuitem"
          className={`switcher-item ${active === product ? 'is-active' : ''}`}
          onClick={() => {
            onPick(product);
            onClose();
          }}
        >
          <ProductIcon product={product} size={38} variant="solid" />
          <span>{t(PRODUCTS[product].labelKey)}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Suite navigation. The category list only appears inside Notes, since that's
 * the only module that uses folders.
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

  const [switcherOpen, setSwitcherOpen] = useState(false);
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
          <button type="button" className="brand-home" onClick={onGoHome} title={t('nav.home')}>
            <Logo size={32} sub={t(PRODUCTS[activeModule]?.labelKey ?? 'common.tagline')} />
          </button>

          <div className="switcher-wrap">
            <button
              type="button"
              className={`icon-button switcher-button ${switcherOpen ? 'is-open' : ''}`}
              aria-label={t('nav.switcher')}
              aria-expanded={switcherOpen}
              onClick={() => setSwitcherOpen((open) => !open)}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                {[2, 7.5, 13].map((y) =>
                  [2, 7.5, 13].map((x) => (
                    <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" rx="0.8" fill="currentColor" />
                  )),
                )}
              </svg>
            </button>
            {switcherOpen ? (
              <AppSwitcher
                active={activeModule}
                onPick={pickModule}
                onClose={() => setSwitcherOpen(false)}
              />
            ) : null}
          </div>
        </div>

        <nav className="module-nav" aria-label={t('common.appName')}>
          {MODULES.map((module) => (
            <button
              key={module}
              type="button"
              className={`module-item ${activeModule === module ? 'is-active' : ''}`}
              style={{ '--module-accent': PRODUCTS[module].colour }}
              onClick={() => pickModule(module)}
              aria-current={activeModule === module ? 'page' : undefined}
            >
              <ProductIcon product={module} size={26} />
              <span className="module-text">
                <strong>{t(PRODUCTS[module].labelKey)}</strong>
                <small>{t(PRODUCTS[module].hintKey)}</small>
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
