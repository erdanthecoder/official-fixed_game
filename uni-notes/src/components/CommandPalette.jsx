/**
 * One box that finds anything.
 *
 * Ctrl+K — or the search button in the sidebar — and every document in every
 * app is one or two letters away, alongside the apps themselves and the things
 * you can do. This is the piece the Workspace apps do not have: Docs searches
 * Docs, Sheets searches Sheets, and finding a spreadsheet from inside a
 * document means going back to Drive first. Uni holds all six kinds, so it can
 * simply answer.
 *
 * Three decisions worth stating, because they are what separate a palette that
 * gets used from one that gets closed again:
 *
 * 1. Subsequence matching, not substring. Typing "uct" finds "University
 *    Comparison Table". Nobody remembers the beginning of a title; they
 *    remember its shape.
 * 2. Scoring, not filtering. Everything that matches is ranked — word starts
 *    beat mid-word hits, recent documents beat old ones — so the right answer
 *    is first rather than merely present.
 * 3. It opens with something in it. Empty, it shows what you had open recently,
 *    because the most likely thing you want is the thing you just left.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from './ui/Icon.jsx';
import ProductIcon, { PRODUCTS } from './brand/ProductIcon.jsx';
import { titleOf } from '../lib/model.js';
import { useData } from '../context/DataContext.jsx';
import { useT } from '../i18n/index.jsx';

/** Which module owns each collection, and which icon to show for it. */
const SOURCES = [
  ['notes', 'notes'],
  ['sheets', 'sheets'],
  ['presentations', 'slides'],
  ['boards', 'canvas'],
  ['plans', 'tasks'],
  ['vocabDecks', 'languages'],
];

const JUMPS = ['notes', 'sheets', 'slides', 'canvas', 'tasks', 'unisave', 'languages', 'apps', 'settings'];

/**
 * How well does `query` match `text`?
 *
 * Returns 0 for no match, higher is better. The letters of the query must
 * appear in order but need not be adjacent, which is what makes "uct" find
 * "University Comparison Table"; a letter that lands at the start of a word
 * scores far more than one in the middle, which is what stops "at" matching
 * every title that happens to contain those letters somewhere.
 */
export function score(query, text) {
  if (!query) return 1;
  const q = query.toLowerCase();
  const t = (text ?? '').toLowerCase();
  if (!t) return 0;

  let total = 0;
  let at = 0;
  let streak = 0;

  for (const letter of q) {
    const found = t.indexOf(letter, at);
    if (found === -1) return 0;
    const startsWord = found === 0 || /[\s\-_/(]/.test(t[found - 1]);
    total += startsWord ? 12 : 3;
    // Consecutive letters are a stronger signal than scattered ones.
    streak = found === at ? streak + 1 : 0;
    total += streak * 4;
    at = found + 1;
  }
  // A short title that matched is a better answer than a long one that also did.
  return total + Math.max(0, 24 - t.length) / 4;
}

export default function CommandPalette({ open, onClose, onGo, onOpenItem }) {
  const { t } = useT();
  const data = useData();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCursor(0);
    // The next frame, because the dialog is still animating in and focusing a
    // moving element makes some browsers scroll to it.
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  /** Everything findable, gathered once. */
  const everything = useMemo(() => {
    const items = [];
    for (const [collection, module] of SOURCES) {
      for (const doc of data[collection] ?? []) {
        items.push({
          id: `${collection}:${doc.id}`,
          kind: 'document',
          module,
          docId: doc.id,
          title: titleOf(doc, t('common.untitled')),
          hint: t(PRODUCTS[module]?.labelKey ?? 'nav.notes'),
          at: doc.updatedAt ?? 0,
        });
      }
    }
    for (const module of JUMPS) {
      items.push({
        id: `go:${module}`,
        kind: 'jump',
        module,
        title: t(PRODUCTS[module]?.labelKey ?? `nav.${module}`),
        hint: t('palette.openApp'),
        at: 0,
      });
    }
    return items;
  }, [data, t]);

  const results = useMemo(() => {
    if (!query.trim()) {
      // Nothing typed: the things most recently worked on, then the apps.
      const recent = everything
        .filter((i) => i.kind === 'document')
        .sort((a, b) => b.at - a.at)
        .slice(0, 5);
      const apps = everything.filter((i) => i.kind === 'jump').slice(0, 6);
      return [...recent, ...apps];
    }
    return everything
      .map((item) => ({ item, s: score(query.trim(), item.title) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s || b.item.at - a.item.at)
      .slice(0, 12)
      .map((r) => r.item);
  }, [everything, query]);

  useEffect(() => setCursor(0), [query]);

  const choose = useCallback(
    (item) => {
      if (!item) return;
      onClose();
      if (item.kind === 'jump') onGo(item.module);
      else onOpenItem(item.module, item.docId);
    },
    [onClose, onGo, onOpenItem],
  );

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown' || (event.key === 'n' && event.ctrlKey)) {
      event.preventDefault();
      setCursor((c) => (results.length ? (c + 1) % results.length : 0));
    } else if (event.key === 'ArrowUp' || (event.key === 'p' && event.ctrlKey)) {
      event.preventDefault();
      setCursor((c) => (results.length ? (c - 1 + results.length) % results.length : 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(results[cursor]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    listRef.current?.children[cursor]?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!open) return null;

  return (
    <div className="palette-overlay" onMouseDown={onClose} role="presentation">
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label={t('palette.title')}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="palette-field">
          <Icon name="search" size={18} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('palette.placeholder')}
            aria-label={t('palette.title')}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="palette-esc">esc</kbd>
        </div>

        {results.length ? (
          <ul className="palette-list" ref={listRef} role="listbox">
            {results.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === cursor}
                  className={`palette-row${index === cursor ? ' is-cursor' : ''}`}
                  onMouseEnter={() => setCursor(index)}
                  onClick={() => choose(item)}
                >
                  <ProductIcon product={item.module} size={22} />
                  <span className="palette-text">
                    <strong>{item.title}</strong>
                    <small>{item.hint}</small>
                  </span>
                  {index === cursor ? <Icon name="forward" size={16} /> : null}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="palette-empty">{t('palette.nothing', { query })}</p>
        )}
      </div>
    </div>
  );
}
