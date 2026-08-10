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

export default function DownloadMenu({ formats, label }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const wrap = useRef(null);

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

  const run = async (format) => {
    /*
     * A Word file of a long document takes a moment to build, and a menu that
     * closes with nothing visibly happening reads as a button that did not
     * work. The row says so and the menu stays until it is done.
     */
    setBusy(format.id);
    try {
      await format.run();
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
          <p className="menu-heading">{t('common.downloadAs')}</p>
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
        </div>
      ) : null}
    </div>
  );
}
