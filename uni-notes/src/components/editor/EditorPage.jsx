import { useCallback, useMemo, useRef, useState } from 'react';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import MoveDialog from '../ui/MoveDialog.jsx';
import RichTextEditor from './RichTextEditor.jsx';
import SaveIndicator from '../SaveIndicator.jsx';
import Toolbar from './Toolbar.jsx';
import { formatRelativeDate, wordCount } from '../../lib/text.js';
import { profileInitial } from '../../lib/storage.js';
import { useApp } from '../../context/AppContext.jsx';

const INITIAL_FORMAT_STATE = {
  bold: false,
  italic: false,
  underline: false,
  unorderedList: false,
  orderedList: false,
  block: 'p',
};

export default function EditorPage({ docId, onBack }) {
  const {
    documents,
    folders,
    activeProfile,
    profileById,
    updateDocument,
    renameDocument,
    deleteDocument,
    duplicateDocument,
  } = useApp();

  const editorRef = useRef(null);
  const [formatState, setFormatState] = useState(INITIAL_FORMAT_STATE);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moving, setMoving] = useState(false);

  const doc = documents.find((item) => item.id === docId);

  // Captured once per document so the canvas isn't re-seeded while typing.
  const initialHtml = useMemo(() => doc?.content ?? '', [docId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback(
    (html) => updateDocument(docId, { content: html }),
    [docId, updateDocument],
  );

  const handleInsertTemplate = useCallback((template) => {
    editorRef.current?.insertHtml(template.html());
  }, []);

  if (!doc) {
    return (
      <div className="editor-missing">
        <h1>That document isn't here anymore</h1>
        <p>It may have been deleted on this device.</p>
        <button type="button" className="button primary" onClick={() => onBack()}>
          Back to my documents
        </button>
      </div>
    );
  }

  const folder = folders.find((f) => f.id === doc.folderId);
  const lastEditor = profileById(doc.lastEditedBy ?? doc.ownerId);

  return (
    <div className="editor-page" style={{ '--owner-color': profileById(doc.ownerId).color }}>
      <header className="editor-header">
        <button type="button" className="icon-button back" onClick={() => onBack()} title="Back">
          ←
        </button>

        <div className="editor-title-block">
          <input
            className="editor-title-input"
            value={doc.title}
            aria-label="Document title"
            onChange={(event) => updateDocument(docId, { title: event.target.value })}
            onBlur={(event) => renameDocument(docId, event.target.value)}
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
              title="Change category"
            >
              {folder ? `${folder.emoji ?? '📁'} ${folder.name}` : '🗂️ No category'}
            </button>
            <span className="dot" aria-hidden="true">
              ·
            </span>
            <span title={`Last edited by ${lastEditor.name}`}>
              Edited {formatRelativeDate(doc.updatedAt)} by {lastEditor.name}
            </span>
          </div>
        </div>

        <div className="editor-header-actions">
          <span
            className="avatar"
            style={{ background: activeProfile.color }}
            title={`Writing as ${activeProfile.name}`}
          >
            {profileInitial(activeProfile)}
          </span>
          <button
            type="button"
            className="button ghost"
            onClick={() => duplicateDocument(docId)}
            title="Make a copy of this document"
          >
            Copy
          </button>
          <button type="button" className="button danger-ghost" onClick={() => setConfirmDelete(true)}>
            Delete
          </button>
        </div>
      </header>

      <Toolbar
        editorRef={editorRef}
        formatState={formatState}
        activeProfile={activeProfile}
        onInsertTemplate={handleInsertTemplate}
      />

      <div className="editor-scroll">
        <div className="editor-paper">
          <RichTextEditor
            ref={editorRef}
            documentId={docId}
            initialHtml={initialHtml}
            onChange={handleChange}
            onSelectionChange={setFormatState}
          />
        </div>
        <p className="editor-footnote">{wordCount(doc.content)} words · saved on this device</p>
      </div>

      {confirmDelete ? (
        <ConfirmDialog
          title={`Delete "${doc.title}"?`}
          message="This can't be undone — the document is removed from this device for good."
          confirmLabel="Delete document"
          onConfirm={() => {
            deleteDocument(docId);
            onBack();
          }}
          onClose={() => setConfirmDelete(false)}
        />
      ) : null}

      {moving ? <MoveDialog doc={doc} onClose={() => setMoving(false)} /> : null}
    </div>
  );
}
