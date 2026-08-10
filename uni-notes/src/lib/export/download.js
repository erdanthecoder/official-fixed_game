/**
 * Putting a file on somebody's disk.
 *
 * One place, because the details are fiddly and getting any of them wrong
 * produces a file that downloads with the wrong name, or a tab that navigates
 * away from the app instead of downloading anything.
 */

/**
 * A filename that will survive every filesystem it might land on.
 *
 * Windows refuses \\ / : * ? " < > | outright, and a trailing dot or space is
 * silently dropped, which turns "Draft 2." into "Draft 2" on one machine and
 * an error on another. Names are also capped: a title pasted from a job advert
 * can be three hundred characters, and some systems stop at 255 for the whole
 * path.
 */
export function safeName(title, extension) {
  const base =
    String(title ?? '')
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[. ]+$/, '')
      .slice(0, 80) || 'Document';
  return `${base}.${extension}`;
}

/**
 * Save `content` as `filename`.
 *
 * The object URL is revoked on a timer rather than immediately: revoking in the
 * same tick cancels the download in Safari, which has not yet started reading
 * from it when the click handler returns.
 */
export function saveFile(content, filename, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  // Must be in the document for Firefox to honour the click.
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
