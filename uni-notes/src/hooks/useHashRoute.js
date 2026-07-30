/**
 * Hash router for the whole suite.
 *
 *   #/notes                  dashboard
 *   #/notes/folder/:id       dashboard filtered to a category
 *   #/notes/:docId           note editor
 *   #/sheets  #/sheets/:id
 *   #/slides  #/slides/:id
 *   #/languages  #/languages/:deckId
 *   #/ai  #/ai/:chatId
 *   #/settings
 *
 * The hash keeps refresh and the browser back button working without pulling in
 * a router library.
 */

import { useCallback, useEffect, useState } from 'react';

export const MODULES = ['notes', 'sheets', 'slides', 'ai', 'languages', 'settings'];

const DEFAULT_ROUTE = { module: 'notes', id: null, folderId: null };

function parse(hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts.length === 0) return DEFAULT_ROUTE;

  const [module, second, third] = parts;
  if (!MODULES.includes(module)) return DEFAULT_ROUTE;

  if (module === 'notes' && second === 'folder') {
    return { module, id: null, folderId: third ?? null };
  }
  return { module, id: second ?? null, folderId: null };
}

export function useHashRoute() {
  const [route, setRoute] = useState(() => parse(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((hash) => {
    if (window.location.hash === hash) {
      setRoute(parse(hash));
      return;
    }
    window.location.hash = hash;
  }, []);

  const goToModule = useCallback((module) => navigate(`#/${module}`), [navigate]);
  const goToItem = useCallback(
    (module, id) => navigate(`#/${module}/${id}`),
    [navigate],
  );
  const goToFolder = useCallback(
    (folderId) => navigate(folderId ? `#/notes/folder/${folderId}` : '#/notes'),
    [navigate],
  );

  return { route, navigate, goToModule, goToItem, goToFolder };
}
