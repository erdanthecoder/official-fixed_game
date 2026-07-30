import ColorMenu from './ColorMenu.jsx';
import TemplateMenu from './TemplateMenu.jsx';
import { BulletListIcon, NumberListIcon } from './icons.jsx';

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
  { value: 'p', label: 'Normal text' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
];

/**
 * The minimal Google-Docs-style toolbar. It's a dumb component — every button
 * calls back into the editor's imperative handle.
 */
export default function Toolbar({ editorRef, formatState, activeProfile, onInsertTemplate }) {
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
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      <div className="tool-group">
        {toolButton('undo', 'Undo (Ctrl+Z)', '↶', 'undo')}
        {toolButton('redo', 'Redo (Ctrl+Shift+Z)', '↷', 'redo')}
      </div>

      <div className="tool-group">
        <label className="block-select">
          <span className="sr-only">Text style</span>
          <select
            value={formatState.block}
            onChange={(event) => exec('formatBlock', `<${event.target.value}>`)}
          >
            {BLOCKS.map((block) => (
              <option key={block.value} value={block.value}>
                {block.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="tool-group">
        {toolButton('bold', 'Bold (Ctrl+B)', 'B', 'bold', {
          isActive: formatState.bold,
          className: 'glyph-bold',
        })}
        {toolButton('italic', 'Italic (Ctrl+I)', 'I', 'italic', {
          isActive: formatState.italic,
          className: 'glyph-italic',
        })}
        {toolButton('underline', 'Underline (Ctrl+U)', 'U', 'underline', {
          isActive: formatState.underline,
          className: 'glyph-underline',
        })}
      </div>

      <div className="tool-group">
        <ColorMenu
          label="Text colour"
          icon="🅰"
          colors={TEXT_COLORS}
          onPick={(color) => exec('foreColor', color)}
        />
        <ColorMenu
          label="Highlight"
          icon="🖍"
          colors={HIGHLIGHTS}
          onPick={(color) => exec('hiliteColor', color)}
          onClear={() => exec('hiliteColor', 'transparent')}
          clearLabel="No highlight"
        />
        <button
          type="button"
          className="tool-button mine"
          style={{ '--profile-color': activeProfile.color }}
          title={`Mark this bit as ${activeProfile.name}'s`}
          aria-label={`Highlight in ${activeProfile.name}'s colour`}
          onMouseDown={(event) => {
            event.preventDefault();
            exec('hiliteColor', activeProfile.highlight);
          }}
        >
          <span aria-hidden="true">✍️</span>
          <span className="tool-text">Mine</span>
        </button>
      </div>

      <div className="tool-group">
        {toolButton('ul', 'Bulleted list', <BulletListIcon />, 'insertUnorderedList', {
          isActive: formatState.unorderedList,
        })}
        {toolButton('ol', 'Numbered list', <NumberListIcon />, 'insertOrderedList', {
          isActive: formatState.orderedList,
        })}
      </div>

      <div className="tool-group">
        {toolButton('clear', 'Clear formatting', '⌫', 'removeFormat')}
      </div>

      <div className="tool-group push-right">
        <TemplateMenu onInsert={onInsertTemplate} />
      </div>
    </div>
  );
}
