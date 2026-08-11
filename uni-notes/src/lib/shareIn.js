/**
 * Text shared into Kadam from another app.
 *
 * The manifest registers Kadam as a share target, which is what puts it in
 * Android's share sheet next to Gmail and WhatsApp — the single thing that
 * most separates an installed app from a bookmark, because a bookmark cannot
 * receive anything. Android then opens the app at `./?title=…&text=…&url=…`
 * and that is the whole handoff; the manifest entry does nothing on its own.
 *
 * What arrives is unpredictable, and every sender does it differently:
 *
 *   · a browser sends `title` and `url`, and often repeats the URL in `text`
 *   · a notes app sends `text` alone
 *   · a messaging app sends the message in `text` with no title at all
 *   · some send a URL in `text` and nothing else
 *
 * So the three fields are folded into one document rather than trusted to mean
 * what they are named, and a URL that appears in both `url` and `text` is
 * printed once.
 */

const KEY = 'kadam.share';

const escape = (text) =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * Read a share out of the current URL, if there is one.
 *
 * Returns `{ title, html }` ready to become a document, or null. Reading is
 * destructive by design: it strips the parameters from the address bar with
 * `replaceState` so that reloading the page does not create the same note
 * again, which is what happens with every naive implementation of this.
 */
export function takeSharedText(search = window.location.search, replace = true) {
  const params = new URLSearchParams(search);
  const title = (params.get('title') ?? '').trim();
  const text = (params.get('text') ?? '').trim();
  const url = (params.get('url') ?? '').trim();

  if (!title && !text && !url) return null;

  if (replace && typeof history !== 'undefined') {
    try {
      history.replaceState(null, '', window.location.pathname + window.location.hash);
    } catch {
      /* a sandboxed frame may refuse; the note is still created */
    }
  }

  const parts = [];
  if (text) {
    for (const block of text.split(/\n{2,}/)) {
      const line = block.trim();
      if (line) parts.push(`<p>${escape(line).replace(/\n/g, '<br />')}</p>`);
    }
  }
  // Only if it is not already sitting in the body — browsers commonly send the
  // same link in both fields, and a note that quotes its own source twice
  // looks like a bug in the app rather than in the sender.
  if (url && !text.includes(url)) {
    parts.push(`<p><a href="${escape(url)}">${escape(url)}</a></p>`);
  }

  // A note needs a name. Prefer what the sender called it, fall back to the
  // first line of the text, and only then to a generic one.
  const firstLine = text.split('\n').find((line) => line.trim())?.trim() ?? '';
  const name = title || (firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine) || null;

  return {
    title: name,
    html: `${name ? `<h1>${escape(name)}</h1>` : ''}${parts.join('')}` || '<p><br /></p>',
  };
}

/**
 * Park a share until the app is ready to make a document out of it.
 *
 * A share can arrive before the data layer has finished loading, or while
 * nobody is signed in — in which case the sign-in round trip would lose it.
 * sessionStorage rather than local: this belongs to the tab that was opened,
 * and a share left over from yesterday should not become a note today.
 */
export function parkShare(share) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(share));
  } catch {
    /* private mode — the share is handled in memory or not at all */
  }
}

export function takeParkedShare() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
