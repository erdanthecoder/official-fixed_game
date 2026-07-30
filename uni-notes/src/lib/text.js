/** Helpers for turning document HTML into human-readable bits. */

/** Strip tags for card previews. Runs on our own content, never on user URLs. */
export function toPlainText(html = '') {
  const withSpaces = html
    .replace(/<\/(p|div|h1|h2|h3|li|tr|td|th)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ');
  const el = document.createElement('div');
  el.innerHTML = withSpaces;
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

/** Drop the document's own opening heading — the card already shows the title. */
function withoutLeadingHeading(html = '') {
  return html.replace(/^\s*<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>/i, '');
}

export function previewSnippet(html, length = 140) {
  const body = toPlainText(withoutLeadingHeading(html));
  const text = body || toPlainText(html);
  if (!text) return 'Empty document — tap to start writing.';
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}

export function wordCount(html) {
  const text = toPlainText(html);
  return text ? text.split(/\s+/).length : 0;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "just now" / "12 min ago" / "Mar 4" — Google Docs style.
 * Pass the `t` function to get it in the user's language; without it, English.
 */
export function formatRelativeDate(timestamp, t) {
  const label = (key, values) => (t ? t(`common.${key}`, values) : fallbackLabel(key, values));
  if (!timestamp) return label('never');

  const diff = Date.now() - timestamp;
  if (diff < MINUTE) return label('justNow');
  if (diff < HOUR) return label('minutesAgo', { count: Math.round(diff / MINUTE) });
  if (diff < DAY) return label('hoursAgo', { count: Math.round(diff / HOUR) });
  if (diff < 7 * DAY) return label('daysAgo', { count: Math.round(diff / DAY) });

  const date = new Date(timestamp);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** Used when no translator is supplied (tests, non-React callers). */
function fallbackLabel(key, values) {
  switch (key) {
    case 'never':
      return 'never';
    case 'justNow':
      return 'just now';
    case 'minutesAgo':
      return `${values.count} min ago`;
    case 'hoursAgo':
      return `${values.count} h ago`;
    case 'daysAgo':
      return `${values.count} d ago`;
    default:
      return key;
  }
}

export function formatExactDate(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
