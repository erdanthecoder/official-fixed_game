/**
 * Preferences that change how the whole app looks or behaves.
 *
 * They are applied to `<html>` as attributes rather than passed down through
 * React, because the things they affect — root font size, whether animations
 * run — belong to CSS, and threading them through forty components to end up
 * back in CSS would be a long way round.
 *
 * Stored in prefs, so they follow the account between devices rather than being
 * per-browser. Someone who needs larger text needs it on both their phone and
 * their laptop.
 */

import { useEffect } from 'react';

export const THEMES = [
  { id: 'system', labelKey: 'settings.themeSystem' },
  { id: 'light', labelKey: 'settings.themeLight' },
  { id: 'dark', labelKey: 'settings.themeDark' },
];

export const TEXT_SIZES = [
  { id: 'small', scale: 0.92, labelKey: 'settings.textSmall' },
  { id: 'normal', scale: 1, labelKey: 'settings.textNormal' },
  { id: 'large', scale: 1.12, labelKey: 'settings.textLarge' },
  { id: 'xlarge', scale: 1.25, labelKey: 'settings.textXLarge' },
];

export function useAppearance(prefs) {
  const size = prefs?.textSize ?? 'normal';
  const reduceMotion = prefs?.reduceMotion ?? false;
  const theme = prefs?.theme ?? 'system';

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    // `system` is not a third theme — it resolves to one of the other two and
    // keeps resolving, so the app turns dark when the phone does at sunset
    // rather than only on the next reload.
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      // Mirrored to localStorage purely so the snippet in index.html can paint
      // the right background before React has loaded. Prefs themselves still
      // live in the account; this is a cache of one boolean, not a second copy
      // of the setting.
      try {
        localStorage.setItem('uni.theme', theme);
      } catch {
        /* private mode; the app just starts light for a frame */
      }
      // The browser chrome — address bar, notch area — reads this, and it is
      // what stops an installed app from having a white bar above a dark page.
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', dark ? '#0e1418' : '#ffffff');
    };

    apply();
    if (theme !== 'system') return undefined;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    const scale = TEXT_SIZES.find((s) => s.id === size)?.scale ?? 1;
    // Scaling the root font size rather than zooming: every size in the app is
    // in rem, so this moves type and spacing together and never reflows the
    // layout into something that was never designed.
    document.documentElement.style.fontSize = `${Math.round(16 * scale)}px`;
    document.documentElement.dataset.textSize = size;
  }, [size]);

  useEffect(() => {
    // The CSS honours the OS setting on its own; this is the in-app override for
    // people whose OS says one thing and who want the other here.
    document.documentElement.dataset.motion = reduceMotion ? 'reduced' : 'full';
  }, [reduceMotion]);
}
