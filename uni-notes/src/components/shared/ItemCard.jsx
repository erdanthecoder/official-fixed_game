import { useEffect, useRef, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import ProductIcon from '../brand/ProductIcon.jsx';
import { morphFrom } from '../../lib/morph.js';
import { formatRelativeDate } from '../../lib/text.js';
import { useT } from '../../i18n/index.jsx';

/**
 * One dashboard card, shared by Notes, Sheets, Slides and Languages.
 *
 * `thumb` lets each module draw its own preview (text lines, a mini grid, a
 * slide, a card count) while everything else — title, meta line, ⋮ menu —
 * stays consistent.
 */
export default function ItemCard({
  title,
  meta,
  preview,
  thumb,
  tag,
  tagIcon,
  accent,
  onOpen,
  actions = [],
  view = 'grid',
  product,
}) {
  const { t } = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const cardRef = useRef(null);

  /*
   * Claim the morph before navigating, not after. The browser takes the
   * "before" snapshot the moment the transition starts, so the card has to be
   * wearing the name by then — a frame later is a frame too late.
   */
  const open = () => {
    morphFrom(cardRef.current);
    onOpen?.();
  };

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [menuOpen]);

  /*
   * The list is not a narrow grid.
   *
   * A card stacks — thumbnail, title, snippet, meta — because it is read top to
   * bottom in a column of its own. A row is read left to right against the rows
   * above and below it, so the same facts have to be laid out in columns that
   * line up: name here, category there, edited on the right. Squashing the card
   * markup into a short wide box gives a list where nothing aligns, which is
   * the usual reason a "list view" feels worse than the grid it replaced.
   */
  if (view === 'list') {
    return (
      <article
        ref={cardRef}
        className="doc-row"
        style={accent ? { '--card-accent': accent } : undefined}
      >
        <button
          type="button"
          className="doc-row-main"
          onClick={open}
          aria-label={`${t('common.open')} ${title}`}
        >
          <span className="doc-row-icon" aria-hidden="true">
            <ProductIcon product={product ?? 'notes'} size={30} variant="plain" />
          </span>

          <span className="doc-row-name">
            <strong>{title}</strong>
            {preview ? <span className="doc-row-preview">{preview}</span> : null}
          </span>

          <span className="doc-row-tag">
            {tag ? (
              <span className="doc-card-tag">
                {tagIcon ? <Icon name={tagIcon} size={13} /> : null}
                {tag}
              </span>
            ) : null}
          </span>

          <span className="doc-row-meta">{meta}</span>
        </button>

        {actions.length > 0 ? (
          <div className="doc-card-menu" ref={menuRef}>
            <button
              type="button"
              className="icon-button small"
              aria-label={`${t('common.more')} — ${title}`}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Icon name="more" size={17} />
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

  return (
    <article
      ref={cardRef}
      className="doc-card"
      style={accent ? { '--card-accent': accent } : undefined}
    >
      <button
        type="button"
        className="doc-card-main"
        onClick={open}
        aria-label={`${t('common.open')} ${title}`}
      >
        {thumb ? <span className="doc-card-thumb-wrap">{thumb}</span> : null}
        <h3 className="doc-card-title">{title}</h3>
        {preview ? <p className="doc-card-preview">{preview}</p> : null}
        <div className="doc-card-meta">{meta}</div>
        {tag ? (
          <span className="doc-card-tag">
            {tagIcon ? <Icon name={tagIcon} size={13} /> : null}
            {tag}
          </span>
        ) : null}
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
            <Icon name="more" size={17} />
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
