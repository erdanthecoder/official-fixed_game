/**
 * Is this running as an installed app rather than a browser tab?
 *
 * It matters because the landing page is a sales pitch. Someone who tapped an
 * icon on their home screen has already bought it — showing them "here is what
 * Uni does, click Let's go" every single launch would be absurd. Installed
 * launches go straight to the app.
 *
 * Three ways to detect it, because no single one covers every platform:
 *
 *   display-mode: standalone   the standard, and what Android reports
 *   navigator.standalone       Apple's own, predating the standard and still
 *                              the only thing iOS Safari sets
 *   ?source=pwa               the manifest's start_url carries it, which
 *                              catches anything the first two miss
 *
 * The media query is watched rather than read once: a desktop PWA can be
 * installed while the tab is open, and Chrome flips the mode without a reload.
 */

import { useEffect, useState } from 'react';

const QUERY = '(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)';

function detect() {
  if (typeof window === 'undefined') return false;
  if (window.navigator.standalone === true) return true;
  if (new URLSearchParams(window.location.search).get('source') === 'pwa') return true;
  return window.matchMedia?.(QUERY).matches ?? false;
}

export function useStandalone() {
  const [standalone, setStandalone] = useState(detect);

  useEffect(() => {
    const media = window.matchMedia?.(QUERY);
    if (!media) return undefined;
    const onChange = () => setStandalone(detect());
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return standalone;
}
