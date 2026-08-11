/**
 * What a module looks like while its documents are still arriving.
 *
 * A skeleton in the shape of the thing that is coming, rather than the word
 * "Loading". Two reasons, and the second matters more: it tells you what kind
 * of page this is going to be before it is one, and it stops the layout jumping
 * when the real content lands, because the space was already the right size.
 *
 * `aria-busy` on the container and no text inside — a screen reader should hear
 * that the region is loading once, not read out nine empty boxes.
 */

import { useView } from '../../hooks/useView.js';

export default function Skeleton({ cards = 6, banner = true }) {
  /*
   * The skeleton has to be the shape of what is coming, and what is coming is
   * now a list — the grid became the alternative when the view switch landed
   * and this was never updated, so every load flashed a grid of cards and then
   * replaced it with rows. That is worse than no skeleton: it promises one
   * layout and delivers another, which is the exact jump a skeleton exists to
   * prevent.
   */
  const [view] = useView();

  return (
    <div className="skeleton-view" aria-busy="true" aria-live="polite">
      {banner ? <div className="skeleton skeleton-banner" /> : null}
      {view === 'list' ? (
        <div className="skeleton-rows">
          {Array.from({ length: cards }, (_, index) => (
            <div key={index} className="skeleton-row">
              <span className="skeleton skeleton-row-icon" />
              <span
                className="skeleton skeleton-row-name"
                /* Varied widths: a column of identical bars reads as a loading
                   bar, not as a list of names. */
                style={{ width: `${38 + ((index * 37) % 34)}%` }}
              />
              <span className="skeleton skeleton-row-meta" />
            </div>
          ))}
        </div>
      ) : (
        <div className="skeleton-grid">
          {Array.from({ length: cards }, (_, index) => (
            <div key={index} className="skeleton skeleton-card" />
          ))}
        </div>
      )}
    </div>
  );
}
