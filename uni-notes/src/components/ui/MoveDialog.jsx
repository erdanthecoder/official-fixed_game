import { useState } from 'react';
import Modal from './Modal.jsx';
import { useData } from '../../context/DataContext.jsx';
import { useT } from '../../i18n/index.jsx';

/** Pick which category a note belongs to. */
export default function MoveDialog({ note, onClose }) {
  const { t } = useT();
  const { folders, update } = useData();
  const [selected, setSelected] = useState(note.folderId ?? '');

  return (
    <Modal
      title={`${t('common.moveTo')} — ${note.title || t('common.untitled')}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="button primary"
            onClick={() => {
              update('notes', note.id, { folderId: selected || null }, { immediate: true });
              onClose();
            }}
          >
            {t('common.move')}
          </button>
        </>
      }
    >
      <div className="radio-list">
        {folders
          .slice()
          .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
          .map((folder) => (
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
          <span>🗂️ {t('common.noCategory')}</span>
        </label>
      </div>
    </Modal>
  );
}
