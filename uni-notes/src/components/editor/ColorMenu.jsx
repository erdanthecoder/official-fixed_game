import { useEffect, useRef, useState } from 'react';

/**
 * Swatch popover for text colour and highlight.
 *
 * Every interactive element uses `onMouseDown` + `preventDefault` so the text
 * selection inside the editor is never lost by the click itself.
 */
export default function ColorMenu({ label, icon, colors, onPick, onClear, clearLabel }) {
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

  const pick = (color) => {
    onPick(color);
    setOpen(false);
  };

  return (
    <div className="color-menu" ref={wrapperRef}>
      <button
        type="button"
        className={`tool-button ${open ? 'is-open' : ''}`}
        title={label}
        aria-label={label}
        aria-expanded={open}
        onMouseDown={(event) => {
          event.preventDefault();
          setOpen((value) => !value);
        }}
      >
        <span aria-hidden="true">{icon}</span>
        <span className="tool-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <div className="color-popover" role="menu" aria-label={label}>
          <div className="swatch-grid">
            {colors.map((color) => (
              <button
                key={color.value}
                type="button"
                role="menuitem"
                className="swatch"
                style={{ background: color.value }}
                title={color.name}
                aria-label={color.name}
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(color.value);
                }}
              />
            ))}
          </div>
          {onClear ? (
            <button
              type="button"
              className="color-clear"
              onMouseDown={(event) => {
                event.preventDefault();
                onClear();
                setOpen(false);
              }}
            >
              {clearLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
