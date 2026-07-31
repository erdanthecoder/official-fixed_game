/**
 * The Uni logo, as a system.
 *
 * ── The idea ──────────────────────────────────────────────────────────────
 * Motorsport logotypes: a heavy oblique letterform with the air still coming
 * off it. Speed, drawn rather than described.
 *
 * This is an original mark in that tradition — the letterforms, the slant, the
 * bar geometry and the colour are all ours. Borrowing a *genre* is what design
 * traditions are for; copying a specific famous mark would make Uni look like a
 * knock-off of someone else's brand, which is the opposite of the point.
 *
 * ── The letterforms ───────────────────────────────────────────────────────
 * A bold geometric sans, drawn on a 64-unit cap height and then sheared 12°.
 * Sheared, not "italic": a true italic redraws the letters, an oblique leans
 * the ones you have, and a logotype is one drawn object rather than a font — so
 * the oblique is both honest and consistent.
 *
 *   U   stems 14, outer bowl r23, inner r9 — 23 − 9 = 14, so the weight holds
 *       constant all the way round the turn
 *   n   stems 12, outer arch r20, inner r8 — same trick, same weight
 *   i   stem 12, and the dot is a parallelogram rather than a square, so it
 *       leans with everything else instead of sitting upright looking dropped
 *
 * ── The speed bars ────────────────────────────────────────────────────────
 * Three bars, thickest and longest at the top, each fading out to the left.
 * They live on the *mark* only, never on the mark and the wordmark at once:
 * repeated in a lockup they stop reading as motion and start reading as noise.
 *
 * Their size is set by the smallest place they appear. One pixel at favicon
 * size is four units on this grid, so the bars are 6 units thick — a pixel and
 * a half at 16px, which survives. Thinner and they turn to grey mush; the
 * three-thin-bars version was tried and did exactly that.
 *
 * ── The lockups ───────────────────────────────────────────────────────────
 *   mark        the tile alone: favicons, avatars, tight chrome
 *   horizontal  mark + wordmark on one line: headers, sidebars
 *   stacked     mark above a centred wordmark: covers, empty canvases
 *
 * `sub` sets the line beneath the wordmark — a product name ("Notes") or the
 * tagline. That stays live text: it is the part that gets translated.
 *
 * ── Tones ─────────────────────────────────────────────────────────────────
 *   tile   full colour on the deep lake tile — the default, and the only
 *          version an app launcher should ever get
 *   light  no tile, white into amber — for dark or photographic surfaces
 *   ink    no tile, lake-blue into amber — for light surfaces, where a wash
 *          starting at white would begin by being invisible
 *
 * public/icon.svg carries the same geometry for browsers and launchers, which
 * cannot read a React component. If you change a number here, change it there.
 */

const SHEAR = 12;

/* Letterforms, unsheared, on a 64 cap height. */
const GLYPH = {
  U: 'M0 0 L0 41 A23 23 0 0 0 46 41 L46 0 L32 0 L32 41 A9 9 0 0 1 14 41 L14 0 Z',
  n: 'M0 64 L0 44 A20 20 0 0 1 40 44 L40 64 L28 64 L28 44 A8 8 0 0 0 12 44 L12 64 Z',
  i: 'M0 24 L12 24 L12 64 L0 64 Z',
  iDot: 'M2 4 L14 4 L10 16 L-2 16 Z',
};

/** x, y, width, height — tuned against 16px, see the note above. */
const BARS = [
  [8, 19, 16, 6],
  [8, 29, 13, 6],
  [8, 39, 10, 6],
];

let seq = 0;

function Defs({ id, tone }) {
  const onLight = tone === 'ink';
  return (
    <defs>
      <linearGradient id={`${id}-tile`} x1="0.12" y1="0" x2="0.88" y2="1">
        <stop offset="0%" stopColor="#17739B" />
        <stop offset="52%" stopColor="#0B4265" />
        <stop offset="100%" stopColor="#04203A" />
      </linearGradient>

      {/* The light raked across the letter, as before — it is the one thing
          carried over from the previous mark, because it was the good part. */}
      <linearGradient id={`${id}-ink`} x1="0.1" y1="0" x2="0.85" y2="1">
        {onLight ? (
          <>
            <stop offset="0%" stopColor="#0B4265" />
            <stop offset="48%" stopColor="#1B7FA8" />
            <stop offset="100%" stopColor="#E4801A" />
          </>
        ) : (
          <>
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="42%" stopColor="#FFF1D6" />
            <stop offset="76%" stopColor="#FDBB5A" />
            <stop offset="100%" stopColor="#E4801A" />
          </>
        )}
      </linearGradient>

      {/* Bars fade out backwards, so they read as air left behind rather than
          as three stripes someone put there. */}
      <linearGradient id={`${id}-speed`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#FDBB5A" stopOpacity="0" />
        <stop offset="100%" stopColor="#FDBB5A" />
      </linearGradient>

      <radialGradient id={`${id}-sheen`} cx="0.5" cy="0" r="0.9">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.16" />
        <stop offset="62%" stopColor="#FFFFFF" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

export function LogoMark({ size = 40, tone = 'tile', className = '' }) {
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
      <Defs id={id} tone={tone} />

      {onTile ? (
        <>
          <rect width="64" height="64" rx="14.5" fill={`url(#${id}-tile)`} />
          <rect width="64" height="64" rx="14.5" fill={`url(#${id}-sheen)`} />
        </>
      ) : null}

      {BARS.map(([x, y, w, h]) => (
        <rect
          key={y}
          x={x}
          y={y}
          width={w}
          height={h}
          rx={h / 2}
          fill={`url(#${id}-speed)`}
        />
      ))}

      <g transform="translate(26 16) scale(0.53)">
        <g transform={`skewX(-${SHEAR}) translate(6 0)`}>
          <path d={GLYPH.U} fill={`url(#${id}-ink)`} />
        </g>
      </g>
    </svg>
  );
}

/**
 * "Uni", drawn.
 *
 * Height-driven rather than width-driven: `size` is the cap height in pixels
 * and the width follows, which is how a logotype behaves when it sits next to
 * text set at a known size.
 */
export function UniWordmark({ size = 22, tone = 'ink', className = '' }) {
  const id = `uni-word-${(seq += 1)}`;
  const fill = `url(#${id}-ink)`;

  return (
    <svg
      // Bounds include the shear: at the baseline every glyph has moved left by
      // 64·tan(12°) ≈ 13.6 units, so the box starts negative.
      viewBox="-15 0 134 66"
      height={size * (66 / 64)}
      className={`logo-lettering ${className}`}
      role="img"
      aria-label="Uni"
    >
      <Defs id={id} tone={tone} />
      <g transform={`skewX(-${SHEAR})`}>
        <path d={GLYPH.U} fill={fill} />
        <g transform="translate(54 0)">
          <path d={GLYPH.n} fill={fill} />
        </g>
        <g transform="translate(104 0)">
          <path d={GLYPH.i} fill={fill} />
          <path d={GLYPH.iDot} fill="#E4801A" />
        </g>
      </g>
    </svg>
  );
}

export function Wordmark({ sub = null, tone = 'ink', size = 22, className = '' }) {
  return (
    <span className={`logo-word is-${tone} ${className}`}>
      <UniWordmark size={size} tone={tone} />
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
      {/* The wordmark is set to about two-thirds of the mark, which is where a
          cap height sits against a square tile without either one shouting. */}
      <Wordmark sub={sub} tone={wordTone} size={Math.round(size * 0.62)} />
    </span>
  );
}
