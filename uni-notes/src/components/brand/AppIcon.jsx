/**
 * The Uni mark, inline.
 *
 * Same geometry as public/icon.svg — a heavy U cradling a low sun. Kept in sync
 * by hand; there are only two copies and the file-based one is what browsers
 * and app launchers read.
 *
 * `tone="light"` draws the mark without its tile, for use on a dark surface.
 */
export default function AppIcon({ size = 40, tone = 'tile', className = '' }) {
  const id = `app-icon-${tone}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={`app-icon ${className}`}
      role="img"
      aria-label="Uni"
    >
      <defs>
        <linearGradient id={`${id}-tile`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#125E86" />
          <stop offset="55%" stopColor="#0B4265" />
          <stop offset="100%" stopColor="#062B44" />
        </linearGradient>
        <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#D8ECF6" />
        </linearGradient>
        <linearGradient id={`${id}-sun`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFC978" />
          <stop offset="100%" stopColor="#EE9134" />
        </linearGradient>
      </defs>

      {tone === 'tile' ? <rect width="512" height="512" rx="116" fill={`url(#${id}-tile)`} /> : null}

      <circle cx="256" cy="203" r="42" fill={`url(#${id}-sun)`} />
      <path
        d="M150 140 L150 268 A106 106 0 0 0 362 268 L362 140"
        fill="none"
        stroke={tone === 'tile' ? `url(#${id}-stroke)` : '#FFFFFF'}
        strokeWidth="78"
        strokeLinecap="round"
      />
    </svg>
  );
}
