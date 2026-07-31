/**
 * Draws a board.
 *
 * One component renders both the full-size editing surface and the thumbnails
 * on the dashboard, so a card can never disagree with what opening it shows.
 * It is pure: hand it shapes, it draws them, and it holds no state of its own.
 */

import { BOARD_HEIGHT, BOARD_WIDTH, normaliseBox, penPath } from '../../lib/templates/canvas.js';

/** Background patterns, as SVG defs. Ruled paper, without the paper. */
function Backdrop({ id, background }) {
  if (background === 'plain') return <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="#fff" />;

  const pattern =
    background === 'dots' ? (
      <pattern id={id} width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="2" fill="#c8d4de" />
      </pattern>
    ) : background === 'lines' ? (
      <pattern id={id} width="40" height="56" patternUnits="userSpaceOnUse">
        <path d="M0 55.5h40" stroke="#dbe4ec" strokeWidth="1.5" />
      </pattern>
    ) : (
      <pattern id={id} width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M40 0H0v40" fill="none" stroke="#e3eaf1" strokeWidth="1.5" />
      </pattern>
    );

  return (
    <>
      <defs>{pattern}</defs>
      <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="#fff" />
      <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} fill={`url(#${id})`} />
    </>
  );
}

function Shape({ shape }) {
  const stroke = shape.colour ?? '#12263a';
  const strokeWidth = shape.width ?? 6;
  const common = { stroke, strokeWidth, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };

  switch (shape.type) {
    case 'pen':
      return <path d={penPath(shape.points)} {...common} />;

    case 'line':
      return <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} {...common} />;

    case 'arrow': {
      // The head is drawn as two strokes rather than a marker, so it inherits
      // the line's colour and weight without a per-colour marker definition.
      const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
      const head = Math.max(16, strokeWidth * 3.4);
      const spread = 0.42;
      return (
        <g {...common}>
          <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} />
          <path
            d={
              `M${shape.x2 - head * Math.cos(angle - spread)} ${shape.y2 - head * Math.sin(angle - spread)}` +
              ` L${shape.x2} ${shape.y2}` +
              ` L${shape.x2 - head * Math.cos(angle + spread)} ${shape.y2 - head * Math.sin(angle + spread)}`
            }
          />
        </g>
      );
    }

    case 'rect': {
      const box = normaliseBox(shape);
      return <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="10" {...common} />;
    }

    case 'ellipse': {
      const box = normaliseBox(shape);
      return (
        <ellipse
          cx={box.x + box.w / 2}
          cy={box.y + box.h / 2}
          rx={box.w / 2}
          ry={box.h / 2}
          {...common}
        />
      );
    }

    case 'text':
      return (
        <text
          x={shape.x}
          y={shape.y}
          fill={shape.colour ?? '#12263a'}
          fontSize={shape.size ?? 32}
          fontFamily="'Segoe UI', system-ui, -apple-system, sans-serif"
          fontWeight="600"
        >
          {shape.text}
        </text>
      );

    default:
      return null;
  }
}

export default function BoardView({
  shapes = [],
  background = 'grid',
  id = 'board',
  className = '',
  children = null,
  svgRef = null,
  ...rest
}) {
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
      className={`board-view ${className}`}
      preserveAspectRatio="xMidYMid meet"
      {...rest}
    >
      <Backdrop id={`${id}-bg`} background={background} />
      {shapes.map((shape) => (
        <Shape key={shape.id} shape={shape} />
      ))}
      {children}
    </svg>
  );
}
