/**
 * Turning selected text into a link.
 *
 * A popover rather than `window.prompt`, which is what most rich-text editors
 * reach for. A native prompt is a browser dialog with the site's address in the
 * title bar — the single most website-looking thing an app can put on screen —
 * and on Android it is a system alert that steals focus and loses the
 * selection. This keeps both the look and the selection.
 *
 * Keeping the selection is the whole difficulty. Clicking anything outside the
 * editor collapses it, so `createLink` would have nothing to wrap. The range is
 * captured on mousedown, before focus moves, and restored before the command
 * runs.
 */

import { useEffect, useRef, useState } from 'react';
import Icon from '../../ui/Icon.jsx';
import { useT } from '../../../i18n/index.jsx';

export default function LinkButton({ label, onApply, onRemove }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const savedRange = useRef(null);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  /*
   * Ctrl+Shift+K from inside the editor. The editor cannot reach into this
   * component, and threading a ref up through the toolbar for one shortcut
   * would be a lot of wiring for a single message — so it announces, and this
   * listens.
   */
  useEffect(() => {
    const onAsk = () => {
      const selection = window.getSelection();
      savedRange.current =
        selection && selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
      setOpen(true);
    };
    document.addEventListener('uni:link', onAsk);
    return () => document.removeEventListener('uni:link', onAsk);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    const onOutside = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const restore = () => {
    const range = savedRange.current;
    if (!range) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const apply = () => {
    const raw = value.trim();
    if (!raw) return;
    // Someone typing "ox.ac.uk" means https. Without this the browser resolves
    // it against the app's own address and produces a link to nowhere.
    const url = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
    restore();
    onApply(url);
    setValue('');
    setOpen(false);
  };

  return (
    <span className="link-tool" ref={wrapRef}>
      <button
        type="button"
        className={`tool-button ${open ? 'is-active' : ''}`}
        title={label}
        aria-label={label}
        aria-expanded={open}
        onMouseDown={(event) => {
          // Before focus leaves the editor, which is the only moment the
          // selection still exists.
          event.preventDefault();
          const selection = window.getSelection();
          savedRange.current =
            selection && selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
          setOpen((was) => !was);
        }}
      >
        <span aria-hidden="true">
          <Icon name="link" size={17} />
        </span>
      </button>

      {open ? (
        <div className="link-popover" role="dialog" aria-label={label}>
          <input
            ref={inputRef}
            type="url"
            inputMode="url"
            placeholder={t('notes.linkPlaceholder')}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                apply();
              }
            }}
          />
          <div className="link-popover-actions">
            <button
              type="button"
              className="button ghost tiny"
              onMouseDown={(event) => {
                event.preventDefault();
                restore();
                onRemove();
                setOpen(false);
              }}
            >
              {t('notes.linkRemove')}
            </button>
            <button
              type="button"
              className="button primary tiny"
              onMouseDown={(event) => {
                event.preventDefault();
                apply();
              }}
            >
              {t('common.done')}
            </button>
          </div>
        </div>
      ) : null}
    </span>
  );
}
