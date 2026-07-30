/**
 * The two list icons are drawn rather than typed: the emoji/glyph versions of
 * "bulleted list" render inconsistently across platforms and read as a plain
 * dash on some of them. Everything else in the toolbar is a normal character.
 */

const base = {
  width: 17,
  height: 17,
  viewBox: '0 0 18 18',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  'aria-hidden': true,
  focusable: false,
};

export function BulletListIcon() {
  return (
    <svg {...base}>
      <circle cx="2.6" cy="4" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="2.6" cy="9" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="2.6" cy="14" r="1.1" fill="currentColor" stroke="none" />
      <line x1="6.4" y1="4" x2="15.4" y2="4" />
      <line x1="6.4" y1="9" x2="15.4" y2="9" />
      <line x1="6.4" y1="14" x2="15.4" y2="14" />
    </svg>
  );
}

export function NumberListIcon() {
  return (
    <svg {...base}>
      <text
        x="0.6"
        y="5.6"
        fontSize="5.6"
        fill="currentColor"
        stroke="none"
        fontFamily="inherit"
        fontWeight="600"
      >
        1
      </text>
      <text
        x="0.6"
        y="11"
        fontSize="5.6"
        fill="currentColor"
        stroke="none"
        fontFamily="inherit"
        fontWeight="600"
      >
        2
      </text>
      <text
        x="0.6"
        y="16.4"
        fontSize="5.6"
        fill="currentColor"
        stroke="none"
        fontFamily="inherit"
        fontWeight="600"
      >
        3
      </text>
      <line x1="6.6" y1="4" x2="15.4" y2="4" />
      <line x1="6.6" y1="9.3" x2="15.4" y2="9.3" />
      <line x1="6.6" y1="14.6" x2="15.4" y2="14.6" />
    </svg>
  );
}
