import { useState } from 'react';
import Icon from './Icon.jsx';
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
              <span className="radio-label">
                <Icon name={folder.icon ?? 'folder'} size={16} />
                {folder.name}
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
          <span className="radio-label">
            <Icon name="inbox" size={16} />
            {t('common.noCategory')}
          </span>
        </label>
      </div>
    </Modal>
  );
}
