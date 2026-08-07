import { useRef, useState } from 'react';
import LanguagePicker from './LanguagePicker.jsx';
import Icon from './ui/Icon.jsx';
import ConfirmDialog from './ui/ConfirmDialog.jsx';
import { PRODUCTS } from './brand/ProductIcon.jsx';
import { TEXT_SIZES, THEMES } from '../hooks/useAppearance.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useInstall } from '../hooks/useInstall.js';
import { useT } from '../i18n/index.jsx';

export default function SettingsPage() {
  const { t } = useT();
  const { user, isCloud, isFirebaseConfigured, signOut } = useAuth();
  const { exportAll, importAll, prefs, setPrefs, storageMode } = useData();
  const fileRef = useRef(null);
  const [importing, setImporting] = useState(null);
  const [imported, setImported] = useState(null);
  const [cleared, setCleared] = useState(false);
  const { canInstall, installed, install } = useInstall();

  const download = () => {
    const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `uni-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /*
    Import reads and parses before asking anything, so the confirmation can say
    what is actually in the file. "Are you sure?" is a worse question than
    "merge 14 notes and 3 sheets?".
  */
  const chooseFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const counts = Object.entries(parsed?.collections ?? {})
        .filter(([, value]) => Array.isArray(value) && value.length)
        .map(([key, value]) => `${value.length} ${key}`);
      setImporting({ parsed, summary: counts.join(', ') || t('settings.importEmpty') });
    } catch {
      setImporting({ error: true });
    }
  };

  /*
    Clearing the offline copy, not the data. Everything lives in the account, so
    this is a repair tool for a bad cache rather than a delete button — worth
    saying plainly, because "clear" next to "data" reads as destructive.
  */
  const clearCache = async () => {
    if ('caches' in window) {
      await Promise.all((await caches.keys()).map((key) => caches.delete(key)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    setCleared(true);
    setTimeout(() => window.location.reload(), 700);
  };

  /* The same nine offered on the first-run screen, plus Home — someone who
     chose an app there must be able to change their mind to any of them here,
     and Calendar and Shortlist were missing from this list entirely. */
  const startModules = [
    'home',
    'notes',
    'sheets',
    'slides',
    'canvas',
    'tasks',
    'calendar',
    'shortlist',
    'languages',
    'unisave',
  ];

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1>{t('settings.title')}</h1>
      </header>

      <section className="settings-card">
        <h2>{t('settings.language')}</h2>
        <p className="settings-hint">{t('settings.languageHint')}</p>
        <LanguagePicker />
      </section>

      <section className="settings-card">
        <h2>{t('settings.account')}</h2>
        {isCloud && user ? (
          <>
            <div className="settings-account">
              {user.photoURL ? (
                <img className="account-avatar big" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span className="account-avatar big placeholder" aria-hidden="true">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
              <div>
                <strong>{user.name}</strong>
                <small>{user.email}</small>
              </div>
            </div>
            <p className="settings-hint">{t('settings.accountHint')}</p>
            <button type="button" className="button ghost" onClick={signOut}>
              {t('common.signOut')}
            </button>
          </>
        ) : (
          <>
            <strong>{t('settings.localOnly')}</strong>
            <p className="settings-hint">
              {isFirebaseConfigured ? t('auth.privacy') : t('settings.localOnlyHint')}
            </p>
          </>
        )}
      </section>

      {/*
        Installing is offered here rather than as a banner. Chrome's own
        mini-infobar is suppressed in useInstall, so this is the only invitation
        — and a settings page is where someone goes when they have decided they
        like the thing, which is the right moment to ask.
      */}
      {canInstall || installed ? (
        <section className="settings-card">
          <h2>{t('settings.install')}</h2>
          <p className="settings-hint">
            {installed ? t('settings.installedHint') : t('settings.installHint')}
          </p>
          {installed ? (
            <p className="settings-installed">
              <Icon name="circleCheck" size={17} className="done-icon" />
              {t('settings.installed')}
            </p>
          ) : (
            <button type="button" className="button primary" onClick={install}>
              <Icon name="download" size={16} />
              {t('settings.installAction')}
            </button>
          )}
        </section>
      ) : null}

      <section className="settings-card">
        <h2>{t('settings.appearance')}</h2>

        <p className="settings-hint">{t('settings.themeHint')}</p>
        <div className="theme-choices" role="group" aria-label={t('settings.appTheme')}>
          {THEMES.map((option) => {
            const active = (prefs?.theme ?? 'system') === option.id;
            return (
              <button
                key={option.id}
                type="button"
                className={`theme-choice${active ? ' is-active' : ''}`}
                aria-pressed={active}
                onClick={() => setPrefs({ theme: option.id })}
              >
                {/* A miniature of the app rather than a swatch: a page, a
                    sidebar and a card, so the choice is legible without
                    reading the label. `system` is shown split down the
                    middle, which is the only honest picture of "both". */}
                <span className={`theme-preview is-${option.id}`} aria-hidden="true">
                  <span className="theme-preview-bar" />
                  <span className="theme-preview-card" />
                </span>
                <span className="theme-choice-label">{t(option.labelKey)}</span>
              </button>
            );
          })}
        </div>

        <p className="settings-hint">{t('settings.textSizeHint')}</p>
        <div className="segmented" role="group" aria-label={t('settings.textSize')}>
          {TEXT_SIZES.map((size) => (
            <button
              key={size.id}
              type="button"
              className={(prefs?.textSize ?? 'normal') === size.id ? 'is-active' : ''}
              aria-pressed={(prefs?.textSize ?? 'normal') === size.id}
              onClick={() => setPrefs({ textSize: size.id })}
            >
              {t(size.labelKey)}
            </button>
          ))}
        </div>

        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={prefs?.reduceMotion ?? false}
            onChange={(event) => setPrefs({ reduceMotion: event.target.checked })}
          />
          <span>
            <strong>{t('settings.reduceMotion')}</strong>
            <small>{t('settings.reduceMotionHint')}</small>
          </span>
        </label>
      </section>

      <section className="settings-card">
        <h2>{t('settings.startPage')}</h2>
        <p className="settings-hint">{t('settings.startPageHint')}</p>
        <label className="select-field">
          <span className="sr-only">{t('settings.startPage')}</span>
          <select
            value={prefs?.startModule ?? 'notes'}
            onChange={(event) => setPrefs({ startModule: event.target.value })}
          >
            {startModules.map((module) => (
              <option key={module} value={module}>
                {t(PRODUCTS[module].labelKey)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="settings-card">
        <h2>{t('settings.data')}</h2>
        <p className="settings-hint">{t('settings.exportHint')}</p>
        <div className="settings-actions">
          <button type="button" className="button ghost" onClick={download}>
            <Icon name="download" size={17} />
            {t('settings.exportData')}
          </button>
          <button type="button" className="button ghost" onClick={() => fileRef.current?.click()}>
            <Icon name="up" size={17} />
            {t('settings.importData')}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={chooseFile}
        />
        {imported ? (
          <p className="settings-installed">
            <Icon name="circleCheck" size={17} className="done-icon" />
            {t('settings.imported', { count: imported })}
          </p>
        ) : null}
      </section>

      <section className="settings-card">
        <h2>{t('settings.offline')}</h2>
        <p className="settings-hint">{t('settings.offlineHint')}</p>
        {cleared ? (
          <p className="settings-installed">
            <Icon name="circleCheck" size={17} className="done-icon" />
            {t('settings.cacheCleared')}
          </p>
        ) : (
          <button type="button" className="button ghost" onClick={clearCache}>
            <Icon name="redo" size={17} />
            {t('settings.clearCache')}
          </button>
        )}
      </section>

      <section className="settings-card">
        <h2>{t('settings.photos')}</h2>
        <p className="settings-hint">{t('settings.photosHint')}</p>
      </section>

      <section className="settings-card">
        <h2>{t('settings.about')}</h2>
        <p className="settings-hint">
          {t('common.appName')} · {t('common.tagline')} ·{' '}
          {storageMode === 'cloud' ? 'Firebase' : t('settings.localOnly')}
        </p>
      </section>

      {importing ? (
        <ConfirmDialog
          title={importing.error ? t('settings.importBadFile') : t('settings.importTitle')}
          message={
            importing.error ? t('settings.importBadFileBody') : t('settings.importBody', { what: importing.summary })
          }
          confirmLabel={importing.error ? t('common.done') : t('settings.importConfirm')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => {
            if (importing.error) return;
            setImported(importAll(importing.parsed));
          }}
          onClose={() => setImporting(null)}
        />
      ) : null}
    </div>
  );
}
