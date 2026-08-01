import ColorMenu from './ColorMenu.jsx';
import LinkButton from './LinkButton.jsx';
import Icon from '../../ui/Icon.jsx';
import TemplateMenu from './TemplateMenu.jsx';
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
  const exec = (command, value) => {
    // `formatBlock:blockquote` keeps toolButton's single-argument shape while
    // still letting a block command carry its tag.
    if (command.includes(':')) {
      const [name, arg] = command.split(':');
      editorRef.current?.exec(name, `<${arg}>`);
      return;
    }
    editorRef.current?.exec(command, value);
  };

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
        {toolButton('undo', `${t('notes.undo')} (Ctrl+Z)`, <Icon name="undo" size={17} />, 'undo')}
        {toolButton('redo', `${t('notes.redo')} (Ctrl+Shift+Z)`, <Icon name="redo" size={17} />, 'redo')}
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
        {toolButton('bold', `${t('notes.bold')} (Ctrl+B)`, <Icon name="bold" size={17} />, 'bold', {
          isActive: formatState.bold,
        })}
        {toolButton('italic', `${t('notes.italic')} (Ctrl+I)`, <Icon name="italic" size={17} />, 'italic', {
          isActive: formatState.italic,
        })}
        {toolButton(
          'underline',
          `${t('notes.underline')} (Ctrl+U)`,
          <Icon name="underline" size={17} />,
          'underline',
          { isActive: formatState.underline },
        )}
        {toolButton(
          'strike',
          t('notes.strikethrough'),
          <Icon name="strikethrough" size={17} />,
          'strikeThrough',
          { isActive: formatState.strikethrough },
        )}
      </div>

      <div className="tool-group">
        <ColorMenu
          label={t('notes.textColour')}
          icon={<Icon name="textColour" size={17} />}
          colors={TEXT_COLORS}
          onPick={(color) => exec('foreColor', color)}
        />
        <ColorMenu
          label={t('notes.highlight')}
          icon={<Icon name="highlight" size={17} />}
          colors={HIGHLIGHTS}
          onPick={(color) => exec('hiliteColor', color)}
          onClear={() => exec('hiliteColor', 'transparent')}
          clearLabel={t('notes.noHighlight')}
        />
      </div>

      <div className="tool-group">
        {toolButton('ul', t('notes.bulletList'), <Icon name="listBullet" size={17} />, 'insertUnorderedList', {
          isActive: formatState.unorderedList,
        })}
        {toolButton('ol', t('notes.numberList'), <Icon name="listNumber" size={17} />, 'insertOrderedList', {
          isActive: formatState.orderedList,
        })}
      </div>

      <div className="tool-group">
        {toolButton('alignLeft', t('notes.alignLeft'), <Icon name="alignLeft" size={17} />, 'justifyLeft', {
          isActive: formatState.align === 'left',
        })}
        {toolButton('alignCentre', t('notes.alignCentre'), <Icon name="alignCentre" size={17} />, 'justifyCenter', {
          isActive: formatState.align === 'center',
        })}
        {toolButton('alignRight', t('notes.alignRight'), <Icon name="alignRight" size={17} />, 'justifyRight', {
          isActive: formatState.align === 'right',
        })}
      </div>

      <div className="tool-group">
        {/* A quote is a blockquote, not italics — it survives copy and paste
            into a document that has to be handed in. */}
        {toolButton('quote', t('notes.quote'), <Icon name="quote" size={17} />, 'formatBlock:blockquote', {
          isActive: formatState.block === 'blockquote',
        })}
        <LinkButton
          label={t('notes.link')}
          onApply={(url) => exec('createLink', url)}
          onRemove={() => exec('unlink')}
        />
      </div>

      <div className="tool-group">
        {toolButton('clear', t('notes.clearFormatting'), <Icon name="clearFormat" size={17} />, 'removeFormat')}
      </div>

      <div className="tool-group push-right">
        <TemplateMenu onInsert={onInsertTemplate} />
      </div>
    </div>
  );
}
