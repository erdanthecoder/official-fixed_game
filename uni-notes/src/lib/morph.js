/**
 * Growing a document out of the card you tapped.
 *
 * A view transition cross-fades the whole page by default, which is right when
 * two screens have nothing to do with each other. Opening a document is not
 * that: the card and the page it becomes are the same document, and an app that
 * knows this feels made rather than assembled.
 *
 * The mechanism is `view-transition-name`. Give the card and the editor page
 * the same name and the browser stops treating them as two elements — it treats
 * them as one that moved and resized, and animates between the two positions
 * by itself. No measuring, no cloning, no absolutely-positioned ghost.
 *
 * The catch, and the reason this file exists: a view-transition-name must be
 * unique in the document at the moment the snapshot is taken. Twenty cards on a
 * dashboard cannot all be called `doc`. So exactly one element wears the name
 * at a time — the card that was actually tapped — and it is taken off again
 * once the transition is over.
 */

import { useLayoutEffect } from 'react';

const NAME = 'morph-doc';

/** The element currently wearing the name, if any. */
let holder = null;

function release() {
  if (holder && holder.isConnected) holder.style.viewTransitionName = '';
  holder = null;
}

/**
 * Mark `element` as the thing the next navigation grows from.
 *
 * Called on the card as it is clicked, before the route changes. The editor
 * claims the same name on the way in (see `claimMorphTarget`), and the browser
 * joins them up.
 */
export function morphFrom(element) {
  release();
  if (!element) return;
  holder = element;
  element.style.viewTransitionName = NAME;
}

/**
 * Wear the name on the destination side.
 *
 * Returns a cleanup function, so this suits a `useLayoutEffect` in the editor:
 * the name has to be on the element before the browser takes the "after"
 * snapshot, which is why layout effect and not effect.
 *
 * If nothing set a source — the document was opened from a link, a reload, or
 * the back gesture — this does nothing at all and the ordinary cross-fade
 * plays. A morph with only one end is a jump.
 */
export function claimMorphTarget(element) {
  if (!element || !holder) return () => {};
  element.style.viewTransitionName = NAME;
  return () => {
    element.style.viewTransitionName = '';
  };
}

/**
 * Forget the source once the transition has finished.
 *
 * Left on, the name would still be claimed the next time a snapshot is taken,
 * and a second element claiming it would make the browser abandon the
 * transition — the app would silently stop animating and nothing would say why.
 */
export function endMorph() {
  release();
}

export const MORPH_NAME = NAME;

/**
 * Hook form, for the page being opened.
 *
 * `useLayoutEffect` rather than `useEffect`: the browser takes the "after"
 * snapshot as soon as React's update is committed, and a passive effect runs
 * after that. Half a frame late is the difference between a morph and a fade.
 */
export function useMorphTarget(ref) {
  useLayoutEffect(() => {
    const cleanup = claimMorphTarget(ref.current);
    return () => {
      cleanup();
      endMorph();
    };
  }, [ref]);
}
