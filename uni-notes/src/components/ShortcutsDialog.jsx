/**
 * The shortcut list, on Ctrl+/ — the same key Docs and Gmail use.
 *
 * Everything on this screen is generated from lib/shortcuts.js, which is also
 * what the handlers read. A hand-written help screen is correct on the day it
 * is written and lying by the end of the month; this one cannot drift, because
 * there is nothing to keep in sync.
 */

import { useEffect } from 'react';
import Icon from './ui/Icon.jsx';
import { GROUPS, label, SHORTCUTS } from '../lib/shortcuts.js';
import { useT } from '../i18n/index.jsx';

export default function ShortcutsDialog({ open, onClose }) {
  const { t } = useT();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="palette-overlay" onMouseDown={onClose} role="presentation">
      <div
        className="shortcuts-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t('shortcuts.title')}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="shortcuts-head">
          <h2>{t('shortcuts.title')}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t('common.close')}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="shortcuts-body">
          {GROUPS.map((group) => {
            const items = SHORTCUTS.filter((item) => item.group === group);
            if (!items.length) return null;
            return (
              <section key={group} className="shortcuts-group">
                <h3>{t(`shortcuts.group.${group}`)}</h3>
                <dl>
                  {items.map((item) => (
                    <div key={item.labelKey + item.keys[0]} className="shortcut-row">
                      <dt>{t(item.labelKey)}</dt>
                      <dd>
                        {item.keys.map((binding, index) => (
                          <span key={binding}>
                            {index > 0 ? <em>{t('shortcuts.or')}</em> : null}
                            <kbd>{label(binding)}</kbd>
                          </span>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}
        </div>

        <p className="shortcuts-foot">{t('shortcuts.foot')}</p>
      </div>
    </div>
  );
}
