/**
 * Boards for Kadam Canvas.
 *
 * A board is `{ title, background, shapes: [...] }`. Every shape is plain data,
 * never pixels, which is the decision the whole module rests on:
 *
 *   · it syncs — a board is a few kilobytes of JSON, so it travels through the
 *     same document pipeline as a note and two accounts can hold one board
 *   · it survives — a reload replays the same shapes; nothing is rasterised,
 *     so nothing is ever lost to a resize
 *   · it scales — the board renders as SVG, so it is sharp on a phone, on a
 *     laptop and in a printout
 *
 * Coordinates are in board units on a fixed 1600 × 1000 field. The view scales
 * that field to whatever space it is given, so a board drawn on a tablet opens
 * identically on a laptop.
 */

import { createId } from '../ids.js';

export const BOARD_WIDTH = 1600;
export const BOARD_HEIGHT = 1000;

/** Ink colours. Deliberately few — a diagram with nine colours says nothing. */
export const INKS = [
  { id: 'ink', value: '#12263a', labelKey: 'canvas.inkInk' },
  { id: 'lake', value: '#1a73e8', labelKey: 'canvas.inkLake' },
  { id: 'green', value: '#0f9d58', labelKey: 'canvas.inkGreen' },
  { id: 'sun', value: '#e8a020', labelKey: 'canvas.inkSun' },
  { id: 'red', value: '#c5372c', labelKey: 'canvas.inkRed' },
  { id: 'violet', value: '#8430ce', labelKey: 'canvas.inkViolet' },
];

export const WIDTHS = [
  { id: 'fine', value: 3, labelKey: 'canvas.widthFine' },
  { id: 'medium', value: 6, labelKey: 'canvas.widthMedium' },
  { id: 'bold', value: 11, labelKey: 'canvas.widthBold' },
];

export const BACKGROUNDS = [
  { id: 'plain', labelKey: 'canvas.backgroundPlain' },
  { id: 'grid', labelKey: 'canvas.backgroundGrid' },
  { id: 'dots', labelKey: 'canvas.backgroundDots' },
  { id: 'lines', labelKey: 'canvas.backgroundLines' },
];

export const TOOLS = [
  { id: 'pen', icon: 'pen', labelKey: 'canvas.toolPen' },
  { id: 'line', icon: 'line', labelKey: 'canvas.toolLine' },
  { id: 'arrow', icon: 'arrowTool', labelKey: 'canvas.toolArrow' },
  { id: 'rect', icon: 'square', labelKey: 'canvas.toolRect' },
  { id: 'ellipse', icon: 'circle', labelKey: 'canvas.toolEllipse' },
  { id: 'text', icon: 'text', labelKey: 'canvas.toolText' },
  { id: 'eraser', icon: 'eraser', labelKey: 'canvas.toolEraser' },
];

export function makeShape(type, fields) {
  return { id: createId('shape'), type, ...fields };
}

/** True if a shape ended up too small to be anything but a stray click. */
export function isDegenerate(shape) {
  if (!shape) return true;
  if (shape.type === 'pen') return (shape.points?.length ?? 0) < 4;
  if (shape.type === 'text') return !String(shape.text ?? '').trim();
  if (shape.type === 'rect' || shape.type === 'ellipse') {
    return Math.abs(shape.w) < 6 || Math.abs(shape.h) < 6;
  }
  return Math.hypot(shape.x2 - shape.x1, shape.y2 - shape.y1) < 6;
}

/**
 * Rectangles and ellipses are drawn from wherever the drag started, so width
 * and height can be negative. Normalise before rendering or hit-testing.
 */
export function normaliseBox(shape) {
  return {
    x: shape.w < 0 ? shape.x + shape.w : shape.x,
    y: shape.h < 0 ? shape.y + shape.h : shape.y,
    w: Math.abs(shape.w),
    h: Math.abs(shape.h),
  };
}

/** Distance from a point to a line segment — the eraser's hit test. */
function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/**
 * Does the eraser at (px, py) touch this shape?
 *
 * Outlines are tested against their edges rather than their fill, so you can
 * erase a big rectangle by crossing its border instead of having to find the
 * one pixel the renderer considers "inside". Text is the exception: it is
 * tested against a box, because chasing individual glyph outlines is not
 * worth it and nobody expects to erase the hole in an "o".
 */
export function hitsShape(shape, px, py, radius) {
  switch (shape.type) {
    case 'pen': {
      const points = shape.points ?? [];
      for (let i = 0; i + 3 < points.length; i += 2) {
        const d = distanceToSegment(px, py, points[i], points[i + 1], points[i + 2], points[i + 3]);
        if (d <= radius + (shape.width ?? 4) / 2) return true;
      }
      return false;
    }

    case 'line':
    case 'arrow':
      return (
        distanceToSegment(px, py, shape.x1, shape.y1, shape.x2, shape.y2) <=
        radius + (shape.width ?? 4) / 2
      );

    case 'rect': {
      const box = normaliseBox(shape);
      const edges = [
        [box.x, box.y, box.x + box.w, box.y],
        [box.x + box.w, box.y, box.x + box.w, box.y + box.h],
        [box.x + box.w, box.y + box.h, box.x, box.y + box.h],
        [box.x, box.y + box.h, box.x, box.y],
      ];
      return edges.some((e) => distanceToSegment(px, py, ...e) <= radius + (shape.width ?? 4) / 2);
    }

    case 'ellipse': {
      const box = normaliseBox(shape);
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      const rx = Math.max(box.w / 2, 1);
      const ry = Math.max(box.h / 2, 1);
      // How far the point is from the outline, in units of "one radius".
      const reach = Math.hypot((px - cx) / rx, (py - cy) / ry);
      const tolerance = (radius + (shape.width ?? 4) / 2) / Math.min(rx, ry);
      return Math.abs(reach - 1) <= tolerance;
    }

    case 'text': {
      const size = shape.size ?? 32;
      const width = String(shape.text ?? '').length * size * 0.55;
      return (
        px >= shape.x - radius &&
        px <= shape.x + width + radius &&
        py >= shape.y - size + -radius &&
        py <= shape.y + size * 0.3 + radius
      );
    }

    default:
      return false;
  }
}

