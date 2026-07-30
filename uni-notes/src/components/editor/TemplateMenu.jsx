import { useEffect, useRef, useState } from 'react';
import { TEMPLATES } from '../../lib/templates.js';

/** "Insert template" dropdown — drops a table or checklist at the caret. */
export default function TemplateMenu({ onInsert }) {
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
        <span aria-hidden="true">➕</span>
        <span className="tool-text">Insert</span>
        <span className="tool-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <div className="template-popover" role="menu" aria-label="Insert a template">
          {TEMPLATES.map((template) => (
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
              <span className="template-option-icon" aria-hidden="true">
                {template.icon}
              </span>
              <span>
                <strong>{template.label}</strong>
                <small>{template.description}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
