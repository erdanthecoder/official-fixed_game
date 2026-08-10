/**
 * The bar that appears when something is wrong.
 *
 * Until now the only sign that a save had failed was the word "Couldn't save"
 * in the document header, in the same grey as "Saved" — which is the size of
 * signal you give a detail, not the size you give "your last paragraph is not
 * on the server". And there was nothing to press.
 *
 * Two states, one bar:
 *
 *   offline — the connection is gone. Not an error: everything typed is kept
 *             on the device and goes up on its own when the network returns.
 *             Said calmly, because it is not the person's fault and there is
 *             nothing for them to do.
 *   failed  — writes are being retried on a backoff. There is a button,
 *             because the one thing worse than a failure is a failure you are
 *             told to wait out with no way to hurry it.
 *
 * It sits over the app rather than pushing it down: a bar that reflows the
 * page moves the line you were typing, and losing your place is a worse
 * interruption than the problem being reported.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';
import { SAVE_STATUS, useData } from '../../context/DataContext.jsx';
import { useT } from '../../i18n/index.jsx';

export default function Trouble() {
  const { t } = useT();
  const { saveStatus, retryNow } = useData();
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const failed = saveStatus === SAVE_STATUS.error;
  if (!offline && !failed) return null;

  /*
   * Offline wins when both are true. A failed write while the network is down
   * has one cause and one remedy, and "Try again" is a button that cannot
   * work — offering it would be theatre.
   */
  const kind = offline ? 'offline' : 'failed';

  /*
   * Portalled to the body. The app shell and several editors carry transforms
   * from their entrance animations, and a transformed ancestor becomes the
   * containing block for a fixed element — so a bar meant to be pinned to the
   * bottom of the window would instead pin itself to the bottom of whichever
   * panel it was rendered inside.
   */
  return createPortal(
    <div className={`trouble is-${kind}`} role="status" aria-live="polite">
      <Icon name={offline ? 'cloudOff' : 'warning'} size={18} />
      <p>
        <strong>{t(offline ? 'trouble.offlineTitle' : 'trouble.failedTitle')}</strong>
        <span>{t(offline ? 'trouble.offlineBody' : 'trouble.failedBody')}</span>
      </p>
      {failed && !offline ? (
        <button type="button" className="button ghost tiny" onClick={retryNow}>
          {t('trouble.retry')}
        </button>
      ) : null}
    </div>,
    document.body,
  );
}
