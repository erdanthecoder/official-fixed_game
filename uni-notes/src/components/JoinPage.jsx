/**
 * What someone sees when they open an invite link.
 *
 * This is the one screen a complete stranger reaches, so it has to work from
 * every starting state: signed out, signed in as the wrong account, already a
 * member, link revoked, link expired. It sits outside the app shell for that
 * reason — there is no sidebar to show someone who has no documents yet.
 *
 * The code is put aside the moment this page opens, because signing in takes
 * it away otherwise: the hash becomes #/signin, and on Safari the page reloads
 * outright. Somebody who opens a link while signed out signs in, comes back
 * here by themselves, and joins without ever having to find the link again.
 * See lib/pendingJoin.js.
 */

import { useEffect, useRef, useState } from 'react';
import Icon from './ui/Icon.jsx';
import Logo from './brand/Logo.jsx';
import Scenery from './Scenery.jsx';
import TipLine from './TipLine.jsx';
import { AUTH_STATUS, useAuth } from '../context/AuthContext.jsx';
import { LINK_ERROR, areLinksAvailable, joinWithCode } from '../lib/inviteLinks.js';
import { forgetJoin, rememberJoin } from '../lib/pendingJoin.js';
import { useT } from '../i18n/index.jsx';

const ERROR_KEYS = {
  [LINK_ERROR.notConfigured]: 'join.errorNoAccount',
  [LINK_ERROR.needSignIn]: 'join.errorSignIn',
  [LINK_ERROR.notFound]: 'join.errorNoLink',
  [LINK_ERROR.expired]: 'join.errorExpired',
  [LINK_ERROR.alreadyMember]: 'join.alreadyIn',
  [LINK_ERROR.failed]: 'join.errorFailed',
};

export default function JoinPage({ code, onOpenDocument, onGoHome, onSignIn }) {
  const { t } = useT();
  const { user, status } = useAuth();

  const [phase, setPhase] = useState('idle'); // idle | joining | done | error
  const [errorKey, setErrorKey] = useState(null);
  const attempted = useRef(null);

  const signedIn = status === AUTH_STATUS.signedIn;

  // Before anything else, and before anyone is asked to sign in.
  useEffect(() => {
    if (code) rememberJoin(code);
  }, [code]);

  // Join once, automatically, as soon as there is an account to join as.
  // Guarded by the code rather than a boolean so that arriving back from
  // sign-in with a *different* link still runs.
  useEffect(() => {
    if (!code || !signedIn || attempted.current === code) return;
    attempted.current = code;
    setPhase('joining');

    joinWithCode({ code, user })
      .then((result) => {
        forgetJoin();
        setPhase('done');
        // A beat on the confirmation, so it doesn't flash past unread.
        setTimeout(() => onOpenDocument(result.docId), 900);
      })
      .catch((error) => {
        if (error?.code === LINK_ERROR.alreadyMember && error.docId) {
          forgetJoin();
          setPhase('done');
          setTimeout(() => onOpenDocument(error.docId), 900);
          return;
        }
        // A link that failed is not worth carrying into the next sign-in.
        forgetJoin();
        setErrorKey(ERROR_KEYS[error?.code] ?? 'join.errorFailed');
        setPhase('error');
      });
  }, [code, signedIn, user, onOpenDocument]);

  const body = () => {
    if (!areLinksAvailable) {
      return <p className="join-note">{t('join.errorNoAccount')}</p>;
    }

    if (!signedIn) {
      return (
        <>
          <p className="join-note">{t('join.signInFirst')}</p>
          <button type="button" className="button primary big" onClick={onSignIn}>
            {t('auth.signIn')}
            <Icon name="forward" size={17} />
          </button>
        </>
      );
    }

    if (phase === 'joining' || phase === 'idle') {
      return (
        <p className="join-note">
          <span className="saving-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          {t('join.joining')}
        </p>
      );
    }

    if (phase === 'done') {
      return (
        <p className="join-note is-good">
          <Icon name="circleCheck" size={18} className="done-icon" />
          {t('join.joined')}
        </p>
      );
    }

    return (
      <>
        <p className="join-note is-bad" role="alert">
          <Icon name="warning" size={17} className="notice-icon" />
          {t(errorKey ?? 'join.errorFailed')}
        </p>
        <button type="button" className="button ghost big" onClick={onGoHome}>
          {t('join.goHome')}
        </button>
      </>
    );
  };

  return (
    <div className="join-page">
      <Scenery slot="signIn" className="join-scene" overlay />

      <div className="join-card">
        <Logo variant="stacked" size={54} sub={t('common.tagline')} wordTone="ink" />

        <h1>{t('join.title')}</h1>
        <p className="join-lede">{t('join.body')}</p>

        {body()}

        <TipLine />
      </div>
    </div>
  );
}
