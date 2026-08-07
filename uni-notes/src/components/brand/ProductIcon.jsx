/**
 * Per-module product icons, in the shape of a suite.
 *
 * Each module owns one colour and one glyph, and uses them everywhere it
 * appears — nav, app switcher, dashboard banner, cards. That consistency is
 * what makes a set of tools read as one product family rather than six
 * unrelated screens.
 *
 * Two variants:
 *   plain — coloured glyph on a soft tinted tile, for the sidebar
 *   solid — white glyph on a full-colour tile, for the app switcher
 */

/*
 * These were Google's colours — #1A73E8, #0F9D58, #E8A020 — and three modules
 * shared a colour with another because there were only so many to borrow. They
 * are now the same ten the stylesheet gives each app, so the icon in the app
 * switcher, the mark at the top of the module and everything the module tints
 * are all one colour, and no two apps are the same one.
 *
 * The values are duplicated here rather than read from the stylesheet on
 * purpose: these are drawn into SVG fills, and a custom property resolved at
 * paint time cannot be handed to a `fill` attribute without the icon flashing
 * black on first render.
 */
export const PRODUCTS = {
  notes: { colour: '#A8342A', soft: '#F6E5E2', labelKey: 'nav.notes', hintKey: 'nav.notesHint' },
  sheets: { colour: '#2F6B4A', soft: '#E2EFE7', labelKey: 'nav.sheets', hintKey: 'nav.sheetsHint' },
  slides: { colour: '#74385C', soft: '#F1E6ED', labelKey: 'nav.slides', hintKey: 'nav.slidesHint' },
  canvas: { colour: '#12707C', soft: '#DDEEF0', labelKey: 'nav.canvas', hintKey: 'nav.canvasHint' },
  tasks: { colour: '#B4562E', soft: '#F8E8E0', labelKey: 'nav.tasks', hintKey: 'nav.tasksHint' },
  calendar: { colour: '#8C2F3E', soft: '#F5E3E6', labelKey: 'nav.calendar', hintKey: 'nav.calendarHint' },
  shortlist: { colour: '#5C6B2B', soft: '#EAEEDD', labelKey: 'nav.shortlist', hintKey: 'nav.shortlistHint' },
  unisave: { colour: '#8A5F14', soft: '#F5EBD8', labelKey: 'nav.unisave', hintKey: 'nav.unisaveHint' },
  languages: { colour: '#A63A64', soft: '#F7E5EC', labelKey: 'nav.languages', hintKey: 'nav.languagesHint' },
  home: { colour: '#B0801B', soft: '#F8EFD9', labelKey: 'nav.home', hintKey: 'nav.homeHint' },
  settings: { colour: '#55504A', soft: '#EDEAE5', labelKey: 'nav.settings', hintKey: null },
  apps: { colour: '#8A5F14', soft: '#F5EBD8', labelKey: 'nav.apps', hintKey: 'nav.appsHint' },
};

export function productColour(product) {
  return PRODUCTS[product]?.colour ?? PRODUCTS.notes.colour;
}

