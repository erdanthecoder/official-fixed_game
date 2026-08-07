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

/** The stacks offered, and the label each one appears under. */
export const FONTS = [
  { id: 'sans', label: 'Inter', stack: "Inter, 'Segoe UI', Roboto, system-ui, sans-serif" },
  { id: 'serif', label: 'Georgia', stack: "Georgia, 'Times New Roman', serif" },
  { id: 'mono', label: 'Mono', stack: "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace" },
];

const SIZES = [10, 11, 12, 14, 16, 18, 20, 24, 30, 36, 48];

const MIN = 6;
const MAX = 96;

/** Which of our stacks a computed font-family string belongs to, if any. */
function familyOf(computed) {
  if (!computed) return 'sans';
  const first = computed.split(',')[0].replace(/["']/g, '').trim().toLowerCase();
  if (first.includes('georgia') || first.includes('times')) return 'serif';
  if (first.includes('mono') || first.includes('consolas')) return 'mono';
  return 'sans';
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
            {FONTS.map((font) => (
              <option key={font.id} value={font.id} style={{ fontFamily: font.stack }}>
                {font.label}
              </option>
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
