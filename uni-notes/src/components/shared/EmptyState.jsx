import Icon from '../ui/Icon.jsx';

/** Shown when a dashboard, deck or search has nothing to display. */
export default function EmptyState({ icon = 'empty', title, body, action }) {
  return (
    <div className="empty-state">
      <Icon name={icon} size={34} className="empty-icon" />
      <h2>{title}</h2>
      {body ? <p>{body}</p> : null}
      {action ?? null}
    </div>
  );
}
