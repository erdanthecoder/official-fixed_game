/**
 * Find and replace.
 *
 * The one feature whose absence is felt at exactly the wrong moment: the night
 * before a deadline, when a school's name has to change in eleven places
 * because the essay is being reused. Ctrl+F in the browser searches the page
 * and cannot edit it; this searches the document and can.
 *
 * How it finds things without touching the document:
 *
 * Highlighting matches by wrapping them in `<mark>` is the obvious approach and
 * it is a trap — it rewrites the document to show a search result, so every
 * search dirties the file, the save indicator flickers, and an undo after
 * closing the panel takes the highlights out one at a time. Instead the matches
 * are Ranges, and the current one is simply *selected*. The browser draws the
 * selection for free, replacing is `deleteContents` on a range that is already
 * pointing at the right characters, and a search that finds nothing has changed
 * nothing.
 *
 * The text is walked once into a flat string with a map back to the text nodes,
 * so a phrase that straddles a bold word — "the <b>only</b> course" — is still
 * one match. Searching node by node, which is the shortcut, silently misses
 * every one of those.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../ui/Icon.jsx';
import { useT } from '../../../i18n/index.jsx';

/**
 * Flatten an element's text, remembering where each character came from.
 *
 * Returns the whole string plus the pieces, so an index into the string can be
 * turned back into (node, offset) — which is what a Range needs.
 */
function flatten(root) {
  const pieces = [];
  let text = '';
  if (!root) return { text, pieces };

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    pieces.push({ node, start: text.length, length: node.nodeValue.length });
    text += node.nodeValue;
    node = walker.nextNode();
  }
  return { text, pieces };
}

/** The (node, offset) an absolute index falls on. */
function locate(pieces, index) {
  for (const piece of pieces) {
    if (index <= piece.start + piece.length) {
      return { node: piece.node, offset: index - piece.start };
    }
  }
  const last = pieces[pieces.length - 1];
  return last ? { node: last.node, offset: last.length } : null;
}

/** Every match of `query`, as Ranges, in document order. */
export function findRanges(root, query, matchCase) {
  if (!root || !query) return [];
  const { text, pieces } = flatten(root);
  if (!pieces.length) return [];

  const haystack = matchCase ? text : text.toLowerCase();
  const needle = matchCase ? query : query.toLowerCase();

  const out = [];
  let at = haystack.indexOf(needle);
  while (at !== -1) {
    const from = locate(pieces, at);
    const to = locate(pieces, at + needle.length);
    if (from && to) {
      const range = document.createRange();
      try {
        range.setStart(from.node, from.offset);
        range.setEnd(to.node, to.offset);
        out.push(range);
      } catch {
        /* a node moved under us; skip this one rather than fail the search */
      }
    }
    // Step past this match, so "aa" in "aaaa" finds two and not three.
    at = haystack.indexOf(needle, at + needle.length);
  }
  return out;
}

export default function FindReplace({ editorRef, onClose }) {
  const { t } = useT();
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [at, setAt] = useState(0);
  const [count, setCount] = useState(0);
  const fieldRef = useRef(null);

  useEffect(() => {
    fieldRef.current?.focus();
  }, []);

  const ranges = useCallback(
    () => findRanges(editorRef.current?.root?.(), query, matchCase),
    [editorRef, query, matchCase],
  );

  // The count is recomputed on every keystroke; the matches themselves are not
  // kept in state, because the document can change under them and a stale Range
  // is worse than no Range.
  useEffect(() => {
    const found = ranges();
    setCount(found.length);
    setAt((current) => (found.length === 0 ? 0 : Math.min(current, found.length - 1)));
  }, [ranges]);

  const go = (delta) => {
    const found = ranges();
    if (!found.length) return;
    const next = (at + delta + found.length) % found.length;
    setAt(next);
    editorRef.current?.select(found[next]);
  };

  const replaceOne = () => {
    const found = ranges();
    if (!found.length) return;
    const index = Math.min(at, found.length - 1);
    editorRef.current?.replaceRange(found[index], replacement);
    // Re-find rather than reusing the list: every range after the one just
    // edited now points at the wrong characters.
    setTimeout(() => {
      const rest = ranges();
      setCount(rest.length);
      if (rest.length) {
        const nextIndex = Math.min(index, rest.length - 1);
        setAt(nextIndex);
        editorRef.current?.select(rest[nextIndex]);
      }
    }, 0);
  };

  const replaceAll = () => {
    /*
     * Backwards, deliberately. Replacing from the front shifts the text after
     * each edit, so every later range is off by the difference in length —
     * working from the end means nothing before the current match has moved.
     */
    const found = ranges();
    for (let i = found.length - 1; i >= 0; i -= 1) {
      editorRef.current?.replaceRange(found[i], replacement);
    }
    setCount(0);
    setAt(0);
  };

  const label = useMemo(() => {
    if (!query) return '';
    return count === 0 ? t('notes.findNone') : `${at + 1} / ${count}`;
  }, [query, count, at, t]);

  return (
    <div
      className="find-bar"
      role="search"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <div className="find-field">
        <Icon name="search" size={15} />
        <input
          ref={fieldRef}
          value={query}
          placeholder={t('notes.findPlaceholder')}
          aria-label={t('notes.find')}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              go(event.shiftKey ? -1 : 1);
            }
          }}
        />
        <span className="find-count">{label}</span>
      </div>

      <button
        type="button"
        className="icon-button small"
        title={t('notes.findPrev')}
        aria-label={t('notes.findPrev')}
        onClick={() => go(-1)}
      >
        <Icon name="up" size={15} />
      </button>
      <button
        type="button"
        className="icon-button small"
        title={t('notes.findNext')}
        aria-label={t('notes.findNext')}
        onClick={() => go(1)}
      >
        <Icon name="down" size={15} />
      </button>

      <div className="find-field">
        <input
          value={replacement}
          placeholder={t('notes.replacePlaceholder')}
          aria-label={t('notes.replaceWith')}
          onChange={(event) => setReplacement(event.target.value)}
        />
      </div>

      <button type="button" className="button ghost tiny" onClick={replaceOne} disabled={!count}>
        {t('notes.replace')}
      </button>
      <button type="button" className="button ghost tiny" onClick={replaceAll} disabled={!count}>
        {t('notes.replaceAll')}
      </button>

      <label className="find-case">
        <input
          type="checkbox"
          checked={matchCase}
          onChange={(event) => setMatchCase(event.target.checked)}
        />
        {t('notes.matchCase')}
      </label>

      <button
        type="button"
        className="icon-button small"
        title={t('common.close')}
        aria-label={t('common.close')}
        onClick={onClose}
      >
        <Icon name="close" size={15} />
      </button>
    </div>
  );
}
