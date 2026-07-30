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

/** "just now" / "12 minutes ago" / "Mar 4" — Google Docs style. */
export function formatRelativeDate(timestamp) {
  if (!timestamp) return 'never';
  const diff = Date.now() - timestamp;

  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) {
    const mins = Math.round(diff / MINUTE);
    return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  }
  if (diff < DAY) {
    const hours = Math.round(diff / HOUR);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (diff < 7 * DAY) {
    const days = Math.round(diff / DAY);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  const date = new Date(timestamp);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export function formatExactDate(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
