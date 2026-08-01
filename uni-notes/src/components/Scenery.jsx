/**
 * Issyk-Kul imagery.
 *
 * Each named slot first tries to load a real photograph from
 * `public/images/issyk-kul/<slot>.jpg`. If the file isn't there (or fails to
 * load) it falls back to hand-drawn SVG artwork of the lake and the Tian Shan
 * range, so the app always looks finished.
 *
 * To use real photos: drop correctly-named files into public/images/issyk-kul/
 * — no code change needed. See public/images/README.md.
 */

import { useState } from 'react';

export const SLOTS = {
  signIn: {
    file: 'sunrise.jpg',
    // Dawn over the lake: warm sky, snow peaks catching first light.
    sky: ['#0b2a4a', '#2e5f8a', '#e8a35c', '#f6d3a1'],
    peaks: ['#173355', '#22496e'],
    snow: '#f7e3c8',
    water: ['#123a5c', '#0d2c48'],
    sun: '#ffd9a0',
    stars: true,
  },
  notes: {
    file: 'shore.jpg',
    // Midday: the colour the lake is actually famous for.
    sky: ['#7fc4e8', '#bfe3f4'],
    peaks: ['#5b7f9c', '#7ea3bd'],
    snow: '#ffffff',
    water: ['#1d8fc4', '#0f6d9e'],
    sun: '#fffbe8',
  },
  sheets: {
    file: 'valley.jpg',
    sky: ['#a8d8ea', '#d6ecf5'],
    peaks: ['#6a8f7a', '#89aa8e'],
    snow: '#f4f9f7',
    water: ['#2f9bb5', '#1b7a97'],
    sun: '#ffffff',
  },
  slides: {
    file: 'peaks.jpg',
    sky: ['#12325a', '#3d6a93'],
    peaks: ['#20406a', '#2c5480'],
    snow: '#eaf2fb',
    water: ['#153f63', '#0e2c48'],
    sun: '#cfe4ff',
    stars: true,
  },
  canvas: {
    file: 'bay.jpg',
    // Flat light off the water — a quiet backdrop for a page full of drawing.
    sky: ['#bfe0ea', '#e2f1f5'],
    peaks: ['#5f8b8c', '#7fa6a4'],
    snow: '#f2fafa',
    water: ['#2a9d8f', '#17786f'],
    sun: '#ffffff',
  },
  tasks: {
    file: 'autumn.jpg',
    // Late in the season, which is what a deadline feels like.
    sky: ['#e8b98a', '#f6dcc0'],
    peaks: ['#9a6a55', '#b58a6f'],
    snow: '#fff1e2',
    water: ['#3f8fa8', '#286f88'],
    sun: '#ffe3bd',
  },
  languages: {
    file: 'meadow.jpg',
    sky: ['#f3c48a', '#f8e0c0'],
    peaks: ['#8a6f5c', '#a5866d'],
    snow: '#fff4e4',
    water: ['#4aa3b8', '#2d7f97'],
    sun: '#ffeccb',
  },
};

const PHOTO_BASE = `${import.meta.env.BASE_URL ?? '/'}images/issyk-kul/`;

/** Deterministic pseudo-random so the stars don't jump between renders. */
function starField(count, seed) {
  const stars = [];
  let value = seed;
  for (let i = 0; i < count; i += 1) {
    value = (value * 9301 + 49297) % 233280;
    const x = (value / 233280) * 100;
    value = (value * 9301 + 49297) % 233280;
    const y = (value / 233280) * 100;
    value = (value * 9301 + 49297) % 233280;
    const r = 0.4 + (value / 233280) * 0.8;
    stars.push({ x, y, r });
  }
  return stars;
}

function SceneryArt({ config, slot }) {
  const id = `scenery-${slot}`;
  const stars = config.stars ? starField(38, slot.length * 977) : [];

  return (
    <svg
      className="scenery-art"
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          {config.sky.map((colour, index) => (
            <stop
              key={colour + index}
              offset={`${(index / (config.sky.length - 1)) * 100}%`}
              stopColor={colour}
            />
          ))}
        </linearGradient>
        <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={config.water[0]} />
          <stop offset="100%" stopColor={config.water[1]} />
        </linearGradient>
        <linearGradient id={`${id}-far`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={config.snow} />
          <stop offset="55%" stopColor={config.peaks[1]} />
        </linearGradient>
        <linearGradient id={`${id}-near`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={config.snow} />
          <stop offset="40%" stopColor={config.peaks[0]} />
        </linearGradient>
      </defs>

      <rect width="400" height="240" fill={`url(#${id}-sky)`} />

      {stars.map((star, index) => (
        <circle key={index} cx={star.x * 4} cy={star.y} r={star.r} fill="#ffffff" opacity={0.55} />
      ))}

      <circle cx="302" cy="48" r="15" fill={config.sun} opacity="0.9" />

      {/*
        The horizon sits at the vertical centre on purpose. Wide banners crop
        this SVG to a middle band (preserveAspectRatio slice), so centring the
        shoreline is what keeps both the peaks and the lake in frame.
      */}

      {/* Far range — the high Tian Shan wall across the lake. */}
      <path
        d="M0 112 L34 72 L62 92 L94 58 L122 88 L150 62 L184 94 L212 70 L246 96 L280 72 L314 98 L346 76 L400 108 L400 124 L0 124 Z"
        fill={`url(#${id}-far)`}
      />
      {/* Near range, darker and lower. */}
      <path
        d="M0 124 L42 100 L80 120 L118 96 L162 122 L204 100 L244 124 L290 102 L334 126 L400 104 L400 130 L0 130 Z"
        fill={`url(#${id}-near)`}
        opacity="0.95"
      />

      {/* The lake. */}
      <rect x="0" y="128" width="400" height="112" fill={`url(#${id}-water)`} />
      {/* Reflection of the sun on the water. */}
      <ellipse cx="302" cy="140" rx="15" ry="3" fill={config.sun} opacity="0.4" />
      {[144, 158, 176, 198, 222].map((y, index) => (
        <rect
          key={y}
          x={index % 2 === 0 ? 14 : 98}
          y={y}
          width={index % 2 === 0 ? 152 : 206}
          height="1.5"
          fill="#ffffff"
          opacity={0.17 - index * 0.025}
          rx="0.75"
        />
      ))}
    </svg>
  );
}

/**
 * @param slot   which named scene to show
 * @param className extra classes for the wrapper
 * @param children overlay content (headings, buttons) rendered above the image
 */
export default function Scenery({ slot = 'notes', className = '', children, overlay = true }) {
  const config = SLOTS[slot] ?? SLOTS.notes;
  const [photoFailed, setPhotoFailed] = useState(false);

  return (
    <div className={`scenery ${className}`} data-slot={slot}>
      {photoFailed ? (
        <SceneryArt config={config} slot={slot} />
      ) : (
        <img
          className="scenery-photo"
          src={`${PHOTO_BASE}${config.file}`}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={() => setPhotoFailed(true)}
        />
      )}
      {overlay ? <div className="scenery-veil" /> : null}
      {children ? <div className="scenery-content">{children}</div> : null}
    </div>
  );
}
