import LanguagePicker from './LanguagePicker.jsx';
import Icon from './ui/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useT } from '../i18n/index.jsx';

export default function SettingsPage() {
  const { t } = useT();
  const { user, isCloud, isFirebaseConfigured, signOut } = useAuth();
  const { exportAll, storageMode } = useData();

  const download = () => {
    const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `uni-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

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

      <section className="settings-card">
        <h2>{t('settings.data')}</h2>
        <p className="settings-hint">{t('settings.exportHint')}</p>
        <button type="button" className="button ghost" onClick={download}>
          <Icon name="download" size={17} />
          {t('settings.exportData')}
        </button>
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
    </div>
  );
}
