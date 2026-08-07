import { useMemo, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import ItemCard, { EditedMeta } from '../shared/ItemCard.jsx';
import ModuleHeader, { sortItems } from '../shared/ModuleHeader.jsx';
import MoveDialog from '../ui/MoveDialog.jsx';
import PromptDialog from '../ui/PromptDialog.jsx';
import TemplateStrip from '../shared/TemplateStrip.jsx';
import { NOTE_TEMPLATES, templateAsDocument } from '../../lib/templates/notes.js';
import { previewSnippet, wordCount } from '../../lib/text.js';
import { useData } from '../../context/DataContext.jsx';
import { useT } from '../../i18n/index.jsx';
import { useView } from '../../hooks/useView.js';

function DocThumb() {
  return (
    <span className="doc-card-thumb" aria-hidden="true">
      <span className="doc-card-thumb-line" />
      <span className="doc-card-thumb-line short" />
      <span className="doc-card-thumb-line" />
      <span className="doc-card-thumb-line shorter" />
    </span>
  );
}

export default function NotesDashboard({ folderId, onOpen }) {
  const { t } = useT();
  const [view, setView] = useView();
  const { notes, folders, create, update, remove, duplicate } = useData();

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('updated');
  const [renaming, setRenaming] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [moving, setMoving] = useState(null);

  const folder = folders.find((item) => item.id === folderId) ?? null;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = notes.filter((note) => {
      const inFolder =
        folderId === null
          ? true
          : folderId === 'none'
            ? !note.folderId
            : note.folderId === folderId;
      if (!inFolder) return false;
      if (!needle) return true;
      return (
        String(note.title ?? '').toLowerCase().includes(needle) ||
        String(note.content ?? '').toLowerCase().includes(needle)
      );
    });
    return sortItems(filtered, sort);
  }, [notes, folderId, query, sort]);

  const createNote = ({ title, content }) => {
    const note = create(
      'notes',
      {
        title,
        content,
        folderId: folderId === 'none' ? null : folderId,
      },
      { idPrefix: 'note' },
    );
    onOpen(note.id);
  };

  const startBlank = () =>
    createNote({
      title: t('common.untitled'),
      content: `<h1>${t('common.untitled')}</h1><p><br /></p>`,
    });

  const startFromTemplate = (template) => {
    const title = t(template.labelKey);
    createNote({ title, content: templateAsDocument(template, title) });
  };

  const heading =
    folderId === null
      ? t('notes.allDocs')
      : folderId === 'none'
        ? t('common.noCategory')
        : folder?.name;

  return (
    <div className="dashboard">
      <ModuleHeader
        product="notes"
        title={
          <>
            {folder ? <Icon name={folder.icon ?? 'folder'} size={20} className="heading-icon" /> : null}
            {heading}
          </>
        }
        subtitle={t('notes.subtitle')}
        count={`${visible.length} · ${t('notes.title')}`}
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        view={view}
        onViewChange={setView}
        searchPlaceholder={t('notes.searchPlaceholder')}
        actions={
          <button type="button" className="button primary" onClick={startBlank}>
            <Icon name="plus" size={17} />
            {t('notes.newDoc')}
          </button>
        }
      />

      <TemplateStrip
        templates={NOTE_TEMPLATES}
        onPick={startFromTemplate}
        onBlank={startBlank}
        blankLabelKey="notes.blankDoc"
        blankHintKey="notes.blankHint"
        ariaLabel={t('notes.newDoc')}
      />

      {visible.length === 0 ? (
        <EmptyState
          title={query ? t('notes.noMatches') : t('notes.emptyCategory')}
          body={query ? t('notes.noMatchesBody', { query }) : t('notes.pickTemplate')}
          action={
            query ? null : (
              <button type="button" className="button primary" onClick={startBlank}>
                {t('notes.newDoc')}
              </button>
            )
          }
        />
      ) : (
        <div className={view === 'list' ? 'doc-rows' : 'doc-grid'}>
          {visible.map((note) => {
            const noteFolder = folders.find((item) => item.id === note.folderId);
            return (
              <ItemCard
                view={view}
                product="notes"
                key={note.id}
                title={note.title || t('common.untitled')}
                thumb={<DocThumb />}
                preview={previewSnippet(note.content) || t('notes.emptyDoc')}
                meta={
                  <EditedMeta
                    timestamp={note.updatedAt}
                    extra={t('common.words', { count: wordCount(note.content) })}
                  />
                }
                tag={noteFolder?.name ?? null}
                tagIcon={noteFolder ? (noteFolder.icon ?? 'folder') : null}
                onOpen={() => onOpen(note.id)}
                actions={[
                  { label: t('common.open'), run: () => onOpen(note.id) },
                  { label: t('common.rename'), run: () => setRenaming(note) },
                  { label: t('common.copy'), run: () => duplicate('notes', note.id) },
                  { label: t('common.moveTo'), run: () => setMoving(note) },
                  { label: t('common.delete'), run: () => setDeleting(note), danger: true },
                ]}
              />
            );
          })}
        </div>
      )}

      {renaming ? (
        <PromptDialog
          title={t('notes.renameDoc')}
          label={t('notes.docTitle')}
          initialValue={renaming.title}
          confirmLabel={t('common.save')}
          cancelLabel={t('common.cancel')}
          onConfirm={(title) =>
            update('notes', renaming.id, { title: title.trim() || t('common.untitled') }, { immediate: true })
          }
          onClose={() => setRenaming(null)}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={t('notes.deleteDocTitle', { name: deleting.title })}
          message={t('common.deleteForeverWarning')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => remove('notes', deleting.id)}
          onClose={() => setDeleting(null)}
        />
      ) : null}

      {moving ? <MoveDialog note={moving} onClose={() => setMoving(null)} /> : null}
    </div>
  );
}
