import { LANGUAGES, useT } from '../i18n/index.jsx';
import { useData } from '../context/DataContext.jsx';

/** Switches the whole UI language. Stored in prefs, so it follows the account. */
export default function LanguagePicker({ compact = false }) {
  const { language } = useT();
  const { setPrefs } = useData();

  if (compact) {
    return (
      <div className="language-chips" role="group" aria-label="Language">
        {LANGUAGES.map((option) => (
          <button
            key={option.code}
            type="button"
            className={`language-chip ${option.code === language ? 'is-active' : ''}`}
            onClick={() => setPrefs({ language: option.code })}
            aria-pressed={option.code === language}
          >
            <span className="language-code" aria-hidden="true">{option.short}</span>
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="language-list">
      {LANGUAGES.map((option) => (
        <label key={option.code} className="radio-row">
          <input
            type="radio"
            name="app-language"
            value={option.code}
            checked={option.code === language}
            onChange={() => setPrefs({ language: option.code })}
          />
          <span>
            <span className="language-code" aria-hidden="true">{option.short}</span>
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}
