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

/*
 * One hour of the day per app.
 *
 * These used to be seven variations on midday, which meant seven blue banners
 * — and since the banner is the biggest block of colour on any screen, the
 * whole suite looked like one app in one colour no matter which one you opened.
 * The water in particular was the same lake blue in all of them, including the
 * ones whose sky was deliberately warm.
 *
 * Now each app gets an hour: Notes at sunset, Sheets in the green of a summer
 * jailoo, Tasks in late autumn, Calendar at last light, Languages at dusk.
 * They share a shape and a range of dyes — madder, saffron, walnut, pasture —
 * so they are visibly a family, but no two are the same colour, and each one
 * is in the same family as its app's accent.
 *
 * Every `water` here is now the colour that hour would actually put on a lake,
 * which is mostly not blue.
 */
export const SLOTS = {
  signIn: {
    file: 'sunrise.jpg',
    // First light: the sky still holds the night, the peaks are already lit.
    sky: ['#2a1a22', '#6b3630', '#c9662f', '#f0b268'],
    peaks: ['#3a231f', '#54332a'],
    snow: '#f7e3c8',
    water: ['#5d3128', '#39201c'],
    sun: '#ffd79a',
    stars: true,
  },
  home: {
    file: 'morning.jpg',
    // Mid-morning, saffron. The screen you open first should look like the
    // start of the day rather than the end of one.
    sky: ['#e8b23c', '#f3d385', '#faeccb'],
    peaks: ['#9a7a2c', '#b89a48'],
    snow: '#fffaeb',
    water: ['#c99a2b', '#966c14'],
    sun: '#fffdf2',
  },
  notes: {
    file: 'shore.jpg',
    // Sunset, madder red — the same dye as the mark.
    sky: ['#a8342a', '#dd7a45', '#f6c98a'],
    peaks: ['#6d2c24', '#8f4231'],
    snow: '#f9e6cd',
    water: ['#b04530', '#7c2620'],
    sun: '#ffe1ae',
  },
  sheets: {
    file: 'valley.jpg',
    // Midsummer on the jailoo: grass all the way to the snowline.
    sky: ['#cfe0a8', '#eef3d6'],
    peaks: ['#4f7a52', '#6f9a68'],
    snow: '#f6faee',
    water: ['#3f8a5c', '#276a44'],
    sun: '#ffffff',
  },
  slides: {
    file: 'peaks.jpg',
    // Late dusk, plum. Dark enough that white type sits on it cleanly, which
    // is what a deck screen needs.
    sky: ['#2b1626', '#5e2f4c', '#8e4a66'],
    peaks: ['#331b2b', '#4a2a3f'],
    snow: '#f0e2ea',
    water: ['#6b3350', '#3f1e30'],
    sun: '#f3c9de',
    stars: true,
  },
  canvas: {
    file: 'bay.jpg',
    // Flat light off the water — the one place the lake is allowed to be the
    // lake, because Canvas is where you draw and the backdrop should be quiet.
    sky: ['#cfe6e3', '#eaf4f2'],
    peaks: ['#5f8b8c', '#7fa6a4'],
    snow: '#f2fafa',
    water: ['#2a9d8f', '#17786f'],
    sun: '#ffffff',
  },
  tasks: {
    file: 'autumn.jpg',
    // Late in the season, which is what a deadline feels like.
    sky: ['#e8a86a', '#f6dcc0'],
    peaks: ['#8f5b40', '#b07a55'],
    snow: '#fff1e2',
    water: ['#b4562e', '#8a3d1f'],
    sun: '#ffe3bd',
  },
  calendar: {
    file: 'lastlight.jpg',
    // The last twenty minutes of the day, burgundy — a month at a time is the
    // view you take when the light is going.
    sky: ['#7a2536', '#c2585c', '#f0a878'],
    peaks: ['#4d1d28', '#6b2c36'],
    snow: '#f7dfd6',
    water: ['#8c2f3e', '#571d28'],
    sun: '#ffd0a4',
  },
  shortlist: {
    file: 'steppe.jpg',
    // Dry olive steppe, the colour of the grass in August when you are
    // deciding where to go.
    sky: ['#d8d69a', '#f1eecb'],
    peaks: ['#6b6b2b', '#8b8a45'],
    snow: '#f8f6e4',
    water: ['#5c6b2b', '#3f4a1c'],
    sun: '#fffce8',
  },
  languages: {
    file: 'meadow.jpg',
    // Dusk over the meadow, berry.
    sky: ['#a63a64', '#e08aa4', '#f6d0c4'],
    peaks: ['#6a2440', '#8b3a58'],
    snow: '#f9e2e8',
    water: ['#9c3a5e', '#66223c'],
    sun: '#ffd9e6',
  },
  unisave: {
    file: 'bronze.jpg',
    // Everything you have made, in bronze: the warmest, quietest hour.
    sky: ['#c78f2c', '#e9c47c', '#f6e4bd'],
    peaks: ['#7a5314', '#9c6f24'],
    snow: '#fdf1d8',
    water: ['#8a5f14', '#5d3f0c'],
    sun: '#fff3d2',
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
