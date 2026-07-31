/**
 * The Uni logo, as a system.
 *
 * ── The mark ──────────────────────────────────────────────────────────────
 * A letter U holding a sun: the basin of Issyk-Kul with the sun sitting in it.
 *
 * Everything is drawn on a 64-unit grid and every coordinate lands on a whole
 * unit, so the mark stays crisp when it is scaled to 16, 32, 192 or 512.
 *
 *   outer walls   x 15 → 49   (34 wide)
 *   inner counter x 24 → 40   (16 wide)
 *   wall weight   9 units, constant — the outer bowl radius is 17 and the
 *                 inner is 8, and 17 − 8 = 9, so the curve never thins
 *   sun          r 8, centred on the bowl's own centre (32, 31)
 *
 * That last number is the whole idea. The counter is exactly 16 units across
 * and the sun is exactly 16 units across, so the sun drops into the U and
 * settles against it on three sides. Nothing floats, and there is no gap
 * anywhere in the mark.
 *
 * Which matters more than it sounds: a gap of two or three units disappears
 * below one pixel at favicon size, and a mark that relies on one turns to mush
 * at 16px. Contact survives every size. Above the sun the counter stays open —
 * eight units of sky — and that is what keeps the U readable as a letter.
 *
 * ── The lockups ───────────────────────────────────────────────────────────
 *   mark        the tile alone: favicons, avatars, tight chrome
 *   horizontal  mark + wordmark on one line: headers, sidebars
 *   stacked     mark above a centred wordmark: covers, empty canvases
 *
 * The wordmark is live text in the display serif rather than an outlined path,
 * so it stays selectable, translatable and sharp at any zoom. `sub` sets the
 * line beneath it — a product name ("Notes") or the tagline.
 *
 * Clear space is enforced in CSS at 25% of the mark's height on every side.
 * Nothing is allowed inside it.
 *
 * ── Tones ─────────────────────────────────────────────────────────────────
 *   tile   full colour on the deep-blue tile — the default, and the only
 *          version an app launcher should ever get
 *   light  tile removed, U in white — for dark or photographic surfaces
 *   ink    tile removed, U in deep blue — for light surfaces and print
 *
 * public/icon.svg carries the same geometry for browsers and launchers, which
 * cannot read a React component. If you change a number here, change it there.
 */

/** Outer wall, down the left, round the bowl, up the right, back through the counter. */
const U_PATH =
  'M15 15 L15 31 A17 17 0 0 0 49 31 L49 15 L40 15 L40 31 A8 8 0 0 1 24 31 L24 15 Z';

const U_INK = '#0B4265';

let seq = 0;

export function LogoMark({ size = 40, tone = 'tile', className = '' }) {
  // Gradient ids have to be unique per instance or a second logo on the page
  // inherits the first one's fills.
  const id = `uni-mark-${(seq += 1)}`;
  const onTile = tone === 'tile';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`logo-mark ${className}`}
      role="img"
      aria-label="Uni"
    >
      <defs>
        <linearGradient id={`${id}-tile`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#125E86" />
          <stop offset="55%" stopColor="#0B4265" />
          <stop offset="100%" stopColor="#062B44" />
        </linearGradient>
        <linearGradient id={`${id}-u`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#D8ECF6" />
        </linearGradient>
        <linearGradient id={`${id}-sun`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD089" />
          <stop offset="100%" stopColor="#E98C2C" />
        </linearGradient>
        {/* A single soft highlight from above, so the tile has depth without
            looking like it was rendered in 2009. */}
        <radialGradient id={`${id}-sheen`} cx="0.5" cy="0.02" r="0.85">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.16" />
          <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      {onTile ? (
        <>
          <rect width="64" height="64" rx="14.5" fill={`url(#${id}-tile)`} />
          <rect width="64" height="64" rx="14.5" fill={`url(#${id}-sheen)`} />
        </>
      ) : null}

      <circle cx="32" cy="31" r="8" fill={`url(#${id}-sun)`} />
      <path
        d={U_PATH}
        fill={onTile ? `url(#${id}-u)` : tone === 'ink' ? U_INK : '#FFFFFF'}
      />
    </svg>
  );
}

/** "Uni", plus an optional second line. Text, not outlines. */
export function Wordmark({ sub = null, tone = 'ink', className = '' }) {
  return (
    <span className={`logo-word is-${tone} ${className}`}>
      <strong>Uni</strong>
      {sub ? <small>{sub}</small> : null}
    </span>
  );
}

export default function Logo({
  variant = 'horizontal',
  size = 34,
  tone = 'tile',
  wordTone = 'ink',
  sub = null,
  className = '',
}) {
  if (variant === 'mark') {
    return <LogoMark size={size} tone={tone} className={className} />;
  }

  return (
    <span className={`logo is-${variant} ${className}`}>
      <LogoMark size={size} tone={tone} />
      <Wordmark sub={sub} tone={wordTone} />
    </span>
  );
}
