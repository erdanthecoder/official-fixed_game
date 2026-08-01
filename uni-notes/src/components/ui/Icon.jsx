/**
 * The icon set.
 *
 * One system, drawn to one spec, so the interface looks like it was made by one
 * person on one afternoon rather than assembled from whatever was to hand:
 *
 *   · 24×24 grid, always
 *   · 1.7 stroke, round caps and joins
 *   · `currentColor`, so an icon takes the colour of the text beside it
 *   · geometry snapped to whole or half units, so edges stay crisp at 16px
 *
 * Icons are decorative by default (aria-hidden). When one is the only content
 * of a control, give the *control* an aria-label — not the icon.
 */

const P = {
  /* ------------------------------- navigation ------------------------------ */
  back: <path d="M14.5 5 7.5 12l7 7" />,
  forward: <path d="M9.5 5l7 7-7 7" />,
  up: <path d="M12 18.5V5.5M6 11.5l6-6 6 6" />,
  down: <path d="M12 5.5v13M6 12.5l6 6 6-6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  more: (
    <>
      <circle cx="12" cy="5.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18.5" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  check: <path d="M5 12.8l4.6 4.4L19 6.6" />,
  chevronDown: <path d="M6 9.5l6 6 6-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.2" />
      <path d="M15.6 15.6L20 20" />
    </>
  ),
  home: <path d="M4 10.8 12 4l8 6.8V19a1 1 0 0 1-1 1h-4.2v-5.2H9.2V20H5a1 1 0 0 1-1-1Z" />,
  grid: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1.4" />
      <rect x="14" y="4" width="6" height="6" rx="1.4" />
      <rect x="4" y="14" width="6" height="6" rx="1.4" />
      <rect x="14" y="14" width="6" height="6" rx="1.4" />
    </>
  ),

  /* --------------------------------- editing ------------------------------- */
  bold: <path d="M7.5 4.8h6a3.6 3.6 0 0 1 0 7.2h-6Zm0 7.2h6.8a3.6 3.6 0 0 1 0 7.2H7.5Z" />,
  italic: <path d="M15.5 4.8H10M14 19.2H8.5M13.4 4.8 10.6 19.2" />,
  underline: <path d="M7 4.6v6.2a5 5 0 0 0 10 0V4.6M6 19.4h12" />,
  listBullet: (
    <>
      <path d="M9 6.5h11M9 12h11M9 17.5h11" />
      <circle cx="4.8" cy="6.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="4.8" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="4.8" cy="17.5" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  listNumber: (
    <>
      <path d="M9.5 6.5h10.5M9.5 12H20M9.5 17.5H20" />
      <path d="M4 4.9h1.3v3.4M3.6 15.6a1.3 1.3 0 1 1 2 1.1L3.6 18.6h2.5" strokeWidth="1.4" />
    </>
  ),
  undo: <path d="M4.5 9.5h9.8a4.7 4.7 0 0 1 0 9.4H8.4M4.5 9.5 8.6 5.4M4.5 9.5l4.1 4.1" />,
  redo: <path d="M19.5 9.5H9.7a4.7 4.7 0 0 0 0 9.4h5.9M19.5 9.5 15.4 5.4M19.5 9.5l-4.1 4.1" />,
  clearFormat: (
    <>
      <path d="M8.5 5.5h10M13.6 5.5 10.4 18.5M6 18.5h6" />
      <path d="M16 14.4l4.4 4.4M20.4 14.4 16 18.8" strokeWidth="1.5" />
    </>
  ),
  textColour: (
    <>
      <path d="M5.6 15.4 10.6 4.6h1.6l5 10.8M7.5 12.2h7.6" />
      <rect x="4.4" y="18" width="15.2" height="2.6" rx="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  highlight: (
    <>
      <path d="M12.4 4.8 19 11.4l-6.1 6.1H7.4l-1.8-1.8Z" />
      <rect x="4.4" y="19.4" width="15.2" height="1.8" rx="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  heading: <path d="M6 5v14M18 5v14M6 12h12" />,

  /* ------------------------------- file actions ---------------------------- */
  edit: <path d="M14.6 4.9 19.1 9.4 8.5 20H4v-4.5ZM12.9 6.6l4.5 4.5" />,
  trash: (
    <>
      <path d="M4.6 6.6h14.8M9.3 6.6V4.8h5.4v1.8" />
      <path d="M6.6 6.6 7.5 19a1.2 1.2 0 0 0 1.2 1.1h6.6a1.2 1.2 0 0 0 1.2-1.1l.9-12.4" />
      <path d="M10.4 10.2v6M13.6 10.2v6" strokeWidth="1.4" />
    </>
  ),
  copy: (
    <>
      <rect x="8.4" y="8.4" width="11.2" height="11.2" rx="2" />
      <path d="M15.6 5.6a1.2 1.2 0 0 0-1.2-1.2H6a1.6 1.6 0 0 0-1.6 1.6v8.4a1.2 1.2 0 0 0 1.2 1.2" />
    </>
  ),
  move: <path d="M4 7.6a1.6 1.6 0 0 1 1.6-1.6h3.1l1.7 2h7A1.6 1.6 0 0 1 20 9.6v7.2a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 16.8Z" />,
  // Two links of a chain, each an open bracket meeting in the middle.
  link: (
    <>
      <path d="M10.4 13.6a3.4 3.4 0 0 0 5 .4l3-3a3.4 3.4 0 0 0-4.8-4.8l-1.7 1.7" />
      <path d="M13.6 10.4a3.4 3.4 0 0 0-5-.4l-3 3a3.4 3.4 0 0 0 4.8 4.8l1.7-1.7" />
    </>
  ),

  share: (
    <>
      <circle cx="17.6" cy="6" r="2.6" />
      <circle cx="6.4" cy="12" r="2.6" />
      <circle cx="17.6" cy="18" r="2.6" />
      <path d="M8.8 10.8 15.3 7.3M8.8 13.2l6.5 3.5" />
    </>
  ),
  download: <path d="M12 4.4v10.8M7.6 11l4.4 4.4L16.4 11M4.8 19.6h14.4" />,
  leave: <path d="M14 4.8H6.4a1.6 1.6 0 0 0-1.6 1.6v11.2a1.6 1.6 0 0 0 1.6 1.6H14M11.6 12h8M16.4 8.4 20 12l-3.6 3.6" />,
  open: <path d="M13.6 4.8H19V10M19 4.8 11.4 12.4M17 13.8v4.6a1.6 1.6 0 0 1-1.6 1.6H6a1.6 1.6 0 0 1-1.6-1.6V9a1.6 1.6 0 0 1 1.6-1.6h4.6" />,

  /* --------------------------------- folders ------------------------------- */
  folder: <path d="M4 7.4a1.6 1.6 0 0 1 1.6-1.6h3.3l1.8 2.2h7.7A1.6 1.6 0 0 1 20 9.6v7.8a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 17.4Z" />,
  library: (
    <>
      <path d="M4.6 5.2h4.2v14.2H4.6zM10.4 5.2h4.2v14.2h-4.2z" />
      <path d="m16.4 6 3.4 13-3.6.8" />
    </>
  ),
  inbox: (
    <>
      <path d="M4.4 12.6 6.8 5.4h10.4l2.4 7.2v5a1.6 1.6 0 0 1-1.6 1.6H6a1.6 1.6 0 0 1-1.6-1.6Z" />
      <path d="M4.4 12.6h4l1 2.4h5.2l1-2.4h4" />
    </>
  ),

  /* --------------------------------- status -------------------------------- */
  cloud: <path d="M7.2 18.4A3.6 3.6 0 0 1 7 11.3a5 5 0 0 1 9.7-1.2 3.9 3.9 0 0 1-.5 8.3Z" />,
  cloudOff: (
    <>
      <path d="M7.2 18.4A3.6 3.6 0 0 1 7 11.3a5 5 0 0 1 9.7-1.2 3.9 3.9 0 0 1-.5 8.3Z" />
      <path d="M4 4l16 16" strokeWidth="1.5" />
    </>
  ),
  save: (
    <>
      <path d="M5.6 4.8h10L19.2 8v11.2a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 19.2V6.4a1.6 1.6 0 0 1 1.6-1.6Z" />
      <path d="M8 4.8v4.4h6.4V4.8M8 20.8v-5.6h8v5.6" />
    </>
  ),
  warning: (
    <>
      <path d="M12 4.6 21 19.4H3Z" />
      <path d="M12 10.4v4" strokeWidth="1.6" />
      <circle cx="12" cy="16.8" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  lock: (
    <>
      <rect x="4.8" y="10.4" width="14.4" height="9.6" rx="2" />
      <path d="M8.4 10.4V7.8a3.6 3.6 0 0 1 7.2 0v2.6" />
    </>
  ),
  shield: <path d="M12 3.6 19.6 6.6v5.2c0 4.2-3.2 7.6-7.6 9-4.4-1.4-7.6-4.8-7.6-9V6.6Z" />,
  users: (
    <>
      <circle cx="9.4" cy="8.4" r="3.2" />
      <path d="M3.8 19.4a5.6 5.6 0 0 1 11.2 0" />
      <path d="M16 5.6a3.2 3.2 0 0 1 0 5.9M17.6 19.4a5.6 5.6 0 0 0-2.2-4.5" />
    </>
  ),
  strikethrough: (
    <>
      <path d="M4.4 12h15.2" />
      <path d="M16.6 7.6C15.9 6.2 14.2 5.4 12 5.4c-2.6 0-4.4 1.2-4.4 3 0 1.3.9 2.2 2.4 2.8" />
      <path d="M7.6 16.2c.8 1.5 2.5 2.4 4.6 2.4 2.7 0 4.5-1.3 4.5-3.2 0-1-.5-1.8-1.4-2.4" />
    </>
  ),
  quote: (
    <>
      <path d="M9.6 6.4C7 7.4 5.4 9.6 5.4 12.4v5.2h5.4v-5.4H8.2c0-1.7.9-3 2.6-3.7Z" />
      <path d="M18 6.4c-2.6 1-4.2 3.2-4.2 6v5.2h5.4v-5.4h-2.6c0-1.7.9-3 2.6-3.7Z" />
    </>
  ),
  phone: (
    <>
      <rect x="6.8" y="2.8" width="10.4" height="18.4" rx="2.4" />
      <path d="M10.4 18.4h3.2" />
    </>
  ),
  monitor: (
    <>
      <rect x="2.8" y="4.2" width="18.4" height="12.4" rx="2" />
      <path d="M8.6 20.4h6.8M12 16.6v3.8" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 11.2v5" />
      <path d="M12 7.9v.1" strokeWidth="2.2" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M4.2 12h15.6M12 4a13 13 0 0 1 0 16 13 13 0 0 1 0-16Z" />
    </>
  ),
  send: <path d="M20 4 3.6 10.6l6.6 2.8 2.8 6.6Zm0 0-9.8 9.4" />,

  /* -------------------------------- learning ------------------------------- */
  // Drawn as solid shapes rather than outlines: these are score-keeping, and a
  // hollow heart next to a full one has to read at a glance.
  heart: (
    <path
      d="M12 20.4 4.4 13a4.7 4.7 0 0 1 6.6-6.7l1 1 1-1A4.7 4.7 0 0 1 19.6 13Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  flame: (
    <path
      d="M12.6 2.6c.4 3 2.2 4 3.7 5.8a6.8 6.8 0 1 1-10.4.5c1-1.2 1.6-1.9 1.9-3.1.5 1.2 1.2 1.8 2 2.3.6-2.2 1.4-3.9 2.8-5.5Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  bolt: <path d="M13.4 2.4 4.6 13.6h5.4l-.8 8 8.8-11.2h-5.4Z" fill="currentColor" stroke="none" />,
  star: (
    <path
      d="M12 3.2 14.7 9l6.3.8-4.6 4.3 1.2 6.2L12 17.4 6.4 20.3l1.2-6.2L3 9.8 9.3 9Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  trophy: (
    <>
      <path d="M7 4.4h10v5.2a5 5 0 0 1-10 0Z" fill="currentColor" stroke="none" />
      <path d="M7 6H4.6v1.6A3.4 3.4 0 0 0 7.6 11M17 6h2.4v1.6A3.4 3.4 0 0 1 16.4 11" />
      <path d="M12 14.6v3.2M8.4 20.4h7.2" strokeLinecap="round" />
    </>
  ),

  /* --------------------------------- sheets -------------------------------- */
  addRow: (
    <>
      <rect x="3.6" y="12.6" width="16.8" height="6.4" rx="1.4" />
      <path d="M12 3.4v6.2M9 6.5h6" />
    </>
  ),
  addColumn: (
    <>
      <rect x="3.6" y="3.6" width="6.4" height="16.8" rx="1.4" />
      <path d="M17 9v6M14 12h6" />
    </>
  ),
  deleteRow: (
    <>
      <rect x="3.6" y="12.6" width="16.8" height="6.4" rx="1.4" />
      <path d="M9 6.5h6" />
    </>
  ),
  deleteColumn: (
    <>
      <rect x="3.6" y="3.6" width="6.4" height="16.8" rx="1.4" />
      <path d="M14 12h6" />
    </>
  ),
  alignLeft: <path d="M4 6.4h16M4 12h10M4 17.6h13" />,
  alignCentre: <path d="M4 6.4h16M7 12h10M5.5 17.6h13" />,
  alignRight: <path d="M4 6.4h16M10 12h10M7 17.6h13" />,
  function: <path d="M14.6 4.6h-1.7a2.6 2.6 0 0 0-2.6 2.6v9.6a2.6 2.6 0 0 1-2.6 2.6H6M8 11.6h7" />,

  /* --------------------------------- slides -------------------------------- */
  present: <path d="M8 5.4 18.6 12 8 18.6Z" />,
  layout: (
    <>
      <rect x="3.8" y="4.6" width="16.4" height="14.8" rx="1.8" />
      <path d="M3.8 9.6h16.4M9.4 9.6v9.8" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3.8a8.2 8.2 0 0 0 0 16.4c1.2 0 1.8-.8 1.8-1.7 0-1.3-1-1.6-1-2.7 0-.8.7-1.5 1.6-1.5h1.4a4.4 4.4 0 0 0 4.4-4.5c0-3.4-3.6-6-8.2-6Z" />
      <circle cx="8.2" cy="10.4" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.6" cy="10" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),

  /* ------------------------------- languages ------------------------------- */
  cards: (
    <>
      <rect x="3.6" y="6.6" width="12" height="13.2" rx="1.8" />
      <path d="M7.6 6.6V5.4a1.4 1.4 0 0 1 1.4-1.4h9.4a1.8 1.8 0 0 1 1.8 1.8v9.6a1.4 1.4 0 0 1-1.4 1.4h-1.2" />
    </>
  ),
  quiz: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M9.6 9.6a2.4 2.4 0 1 1 3.3 2.2c-.6.3-.9.8-.9 1.5v.5" />
      <circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  list: <path d="M8.4 6.6H20M8.4 12H20M8.4 17.4H20M4.4 6.6h.01M4.4 12h.01M4.4 17.4h.01" />,

  /* --------------------------------- canvas -------------------------------- */
  pen: <path d="M4 20l1-4.2L15.6 5.2a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.2 19 4 20Z" />,
  eraser: (
    <>
      <path d="m9.6 20-5-5a1.6 1.6 0 0 1 0-2.3l8-8a1.6 1.6 0 0 1 2.3 0l4.4 4.4a1.6 1.6 0 0 1 0 2.3L11.9 20Z" />
      <path d="M8.4 9.2 15.4 16.2M9.6 20H20" />
    </>
  ),
  line: <path d="M5 19 19 5" />,
  square: <rect x="4.6" y="4.6" width="14.8" height="14.8" rx="2" />,
  circle: <circle cx="12" cy="12" r="7.4" />,
  arrowTool: <path d="M5 19 19 5M19 5h-6M19 5v6" />,
  text: <path d="M5 6.4V4.8h14v1.6M12 4.8v14.4M9 19.2h6" />,
  hand: <path d="M8.4 12V6.6a1.5 1.5 0 0 1 3 0V11m0-.6V5.4a1.5 1.5 0 0 1 3 0V11m0-.4V6.8a1.5 1.5 0 0 1 3 0V15a5.2 5.2 0 0 1-5.2 5.2h-.9a5.4 5.4 0 0 1-4-1.8l-3-3.4a1.5 1.5 0 0 1 2.2-2Z" />,

  /* --------------------------------- tasks --------------------------------- */
  circleEmpty: <circle cx="12" cy="12" r="7.6" />,
  circleCheck: (
    <>
      <circle cx="12" cy="12" r="7.6" />
      <path d="M8.6 12.2 11 14.6l4.4-4.6" />
    </>
  ),
  flag: <path d="M6 20.4V4.6c3.6-2 7.2 2 10.8 0v9c-3.6 2-7.2-2-10.8 0" />,
  calendar: (
    <>
      <rect x="4" y="5.6" width="16" height="14.4" rx="2" />
      <path d="M4 10h16M8.6 3.6v4M15.4 3.6v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.6V12l3 1.8" />
    </>
  ),

  /* -------------------------------- templates ------------------------------ */
  school: (
    <>
      <path d="M12 3.6 21 8l-9 4.4L3 8Z" />
      <path d="M6.6 10.2v5.2c0 1.9 2.4 3.4 5.4 3.4s5.4-1.5 5.4-3.4v-5.2" />
    </>
  ),
  checklist: (
    <>
      <path d="M10 6.6h10M10 12h10M10 17.4h10" />
      <path d="m3.6 6.2 1.4 1.4 2.4-2.6M3.6 11.6 5 13l2.4-2.6M3.6 17 5 18.4l2.4-2.6" strokeWidth="1.5" />
    </>
  ),
  essay: (
    <>
      <path d="M6 3.8h7.6L18 8.2V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.8a1 1 0 0 1 1-1Z" />
      <path d="M13.2 4v4.4h4.4M8.4 13.4h6.2M8.4 16.8h4" />
    </>
  ),
  money: (
    <>
      <ellipse cx="12" cy="6.6" rx="7.4" ry="2.8" />
      <path d="M4.6 6.6v10.8c0 1.6 3.3 2.8 7.4 2.8s7.4-1.2 7.4-2.8V6.6" />
      <path d="M4.6 12c0 1.6 3.3 2.8 7.4 2.8s7.4-1.2 7.4-2.8" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.4" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  research: (
    <>
      <path d="M9.6 3.8v6L4.8 18a1.8 1.8 0 0 0 1.6 2.6h11.2A1.8 1.8 0 0 0 19.2 18l-4.8-8.2v-6" />
      <path d="M8.4 3.8h7.2M8 13.4h8" />
    </>
  ),
  book: (
    <>
      <path d="M4.4 5.2a1.6 1.6 0 0 1 1.6-1.6h4a2.4 2.4 0 0 1 2 1.1 2.4 2.4 0 0 1 2-1.1h4a1.6 1.6 0 0 1 1.6 1.6v11.4a1.4 1.4 0 0 1-1.4 1.4h-4.2a2 2 0 0 0-2 1.4 2 2 0 0 0-2-1.4H5.8a1.4 1.4 0 0 1-1.4-1.4Z" />
      <path d="M12 4.7v14.7" />
    </>
  ),
  tabs: (
    <>
      <path d="M3.8 8.4a1.6 1.6 0 0 1 1.6-1.6h3.4l1.6 2h8a1.6 1.6 0 0 1 1.6 1.6v6.2a1.6 1.6 0 0 1-1.6 1.6H5.4a1.6 1.6 0 0 1-1.6-1.6Z" />
      <path d="M7 6.8V5.2a1.4 1.4 0 0 1 1.4-1.4h6" />
    </>
  ),
  plug: (
    <>
      <path d="M9.2 3.8v4.4M14.8 3.8v4.4" />
      <path d="M6.6 8.2h10.8v3.2a5.4 5.4 0 0 1-10.8 0Z" />
      <path d="M12 16.8v3.4" />
    </>
  ),
  empty: (
    <>
      <rect x="3.8" y="6.4" width="16.4" height="13.2" rx="2" />
      <path d="M3.8 11.4h16.4" strokeDasharray="2.4 2.4" />
    </>
  ),
};

export const ICON_NAMES = Object.keys(P);

export default function Icon({ name, size = 20, className = '', strokeWidth = 1.7, title }) {
  const glyph = P[name];
  if (!glyph) {
    // A missing icon should be obvious in development, not a silent gap.
    if (import.meta.env.DEV) console.warn(`[Uni] No icon named "${name}".`);
    return null;
  }

  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {glyph}
    </svg>
  );
}
