/** Shown when a dashboard, deck or search has nothing to display. */
export default function EmptyState({ emoji = '🗒️', title, body, action }) {
  return (
    <div className="empty-state">
      <p className="empty-emoji" aria-hidden="true">
        {emoji}
      </p>
      <h2>{title}</h2>
      {body ? <p>{body}</p> : null}
      {action ?? null}
    </div>
  );
}
