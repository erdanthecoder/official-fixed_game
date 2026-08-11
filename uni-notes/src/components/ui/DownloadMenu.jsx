/**
 * File → Download.
 *
 * The menu is passed a list of formats rather than knowing about documents, so
 * Notes offers Word and Markdown, Sheets offers CSV, and a board offers SVG,
 * without this component learning what any of them are.
 *
 * PDF is deliberately "Print", and it is honest about it: every browser's print
 * dialog has "Save as PDF" in it, the app already has a print stylesheet that
 * reduces the screen to the page, and the alternative is shipping a rendering
 * engine to reproduce something the operating system does better.
 */

import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { useT } from '../../i18n/index.jsx';

/**
 * Can this device hand a file to another app?
 *
 * `canShare` with the actual payload rather than a bare feature check: desktop
 * Chrome has `navigator.share` and refuses files, so testing for the function
 * alone offers a button that fails on exactly the machines least able to
 * explain why.
 */
function canShareFiles(files) {
  try {
    return Boolean(navigator.canShare?.({ files }));
  } catch {
    return false;
  }
}

export default function DownloadMenu({ formats, label }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  /*
   * Send instead of save. Off by default even on a phone: someone who opened a
   * menu called Download is asking for a file, and hijacking that into a share
   * sheet is the kind of helpfulness that loses people their document.
   */
  const [sharing, setSharing] = useState(false);
  const wrap = useRef(null);
  const canShare = typeof navigator !== 'undefined' && Boolean(navigator.canShare);

  useEffect(() => {
    if (!open) return undefined;
    const away = (event) => {
      if (!wrap.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  /**
   * Hand the file to the phone's own share sheet.
   *
   * This is the difference between an installed app and a bookmark on Android:
   * the file goes straight into WhatsApp, Gmail or Drive from here, instead of
   * landing in Downloads for you to go and find. Falls back to a normal
   * download wherever the sheet does not exist, which is most desktops.
   */
  const share = async (format) => {
    if (!format.file) return false;
    try {
      const file = await format.file();
      if (!file || !canShareFiles([file])) return false;
      await navigator.share({ files: [file], title: file.name });
      return true;
    } catch (error) {
      // AbortError is the person closing the sheet — not a failure, and not
      // something to fall back from, or closing it would download the file.
      if (error?.name === 'AbortError') return true;
      console.warn('Share failed; falling back to a download.', error);
      return false;
    }
  };

  const run = async (format) => {
    /*
     * A Word file of a long document takes a moment to build, and a menu that
     * closes with nothing visibly happening reads as a button that did not
     * work. The row says so and the menu stays until it is done.
     */
    setBusy(format.id);
    try {
      const shared = sharing ? await share(format) : false;
      if (!shared) await format.run();
      setOpen(false);
    } catch (error) {
      console.warn(`Export as ${format.id} failed.`, error);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="download-menu" ref={wrap}>
      <button
        type="button"
        className="icon-button"
        title={label ?? t('common.download')}
        aria-label={label ?? t('common.download')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
      >
        <Icon name="download" size={17} />
      </button>

      {open ? (
        <div className="menu-popover download-popover" role="menu">
          <p className="menu-heading">{sharing ? t('common.shareAs') : t('common.downloadAs')}</p>
          {formats.map((format) => (
            <button
              key={format.id}
              type="button"
              role="menuitem"
              disabled={busy !== null}
              onClick={() => run(format)}
            >
              <span className="download-ext">{format.ext}</span>
              <span className="download-label">{format.label}</span>
              {busy === format.id ? <span className="download-busy">…</span> : null}
            </button>
          ))}

          {canShare && formats.some((format) => format.file) ? (
            <label className="download-share">
              <input
                type="checkbox"
                checked={sharing}
                onChange={(event) => setSharing(event.target.checked)}
              />
              {t('common.sendInstead')}
            </label>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
