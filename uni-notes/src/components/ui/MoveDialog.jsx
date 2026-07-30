import { useState } from 'react';
import Modal from './Modal.jsx';
import { useApp } from '../../context/AppContext.jsx';

/** Pick which category a document belongs to. */
export default function MoveDialog({ doc, onClose }) {
  const { folders, moveDocument } = useApp();
  const [selected, setSelected] = useState(doc.folderId ?? '');

  return (
    <Modal
      title={`Move "${doc.title}"`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="button primary"
            onClick={() => {
              moveDocument(doc.id, selected || null);
              onClose();
            }}
          >
            Move
          </button>
        </>
      }
    >
      <div className="radio-list">
        {folders.map((folder) => (
          <label key={folder.id} className="radio-row">
            <input
              type="radio"
              name="folder"
              value={folder.id}
              checked={selected === folder.id}
              onChange={() => setSelected(folder.id)}
            />
            <span>
              {folder.emoji ?? '📁'} {folder.name}
            </span>
          </label>
        ))}
        <label className="radio-row">
          <input
            type="radio"
            name="folder"
            value=""
            checked={selected === ''}
            onChange={() => setSelected('')}
          />
          <span>🗂️ No category</span>
        </label>
      </div>
    </Modal>
  );
}
