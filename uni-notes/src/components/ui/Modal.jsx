import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

/**
 * Accessible dialog: Esc closes, backdrop click closes, focus lands inside when
 * it opens and returns to wherever it came from when it shuts.
 *
 * Closing is animated, which takes a little arranging. The parent owns whether
 * this is mounted (`{open ? <Modal/> : null}`), so the dialog cannot delay its
 * own removal — by the time the parent has re-rendered it is already gone. So
 * every close path routes through `requestClose`, which plays the exit and only
 * then tells the parent. The parent unmounts on cue, and neither side needs to
 * know anything about the other's timing beyond this one function.
 */

const EXIT_MS = 140;

export default function Modal({ title, children, onClose, footer, width = 420 }) {
  const panelRef = useRef(null);
  const returnFocusTo = useRef(null);
  const [closing, setClosing] = useState(false);

  const requestClose = useCallback(() => {
    setClosing((already) => {
      if (already) return already; // a second Esc must not queue a second close
      setTimeout(onClose, EXIT_MS);
      return true;
    });
  }, [onClose]);

  useEffect(() => {
    // Remember what had focus, so closing puts it back rather than dropping a
    // keyboard user at the top of the document.
    returnFocusTo.current = document.activeElement;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const focusable = panelRef.current?.querySelector(
      'input, textarea, select, button:not([data-autofocus-skip])',
    );
    focusable?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      returnFocusTo.current?.focus?.();
    };
  }, [requestClose]);

  return (
    <div className={`modal-backdrop ${closing ? 'is-closing' : ''}`} onMouseDown={requestClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxWidth: width }}
        ref={panelRef}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={requestClose} aria-label="Close">
            <Icon name="close" size={17} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
