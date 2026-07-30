import { useCallback, useMemo, useRef, useState } from 'react';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import MoveDialog from '../ui/MoveDialog.jsx';
import RichTextEditor from './editor/RichTextEditor.jsx';
import SaveIndicator from '../SaveIndicator.jsx';
import Toolbar from './editor/Toolbar.jsx';
import { formatRelativeDate, wordCount } from '../../lib/text.js';
import { useData } from '../../context/DataContext.jsx';
import { useT } from '../../i18n/index.jsx';

const INITIAL_FORMAT_STATE = {
  bold: false,
  italic: false,
  underline: false,
  unorderedList: false,
  orderedList: false,
  block: 'p',
};

export default function NoteEditor({ noteId, onBack }) {
  const { t } = useT();
  const { notes, folders, update, remove, duplicate } = useData();

  const editorRef = useRef(null);
  const [formatState, setFormatState] = useState(INITIAL_FORMAT_STATE);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moving, setMoving] = useState(false);

  const note = notes.find((item) => item.id === noteId);

  // Captured once per document so the canvas isn't re-seeded while typing.
  const initialHtml = useMemo(() => note?.content ?? '', [noteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback(
    (html) => update('notes', noteId, { content: html }),
    [noteId, update],
  );

  const handleInsertTemplate = useCallback((template) => {
    editorRef.current?.insertHtml(template.html());
  }, []);

  if (!note) {
    return (
      <div className="editor-missing">
        <h1>{t('notes.missingTitle')}</h1>
        <p>{t('notes.missingBody')}</p>
        <button type="button" className="button primary" onClick={onBack}>
          {t('notes.backToDocs')}
        </button>
      </div>
    );
  }

  const folder = folders.find((item) => item.id === note.folderId);

  return (
    <div className="editor-page">
      <header className="editor-header">
        <button
          type="button"
          className="icon-button back"
          onClick={onBack}
          title={t('common.back')}
          aria-label={t('common.back')}
        >
          ←
        </button>

        <div className="editor-title-block">
          <input
            className="editor-title-input"
            value={note.title ?? ''}
            aria-label={t('notes.docTitle')}
            onChange={(event) => update('notes', noteId, { title: event.target.value })}
            onBlur={(event) =>
              update(
                'notes',
                noteId,
                { title: event.target.value.trim() || t('common.untitled') },
                { immediate: true },
              )
            }
          />
          <div className="editor-title-meta">
            <SaveIndicator />
            <span className="dot" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              className="link-button"
              onClick={() => setMoving(true)}
              title={t('notes.changeCategory')}
            >
              {folder ? `${folder.emoji ?? '📁'} ${folder.name}` : `🗂️ ${t('common.noCategory')}`}
            </button>
            <span className="dot" aria-hidden="true">
              ·
            </span>
            <span>{t('common.edited', { when: formatRelativeDate(note.updatedAt, t) })}</span>
          </div>
        </div>

        <div className="editor-header-actions">
          <button
            type="button"
            className="button ghost"
            onClick={() => duplicate('notes', noteId)}
          >
            {t('common.copy')}
          </button>
          <button
            type="button"
            className="button danger-ghost"
            onClick={() => setConfirmDelete(true)}
          >
            {t('common.delete')}
          </button>
        </div>
      </header>

      <Toolbar
        editorRef={editorRef}
        formatState={formatState}
        onInsertTemplate={handleInsertTemplate}
      />

      <div className="editor-scroll">
        <div className="editor-paper">
          <RichTextEditor
            ref={editorRef}
            documentId={noteId}
            initialHtml={initialHtml}
            onChange={handleChange}
            onSelectionChange={setFormatState}
          />
        </div>
        <p className="editor-footnote">{t('common.words', { count: wordCount(note.content) })}</p>
      </div>

      {confirmDelete ? (
        <ConfirmDialog
          title={t('notes.deleteDocTitle', { name: note.title })}
          message={t('common.deleteForeverWarning')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => {
            remove('notes', noteId);
            onBack();
          }}
          onClose={() => setConfirmDelete(false)}
        />
      ) : null}

      {moving ? <MoveDialog note={note} onClose={() => setMoving(false)} /> : null}
    </div>
  );
}
