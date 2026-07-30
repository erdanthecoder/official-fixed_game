/**
 * Translation provider.
 *
 * `t('notes.newDoc')` looks up the active language, falls back to English for
 * any key that hasn't been translated yet, and finally returns the key itself
 * so a typo is visible instead of rendering an empty label.
 *
 * `t('common.words', { count: 12 })` fills {placeholders}.
 */

import { createContext, useCallback, useContext, useMemo } from 'react';
import { DEFAULT_LANGUAGE, LANGUAGES, TRANSLATIONS } from './translations.js';

const I18nContext = createContext(null);

function lookup(dictionary, path) {
  return path.split('.').reduce((node, key) => (node == null ? undefined : node[key]), dictionary);
}

function interpolate(template, values) {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}

export function I18nProvider({ language = DEFAULT_LANGUAGE, children }) {
  const active = TRANSLATIONS[language] ? language : DEFAULT_LANGUAGE;

  const t = useCallback(
    (path, values) => {
      const translated = lookup(TRANSLATIONS[active], path);
      const fallback = translated ?? lookup(TRANSLATIONS[DEFAULT_LANGUAGE], path);
      if (typeof fallback !== 'string') return path;
      return interpolate(fallback, values);
    },
    [active],
  );

  const value = useMemo(() => ({ t, language: active, languages: LANGUAGES }), [t, active]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useT must be used inside <I18nProvider>');
  return context;
}

export { LANGUAGES };