/** A freehand stroke, as an SVG path. Straight segments; the points are dense. */
export function penPath(points) {
  if (!points || points.length < 2) return '';
  let d = `M${points[0]} ${points[1]}`;
  for (let i = 2; i + 1 < points.length; i += 2) d += ` L${points[i]} ${points[i + 1]}`;
  return d;
}

/* ------------------------------- templates -------------------------------- */

const ink = '#12263a';
const lake = '#1a73e8';
const green = '#0f9d58';
const sun = '#e8a020';

function label(x, y, text, colour = ink, size = 30) {
  return makeShape('text', { x, y, text, colour, size });
}

function box(x, y, w, h, colour = ink, width = 6) {
  return makeShape('rect', { x, y, w, h, colour, width });
}

function arrow(x1, y1, x2, y2, colour = ink, width = 6) {
  return makeShape('arrow', { x1, y1, x2, y2, colour, width });
}

/** Three schools side by side, with room to write underneath each. */
function compareSchools() {
  const shapes = [label(560, 110, 'Comparing three schools', ink, 42)];
  const columns = ['School A', 'School B', 'School C'];
  const colours = [lake, green, sun];

  columns.forEach((name, index) => {
    const x = 160 + index * 440;
    shapes.push(box(x, 190, 340, 620, colours[index]));
    shapes.push(label(x + 30, 260, name, colours[index], 36));
    shapes.push(makeShape('line', { x1: x, y1: 300, x2: x + 340, y2: 300, colour: colours[index], width: 3 }));
    ['Course', 'Cost', 'Distance', 'Why me'].forEach((row, rowIndex) => {
      shapes.push(label(x + 30, 380 + rowIndex * 110, row, ink, 26));
    });
  });

  return { background: 'grid', shapes };
}

/** A term on one line, with the four things that have to happen on it. */
function applicationTimeline() {
  const shapes = [
    label(520, 120, 'Application timeline', ink, 42),
    makeShape('line', { x1: 160, y1: 520, x2: 1440, y2: 520, colour: ink, width: 6 }),
  ];

  const stops = [
    { at: 260, title: 'Shortlist', when: 'September' },
    { at: 620, title: 'Essay draft', when: 'November' },
    { at: 980, title: 'Tests', when: 'December' },
    { at: 1340, title: 'Submit', when: 'January' },
  ];

  stops.forEach((stop, index) => {
    const colour = [lake, green, sun, '#c5372c'][index];
    shapes.push(makeShape('ellipse', { x: stop.at - 22, y: 498, w: 44, h: 44, colour, width: 6 }));
    // Alternate above and below the line so the labels never collide.
    const above = index % 2 === 0;
    shapes.push(
      makeShape('line', {
        x1: stop.at,
        y1: above ? 498 : 542,
        x2: stop.at,
        y2: above ? 420 : 620,
        colour,
        width: 3,
      }),
    );
    // Title above the month in both directions, so the pairs read the same way
    // whichever side of the line they sit on.
    shapes.push(label(stop.at - 100, above ? 350 : 680, stop.title, colour, 32));
    shapes.push(label(stop.at - 100, above ? 390 : 720, stop.when, ink, 24));
  });

  return { background: 'plain', shapes };
}

/** One idea in the middle, five branches out. For planning an essay. */
function essayMap() {
  const shapes = [
    makeShape('ellipse', { x: 640, y: 420, w: 320, h: 170, colour: lake, width: 8 }),
    label(700, 520, 'My essay', lake, 38),
  ];

  const branches = [
    { x: 240, y: 200, text: 'The story' },
    { x: 1120, y: 200, text: 'What I learned' },
    { x: 180, y: 760, text: 'Why it matters' },
    { x: 1160, y: 760, text: 'What changed' },
    { x: 700, y: 860, text: 'The ending' },
  ];

  branches.forEach((branch, index) => {
    const colour = [green, sun, '#8430ce', '#c5372c', ink][index];
    shapes.push(box(branch.x, branch.y - 60, 300, 110, colour));
    shapes.push(label(branch.x + 24, branch.y + 12, branch.text, colour, 28));
    shapes.push(
      arrow(
        branch.x + 150,
        branch.y < 500 ? branch.y + 50 : branch.y - 60,
        800,
        branch.y < 500 ? 420 : 590,
        colour,
        3,
      ),
    );
  });

  return { background: 'dots', shapes };
}

export const BOARD_TEMPLATES = [
  {
    id: 'compare-schools',
    shape: 'split',
    labelKey: 'templates.compareBoard',
    hintKey: 'templates.compareBoardHint',
    icon: 'tabs',
    build: compareSchools,
  },
  {
    id: 'timeline',
    shape: 'split',
    labelKey: 'templates.timelineBoard',
    hintKey: 'templates.timelineBoardHint',
    icon: 'calendar',
    build: applicationTimeline,
  },
  {
    id: 'essay-map',
    shape: 'split',
    labelKey: 'templates.essayBoard',
    hintKey: 'templates.essayBoardHint',
    icon: 'essay',
    build: essayMap,
  },
];

export function blankBoard() {
  return { background: 'grid', shapes: [] };
}
