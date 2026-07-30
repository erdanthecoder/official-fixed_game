import { useState } from 'react';
import Modal from './Modal.jsx';

/** One-field dialog used for renaming documents, folders and profiles. */
export default function PromptDialog({
  title,
  label,
  initialValue = '',
  confirmLabel = 'Save',
  placeholder,
  onConfirm,
  onClose,
}) {
  const [value, setValue] = useState(initialValue);

  const submit = (event) => {
    event.preventDefault();
    onConfirm(value);
    onClose();
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="prompt-dialog-form" className="button primary">
            {confirmLabel}
          </button>
        </>
      }
    >
      <form id="prompt-dialog-form" onSubmit={submit}>
        <label className="field">
          <span>{label}</span>
          <input
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
      </form>
    </Modal>
  );
}
