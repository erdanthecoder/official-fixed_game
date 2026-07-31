import { useT } from '../../i18n/index.jsx';
import Icon from '../ui/Icon.jsx';

/**
 * The row of "start from…" tiles. Templates supply i18n keys, so the same strip
 * works in every module and every language.
 */
export default function TemplateStrip({
  templates,
  onPick,
  onBlank,
  blankLabelKey,
  blankHintKey,
  ariaLabel,
}) {
  const { t } = useT();

  return (
    <section className="template-strip" aria-label={ariaLabel}>
      {onBlank ? (
        <button type="button" className="template-tile blank" onClick={onBlank}>
          <Icon name="plus" size={22} className="template-icon" />
          <span className="template-label">{t(blankLabelKey)}</span>
          <span className="template-hint">{t(blankHintKey)}</span>
        </button>
      ) : null}

      {templates.map((template) => (
        <button
          key={template.id}
          type="button"
          className="template-tile"
          onClick={() => onPick(template)}
        >
          <Icon name={template.icon} size={22} className="template-icon" />
          <span className="template-label">{t(template.labelKey)}</span>
          <span className="template-hint">{t(template.hintKey)}</span>
        </button>
      ))}
    </section>
  );
}
