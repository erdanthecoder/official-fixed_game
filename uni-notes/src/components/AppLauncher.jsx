/**
 * The nine dots, and the app grid they open.
 *
 * This replaces the old vertical list of modules in the sidebar. A list of
 * eight items took the whole left column and had to be read top to bottom every
 * time; a 3×3 grid is one glance, and it hands the sidebar back to the thing
 * that actually changes while you work — your categories.
 *
 * The dots are not decoration. They are laid out on the same 3×3 grid as the
 * tiles they open, and on opening each dot travels to the tile that takes its
 * place, so the button visibly *becomes* the grid rather than being a button
 * that happens to sit next to one.
 *
 * Closing plays the animation in reverse, which is why this holds a `phase`
 * rather than a boolean: React would unmount the panel the instant a boolean
 * flipped, and there would be nothing left to animate out.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import ProductIcon, { PRODUCTS } from './brand/ProductIcon.jsx';
import { useT } from '../i18n/index.jsx';

/** Row-major, so index 0..8 maps to the dot in the same position. */
export const LAUNCHER_APPS = [
  'home',
  'notes',
  'sheets',
  'slides',
  'canvas',
  'tasks',
  'unisave',
  'languages',
  'apps',
];

const DOTS = [0, 1, 2].flatMap((row) => [0, 1, 2].map((column) => ({ row, column })));

const EXIT_MS = 180;

/** The button. Nine dots on the same grid as the panel behind them. */
function LauncherButton({ open, onToggle, label }) {
  return (
    <button
      type="button"
      className={`launcher-button ${open ? 'is-open' : ''}`}
      aria-label={label}
      aria-expanded={open}
      aria-haspopup="menu"
      onClick={onToggle}
    >
      <span className="launcher-dots" aria-hidden="true">
        {DOTS.map((dot) => (
          <i key={`${dot.row}-${dot.column}`} />
        ))}
      </span>
    </button>
  );
}

export default function AppLauncher({ active, onPick, className = '' }) {
  const { t } = useT();
  const [phase, setPhase] = useState('closed'); // closed | opening | closing
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const closeTimer = useRef(null);

  const open = phase === 'opening';

  const close = useCallback(() => {
    setPhase((current) => (current === 'opening' ? 'closing' : current));
  }, []);

  // One timer, cleared on every phase change, so a fast open-close-open cannot
  // leave a stale timeout that closes the panel a moment after it reopened.
  useEffect(() => {
    clearTimeout(closeTimer.current);
    if (phase !== 'closing') return undefined;
    closeTimer.current = setTimeout(() => setPhase('closed'), EXIT_MS);
    return () => clearTimeout(closeTimer.current);
  }, [phase]);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
        buttonRef.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Move focus into the grid so the keyboard can reach it, but only once the
  // panel is actually there.
  useEffect(() => {
    if (!open) return;
    const first = panelRef.current?.querySelector('.launcher-tile.is-active, .launcher-tile');
    first?.focus();
  }, [open]);

  /** Arrow keys walk the grid three at a time, because it is three wide. */
  const onGridKey = (event) => {
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 }[event.key];
    if (!step) return;
    event.preventDefault();
    const tiles = [...panelRef.current.querySelectorAll('.launcher-tile')];
    const index = tiles.indexOf(document.activeElement);
    const next = tiles[Math.min(tiles.length - 1, Math.max(0, index + step))];
    next?.focus();
  };

  return (
    <div className={`launcher ${className}`} ref={buttonRef}>
      <LauncherButton
        open={open}
        label={t('nav.switcher')}
        onToggle={() => setPhase(open ? 'closing' : 'opening')}
      />

      {phase === 'closed' ? null : (
        <div
          className={`launcher-overlay ${phase === 'closing' ? 'is-closing' : ''}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            className="launcher-panel"
            ref={panelRef}
            role="menu"
            aria-label={t('nav.switcher')}
            onKeyDown={onGridKey}
          >
            <p className="launcher-heading">{t('nav.switcher')}</p>

            <div className="launcher-grid">
              {LAUNCHER_APPS.map((product, index) => (
                <button
                  key={product}
                  type="button"
                  role="menuitem"
                  className={`launcher-tile ${active === product ? 'is-active' : ''}`}
                  // The stagger is what makes it read as nine dots unfolding
                  // rather than one box appearing. Row-major, 26ms apart.
                  style={{ '--stagger': `${index * 26}ms`, '--tile-accent': PRODUCTS[product].colour }}
                  onClick={() => {
                    onPick(product);
                    close();
                  }}
                >
                  <ProductIcon product={product} size={44} variant="solid" />
                  <strong>{t(PRODUCTS[product].labelKey)}</strong>
                  {PRODUCTS[product].hintKey ? (
                    <small>{t(PRODUCTS[product].hintKey)}</small>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
