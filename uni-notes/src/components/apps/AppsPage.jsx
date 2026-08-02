/**
 * Get Kadam — the page that hands over the installers.
 *
 * The whole design rests on one decision: the device you are reading this on
 * gets its own card, at the top, opened, with the download already visible.
 * Every other platform is still on the page, collapsed underneath. A download
 * page that makes you work out which of five files is yours has failed at the
 * only job it has.
 *
 * The files themselves live on the project's releases page rather than being
 * served from here — see the note in lib/platform.js for why.
 */

import { useState } from 'react';
import Scenery from '../Scenery.jsx';
import Icon from '../ui/Icon.jsx';
import Logo from '../brand/Logo.jsx';
import { useInstall } from '../../hooks/useInstall.js';
import { useStandalone } from '../../hooks/useStandalone.js';
import { detectPlatform, DOWNLOADS, RELEASES } from '../../lib/platform.js';
import { useT } from '../../i18n/index.jsx';

/** One download: what it is, how big, and a button that starts it. */
function Download({ label, hint, size, href, primary }) {
  return (
    <a className={`download-row${primary ? ' is-primary' : ''}`} href={href} download>
      <span className="download-body">
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      <span className="download-action">
        <span className="download-size">{size}</span>
        <Icon name="download" size={18} />
      </span>
    </a>
  );
}

/**
 * A platform. Open when it is the one you are on, a clickable summary when it
 * is not — so the page is short by default but nothing is hidden from someone
 * downloading on a laptop for a phone.
 */
function Platform({ id, icon, title, note, open, onToggle, children }) {
  return (
    <section className={`platform-card${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="platform-head"
        aria-expanded={open}
        aria-controls={`platform-${id}`}
        onClick={onToggle}
      >
        <span className="platform-icon" aria-hidden="true">
          <Icon name={icon} size={20} />
        </span>
        <span className="platform-title">
          <strong>{title}</strong>
          <small>{note}</small>
        </span>
        <Icon name="chevronDown" size={18} className="platform-chevron" />
      </button>
      <div className="platform-body" id={`platform-${id}`} hidden={!open}>
        {children}
      </div>
    </section>
  );
}

export default function AppsPage() {
  const { t } = useT();
  const { canInstall, installed, install } = useInstall();
  const standalone = useStandalone();
  const platform = detectPlatform();

  // Whichever platform this device is starts open. `ios` and `mac` both land on
  // the browser-install card, because there is no file to give them.
  const [openId, setOpenId] = useState(() =>
    platform === 'windows' ? 'windows' : platform === 'android' ? 'android' : 'browser',
  );
  const toggle = (id) => setOpenId((current) => (current === id ? null : id));

  return (
    <div className="apps-page">
      <Scenery slot="unisave" className="module-banner apps-banner">
        <div className="apps-banner-text">
          {/* The stacked lockup, at the one size in the app where the logo is
              the subject rather than a label in a corner. */}
          <Logo variant="stacked" size={56} wordTone="light" sub={t('apps.tagline')} />
          <h1>{t('apps.title')}</h1>
          <p>{t('apps.subtitle')}</p>
        </div>
      </Scenery>

      <div className="apps-body">
        {standalone ? (
          <p className="apps-note">
            <Icon name="circleCheck" size={16} className="done-icon" />
            {t('apps.alreadyInstalled')}
          </p>
        ) : null}

        <Platform
          id="android"
          icon="phone"
          title={t('apps.androidTitle')}
          note={t('apps.androidNote')}
          open={openId === 'android'}
          onToggle={() => toggle('android')}
        >
          <Download
            primary
            label={t('apps.androidDownload')}
            hint={t('apps.androidHint')}
            size={DOWNLOADS.android.size}
            href={DOWNLOADS.android.url}
          />
          <ol className="apps-steps">
            <li>{t('apps.androidStep1')}</li>
            <li>{t('apps.androidStep2')}</li>
            <li>{t('apps.androidStep3')}</li>
          </ol>
        </Platform>

        <Platform
          id="windows"
          icon="monitor"
          title={t('apps.windowsTitle')}
          note={t('apps.windowsNote')}
          open={openId === 'windows'}
          onToggle={() => toggle('windows')}
        >
          <Download
            primary
            label={t('apps.windowsSetup')}
            hint={t('apps.windowsSetupHint')}
            size={DOWNLOADS.windowsSetup.size}
            href={DOWNLOADS.windowsSetup.url}
          />
          <Download
            label={t('apps.windowsPortable')}
            hint={t('apps.windowsPortableHint')}
            size={DOWNLOADS.windowsPortable.size}
            href={DOWNLOADS.windowsPortable.url}
          />
          {/* Said plainly and up front. Someone who meets this warning without
              warning assumes the file is broken and deletes it. */}
          <p className="apps-warning">
            <Icon name="info" size={16} />
            <span>{t('apps.windowsSmartScreen')}</span>
          </p>
        </Platform>

        <Platform
          id="browser"
          icon="globe"
          title={t('apps.browserTitle')}
          note={t('apps.browserNote')}
          open={openId === 'browser'}
          onToggle={() => toggle('browser')}
        >
          <p className="apps-text">{t('apps.browserBody')}</p>
          {canInstall && !installed ? (
            <button type="button" className="button primary" onClick={install}>
              <Icon name="download" size={16} />
              {t('settings.installAction')}
            </button>
          ) : (
            <ol className="apps-steps">
              <li>{t('apps.browserStep1')}</li>
              <li>{t('apps.browserStep2')}</li>
            </ol>
          )}
        </Platform>

        <p className="apps-foot">
          {t('apps.sameAccount')}{' '}
          <a href={RELEASES} target="_blank" rel="noreferrer noopener">
            {t('apps.allFiles')}
            <Icon name="link" size={14} />
          </a>
        </p>
      </div>
    </div>
  );
}
