import { useState } from 'react';
import Icon from './ui/Icon.jsx';
import AppIcon from './brand/AppIcon.jsx';
import LanguagePicker from './LanguagePicker.jsx';
import ProductIcon, { PRODUCTS } from './brand/ProductIcon.jsx';
import Scenery from './Scenery.jsx';
import TipLine from './TipLine.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useT } from '../i18n/index.jsx';

const MODULES = ['notes', 'sheets', 'slides', 'unisave', 'ai', 'languages'];

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18z"
      />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

/**
 * Sign in, sign up, or reset a password — one card, three modes.
 *
 * Google first because it's one tap and most people here have an account;
 * email underneath for everyone who doesn't, or doesn't want to use it.
 */
export default function AuthScreen({ onBack }) {
  const { t } = useT();
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    clearMessages,
    busy,
    errorKey,
    noticeKey,
    isFirebaseConfigured,
  } = useAuth();

  const [mode, setMode] = useState('signIn'); // signIn | signUp | reset
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState(null);

  const switchMode = (next) => {
    setMode(next);
    setLocalError(null);
    clearMessages();
  };

  const submit = (event) => {
    event.preventDefault();
    setLocalError(null);

    if (!email.trim()) {
      setLocalError('auth.errorNoEmail');
      return;
    }
    if (mode === 'reset') {
      resetPassword(email);
      return;
    }
    if (password.length < 6) {
      setLocalError('auth.errorWeakPassword');
      return;
    }
    if (mode === 'signUp') signUpWithEmail(email, password, name);
    else signInWithEmail(email, password);
  };

  const message = localError ?? errorKey;

  return (
    <div className="auth-screen">
      {/* Left: the reason to bother signing in at all. */}
      <aside className="auth-aside">
        <Scenery slot="signIn" className="auth-scene" overlay />
        <div className="auth-aside-inner">
          <a className="auth-brand" href="#/">
            <AppIcon size={38} />
            <span>
              <strong>{t('common.appName')}</strong>
              <small>{t('common.tagline')}</small>
            </span>
          </a>

          <h2>{t('auth.heroTitle')}</h2>
          <ul className="auth-modules">
            {MODULES.map((product) => (
              <li key={product}>
                <ProductIcon product={product} size={26} />
                <span>
                  <strong>{t(PRODUCTS[product].labelKey)}</strong>
                  <small>{t(PRODUCTS[product].hintKey)}</small>
                </span>
              </li>
            ))}
          </ul>

          <TipLine className="on-dark" />
        </div>
      </aside>

      {/* Right: the actual form. */}
      <main className="auth-main">
        <div className="auth-card">
          <button type="button" className="auth-back" onClick={onBack}>
            <Icon name="back" size={16} />
            {t('auth.backHome')}
          </button>

          <h1>
            {mode === 'signUp'
              ? t('auth.createTitle')
              : mode === 'reset'
                ? t('auth.resetTitle')
                : t('auth.signInTitle')}
          </h1>
          <p className="auth-sub">
            {mode === 'signUp'
              ? t('auth.createSub')
              : mode === 'reset'
                ? t('auth.resetSub')
                : t('auth.signInSub')}
          </p>

          {!isFirebaseConfigured ? (
            <div className="auth-offline">
              <strong>{t('auth.offlineTitle')}</strong>
              <p>{t('auth.offlineBody')}</p>
              <button type="button" className="button primary block" onClick={onBack}>
                {t('auth.continueOffline')}
              </button>
            </div>
          ) : (
            <>
              {mode !== 'reset' ? (
                <>
                  <button
                    type="button"
                    className="google-button"
                    onClick={signInWithGoogle}
                    disabled={busy}
                  >
                    <GoogleMark />
                    {busy ? t('auth.signingIn') : t('auth.signInWithGoogle')}
                  </button>

                  <div className="auth-or">
                    <span>{t('auth.or')}</span>
                  </div>
                </>
              ) : null}

              <form className="auth-form" onSubmit={submit} noValidate>
                {mode === 'signUp' ? (
                  <label className="field">
                    <span>{t('auth.yourName')}</span>
                    <input
                      type="text"
                      value={name}
                      autoComplete="name"
                      placeholder={t('auth.namePlaceholder')}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </label>
                ) : null}

                <label className="field">
                  <span>{t('auth.email')}</span>
                  <input
                    type="email"
                    value={email}
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>

                {mode !== 'reset' ? (
                  <label className="field">
                    <span>{t('auth.password')}</span>
                    <input
                      type="password"
                      value={password}
                      autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                      placeholder={mode === 'signUp' ? t('auth.passwordHint') : '••••••••'}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </label>
                ) : null}

                {message ? (
                  <p className="auth-error" role="alert">
                    {t(message)}
                  </p>
                ) : null}
                {noticeKey ? <p className="auth-notice">{t(noticeKey)}</p> : null}

                <button type="submit" className="button primary block" disabled={busy}>
                  {busy
                    ? t('auth.working')
                    : mode === 'signUp'
                      ? t('auth.createAccount')
                      : mode === 'reset'
                        ? t('auth.sendReset')
                        : t('auth.signIn')}
                </button>
              </form>

              <div className="auth-switch">
                {mode === 'signIn' ? (
                  <>
                    <button type="button" onClick={() => switchMode('signUp')}>
                      {t('auth.needAccount')}
                    </button>
                    <button type="button" onClick={() => switchMode('reset')}>
                      {t('auth.forgot')}
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => switchMode('signIn')}>
                    {t('auth.haveAccount')}
                  </button>
                )}
              </div>

              <p className="auth-privacy">{t('auth.privacy')}</p>
            </>
          )}

          <div className="auth-language">
            <LanguagePicker compact />
          </div>
        </div>
      </main>
    </div>
  );
}
