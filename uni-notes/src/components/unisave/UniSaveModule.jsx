import { useMemo, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import ModuleHeader, { sortItems } from '../shared/ModuleHeader.jsx';
import ProductIcon, { PRODUCTS } from '../brand/ProductIcon.jsx';
import PromptDialog from '../ui/PromptDialog.jsx';
import ShareDialog from './ShareDialog.jsx';
import { ROLE, isSharedWithOthers, roleOf, titleOf } from '../../lib/model.js';
import { formatRelativeDate, previewSnippet, wordCount } from '../../lib/text.js';
import { planStats } from '../../lib/templates/tasks.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useData } from '../../context/DataContext.jsx';
import { useT } from '../../i18n/index.jsx';

/** UniSave shows every kind of document in one list, so it needs a map. */
const KINDS = [
  { collection: 'notes', product: 'notes', module: 'notes', titleKey: 'title' },
  { collection: 'sheets', product: 'sheets', module: 'sheets', titleKey: 'title' },
  { collection: 'presentations', product: 'slides', module: 'slides', titleKey: 'title' },
  { collection: 'boards', product: 'canvas', module: 'canvas', titleKey: 'title' },
  { collection: 'plans', product: 'tasks', module: 'tasks', titleKey: 'title' },
  { collection: 'decks', product: 'languages', module: 'languages', titleKey: 'name' },
];

const FILTERS = [
  { id: 'all', labelKey: 'unisave.filterAll' },
  { id: 'mine', labelKey: 'unisave.filterMine' },
  { id: 'shared', labelKey: 'unisave.filterShared' },
  { id: 'sharedByMe', labelKey: 'unisave.filterSharedByMe' },
];

/**
 * UniSave — one place holding everything, and where sharing happens.
 *
 * Notes, Sheets, Slides and Languages each show their own documents; this shows
 * all of them together, which is what you want when you're thinking "where did
 * I put that" rather than "I want to write".
 */
export default function UniSaveModule({ onOpen }) {
  const { t } = useT();
  const { uid } = useAuth();
  const data = useData();
  const { update, remove, duplicate, leaveDocument, storageMode } = data;

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('updated');
  const [filter, setFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [sharing, setSharing] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [leaving, setLeaving] = useState(null);

  /** Flatten every collection into one list, tagged with where it came from. */
  const everything = useMemo(() => {
    const lists = {
      notes: data.notes,
      sheets: data.sheets,
      presentations: data.presentations,
      boards: data.boards,
      plans: data.plans,
      decks: data.vocabDecks,
    };

    return KINDS.flatMap((kind) =>
      (lists[kind.collection] ?? []).map((document) => ({
        ...kind,
        document,
        title: titleOf(document, t('common.untitled')),
        role: roleOf(document, uid),
        isMine: !document.ownerUid || document.ownerUid === uid,
      })),
    );
  }, [data.notes, data.sheets, data.presentations, data.boards, data.plans, data.vocabDecks, t, uid]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = everything.filter((entry) => {
      if (kindFilter !== 'all' && entry.collection !== kindFilter) return false;

      if (filter === 'mine' && !entry.isMine) return false;
      if (filter === 'shared' && entry.isMine) return false;
      if (filter === 'sharedByMe' && !(entry.isMine && isSharedWithOthers(entry.document))) {
        return false;
      }

      if (!needle) return true;
      return entry.title.toLowerCase().includes(needle);
    });

    return sortItems(
      filtered.map((entry) => ({ ...entry, updatedAt: entry.document.updatedAt, createdAt: entry.document.createdAt })),
      sort,
      'title',
    );
  }, [everything, filter, kindFilter, query, sort]);

  const counts = useMemo(
    () => ({
      all: everything.length,
      mine: everything.filter((entry) => entry.isMine).length,
      shared: everything.filter((entry) => !entry.isMine).length,
      sharedByMe: everything.filter((entry) => entry.isMine && isSharedWithOthers(entry.document))
        .length,
    }),
    [everything],
  );

  /** A one-line description of each row: type, size, who else is on it. */
  const describe = (entry) => {
    const { document, collection } = entry;
    if (collection === 'notes') return t('common.words', { count: wordCount(document.content) });
    if (collection === 'sheets') {
      return t('sheets.rowsCols', { rows: document.rows ?? 0, cols: document.cols ?? 0 });
    }
    if (collection === 'presentations') {
      return `${document.slides?.length ?? 0} · ${t('slides.slide')}`;
    }
    if (collection === 'boards') {
      return t('canvas.shapeCount', { count: document.shapes?.length ?? 0 });
    }
    if (collection === 'plans') {
      const stats = planStats(document);
      return t('tasks.doneOf', { done: stats.done, total: stats.total });
    }
    return t('languages.cards', { count: document.cards?.length ?? 0 });
  };

  const peopleLabel = (entry) => {
    const members = entry.document.memberUids?.length ?? 1;
    if (members <= 1) return null;
    return entry.isMine
      ? t('unisave.sharedWithCount', { count: members - 1 })
      : t('unisave.sharedByOwner', { name: entry.document.members?.[entry.document.ownerUid]?.name || t('unisave.someone') });
  };

  return (
    <div className="dashboard unisave">
      <ModuleHeader
        product="unisave"
        title={t('unisave.title')}
        subtitle={t('unisave.subtitle')}
        count={t('unisave.count', { count: visible.length })}
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        searchPlaceholder={t('unisave.searchPlaceholder')}
      />

      <div className="unisave-filters">
        <div className="filter-row" role="group" aria-label={t('unisave.filterAll')}>
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`filter-chip ${filter === option.id ? 'is-active' : ''}`}
              onClick={() => setFilter(option.id)}
              aria-pressed={filter === option.id}
            >
              {t(option.labelKey)}
              <span className="filter-count">{counts[option.id]}</span>
            </button>
          ))}
        </div>

        <div className="filter-row" role="group" aria-label={t('unisave.type')}>
          <button
            type="button"
            className={`filter-chip ${kindFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => setKindFilter('all')}
            aria-pressed={kindFilter === 'all'}
          >
            {t('unisave.anyType')}
          </button>
          {KINDS.map((kind) => (
            <button
              key={kind.collection}
              type="button"
              className={`filter-chip has-icon ${kindFilter === kind.collection ? 'is-active' : ''}`}
              onClick={() => setKindFilter(kind.collection)}
              aria-pressed={kindFilter === kind.collection}
            >
              <ProductIcon product={kind.product} size={18} />
              {t(PRODUCTS[kind.product].labelKey)}
            </button>
          ))}
        </div>
      </div>

      {storageMode !== 'cloud' ? (
        <p className="unisave-local-note">{t('unisave.localNote')}</p>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          icon="tabs"
          title={query ? t('notes.noMatches') : t('unisave.emptyTitle')}
          body={query ? t('notes.noMatchesBody', { query }) : t('unisave.emptyBody')}
        />
      ) : (
        <div className="file-table" role="table" aria-label={t('unisave.title')}>
          <div className="file-head" role="row">
            <span role="columnheader">{t('unisave.colName')}</span>
            <span role="columnheader">{t('unisave.colType')}</span>
            <span role="columnheader">{t('unisave.colPeople')}</span>
            <span role="columnheader">{t('common.lastEdited')}</span>
            <span role="columnheader" className="sr-only">
              {t('common.more')}
            </span>
          </div>

          {visible.map((entry) => {
            const canShare = entry.isMine;
            const readOnly = entry.role === ROLE.viewer;

            return (
              <div className="file-row" role="row" key={`${entry.collection}:${entry.document.id}`}>
                <button
                  type="button"
                  className="file-main"
                  role="cell"
                  onClick={() => onOpen(entry.module, entry.document.id)}
                >
                  <ProductIcon product={entry.product} size={30} />
                  <span className="file-text">
                    <strong>{entry.title}</strong>
                    <small>
                      {entry.collection === 'notes'
                        ? previewSnippet(entry.document.content, 68)
                        : describe(entry)}
                    </small>
                  </span>
                  {readOnly ? <span className="file-badge">{t('share.roleViewer')}</span> : null}
                </button>

                <span className="file-kind" role="cell">
                  {t(PRODUCTS[entry.product].labelKey)}
                </span>

                <span className="file-people" role="cell">
                  {peopleLabel(entry) ?? <span className="file-private">{t('unisave.privateOnly')}</span>}
                </span>

                <span className="file-date" role="cell">
                  {formatRelativeDate(entry.document.updatedAt, t)}
                </span>

                <span className="file-actions" role="cell">
                  {/*
                    Always offered, even in local mode: the dialog is where
                    someone finds out that sharing needs an account. Hiding the
                    button just makes the feature invisible.
                  */}
                  <button
                    type="button"
                    className="button ghost tiny"
                    onClick={() => setSharing(entry)}
                  >
                    {canShare ? t('unisave.share') : t('unisave.viewPeople')}
                  </button>
                  <button
                    type="button"
                    className="icon-button small"
                    title={t('common.rename')}
                    aria-label={`${t('common.rename')} — ${entry.title}`}
                    disabled={readOnly}
                    onClick={() => setRenaming(entry)}
                  >
                    <Icon name="edit" size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-button small"
                    title={t('common.copy')}
                    aria-label={`${t('common.copy')} — ${entry.title}`}
                    onClick={() => duplicate(entry.collection, entry.document.id, { titleKey: entry.titleKey })}
                  >
                    <Icon name="copy" size={15} />
                  </button>
                  {entry.isMine ? (
                    <button
                      type="button"
                      className="icon-button small"
                      title={t('common.delete')}
                      aria-label={`${t('common.delete')} — ${entry.title}`}
                      onClick={() => setDeleting(entry)}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="icon-button small"
                      title={t('unisave.leave')}
                      aria-label={`${t('unisave.leave')} — ${entry.title}`}
                      onClick={() => setLeaving(entry)}
                    >
                      <Icon name="leave" size={15} />
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {sharing ? (
        <ShareDialog document={sharing.document} onClose={() => setSharing(null)} />
      ) : null}

      {renaming ? (
        <PromptDialog
          title={t('common.rename')}
          label={t('unisave.colName')}
          initialValue={renaming.title}
          confirmLabel={t('common.save')}
          cancelLabel={t('common.cancel')}
          onConfirm={(value) =>
            update(
              renaming.collection,
              renaming.document.id,
              { [renaming.titleKey]: value.trim() || t('common.untitled') },
              { immediate: true },
            )
          }
          onClose={() => setRenaming(null)}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={t('unisave.deleteTitle', { name: deleting.title })}
          message={
            isSharedWithOthers(deleting.document)
              ? t('unisave.deleteSharedBody')
              : t('common.deleteForeverWarning')
          }
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => remove(deleting.collection, deleting.document.id)}
          onClose={() => setDeleting(null)}
        />
      ) : null}

      {leaving ? (
        <ConfirmDialog
          title={t('unisave.leaveTitle', { name: leaving.title })}
          message={t('unisave.leaveBody')}
          confirmLabel={t('unisave.leave')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => leaveDocument(leaving.collection, leaving.document.id)}
          onClose={() => setLeaving(null)}
        />
      ) : null}
    </div>
  );
}
