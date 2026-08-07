/**
 * Grid or list, remembered.
 *
 * Every dashboard in the app showed one thing: a grid of large cards. That is
 * the right shape for eight documents and the wrong one for eighty — by the
 * second screenful you are scrolling past pictures of grey lines looking for a
 * name, which is exactly why Drive opens as a list and offers the grid as the
 * alternative rather than the other way round.
 *
 * The choice is one setting for the whole app, not one per module. Someone who
 * prefers lists prefers lists; making them say so seven times is the kind of
 * detail that makes software feel like it was assembled rather than designed.
 *
 * localStorage rather than the synced preferences document: this is about the
 * screen in front of you. A phone wants the list and the desktop next to it may
 * well want the grid, and syncing the choice would have them fight.
 */

import { useCallback, useEffect, useState } from 'react';

const KEY = 'kadam.view';

/** 'list' | 'grid' — anything else in storage is treated as absent. */
function stored() {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'grid' || value === 'list' ? value : null;
  } catch {
    return null; // private mode; the default is a perfectly good answer
  }
}

export function useView(fallback = 'list') {
  const [view, setView] = useState(() => stored() ?? fallback);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, view);
    } catch {
      /* nothing to do */
    }
  }, [view]);

  /*
   * Other tabs count. Kadam is a suite people leave open in several tabs — the
   * essay in one, the costs in another — and a preference that only applied to
   * the tab you happened to change it in would look like it had not saved.
   */
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== KEY) return;
      if (event.newValue === 'grid' || event.newValue === 'list') setView(event.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return [view, useCallback((next) => setView(next === 'grid' ? 'grid' : 'list'), [])];
}
