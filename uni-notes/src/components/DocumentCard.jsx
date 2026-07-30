import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatRelativeDate, previewSnippet, wordCount } from '../lib/text.js';
import { profileInitial } from '../lib/storage.js';

/** One card on the dashboard: title, last edited, preview snippet, menu. */
export default function DocumentCard({ doc, onOpen, onRename, onDelete, onMove }) {
  const { folders, profileById, duplicateDocument } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const owner = profileById(doc.ownerId);
  const editor = profileById(doc.lastEditedBy ?? doc.ownerId);
  const folder = folders.find((f) => f.id === doc.folderId);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDocumentClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, [menuOpen]);

  const runAndClose = (action) => () => {
    setMenuOpen(false);
    action();
  };

  return (
    <article className="doc-card" style={{ '--owner-color': owner.color }}>
      <button
        type="button"
        className="doc-card-main"
        onClick={() => onOpen(doc.id)}
        aria-label={`Open ${doc.title}`}
      >
        <span className="doc-card-thumb" aria-hidden="true">
          <span className="doc-card-thumb-line" />
          <span className="doc-card-thumb-line short" />
          <span className="doc-card-thumb-line" />
          <span className="doc-card-thumb-line shorter" />
        </span>
        <h3 className="doc-card-title">{doc.title}</h3>
        <p className="doc-card-preview">{previewSnippet(doc.content)}</p>
        <div className="doc-card-meta">
          <span
            className="avatar tiny"
            style={{ background: editor.color }}
            title={`Last edited by ${editor.name}`}
          >
            {profileInitial(editor)}
          </span>
          <span>Edited {formatRelativeDate(doc.updatedAt)}</span>
          <span className="dot" aria-hidden="true">
            ·
          </span>
          <span>{wordCount(doc.content)} words</span>
        </div>
        {folder ? (
          <span className="doc-card-tag">
            {folder.emoji ?? '📁'} {folder.name}
          </span>
        ) : null}
      </button>

      <div className="doc-card-menu" ref={menuRef}>
        <button
          type="button"
          className="icon-button"
          aria-label={`More actions for ${doc.title}`}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          ⋮
        </button>
        {menuOpen ? (
          <div className="menu-popover" role="menu">
            <button type="button" role="menuitem" onClick={runAndClose(() => onOpen(doc.id))}>
              Open
            </button>
            <button type="button" role="menuitem" onClick={runAndClose(() => onRename(doc))}>
              Rename
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={runAndClose(() => duplicateDocument(doc.id))}
            >
              Make a copy
            </button>
            <button type="button" role="menuitem" onClick={runAndClose(() => onMove(doc))}>
              Move to category
            </button>
            <button
              type="button"
              role="menuitem"
              className="danger-item"
              onClick={runAndClose(() => onDelete(doc))}
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
