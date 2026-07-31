import { useMemo, useState } from 'react';
import BoardView from './BoardView.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import Icon from '../ui/Icon.jsx';
import ItemCard, { EditedMeta } from '../shared/ItemCard.jsx';
import ModuleHeader, { sortItems } from '../shared/ModuleHeader.jsx';
import PromptDialog from '../ui/PromptDialog.jsx';
import TemplateStrip from '../shared/TemplateStrip.jsx';
import { BOARD_TEMPLATES, blankBoard } from '../../lib/templates/canvas.js';
import { useData } from '../../context/DataContext.jsx';
import { useT } from '../../i18n/index.jsx';

export default function CanvasDashboard({ onOpen }) {
  const { t } = useT();
  const { boards, create, update, remove, duplicate } = useData();

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('updated');
  const [renaming, setRenaming] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = boards.filter((board) => {
      if (!needle) return true;
      if (String(board.title ?? '').toLowerCase().includes(needle)) return true;
      // Text written on the board counts as content worth searching.
      return (board.shapes ?? []).some(
        (shape) => shape.type === 'text' && String(shape.text ?? '').toLowerCase().includes(needle),
      );
    });
    return sortItems(filtered, sort);
  }, [boards, query, sort]);

  const startBoard = (title, data) => {
    const board = create('boards', { title, ...data }, { idPrefix: 'board' });
    onOpen(board.id);
  };

  const startBlank = () => startBoard(t('common.untitled'), blankBoard());
  const startFromTemplate = (template) => startBoard(t(template.labelKey), template.build());

  return (
    <div className="dashboard">
      <ModuleHeader
        slot="canvas"
        title={t('canvas.title')}
        subtitle={t('canvas.subtitle')}
        count={`${visible.length} · ${t('canvas.title')}`}
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        searchPlaceholder={t('canvas.searchPlaceholder')}
        actions={
          <button type="button" className="button primary on-scenery" onClick={startBlank}>
            <Icon name="plus" size={17} />
            {t('canvas.newBoard')}
          </button>
        }
      />

      <TemplateStrip
        templates={BOARD_TEMPLATES}
        onPick={startFromTemplate}
        onBlank={startBlank}
        blankLabelKey="canvas.blankBoard"
        blankHintKey="canvas.blankHint"
        ariaLabel={t('canvas.newBoard')}
      />

      {visible.length === 0 ? (
        <EmptyState
          icon="pen"
          title={query ? t('notes.noMatches') : t('canvas.emptyState')}
          body={query ? t('notes.noMatchesBody', { query }) : t('canvas.emptyBody')}
          action={
            query ? null : (
              <button type="button" className="button primary" onClick={startBlank}>
                {t('canvas.newBoard')}
              </button>
            )
          }
        />
      ) : (
        <div className="doc-grid">
          {visible.map((board) => (
            <ItemCard
              key={board.id}
              title={board.title || t('common.untitled')}
              accent="#0f7b6c"
              thumb={
                <span className="board-card-thumb">
                  <BoardView
                    id={`thumb-${board.id}`}
                    shapes={board.shapes ?? []}
                    background={board.background ?? 'grid'}
                  />
                </span>
              }
              meta={
                <EditedMeta
                  timestamp={board.updatedAt}
                  extra={t('canvas.shapeCount', { count: board.shapes?.length ?? 0 })}
                />
              }
              onOpen={() => onOpen(board.id)}
              actions={[
                { label: t('common.open'), run: () => onOpen(board.id) },
                { label: t('common.rename'), run: () => setRenaming(board) },
                { label: t('common.copy'), run: () => duplicate('boards', board.id) },
                { label: t('common.delete'), run: () => setDeleting(board), danger: true },
              ]}
            />
          ))}
        </div>
      )}

      {renaming ? (
        <PromptDialog
          title={t('canvas.renameBoard')}
          label={t('canvas.boardTitle')}
          initialValue={renaming.title}
          confirmLabel={t('common.save')}
          cancelLabel={t('common.cancel')}
          onConfirm={(title) =>
            update(
              'boards',
              renaming.id,
              { title: title.trim() || t('common.untitled') },
              { immediate: true },
            )
          }
          onClose={() => setRenaming(null)}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={t('canvas.deleteBoardTitle', { name: deleting.title })}
          message={t('common.deleteForeverWarning')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => remove('boards', deleting.id)}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </div>
  );
}
