import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import ConfirmDialog from './ui/ConfirmDialog.jsx';
import DocumentCard from './DocumentCard.jsx';
import MoveDialog from './ui/MoveDialog.jsx';
import PromptDialog from './ui/PromptDialog.jsx';
import { TEMPLATES, templateAsDocument } from '../lib/templates.js';

const SORTS = [
  { id: 'updated', label: 'Last edited' },
  { id: 'created', label: 'Newest' },
  { id: 'title', label: 'Title A–Z' },
];

export default function Dashboard({ folderId, onOpenDocument, onNewDocument }) {
  const { documents, folders, createDocument, renameDocument, deleteDocument, activeProfile } =
    useApp();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('updated');
  const [renaming, setRenaming] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [moving, setMoving] = useState(null);

  const folder = folders.find((f) => f.id === folderId) ?? null;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = documents.filter((doc) => {
      const matchesFolder =
        folderId === null
          ? true
          : folderId === 'none'
            ? !doc.folderId
            : doc.folderId === folderId;
      if (!matchesFolder) return false;
      if (!needle) return true;
      return (
        doc.title.toLowerCase().includes(needle) ||
        doc.content.toLowerCase().includes(needle)
      );
    });

    return filtered.sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'created') return b.createdAt - a.createdAt;
      return b.updatedAt - a.updatedAt;
    });
  }, [documents, folderId, query, sort]);

  const heading =
    folderId === null ? 'All documents' : folderId === 'none' ? 'No category' : folder?.name;

  const startFromTemplate = (template) => {
    const doc = createDocument({
      folderId: folderId === 'none' ? null : folderId,
      title: template.label,
      content: templateAsDocument(template),
    });
    onOpenDocument(doc.id);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>
            {folder?.emoji ? <span aria-hidden="true">{folder.emoji} </span> : null}
            {heading}
          </h1>
          <p className="dashboard-subtitle">
            {documents.length === 0
              ? "Nothing here yet — let's start your first doc."
              : `${visible.length} ${visible.length === 1 ? 'document' : 'documents'} · you're writing as ${activeProfile.name}`}
          </p>
        </div>

        <div className="dashboard-controls">
          <label className="search-field">
            <span aria-hidden="true">🔍</span>
            <input
              type="search"
              value={query}
              placeholder="Search notes"
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search documents"
            />
          </label>
          <label className="select-field">
            <span className="sr-only">Sort by</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              {SORTS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <section className="template-strip" aria-label="Start a new document">
        <button type="button" className="template-tile blank" onClick={onNewDocument}>
          <span className="template-icon" aria-hidden="true">
            ＋
          </span>
          <span className="template-label">Blank document</span>
          <span className="template-hint">Start from nothing</span>
        </button>
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            className="template-tile"
            onClick={() => startFromTemplate(template)}
          >
            <span className="template-icon" aria-hidden="true">
              {template.icon}
            </span>
            <span className="template-label">{template.label}</span>
            <span className="template-hint">{template.description}</span>
          </button>
        ))}
      </section>

      {visible.length === 0 ? (
        <div className="empty-state">
          <p className="empty-emoji" aria-hidden="true">
            🗒️
          </p>
          <h2>{query ? 'No matches' : 'This category is empty'}</h2>
          <p>
            {query
              ? `Nothing matches "${query}". Try a different word.`
              : 'Pick a template above, or start a blank document.'}
          </p>
          {query ? null : (
            <button type="button" className="button primary" onClick={onNewDocument}>
              New document
            </button>
          )}
        </div>
      ) : (
        <div className="doc-grid">
          {visible.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onOpen={onOpenDocument}
              onRename={setRenaming}
              onDelete={setDeleting}
              onMove={setMoving}
            />
          ))}
        </div>
      )}

      {renaming ? (
        <PromptDialog
          title="Rename document"
          label="Document title"
          initialValue={renaming.title}
          onConfirm={(title) => renameDocument(renaming.id, title)}
          onClose={() => setRenaming(null)}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={`Delete "${deleting.title}"?`}
          message="This can't be undone — the document is removed from this device for good."
          confirmLabel="Delete document"
          onConfirm={() => deleteDocument(deleting.id)}
          onClose={() => setDeleting(null)}
        />
      ) : null}

      {moving ? <MoveDialog doc={moving} onClose={() => setMoving(null)} /> : null}
    </div>
  );
}
