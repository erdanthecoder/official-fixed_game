import Scenery from '../Scenery.jsx';
import Icon from '../ui/Icon.jsx';
import { useT } from '../../i18n/index.jsx';

const SORTS = [
  { id: 'updated', labelKey: 'common.lastEdited' },
  { id: 'created', labelKey: 'common.newest' },
  { id: 'title', labelKey: 'common.titleAZ' },
];

/**
 * The banner every module dashboard starts with: Issyk-Kul scenery, the module
 * name, a count line, search and sort.
 */
export default function ModuleHeader({
  slot,
  title,
  subtitle,
  count,
  query,
  onQueryChange,
  sort,
  onSortChange,
  searchPlaceholder,
  actions,
}) {
  const { t } = useT();

  return (
    <header className="module-header">
      <Scenery slot={slot} className="module-banner">
        <div className="module-banner-text">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {actions ? <div className="module-banner-actions">{actions}</div> : null}
      </Scenery>

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
