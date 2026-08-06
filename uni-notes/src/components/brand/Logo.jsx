/**
 * The Kadam logo, as a system.
 *
 * ── The idea ──────────────────────────────────────────────────────────────
 * Kadam — кадам — is "step" in Kyrgyz, and a Kyrgyz word deserves a Kyrgyz
 * mark rather than a borrowed one. This replaces an earlier mark drawn after
 * motorsport logotypes: a sheared letter with speed bars behind it. That was a
 * good mark for a different name. Left under this one it would have read as
 * fancy dress.
 *
 * So the mark is built the way a shyrdak is — the felt panel in every Kyrgyz
 * house. A bordered field, flat appliqué colour, and the figure mirrored about
 * a centre line:
 *
 *   · the field is felt cream, keylined in madder red — the panel edge
 *   · above and below the letter, кочкор мүйүз, the ram's horn: two mirrored
 *     spirals with a short bar between them. It is the commonest motif in
 *     Kyrgyz ornament and the one that stands for increase and good fortune
 *   · the K is black and upright. A leaning letter inside an ornament built on
 *     symmetry fights the thing it is sitting in
 *
 * One horn is drawn once; every other piece is that path rotated or reflected,
 * which is also how the real thing is cut out of felt.
 *
 * Nothing here reproduces a state emblem or anyone's protected design. The
 * ram's horn is common inheritance, drawn fresh on this grid.
 *
 * ── The letterforms ───────────────────────────────────────────────────────
 * A bold geometric sans on a 64-unit cap height.
 *
 *   K   stem 14, arm and leg 14 across the diagonal, inside a 46-unit width.
 *       The junctions sit high — y 25 and 39 — so the counter above the arm
 *       stays open when the icon is sixteen pixels wide. Checked at 16px.
 *
 * ── Size ──────────────────────────────────────────────────────────────────
 * The horns are stroked at 3.2 on this grid, about a pixel at 32px, which
 * holds, and specks below it. Under forty pixels the mark drops the ornament
 * and shows the letter alone: better nothing than ornament rendered badly.
 * The 16 and 32 pixel favicons are rendered the same way.
 *
 * ── The lockups ───────────────────────────────────────────────────────────
 *   mark        the panel alone: favicons, avatars, tight chrome
 *   horizontal  mark + wordmark on one line: headers, sidebars
 *   stacked     mark above a centred wordmark: covers, empty canvases
 *
 * `sub` sets the line beneath the wordmark — a product name ("Notes") or the
 * tagline. That stays live text: it is the part that gets translated.
 *
 * ── Tones ─────────────────────────────────────────────────────────────────
 *   tile   the full panel — the default, and the only version an app launcher
 *          should ever get
 *   ink    no panel, black letter — for light surfaces
 *   light  no panel, cream letter — for dark or photographic surfaces
 *
 * public/icon.svg carries the same geometry for browsers and launchers, which
 * cannot read a React component. If you change a number here, change it there.
 */

/*
 * Felt colours, flat.
 *
 * Kadam is "step" in Kyrgyz, and the mark is built the way a shyrdak is: a
 * bordered panel of felt, appliqué in madder red and ochre on cream. Felt has
 * no gradients, so neither does this — the old mark's four-stop washes were
 * borrowed from motorsport logotypes and would make this one look like a
 * costume.
 */
const CREAM = '#F4E9D8';
const RED = '#A8342A';
const GOLD = '#C9922B';
const BLACK = '#1A1714';

/*
 * кочкор мүйүз — the ram's horn. Two mirrored spirals with a short bar between
 * them: the commonest motif in Kyrgyz ornament, and the one that stands for
 * increase and good fortune. One horn, drawn once, is the whole vocabulary
 * here; every other piece is this path rotated or reflected, which is also how
 * the real thing is cut.
 */
const HORN = 'M0 20 C0 9 6 2 13 2 C19 2 22 7 19 11 C16 14 11 12 12 8';

