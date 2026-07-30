/**
 * Tiny hash router — enough for a two-screen SPA without pulling in a library.
 *
 * `#/`            → dashboard (all documents)
 * `#/folder/:id`  → dashboard filtered to one category
 * `#/doc/:id`     → the editor
 *
 * Using the hash means refreshing the tab keeps you where you were, and the
 * tablet back button behaves the way you'd expect.
 */

import { useCallback, useEffect, useState } from 'react';

function parse(hash) {
  const path = hash.replace(/^#\/?/, '');
  const [section, id] = path.split('/');

  if (section === 'doc' && id) return { name: 'doc', docId: id };
  if (section === 'folder' && id) return { name: 'dashboard', folderId: id };
  return { name: 'dashboard', folderId: null };
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

  const goToDashboard = useCallback(
    (folderId = null) => navigate(folderId ? `#/folder/${folderId}` : '#/'),
    [navigate],
  );
  const goToDocument = useCallback((docId) => navigate(`#/doc/${docId}`), [navigate]);

  return { route, navigate, goToDashboard, goToDocument };
}
