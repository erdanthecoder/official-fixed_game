import ColorMenu from './ColorMenu.jsx';
import TemplateMenu from './TemplateMenu.jsx';
import { BulletListIcon, NumberListIcon } from './icons.jsx';
import { useT } from '../../../i18n/index.jsx';

const TEXT_COLORS = [
  { name: 'Black', value: '#202124' },
  { name: 'Grey', value: '#5f6368' },
  { name: 'Blue', value: '#1a73e8' },
  { name: 'Teal', value: '#0f9d95' },
  { name: 'Green', value: '#188038' },
  { name: 'Orange', value: '#e8710a' },
  { name: 'Red', value: '#d93025' },
  { name: 'Purple', value: '#8430ce' },
  { name: 'Pink', value: '#e0339a' },
];

const HIGHLIGHTS = [
  { name: 'Yellow', value: '#fff3a3' },
  { name: 'Mint', value: '#c8f2d8' },
  { name: 'Sky', value: '#cfe4ff' },
  { name: 'Peach', value: '#ffe0c2' },
  { name: 'Lilac', value: '#e6d7ff' },
  { name: 'Rose', value: '#ffd6e4' },
];

const BLOCKS = [
  { value: 'p', labelKey: 'notes.normalText' },
  { value: 'h1', labelKey: 'notes.heading1' },
  { value: 'h2', labelKey: 'notes.heading2' },
  { value: 'h3', labelKey: 'notes.heading3' },
];

/** Minimal Google-Docs-style toolbar. Every button calls into the editor handle. */
export default function Toolbar({ editorRef, formatState, onInsertTemplate }) {
  const { t } = useT();
  const exec = (command, value) => editorRef.current?.exec(command, value);

  const toolButton = (key, label, glyph, command, { isActive = false, className = '' } = {}) => (
    <button
      key={key}
      type="button"
      className={`tool-button ${isActive ? 'is-active' : ''} ${className}`}
      title={label}
      aria-label={label}
      aria-pressed={isActive}
      onMouseDown={(event) => {
        event.preventDefault();
        exec(command);
      }}
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  );

  return (
    <div className="toolbar" role="toolbar" aria-label={t('notes.textStyle')}>
      <div className="tool-group">
        {toolButton('undo', `${t('notes.undo')} (Ctrl+Z)`, '↶', 'undo')}
        {toolButton('redo', `${t('notes.redo')} (Ctrl+Shift+Z)`, '↷', 'redo')}
      </div>

      <div className="tool-group">
        <label className="block-select">
          <span className="sr-only">{t('notes.textStyle')}</span>
          <select
            value={formatState.block}
            onChange={(event) => exec('formatBlock', `<${event.target.value}>`)}
          >
            {BLOCKS.map((block) => (
              <option key={block.value} value={block.value}>
                {t(block.labelKey)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="tool-group">
        {toolButton('bold', `${t('notes.bold')} (Ctrl+B)`, 'B', 'bold', {
          isActive: formatState.bold,
          className: 'glyph-bold',
        })}
        {toolButton('italic', `${t('notes.italic')} (Ctrl+I)`, 'I', 'italic', {
          isActive: formatState.italic,
          className: 'glyph-italic',
        })}
        {toolButton('underline', `${t('notes.underline')} (Ctrl+U)`, 'U', 'underline', {
          isActive: formatState.underline,
          className: 'glyph-underline',
        })}
      </div>

      <div className="tool-group">
        <ColorMenu
          label={t('notes.textColour')}
          icon="🅰"
          colors={TEXT_COLORS}
          onPick={(color) => exec('foreColor', color)}
        />
        <ColorMenu
          label={t('notes.highlight')}
          icon="🖍"
          colors={HIGHLIGHTS}
          onPick={(color) => exec('hiliteColor', color)}
          onClear={() => exec('hiliteColor', 'transparent')}
          clearLabel={t('notes.noHighlight')}
        />
      </div>

      <div className="tool-group">
        {toolButton('ul', t('notes.bulletList'), <BulletListIcon />, 'insertUnorderedList', {
          isActive: formatState.unorderedList,
        })}
        {toolButton('ol', t('notes.numberList'), <NumberListIcon />, 'insertOrderedList', {
          isActive: formatState.orderedList,
        })}
      </div>

      <div className="tool-group">
        {toolButton('clear', t('notes.clearFormatting'), '⌫', 'removeFormat')}
      </div>

      <div className="tool-group push-right">
        <TemplateMenu onInsert={onInsertTemplate} />
      </div>
    </div>
  );
}
