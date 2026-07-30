import { SAVE_STATUS, useData } from '../context/DataContext.jsx';
import { useT } from '../i18n/index.jsx';

/** "Saving… / Saved" — reflects the debounced write queue, not just local state. */
export default function SaveIndicator() {
  const { t } = useT();
  const { saveStatus, storageMode } = useData();

  const label =
    saveStatus === SAVE_STATUS.error
      ? t('common.saveError')
      : saveStatus === SAVE_STATUS.saved
        ? t('common.saved')
        : storageMode === 'cloud'
          ? t('common.syncing')
          : t('common.saving');

  const icon =
    saveStatus === SAVE_STATUS.error ? '⚠️' : saveStatus === SAVE_STATUS.saved ? '☁️' : '⋯';

  return (
    <span className={`save-indicator save-${saveStatus}`} aria-live="polite">
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}
