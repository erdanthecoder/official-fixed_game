import { useMemo, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import ItemCard, { EditedMeta } from '../shared/ItemCard.jsx';
import ModuleHeader, { sortItems } from '../shared/ModuleHeader.jsx';
import PromptDialog from '../ui/PromptDialog.jsx';
import TemplateStrip from '../shared/TemplateStrip.jsx';
import { SHEET_TEMPLATES, blankSheet } from '../../lib/templates/sheets.js';
import { cellRef, displayValue } from '../../lib/formula.js';
import { useData } from '../../context/DataContext.jsx';
import { useT } from '../../i18n/index.jsx';
import { useView } from '../../hooks/useView.js';

/** A 3×3 peek at the top-left of the sheet, so cards are distinguishable. */
function SheetThumb({ sheet }) {
  const rows = [0, 1, 2];
  const cols = [0, 1, 2];
  return (
    <span className="sheet-thumb" aria-hidden="true">
      {rows.map((row) => (
        <span className="sheet-thumb-row" key={row}>
          {cols.map((col) => {
            const value = displayValue(cellRef(row, col), sheet.cells ?? {});
            return (
              <span className={`sheet-thumb-cell ${row === 0 ? 'is-head' : ''}`} key={col}>
                {String(value).slice(0, 8)}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}

export default function SheetsDashboard({ onOpen }) {
  const { t } = useT();
  const [view, setView] = useView();
  const { sheets, create, update, remove, duplicate } = useData();

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('updated');
  const [renaming, setRenaming] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = sheets.filter((sheet) => {
      if (!needle) return true;
      const inTitle = String(sheet.title ?? '').toLowerCase().includes(needle);
      const inCells = Object.values(sheet.cells ?? {}).some((cell) =>
        String(cell?.v ?? '').toLowerCase().includes(needle),
      );
      return inTitle || inCells;
    });
    return sortItems(filtered, sort);
  }, [sheets, query, sort]);

  const startSheet = (title, data) => {
    const sheet = create('sheets', { title, ...data }, { idPrefix: 'sheet' });
    onOpen(sheet.id);
  };

  const startBlank = () => startSheet(t('common.untitled'), blankSheet());
  const startFromTemplate = (template) => startSheet(t(template.labelKey), template.build());

  return (
    <div className="dashboard">
      <ModuleHeader
        product="sheets"
        title={t('sheets.title')}
        subtitle={t('sheets.subtitle')}
        count={`${visible.length} · ${t('sheets.title')}`}
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        view={view}
        onViewChange={setView}
        searchPlaceholder={t('sheets.searchPlaceholder')}
        actions={
          <button type="button" className="button primary" onClick={startBlank}>
            <Icon name="plus" size={17} />
            {t('sheets.newSheet')}
          </button>
        }
      />

      <TemplateStrip
        templates={SHEET_TEMPLATES}
        onPick={startFromTemplate}
        onBlank={startBlank}
        blankLabelKey="sheets.blankSheet"
        blankHintKey="sheets.blankHint"
        ariaLabel={t('sheets.newSheet')}
      />

      {visible.length === 0 ? (
        <EmptyState
          icon="target"
          title={query ? t('notes.noMatches') : t('sheets.emptyState')}
          body={query ? t('notes.noMatchesBody', { query }) : t('sheets.emptyBody')}
          action={
            query ? null : (
              <button type="button" className="button primary" onClick={startBlank}>
                {t('sheets.newSheet')}
              </button>
            )
          }
        />
      ) : (
        <div className={view === 'list' ? 'doc-rows' : 'doc-grid'}>
          {visible.map((sheet) => (
            <ItemCard
              view={view}
              product="sheets"
              key={sheet.id}
              title={sheet.title || t('common.untitled')}
              accent="#188038"
              thumb={<SheetThumb sheet={sheet} />}
              meta={
                <EditedMeta
                  timestamp={sheet.updatedAt}
                  extra={t('sheets.rowsCols', {
                    rows: sheet.rows ?? 0,
                    cols: sheet.cols ?? 0,
                  })}
                />
              }
              onOpen={() => onOpen(sheet.id)}
              actions={[
                { label: t('common.open'), run: () => onOpen(sheet.id) },
                { label: t('common.rename'), run: () => setRenaming(sheet) },
                { label: t('common.copy'), run: () => duplicate('sheets', sheet.id) },
                { label: t('common.delete'), run: () => setDeleting(sheet), danger: true },
              ]}
            />
          ))}
        </div>
      )}

      {renaming ? (
        <PromptDialog
          title={t('sheets.renameSheet')}
          label={t('sheets.sheetTitle')}
          initialValue={renaming.title}
          confirmLabel={t('common.save')}
          cancelLabel={t('common.cancel')}
          onConfirm={(title) =>
            update('sheets', renaming.id, { title: title.trim() || t('common.untitled') }, { immediate: true })
          }
          onClose={() => setRenaming(null)}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={t('sheets.deleteSheetTitle', { name: deleting.title })}
          message={t('common.deleteForeverWarning')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => remove('sheets', deleting.id)}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </div>
  );
}
