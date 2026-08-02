/**
 * Every keyboard shortcut in Kadam, in one list.
 *
 * One list, not two, and that is the point. The usual failure is a help dialog
 * written by hand: it starts correct, a shortcut changes, and now the app
 * teaches something that does not work — which is worse than teaching nothing.
 * Here the handler and the dialog read the same array, so a shortcut that is
 * listed is a shortcut that runs.
 *
 * The bindings follow Google Docs and Excel wherever they agree, because the
 * whole value of a shortcut is that a hand already knows it. Nothing is
 * invented for the sake of being different.
 */

/** Is this a Mac? Only used to print ⌘ instead of Ctrl. */
export const IS_APPLE =
  typeof navigator !== 'undefined' &&
  /mac|iphone|ipad|ipod/i.test(navigator.userAgentData?.platform ?? navigator.platform ?? '');

/**
 * Does an event match a binding like `mod+shift+x`?
 *
 * `mod` is Ctrl everywhere and Cmd on Apple, which is the one difference that
 * matters — every other modifier is named the same on both.
 */
export function matches(event, binding) {
  const parts = binding.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  const want = new Set(parts.slice(0, -1));

  const mod = IS_APPLE ? event.metaKey : event.ctrlKey;
  if (want.has('mod') !== mod) return false;
  if (want.has('shift') !== event.shiftKey) return false;
  if (want.has('alt') !== event.altKey) return false;
  // On Apple, Ctrl is a separate modifier from Cmd and must not be pressed
  // unless asked for; elsewhere `mod` already accounted for it.
  if (IS_APPLE && want.has('ctrl') !== event.ctrlKey) return false;

  const pressed = event.key.toLowerCase();
  if (key === pressed) return true;
  // Digits and letters produce different `key` values with Shift or on other
  // layouts; `code` is the physical key and is stable.
  return event.code?.toLowerCase() === `key${key}` || event.code?.toLowerCase() === `digit${key}`;
}

/** Pretty-print a binding for the help dialog. */
export function label(binding) {
  const names = {
    mod: IS_APPLE ? '⌘' : 'Ctrl',
    shift: IS_APPLE ? '⇧' : 'Shift',
    alt: IS_APPLE ? '⌥' : 'Alt',
    ctrl: '⌃',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
    enter: 'Enter',
    escape: 'Esc',
    backspace: 'Backspace',
    delete: 'Delete',
    tab: 'Tab',
    home: 'Home',
    end: 'End',
    ' ': 'Space',
  };
  return binding
    .split('+')
    .map((part) => names[part.toLowerCase()] ?? (part.length === 1 ? part.toUpperCase() : part))
    .join(IS_APPLE ? '' : ' + ');
}

/**
 * The catalogue.
 *
 * `groupKey` and `labelKey` are translation keys; `keys` may list more than one
 * binding where both are in common use (Docs and Excel disagree about a few).
 * `command` is what the editor is asked to run, for the ones that map onto a
 * single formatting command.
 */
export const SHORTCUTS = [
  // --- anywhere -------------------------------------------------------------
  { group: 'general', labelKey: 'palette.title', keys: ['mod+k'] },
  { group: 'general', labelKey: 'shortcuts.help', keys: ['mod+/'] },
  { group: 'general', labelKey: 'common.close', keys: ['escape'] },

  // --- writing --------------------------------------------------------------
  { group: 'writing', labelKey: 'notes.bold', keys: ['mod+b'], command: 'bold' },
  { group: 'writing', labelKey: 'notes.italic', keys: ['mod+i'], command: 'italic' },
  { group: 'writing', labelKey: 'notes.underline', keys: ['mod+u'], command: 'underline' },
  {
    group: 'writing',
    labelKey: 'notes.strikethrough',
    keys: ['mod+shift+x'],
    command: 'strikeThrough',
  },
  { group: 'writing', labelKey: 'notes.link', keys: ['mod+shift+k'], command: 'link' },
  {
    group: 'writing',
    labelKey: 'notes.clearFormatting',
    keys: ['mod+\\'],
    command: 'removeFormat',
  },
  { group: 'writing', labelKey: 'notes.undo', keys: ['mod+z'], command: 'undo' },
  { group: 'writing', labelKey: 'notes.redo', keys: ['mod+shift+z'], command: 'redo' },

  // --- paragraphs -----------------------------------------------------------
  {
    group: 'paragraph',
    labelKey: 'notes.heading1',
    keys: ['mod+alt+1'],
    command: 'formatBlock:h1',
  },
  {
    group: 'paragraph',
    labelKey: 'notes.heading2',
    keys: ['mod+alt+2'],
    command: 'formatBlock:h2',
  },
  {
    group: 'paragraph',
    labelKey: 'notes.heading3',
    keys: ['mod+alt+3'],
    command: 'formatBlock:h3',
  },
  {
    group: 'paragraph',
    labelKey: 'notes.normalText',
    keys: ['mod+alt+0'],
    command: 'formatBlock:p',
  },
  {
    group: 'paragraph',
    labelKey: 'notes.bulletList',
    keys: ['mod+shift+8'],
    command: 'insertUnorderedList',
  },
  {
    group: 'paragraph',
    labelKey: 'notes.numberList',
    keys: ['mod+shift+7'],
    command: 'insertOrderedList',
  },
  { group: 'paragraph', labelKey: 'notes.quote', keys: ['mod+shift+9'], command: 'formatBlock:blockquote' },
  { group: 'paragraph', labelKey: 'notes.alignLeft', keys: ['mod+shift+l'], command: 'justifyLeft' },
  {
    group: 'paragraph',
    labelKey: 'notes.alignCentre',
    keys: ['mod+shift+e'],
    command: 'justifyCenter',
  },
  {
    group: 'paragraph',
    labelKey: 'notes.alignRight',
    keys: ['mod+shift+r'],
    command: 'justifyRight',
  },

  // --- the grid -------------------------------------------------------------
  { group: 'sheet', labelKey: 'shortcuts.move', keys: ['arrowup'] },
  { group: 'sheet', labelKey: 'shortcuts.edit', keys: ['enter', 'f2'] },
  { group: 'sheet', labelKey: 'shortcuts.nextCell', keys: ['tab'] },
  { group: 'sheet', labelKey: 'shortcuts.jumpEdge', keys: ['mod+arrowright'] },
  { group: 'sheet', labelKey: 'shortcuts.rowStart', keys: ['home'] },
  { group: 'sheet', labelKey: 'shortcuts.sheetStart', keys: ['mod+home'] },
  { group: 'sheet', labelKey: 'shortcuts.clearCell', keys: ['delete'] },
  { group: 'sheet', labelKey: 'shortcuts.cancelEdit', keys: ['escape'] },
];

export const GROUPS = ['general', 'writing', 'paragraph', 'sheet'];

/** The one that matches, or nothing. Used by the editor's key handler. */
export function findCommand(event) {
  return SHORTCUTS.find(
    (item) => item.command && item.keys.some((binding) => matches(event, binding)),
  );
}
