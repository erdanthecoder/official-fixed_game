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

export default function Skeleton({ cards = 6, banner = true }) {
  return (
    <div className="skeleton-view" aria-busy="true" aria-live="polite">
      {banner ? <div className="skeleton skeleton-banner" /> : null}
      <div className="skeleton-grid">
        {Array.from({ length: cards }, (_, index) => (
          <div key={index} className="skeleton skeleton-card" />
        ))}
      </div>
    </div>
  );
}
