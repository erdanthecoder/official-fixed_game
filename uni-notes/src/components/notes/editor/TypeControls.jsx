/**
 * Font and size, the two controls a document editor is not allowed to be
 * missing.
 *
 * Both show what the caret is actually in rather than what was last pressed:
 * put the cursor in a heading and the size box says 30, move it to a paragraph
 * and it says 16. That is measured off the rendered element (see
 * `measureType` in RichTextEditor), because the only alternative the browser
 * offers answers on a 1-to-7 scale and cannot tell 15px from 17px.
 *
 * The size box is a number field with steppers rather than a menu of presets.
 * A menu is faster for the six sizes everybody uses and useless for the
 * seventh — and a university form that demands 11pt body text is exactly the
 * kind of thing this app exists for.
 */

import { useEffect, useState } from 'react';
import Icon from '../../ui/Icon.jsx';
import { useT } from '../../../i18n/index.jsx';

/**
 * The fonts offered.
 *
 * Every one of these is already on the machine — no webfont is downloaded, so
 * the list works offline, costs nothing on first paint, and cannot flash
 * unstyled text while a font file arrives. That rules out the fashionable
 * choices and leaves the ones that documents are actually set in, which is the
 * right trade for a suite whose output gets emailed to people running
 * Microsoft Word.
 *
 * They are grouped the way a font menu should be — the ones you would set an
 * essay in first, then the display faces, then the typewriter ones — because
 * an alphabetical list of nineteen names is a list nobody reads.
 */
