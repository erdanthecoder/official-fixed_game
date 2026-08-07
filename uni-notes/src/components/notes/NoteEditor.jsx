import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMorphTarget } from '../../lib/morph.js';
import Icon from '../ui/Icon.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import ShareDialog from '../unisave/ShareDialog.jsx';
import Facepile from '../collab/Facepile.jsx';
import MoveDialog from '../ui/MoveDialog.jsx';
import RichTextEditor from './editor/RichTextEditor.jsx';
import SaveIndicator from '../SaveIndicator.jsx';
import Toolbar from './editor/Toolbar.jsx';
import FindReplace from './editor/FindReplace.jsx';
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
  const paperRef = useRef(null);

  // The card the user tapped grows into this page.
  useMorphTarget(paperRef);
  const [formatState, setFormatState] = useState(INITIAL_FORMAT_STATE);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [finding, setFinding] = useState(false);

  /*
   * Ctrl+F opens ours instead of the browser's.
   *
   * Overriding a browser shortcut needs a reason, and this is the one case
   * where it is clearly right: the browser's Find searches the whole page —
   * sidebar, toolbar, category names — and cannot change a word once it has
   * found it. Escape closes ours, and the browser's is still one click away in
   * the menu.
   */
  useEffect(() => {
    const onKey = (event) => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;
      const key = event.key.toLowerCase();
      if (key === 'f' || key === 'h') {
        event.preventDefault();
        setFinding(true);
      } else if (key === 'p') {
        event.preventDefault();
        window.print();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
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
          <Icon name="back" size={19} />
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
              <Icon name={folder ? (folder.icon ?? 'folder') : 'inbox'} size={14} />
              {folder ? folder.name : t('common.noCategory')}
            </button>
            <span className="dot" aria-hidden="true">
              ·
            </span>
            <span>{t('common.edited', { when: formatRelativeDate(note.updatedAt, t) })}</span>
          </div>
        </div>

        <div className="editor-header-actions">
          <Facepile document={note} onShare={() => setSharing(true)} />
          <button type="button" className="button ghost" onClick={() => setSharing(true)}>
            <Icon name="share" size={16} />
            {t('common.share')}
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => setFinding((was) => !was)}
            title={`${t('notes.find')} (Ctrl + F)`}
            aria-label={t('notes.find')}
            aria-pressed={finding}
          >
            <Icon name="search" size={17} />
          </button>
          {/* Print is also Export as PDF: every browser's print dialog offers
              "Save as PDF", and the print stylesheet already reduces the screen
              to the page. Building a second PDF path would ship a rendering
              engine to duplicate one that is installed. */}
          <button
            type="button"
            className="icon-button"
            onClick={() => window.print()}
            title={`${t('notes.print')} (Ctrl + P)`}
            aria-label={t('notes.print')}
          >
            <Icon name="download" size={17} />
          </button>
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

      {finding ? <FindReplace editorRef={editorRef} onClose={() => setFinding(false)} /> : null}

      <div className="editor-scroll">
        <div className="editor-paper" ref={paperRef}>
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

      {sharing ? <ShareDialog document={note} onClose={() => setSharing(false)} /> : null}


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
