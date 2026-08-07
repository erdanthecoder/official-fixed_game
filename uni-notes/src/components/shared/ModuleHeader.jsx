import Icon from '../ui/Icon.jsx';
import ProductIcon from '../brand/ProductIcon.jsx';
import { useT } from '../../i18n/index.jsx';

const SORTS = [
  { id: 'updated', labelKey: 'common.lastEdited' },
  { id: 'created', labelKey: 'common.newest' },
  { id: 'title', labelKey: 'common.titleAZ' },
];

/**
 * The top of a module dashboard.
 *
 * This used to open with a 190-pixel photograph of Issyk-Kul, and so did every
 * other module — which is what made the suite feel repetitive rather than
 * consistent. Seven apps, seven hero images, and by the second one you have
 * stopped seeing it: it is a decoration in the position where the work should
 * be, and it pushed the actual documents below the fold.
 *
 * Workspace does not do this, and the reason is worth stating. Drive, Docs and
 * Sheets all open on a compact title row and then go straight to the files;
 * the product's identity is carried by its colour and its icon, not by a
 * picture on top of every screen. The scenery is still here — on Home, on the
 * landing page, behind sign-in — where a large image is the content rather
 * than an obstacle to it.
 *
 * What replaces it is a two-line header and a toolbar: the module's colour as a
 * mark, the name, the count, and the controls that act on the list below —
 * search, sort, and grid-or-list.
 */
export default function ModuleHeader({
  product,
  title,
  subtitle,
  count,
  query,
  onQueryChange,
  sort,
  onSortChange,
  searchPlaceholder,
  actions,
  view,
  onViewChange,
}) {
  const { t } = useT();

  return (
    <header className="module-header">
      <div className="module-title-row">
        {product ? (
          <span className="module-title-mark" aria-hidden="true">
            <ProductIcon product={product} size={42} variant="plain" />
          </span>
        ) : null}

        <div className="module-title-text">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>

        {actions ? <div className="module-title-actions">{actions}</div> : null}
      </div>

      <div className="module-toolbar">
        <p className="module-count">{count}</p>

        <div className="module-controls">
          {onQueryChange ? (
            <label className="search-field">
              <Icon name="search" size={16} />
              <input
                type="search"
                value={query}
                placeholder={searchPlaceholder ?? t('common.search')}
                onChange={(event) => onQueryChange(event.target.value)}
                aria-label={t('common.search')}
              />
            </label>
          ) : null}

          {onSortChange ? (
            <label className="select-field">
              <span className="sr-only">{t('common.sortBy')}</span>
              <select value={sort} onChange={(event) => onSortChange(event.target.value)}>
                {SORTS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {/*
            One control with two states, not two buttons — the pair reads as a
            switch, which is what it is, and it takes the width of one button.
          */}
          {onViewChange ? (
            <div className="view-switch" role="group" aria-label={t('common.view')}>
              <button
                type="button"
                className={view === 'list' ? 'is-on' : undefined}
                aria-pressed={view === 'list'}
                title={t('common.viewList')}
                aria-label={t('common.viewList')}
                onClick={() => onViewChange('list')}
              >
                <Icon name="list" size={16} />
              </button>
              <button
                type="button"
                className={view === 'grid' ? 'is-on' : undefined}
                aria-pressed={view === 'grid'}
                title={t('common.viewGrid')}
                aria-label={t('common.viewGrid')}
                onClick={() => onViewChange('grid')}
              >
                <Icon name="grid" size={16} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function sortItems(items, sort, titleKey = 'title') {
  return items.slice().sort((a, b) => {
    if (sort === 'title') return String(a[titleKey] ?? '').localeCompare(String(b[titleKey] ?? ''));
    if (sort === 'created') return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
  });
}
