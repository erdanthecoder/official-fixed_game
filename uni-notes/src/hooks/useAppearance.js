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

export const TEXT_SIZES = [
  { id: 'small', scale: 0.92, labelKey: 'settings.textSmall' },
  { id: 'normal', scale: 1, labelKey: 'settings.textNormal' },
  { id: 'large', scale: 1.12, labelKey: 'settings.textLarge' },
  { id: 'xlarge', scale: 1.25, labelKey: 'settings.textXLarge' },
];

export function useAppearance(prefs) {
  const size = prefs?.textSize ?? 'normal';
  const reduceMotion = prefs?.reduceMotion ?? false;

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
