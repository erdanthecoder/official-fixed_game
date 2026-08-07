import { useT } from '../../i18n/index.jsx';
import Icon from '../ui/Icon.jsx';

/**
 * "Start a new one" — the row across the top of every dashboard.
 *
 * These were bordered boxes containing an icon and two lines of prose, which
 * is the shape of a settings row, not of a document. Six of them side by side
 * read as a menu you have to finish reading before you can choose.
 *
 * Docs, Slides and Sheets all do the same thing instead, and it is worth
 * copying exactly: show the *shape of the thing you would get*. A page-
 * proportioned tile with a suggestion of a heading and some lines on it; the
 * name underneath in small text, outside the tile. You recognise a two-column
 * layout or a table at a glance, without reading anything, and the name is
 * there to confirm rather than to explain.
 *
 * `preview` is a handful of proportioned bars per template — enough to read as
 * a layout, cheap enough that thirty of them cost nothing. Templates that do
 * not describe one fall back to their icon on blank paper.
 */

/**
 * The bars, as [width%, kind] pairs. `head` is a heavy short bar, `line` a
 * light one, `rule` a full-width divider, `cell` part of a grid row.
 */
const SHAPES = {
  blank: [],
  doc: [['head', 62], ['line', 100], ['line', 96], ['line', 88], ['rule', 100], ['line', 92], ['line', 70]],
  table: [['head', 48], ['cells', 4], ['cells', 4], ['cells', 4], ['cells', 4]],
  list: [['head', 54], ['check', 92], ['check', 84], ['check', 90], ['check', 76]],
  split: [['head', 58], ['split', 100], ['split', 100], ['line', 82]],
  deck: [['title', 100], ['line', 64], ['line', 52]],
  cards: [['head', 50], ['pair', 100], ['pair', 100], ['pair', 100]],
};

function Preview({ shape, icon }) {
  const rows = SHAPES[shape] ?? null;

  if (!rows || rows.length === 0) {
    return (
      <span className="tpl-paper is-blank">
        <Icon name={icon ?? 'plus'} size={24} />
      </span>
    );
  }

  return (
    <span className="tpl-paper" aria-hidden="true">
      {rows.map(([kind, value], index) => {
        if (kind === 'cells') {
          return (
            <span key={index} className="tpl-cells">
              {Array.from({ length: value }, (_, i) => (
                <span key={i} className="tpl-cell" />
              ))}
            </span>
          );
        }
        if (kind === 'check') {
          return (
            <span key={index} className="tpl-check">
              <span className="tpl-box" />
              <span className="tpl-line" style={{ width: `${value}%` }} />
            </span>
          );
        }
        if (kind === 'pair') {
          return (
            <span key={index} className="tpl-pair">
              <span className="tpl-line" style={{ width: '44%' }} />
              <span className="tpl-line" style={{ width: '40%' }} />
            </span>
          );
        }
        if (kind === 'split') {
          return (
            <span key={index} className="tpl-split">
              <span className="tpl-col" />
              <span className="tpl-col" />
            </span>
          );
        }
        return (
          <span
            key={index}
            className={`tpl-${kind}`}
            style={{ width: `${value}%` }}
          />
        );
      })}
    </span>
  );
}

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
          <Preview shape="blank" icon="plus" />
          <span className="template-label">{t(blankLabelKey)}</span>
        </button>
      ) : null}

      {templates.map((template) => (
        <button
          key={template.id}
          type="button"
          className="template-tile"
          onClick={() => onPick(template)}
          /* The hint used to be a second line under every tile, which is what
             made the strip a wall of text. It is still here, as the thing you
             get when you wonder. */
          title={t(template.hintKey)}
        >
          <Preview shape={template.shape ?? 'doc'} icon={template.icon} />
          <span className="template-label">{t(template.labelKey)}</span>
        </button>
      ))}
    </section>
  );
}