export const FONTS = [
  // Sans
  { id: 'sans', label: 'Inter', group: 'sans', stack: "Inter, 'Segoe UI', Roboto, system-ui, sans-serif" },
  { id: 'arial', label: 'Arial', group: 'sans', stack: "Arial, Helvetica, sans-serif" },
  { id: 'helvetica', label: 'Helvetica', group: 'sans', stack: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { id: 'verdana', label: 'Verdana', group: 'sans', stack: "Verdana, Geneva, sans-serif" },
  { id: 'tahoma', label: 'Tahoma', group: 'sans', stack: "Tahoma, Geneva, Verdana, sans-serif" },
  { id: 'trebuchet', label: 'Trebuchet MS', group: 'sans', stack: "'Trebuchet MS', 'Lucida Grande', sans-serif" },
  { id: 'calibri', label: 'Calibri', group: 'sans', stack: "Calibri, Candara, Segoe, Optima, sans-serif" },
  // Serif
  { id: 'serif', label: 'Georgia', group: 'serif', stack: "Georgia, 'Times New Roman', serif" },
  { id: 'times', label: 'Times New Roman', group: 'serif', stack: "'Times New Roman', Times, serif" },
  { id: 'garamond', label: 'Garamond', group: 'serif', stack: "Garamond, 'EB Garamond', 'Palatino Linotype', serif" },
  { id: 'palatino', label: 'Palatino', group: 'serif', stack: "'Palatino Linotype', Palatino, 'Book Antiqua', serif" },
  { id: 'cambria', label: 'Cambria', group: 'serif', stack: "Cambria, Georgia, serif" },
  { id: 'baskerville', label: 'Baskerville', group: 'serif', stack: "Baskerville, 'Libre Baskerville', Georgia, serif" },
  // Display
  { id: 'impact', label: 'Impact', group: 'display', stack: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" },
  { id: 'copperplate', label: 'Copperplate', group: 'display', stack: "Copperplate, 'Copperplate Gothic Light', fantasy" },
  { id: 'brush', label: 'Brush Script', group: 'display', stack: "'Brush Script MT', 'Segoe Script', cursive" },
  // Mono
  { id: 'mono', label: 'Mono', group: 'mono', stack: "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace" },
  { id: 'courier', label: 'Courier New', group: 'mono', stack: "'Courier New', Courier, monospace" },
  { id: 'consolas', label: 'Consolas', group: 'mono', stack: "Consolas, Monaco, 'Andale Mono', monospace" },
];

const GROUPS = [
  { id: 'sans', labelKey: 'notes.fontSans' },
  { id: 'serif', labelKey: 'notes.fontSerif' },
  { id: 'display', labelKey: 'notes.fontDisplay' },
  { id: 'mono', labelKey: 'notes.fontMono' },
];

const SIZES = [10, 11, 12, 14, 16, 18, 20, 24, 30, 36, 48];

const MIN = 6;
const MAX = 96;

/**
 * Which entry in the list a computed font-family string is.
 *
 * Matched on the first family name in the stack, because that is what was
 * asked for — the rest of a stack is the fallback chain, and matching against
 * it would report "Arial" for anything that merely falls back to Arial.
 * Anything unrecognised reports the default rather than guessing, so the menu
 * never claims text is in a font it is not.
 */
function familyOf(computed) {
  if (!computed) return 'sans';
  const first = computed.split(',')[0].replace(/["']/g, '').trim().toLowerCase();
  const hit = FONTS.find((font) => {
    const own = font.stack.split(',')[0].replace(/["']/g, '').trim().toLowerCase();
    return own === first;
  });
  return hit?.id ?? 'sans';
}

export default function TypeControls({ editorRef, formatState }) {
  const { t } = useT();

  /*
   * The field is a draft while it is being typed in.
   *
   * Applying on every keystroke means typing "18" over "16" applies size 1 on
   * the way through, which resizes the selection to something absurd and — far
   * worse — loses the selection, so the second keystroke has nothing to act
   * on. It commits on Enter or on leaving the field.
   */
  const [draft, setDraft] = useState('');
  const measured = formatState.fontSize ?? 16;
  const shown = draft === '' ? String(measured) : draft;

  // Follow the caret while the field is not being edited.
  useEffect(() => {
    setDraft('');
  }, [measured]);

  const apply = (px) => {
    const size = Math.min(MAX, Math.max(MIN, Math.round(Number(px) || 0)));
    if (!size) return;
    editorRef.current?.setFontSize(size);
    setDraft('');
  };

  const step = (by) => apply(measured + by);

  return (
    <>
      <div className="tool-group">
        <label className="block-select font-select">
          <span className="sr-only">{t('notes.font')}</span>
          <select
            value={familyOf(formatState.fontFamily)}
            onChange={(event) => {
              const font = FONTS.find((item) => item.id === event.target.value);
              if (font) editorRef.current?.setFontFamily(font.stack);
            }}
          >
            {GROUPS.map((group) => (
              <optgroup key={group.id} label={t(group.labelKey)}>
                {FONTS.filter((font) => font.group === group.id).map((font) => (
                  /* Each name is set in its own face, which is the whole
                     reason a font menu is quicker than a font list. */
                  <option key={font.id} value={font.id} style={{ fontFamily: font.stack }}>
                    {font.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>

      <div className="tool-group size-group">
        <button
          type="button"
          className="tool-button"
          title={t('notes.sizeDown')}
          aria-label={t('notes.sizeDown')}
          onMouseDown={(event) => {
            event.preventDefault();
            step(-1);
          }}
        >
          <Icon name="down" size={15} />
        </button>

        <input
          className="size-field"
          type="text"
          inputMode="numeric"
          value={shown}
          aria-label={t('notes.textSize')}
          title={t('notes.textSize')}
          onChange={(event) => setDraft(event.target.value.replace(/[^\d]/g, '').slice(0, 2))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              apply(shown);
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              step(1);
            } else if (event.key === 'ArrowDown') {
              event.preventDefault();
              step(-1);
            }
          }}
          onBlur={() => (draft === '' ? null : apply(draft))}
          list="kadam-sizes"
        />
        <datalist id="kadam-sizes">
          {SIZES.map((size) => (
            <option key={size} value={size} />
          ))}
        </datalist>

        <button
          type="button"
          className="tool-button"
          title={t('notes.sizeUp')}
          aria-label={t('notes.sizeUp')}
          onMouseDown={(event) => {
            event.preventDefault();
            step(1);
          }}
        >
          <Icon name="up" size={15} />
        </button>
      </div>
    </>
  );
}
