/**
 * The Uni logo, as a system.
 *
 * ── The mark ──────────────────────────────────────────────────────────────
 * A letter U with the light of the lake pooling in the bottom of it: white at
 * the tips, warming down through gold to amber where the bowl turns. Issyk-Kul
 * at the end of the day, and the app's initial, in one shape.
 *
 * The previous version put a separate amber disc inside the U. Two problems
 * with that, and they are the reasons this exists. A mark made of a letter plus
 * a dot reads as a letter plus a dot — a symbol next to a shape, not one idea.
 * And the disc had to fit *inside* the counter, so the U around it was forced
 * thin and even, which is what made it look like a magnet rather than a letter.
 * Putting the colour into the letterform itself solves both: one silhouette,
 * one idea, and the U is free to be drawn properly.
 *
 * Which is the second half of this. The strokes are modulated the way a real
 * typeface modulates them — heavy stems, a thinner bowl where the curve turns —
 * rather than a single constant width. That contrast is most of what separates
 * a drawn letter from a plotted one.
 *
 * Everything sits on a 64-unit grid and every coordinate lands on a whole unit,
 * so it stays crisp at 16, 32, 192 and 512:
 *
 *   outer walls    x 13 → 51   (38 wide), outer bowl r 19 centred (32, 31)
 *   inner counter  x 25 → 39   (14 wide), inner bowl r 7  centred (32, 36)
 *   stems          12 units    (25 − 13)
 *   bowl bottom     7 units    (50 − 43)
 *
 * The two bowl centres are 5 apart and the radii differ by 12, so the wall
 * tapers smoothly from 12 at the sides to 7 at the base. Both straight walls
 * meet their arcs at the arc's widest point, which is where a vertical line is
 * tangent to a circle — so the join is smooth without needing a curve to fake
 * it. The whole mark sits half a unit above centre, because a U is bottom-heavy
 * and centring it mathematically makes it look like it is sinking.
 *
 * There is no gap anywhere in the mark. That matters more than it sounds: a gap
 * of two or three units falls below one pixel at favicon size, and anything
 * relying on one turns to mush at 16px.
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
 *   tile   the U on the deep lake tile — the default, and the only version an
 *          app launcher should ever get
 *   light  no tile, the same white-to-amber wash — for dark or photographic
 *          surfaces
 *   ink    no tile, lake-blue into amber — for light surfaces and print, where
 *          a wash that starts at white would begin by being invisible
 *
 * public/icon.svg carries the same geometry for browsers and launchers, which
 * cannot read a React component. If you change a number here, change it there.
 */

/** Down the outer wall, round the bowl, up, and back through the counter. */
const U_PATH =
  'M13 13 L13 31 A19 19 0 0 0 51 31 L51 13 L39 13 L39 36 A7 7 0 0 1 25 36 L25 13 Z';

let seq = 0;

export function LogoMark({ size = 40, tone = 'tile', className = '' }) {
  // Gradient ids have to be unique per instance or a second logo on the page
  // inherits the first one's fills.
  const id = `uni-mark-${(seq += 1)}`;
  const onTile = tone === 'tile';
  const onLight = tone === 'ink';

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
        <linearGradient id={`${id}-tile`} x1="0.12" y1="0" x2="0.88" y2="1">
          <stop offset="0%" stopColor="#17739B" />
          <stop offset="52%" stopColor="#0B4265" />
          <stop offset="100%" stopColor="#04203A" />
        </linearGradient>

        {/* The light, raked diagonally so it falls across the letter rather
            than washing straight down it. */}
        <linearGradient id={`${id}-u`} x1="0.18" y1="0" x2="0.78" y2="1">
          {onLight ? (
            <>
              <stop offset="0%" stopColor="#0B4265" />
              <stop offset="46%" stopColor="#1B7FA8" />
              <stop offset="100%" stopColor="#E4801A" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="40%" stopColor="#FFF1D6" />
              <stop offset="74%" stopColor="#FDBB5A" />
              <stop offset="100%" stopColor="#E4801A" />
            </>
          )}
        </linearGradient>

        {/* One soft highlight from above, so the tile has depth without
            looking like it was rendered in 2009. */}
        <radialGradient id={`${id}-sheen`} cx="0.5" cy="0" r="0.9">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.18" />
          <stop offset="62%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      {onTile ? (
        <>
          <rect width="64" height="64" rx="14.5" fill={`url(#${id}-tile)`} />
          <rect width="64" height="64" rx="14.5" fill={`url(#${id}-sheen)`} />
        </>
      ) : null}

      <path d={U_PATH} fill={`url(#${id}-u)`} />
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