function HornPair({ x, y, rotate = 0, scale = 0.38, colour = RED }) {
  return (
    <g
      transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale}) translate(-24 -11)`}
      fill="none"
      stroke={colour}
      strokeWidth="3"
      strokeLinecap="round"
    >
      <path d={HORN} />
      <path d={HORN} transform="translate(48 0) scale(-1 1)" />
      <path d="M22 22 L26 22" />
    </g>
  );
}


/* Letterforms, upright, on a 64 cap height. */
const GLYPH = {
  /*
   * K, on the same grid and at the same weight as the U it replaces: stem 14,
   * arm and leg 14 across the diagonal, everything inside the same 46-unit
   * width so the tile composition did not have to move. Drawn as one polygon
   * because a K has no curves — the only judgement in it is where the arm and
   * leg meet the stem, which is set high (y 25 and 39) so the counter above the
   * junction stays open at favicon size. It was checked at 16px before it was
   * kept.
   */
  K: 'M0 0 L14 0 L14 25 L33 0 L46 0 L25 32 L46 64 L31 64 L14 39 L14 64 L0 64 Z',
  U: 'M0 0 L0 41 A23 23 0 0 0 46 41 L46 0 L32 0 L32 41 A9 9 0 0 1 14 41 L14 0 Z',
  n: 'M0 64 L0 44 A20 20 0 0 1 40 44 L40 64 L28 64 L28 44 A8 8 0 0 0 12 44 L12 64 Z',
  i: 'M0 24 L12 24 L12 64 L0 64 Z',
  iDot: 'M2 4 L14 4 L10 16 L-2 16 Z',
};

let seq = 0;

export function LogoMark({ size = 40, tone = 'tile', className = '' }) {
  const onTile = tone === 'tile';
  // Off the panel, the letter takes the colour of the surface it sits on:
  // black on light, cream on dark. The horns stay red either way — it is the
  // one colour in the mark that is not doing contrast, it is doing meaning.
  const letter = onTile || tone === 'ink' ? BLACK : CREAM;

  /*
   * Ornament needs room. The horns are drawn at stroke 3.2 on a 64 grid — about
   * a pixel at 32px, which holds, and specks below it. Under forty pixels the
   * mark drops them and shows the letter alone rather than showing them badly.
   */
  const ornate = size >= 40;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`logo-mark ${className}`}
      role="img"
      aria-label="Kadam"
    >
      {onTile ? (
        <>
          <rect width="64" height="64" rx="14.5" fill={CREAM} />
          {/*
            Two keylines, not one. A shyrdak is bound at the edge — a fine line
            right at the hem and a heavier band inside it. One line reads as a
            box drawn round a letter; two read as a panel that was made.
          */}
          <rect
            x="2.6"
            y="2.6"
            width="58.8"
            height="58.8"
            rx="12.4"
            fill="none"
            stroke={RED}
            strokeWidth="1.1"
          />
          <rect
            x="5.6"
            y="5.6"
            width="52.8"
            height="52.8"
            rx="10"
            fill="none"
            stroke={RED}
            strokeWidth="2.2"
            opacity="0.9"
          />
        </>
      ) : null}

      {ornate ? (
        <>
          <HornPair x={32} y={12.5} scale={0.34} colour={RED} />
          <HornPair x={32} y={51.5} rotate={180} scale={0.34} colour={onTile ? GOLD : RED} />
        </>
      ) : null}

      {/* With the horns, the letter makes room for them. Without, it takes the
          panel — a shrunken K floating in space would just look like a mistake. */}
      <g transform={ornate ? 'translate(21 20) scale(0.40)' : 'translate(19 16) scale(0.53)'}>
        <path d={GLYPH.K} fill={letter} />
      </g>
    </svg>
  );
}

/**
 * "Kadam", set.
 *
 * The K is drawn, because it is the mark and it has to survive being sixteen
 * pixels wide. "adam" is type — Inter at its heaviest, in the same colour, so
 * it belongs to the K without four more letterforms being invented by hand to
 * sit beside it.
 *
 * Upright, like the mark. The twelve-degree lean came from motorsport
 * logotypes and does not belong on a name that now sits inside Kyrgyz
 * ornament, where every line is mirrored about a centre.
 *
 * `textLength` is not decoration: without it the wordmark's width depends on
 * whether a webfont has finished loading, and the lockup would reflow as the
 * page settles.
 *
 * Height-driven rather than width-driven — `size` is the cap height in pixels
 * and the width follows, which is how a logotype behaves next to text set at a
 * known size.
 */
export function KadamWordmark({ size = 22, tone = 'ink', className = '' }) {
  /*
   * The ink tone follows the text around it rather than being the brand black.
   *
   * Hardcoding #1A1714 painted the name in near-black wherever it appeared,
   * which in the dark theme is a black wordmark on a black rail — the logo was
   * simply missing, and the sidebar looked like it had failed to load. The
   * mark on its cream tile still uses the true black; that tile is always
   * cream, so it always can.
   */
  const fill = tone === 'light' ? CREAM : 'currentColor';

  return (
    <svg
      viewBox="-2 0 202 66"
      height={size * (66 / 64)}
      className={`logo-lettering ${className}`}
      role="img"
      aria-label="Kadam"
    >
      <path d={GLYPH.K} fill={fill} />
      {/*
        Stroked as well as filled. Inter at its heaviest still has stems around
        nine units where the drawn K has fourteen, and a wordmark whose first
        letter is visibly fatter than the rest looks like two logos stuck
        together.
      */}
      <text
        x="50"
        y="64"
        fontFamily="Inter, 'Segoe UI', Roboto, system-ui, sans-serif"
        fontWeight="800"
        fontSize="64"
        textLength="144"
        lengthAdjust="spacingAndGlyphs"
        fill={fill}
        stroke={fill}
        strokeWidth="4"
        strokeLinejoin="round"
      >
        adam
      </text>
    </svg>
  );
}

export function Wordmark({ sub = null, tone = 'ink', size = 22, className = '' }) {
  return (
    <span className={`logo-word is-${tone} ${className}`}>
      <KadamWordmark size={size} tone={tone} />
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
