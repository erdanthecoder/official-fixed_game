/**
 * Hash router for the whole suite.
 *
 *   #/                       the landing page (the front door)
 *   #/signin                 sign in / sign up
 *   #/join/:code             open an invite link
 *   #/notes                  dashboard
 *   #/notes/folder/:id       dashboard filtered to a category
 *   #/notes/:docId           note editor
 *   #/sheets  #/sheets/:id
 *   #/slides  #/slides/:id
 *   #/canvas  #/canvas/:boardId
 *   #/tasks   #/tasks/:planId
 *   #/languages  #/languages/:deckId
 *   #/unisave                everything, with sharing
 *   #/settings
 *
 * The hash keeps refresh and the browser back button working without pulling in
 * a router library.
 */

import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export const MODULES = [
  'home',
  'notes',
  'sheets',
  'slides',
  'canvas',
  'tasks',
  'calendar',
  'shortlist',
  'unisave',
  'languages',
  'apps',
  'settings',
];

/** Screens that sit outside the app shell. */
export const LANDING = 'landing';
export const SIGN_IN = 'signin';
export const JOIN = 'join';

const LANDING_ROUTE = { module: LANDING, id: null, folderId: null };

function parse(hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  // A bare URL is the front door, not the app.
  if (parts.length === 0) return LANDING_ROUTE;

  const [module, second, third] = parts;
  if (module === SIGN_IN) return { module: SIGN_IN, id: null, folderId: null };
  // An invite link is a URL someone was sent, so it has to survive being
  // opened by a signed-out stranger — it is handled outside the app shell.
  if (module === JOIN) return { module: JOIN, id: second ?? null, folderId: null };
  if (!MODULES.includes(module)) return LANDING_ROUTE;

  if (module === 'notes' && second === 'folder') {
    return { module, id: null, folderId: third ?? null };
  }
  return { module, id: second ?? null, folderId: null };
}

/**
 * Run a state change as a view transition when the browser has them.
 *
 * `startViewTransition` snapshots the page, applies the change, snapshots
 * again, and cross-fades between the two — which is why moving between modules
 * can look like a native app without any of the routes knowing about each
 * other. Chrome, Edge and Android Chrome have it; Safari and Firefox do not,
 * and there the callback simply runs and the change is instant, exactly as it
 * was before.
 *
 * The reduced-motion check is explicit rather than left to CSS. A view
 * transition is a real animation on a real pseudo-element; disabling it in the
 * stylesheet still pays for the snapshots.
 */
function withTransition(apply) {
  const reduced =
    document.documentElement.dataset.motion === 'reduced' ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (reduced || typeof document.startViewTransition !== 'function') {
    apply();
    return;
  }
  document.startViewTransition(apply);
}

export function useHashRoute() {
  const [route, setRoute] = useState(() => parse(window.location.hash));

  useEffect(() => {
    // Every navigation lands here, including the back gesture and a pasted
    // link — so wrapping this one place covers all of them, rather than each
    // of the seven helpers below having to remember.
    const onChange = () => withTransition(() => flushSync(() => setRoute(parse(window.location.hash))));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((hash) => {
    // Re-navigating to where you already are still needs to re-render (the
    // module resets its own view), but there is no hashchange to hear it.
    if (window.location.hash === hash) {
      withTransition(() => flushSync(() => setRoute(parse(hash))));
      return;
    }
    window.location.hash = hash;
  }, []);

  const goToModule = useCallback((module) => navigate(`#/${module}`), [navigate]);
  const goToLanding = useCallback(() => navigate('#/'), [navigate]);
  const goToSignIn = useCallback(() => navigate(`#/${SIGN_IN}`), [navigate]);
  const goToJoin = useCallback((code) => navigate(`#/${JOIN}/${code}`), [navigate]);
  const goToItem = useCallback(
    (module, id) => navigate(`#/${module}/${id}`),
    [navigate],
  );
  const goToFolder = useCallback(
    (folderId) => navigate(folderId ? `#/notes/folder/${folderId}` : '#/notes'),
    [navigate],
  );

  return { route, navigate, goToModule, goToItem, goToFolder, goToLanding, goToSignIn, goToJoin };
}
