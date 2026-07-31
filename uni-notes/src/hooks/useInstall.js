/**
 * Installing the app, and updating it once installed.
 *
 * Two things Android does that a browser tab does not, both of which need the
 * page to cooperate:
 *
 * `beforeinstallprompt` fires when Chrome decides the app is installable. The
 * event has to be captured and held — calling `prompt()` later is only allowed
 * if you kept the original event, and it can only be used once. Firefox and
 * Iso Safari never fire it at all, which is why `canInstall` is false there and
 * ANDROID.md explains the manual route instead.
 *
 * The update half exists because the service worker deliberately does not
 * `skipWaiting()`. A new build sits in `waiting` until somebody agrees to it,
 * so the page has to notice and ask. `controllerchange` then fires once the new
 * worker takes over, and one reload lands on the new build.
 */

import { useCallback, useEffect, useState } from 'react';

export function useInstall() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(
    () => window.matchMedia?.('(display-mode: standalone)').matches ?? false,
  );

  useEffect(() => {
    const onPrompt = (event) => {
      // Chrome shows its own mini-infobar unless this is prevented; we want the
      // invitation to appear in Settings, where it is not in the way.
      event.preventDefault();
      setPromptEvent(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return false;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    // The event is spent either way — Chrome will fire a fresh one if the user
    // declined and later becomes eligible again.
    setPromptEvent(null);
    return outcome === 'accepted';
  }, [promptEvent]);

  return { canInstall: Boolean(promptEvent), installed, install };
}

export function useAppUpdate() {
  const [waiting, setWaiting] = useState(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return undefined;

    let registration = null;
    let cancelled = false;

    const watch = (reg) => {
      registration = reg;
      // A worker already waiting from a previous visit.
      if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);

      reg.addEventListener('updatefound', () => {
        const next = reg.installing;
        if (!next) return;
        next.addEventListener('statechange', () => {
          // `controller` is null on the very first install — that is not an
          // update, it is the app arriving, and prompting for it would be odd.
          if (next.state === 'installed' && navigator.serviceWorker.controller) {
            setWaiting(next);
          }
        });
      });
    };

    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((reg) => {
        if (!cancelled) watch(reg);
      })
      .catch(() => {
        // No service worker means no offline and no install prompt. Everything
        // else works, so this is not worth telling anyone about.
      });

    // One reload, when the new worker actually takes control.
    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    // Check again on return — a tab left open for days would otherwise never
    // look. Cheap: a 304 when nothing changed.
    const onVisible = () => {
      if (document.visibilityState === 'visible') registration?.update?.().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    waiting?.postMessage('apply-update');
  }, [waiting]);

  return { updateReady: Boolean(waiting), applyUpdate };
}
