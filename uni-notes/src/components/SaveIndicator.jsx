import { SAVE_STATUS, useApp } from '../context/AppContext.jsx';
import { formatExactDate } from '../lib/text.js';

const LABELS = {
  [SAVE_STATUS.saved]: { text: 'Saved', icon: '☁️' },
  [SAVE_STATUS.pending]: { text: 'Saving…', icon: '⋯' },
  [SAVE_STATUS.saving]: { text: 'Saving…', icon: '⋯' },
  [SAVE_STATUS.error]: { text: "Couldn't save", icon: '⚠️' },
};

export default function SaveIndicator() {
  const { saveStatus, lastSavedAt } = useApp();
  const { text, icon } = LABELS[saveStatus] ?? LABELS[SAVE_STATUS.saved];

  return (
    <span
      className={`save-indicator save-${saveStatus}`}
      title={
        saveStatus === SAVE_STATUS.error
          ? 'Your browser blocked local storage — try turning off private browsing.'
          : `Last saved to this device: ${formatExactDate(lastSavedAt)}`
      }
      aria-live="polite"
    >
      <span aria-hidden="true">{icon}</span>
      {text}
    </span>
  );
}