/** The glyphs, drawn on a 24-unit grid so stroke weights stay even. */
function Glyph({ product, colour }) {
  switch (product) {
    case 'sheets':
      // A grid with a filled header row — the shape of a spreadsheet.
      return (
        <>
          <rect x="4" y="4.5" width="16" height="15" rx="2" fill="none" stroke={colour} strokeWidth="1.8" />
          <path d="M4 9.5h16" stroke={colour} strokeWidth="1.8" />
          <path d="M4 14.5h16M9.7 9.5v10M14.3 9.5v10" stroke={colour} strokeWidth="1.3" opacity="0.75" />
        </>
      );

    case 'shortlist':
      // A ranked list: three bars, the top one starred.
      return (
        <>
          <path d="M4.6 7.5h9M4.6 12h12M4.6 16.5h7" stroke={colour} strokeWidth="1.8" strokeLinecap="round" />
          <path
            d="M18 4.4l1.05 2.13 2.35.34-1.7 1.66.4 2.34L18 9.8l-2.1 1.06.4-2.34-1.7-1.66 2.35-.34z"
            fill={colour}
          />
        </>
      );

    case 'calendar':
      // A month: the page, the torn-off header, and two rows of days.
      return (
        <>
          <rect x="4" y="5.5" width="16" height="14" rx="2.5" fill="none" stroke={colour} strokeWidth="1.8" />
          <path d="M4 10h16" stroke={colour} strokeWidth="1.8" />
          <path d="M8.5 3.5v3.6M15.5 3.5v3.6" stroke={colour} strokeWidth="1.8" strokeLinecap="round" />
          <rect x="7" y="12.4" width="3.2" height="3" rx="0.8" fill={colour} opacity="0.9" />
          <rect x="13.8" y="12.4" width="3.2" height="3" rx="0.8" fill={colour} opacity="0.45" />
        </>
      );

    case 'slides':
      // A slide with a title bar and two lines of body.
      return (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke={colour} strokeWidth="1.8" />
          <rect x="6" y="8" width="9" height="2.2" rx="1.1" fill={colour} />
          <path d="M6 13h12M6 16h8" stroke={colour} strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
        </>
      );

    case 'canvas':
      // A nib on a sheet: the board is something you draw on, not type into.
      return (
        <>
          <rect x="3.4" y="4" width="17.2" height="16" rx="2.4" fill="none" stroke={colour} strokeWidth="1.8" />
          <path d="M7.4 15.6 8 12.9l5.2-5.2a1.3 1.3 0 0 1 1.9 0l.6.6a1.3 1.3 0 0 1 0 1.9L10.5 15Z" fill="none" stroke={colour} strokeWidth="1.6" strokeLinejoin="round" />
        </>
      );

    case 'tasks':
      // Ticked boxes over a date: a checklist that knows what day it is.
      return (
        <>
          <rect x="3.6" y="4.6" width="16.8" height="15.4" rx="2.4" fill="none" stroke={colour} strokeWidth="1.8" />
          <path d="M3.6 8.6h16.8M8 3.2v2.8M16 3.2v2.8" stroke={colour} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M7.6 13.4 9.4 15.2 12.6 12" fill="none" stroke={colour} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 16.6h2.4" stroke={colour} strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
        </>
      );

    case 'unisave':
      // A stack of layers under a shield notch: things kept safe together.
      return (
        <>
          <path
            d="M12 3.2 20 6.4v5.1c0 4.2-3.2 7.6-8 9.3-4.8-1.7-8-5.1-8-9.3V6.4Z"
            fill="none"
            stroke={colour}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M8 10.4h8M8 13.6h8M8 16.8h5" stroke={colour} strokeWidth="1.5" strokeLinecap="round" />
        </>
      );

    case 'languages':
      // Two speech bubbles overlapping: one language answering another.
      return (
        <>
          <path
            d="M3.6 6.4A2 2 0 0 1 5.6 4.4h7.6a2 2 0 0 1 2 2v4.4a2 2 0 0 1-2 2H8.4l-3.2 2.6a.5.5 0 0 1-.8-.4v-2.2H5.6a2 2 0 0 1-2-2Z"
            fill="none"
            stroke={colour}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M17.4 8.6h1a2 2 0 0 1 2 2v4.2a2 2 0 0 1-2 2h-.6v2a.5.5 0 0 1-.82.38L14 17.4"
            fill="none"
            stroke={colour}
            strokeWidth="1.7"
            strokeLinejoin="round"
            opacity="0.8"
          />
        </>
      );

    case 'home':
      // A house. Nothing cleverer, because this tile has to be understood
      // before it is read.
      return (
        <>
          <path
            d="M4.6 10.4 12 4.4l7.4 6v8a1.6 1.6 0 0 1-1.6 1.6H6.2a1.6 1.6 0 0 1-1.6-1.6Z"
            fill="none"
            stroke={colour}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M9.8 20V13.4h4.4V20" fill="none" stroke={colour} strokeWidth="1.8" strokeLinejoin="round" />
        </>
      );

    case 'apps':
      // An arrow coming down into a tray. The universal download mark, which is
      // worth more here than anything cleverer — this tile has to read as "get
      // the file" to someone who has never seen the app before.
      return (
        <>
          <path
            d="M12 3.8v9.4"
            stroke={colour}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="m8.2 9.6 3.8 3.8 3.8-3.8"
            fill="none"
            stroke={colour}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4.8 15.4v2.6a2 2 0 0 0 2 2h10.4a2 2 0 0 0 2-2v-2.6"
            fill="none"
            stroke={colour}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      );

    case 'settings':
      return (
        <>
          <circle cx="12" cy="12" r="3" fill="none" stroke={colour} strokeWidth="1.8" />
          <path
            d="M12 3.6v2.3M12 18.1v2.3M4.9 7.8l2 1.15M17.1 15.05l2 1.15M4.9 16.2l2-1.15M17.1 8.95l2-1.15"
            stroke={colour}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      );

    case 'notes':
    default:
      // A page with a folded corner and ruled lines.
      return (
        <>
          <path
            d="M6 3.6h7.2L19 9.4V20a.8.8 0 0 1-.8.8H6a.8.8 0 0 1-.8-.8V4.4A.8.8 0 0 1 6 3.6Z"
            fill="none"
            stroke={colour}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M13 3.8v5.4h5.4" fill="none" stroke={colour} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M8.2 13h7.6M8.2 16.2h5.2" stroke={colour} strokeWidth="1.5" strokeLinecap="round" />
        </>
      );
  }
}

export default function ProductIcon({ product = 'notes', size = 22, variant = 'plain' }) {
  const meta = PRODUCTS[product] ?? PRODUCTS.notes;
  const solid = variant === 'solid';
  const tileSize = solid ? size : size;

  return (
    <span
      className={`product-icon is-${variant}`}
      style={{
        width: tileSize,
        height: tileSize,
        background: solid ? meta.colour : meta.soft,
      }}
      aria-hidden="true"
    >
      <svg width={size * 0.68} height={size * 0.68} viewBox="0 0 24 24">
        <Glyph product={product} colour={solid ? '#FFFFFF' : meta.colour} />
      </svg>
    </span>
  );
}
