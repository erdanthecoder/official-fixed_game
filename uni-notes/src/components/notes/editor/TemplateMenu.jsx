import { useEffect, useRef, useState } from 'react';
import Icon from '../../ui/Icon.jsx';
import { NOTE_TEMPLATES } from '../../../lib/templates/notes.js';
import { useT } from '../../../i18n/index.jsx';

/** "Insert template" dropdown — drops a table or checklist at the caret. */
export default function TemplateMenu({ onInsert }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  return (
    <div className="template-menu" ref={wrapperRef}>
      <button
        type="button"
        className={`tool-button wide ${open ? 'is-open' : ''}`}
        aria-expanded={open}
        onMouseDown={(event) => {
          event.preventDefault();
          setOpen((value) => !value);
        }}
      >
        <Icon name="plus" size={16} />
        <span className="tool-text">{t('notes.insert')}</span>
        <Icon name="chevronDown" size={14} className="tool-caret" />
      </button>

      {open ? (
        <div className="template-popover" role="menu" aria-label={t('notes.insert')}>
          {NOTE_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              role="menuitem"
              className="template-option"
              onMouseDown={(event) => {
                event.preventDefault();
                onInsert(template);
                setOpen(false);
              }}
            >
              <Icon name={template.icon} size={19} className="template-option-icon" />
              <span>
                <strong>{t(template.labelKey)}</strong>
                <small>{t(template.hintKey)}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
