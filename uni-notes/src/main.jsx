import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { DataProvider, useData } from './context/DataContext.jsx';
import { I18nProvider } from './i18n/index.jsx';
import './styles/global.css';
import './styles/suite.css';

/**
 * The chosen language lives in the user's prefs, which live in DataProvider —
 * so the i18n provider sits inside it and reads from there.
 */
function LocalisedApp() {
  const { prefs } = useData();
  return (
    <I18nProvider language={prefs.language}>
      <App />
    </I18nProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <DataProvider>
        <LocalisedApp />
      </DataProvider>
    </AuthProvider>
  </StrictMode>,
);
