import { useEffect, useRef, useState } from 'react';
import { formatRelativeDate } from '../../lib/text.js';
import { useT } from '../../i18n/index.jsx';

/**
 * One dashboard card, shared by Notes, Sheets, Slides and Languages.
 *
 * `thumb` lets each module draw its own preview (text lines, a mini grid, a
 * slide, a card count) while everything else — title, meta line, ⋮ menu —
 * stays consistent.
 */
export default function ItemCard({ title, meta, preview, thumb, tag, accent, onOpen, actions = [] }) {
  const { t } = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [menuOpen]);

  return (
    <article className="doc-card" style={accent ? { '--card-accent': accent } : undefined}>
      <button type="button" className="doc-card-main" onClick={onOpen} aria-label={`${t('common.open')} ${title}`}>
        {thumb ? <span className="doc-card-thumb-wrap">{thumb}</span> : null}
        <h3 className="doc-card-title">{title}</h3>
        {preview ? <p className="doc-card-preview">{preview}</p> : null}
        <div className="doc-card-meta">{meta}</div>
        {tag ? <span className="doc-card-tag">{tag}</span> : null}
      </button>

      {actions.length > 0 ? (
        <div className="doc-card-menu" ref={menuRef}>
          <button
            type="button"
            className="icon-button"
            aria-label={`${t('common.more')} — ${title}`}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            ⋮
          </button>
          {menuOpen ? (
            <div className="menu-popover" role="menu">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  role="menuitem"
                  className={action.danger ? 'danger-item' : undefined}
                  onClick={() => {
                    setMenuOpen(false);
                    action.run();
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

/** Shared "Edited 3 hours ago" fragment. */
export function EditedMeta({ timestamp, extra }) {
  const { t } = useT();
  return (
    <>
      <span>{t('common.edited', { when: formatRelativeDate(timestamp, t) })}</span>
      {extra ? (
        <>
          <span className="dot" aria-hidden="true">
            ·
          </span>
          <span>{extra}</span>
        </>
      ) : null}
    </>
  );
}
