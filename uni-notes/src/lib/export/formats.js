/**
 * Turning a document into a file somebody else can open.
 *
 * This is the part of a suite that decides whether the work is portable or
 * trapped. A university form wants a Word file; a teacher wants a PDF; a
 * spreadsheet has to open in Excel; and anyone who has been burned before
 * wants a plain-text copy that will still be readable in ten years. All of
 * these are produced here, in the browser, with no server and no library.
 *
 * The HTML the editor stores is the source for every one of them, so a single
 * walk over it feeds text, Markdown and Word alike. That walk is deliberately
 * small: this converts the things the editor can actually make — headings,
 * paragraphs, bold, italic, underline, lists, checklists, quotes and links —
 * and ignores anything else rather than guessing.
 */

import { zipBytes } from '../zip.js';

/** Parse stored HTML into a document we can walk. */
function parse(html) {
  return new DOMParser().parseFromString(`<body>${html ?? ''}</body>`, 'text/html').body;
}

const clean = (text) => text.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

/* ------------------------------- plain text ------------------------------- */

export function toText(html) {
  const body = parse(html);
  const lines = [];

  const walk = (node, prefix = '') => {
    for (const child of node.children) {
      const tag = child.tagName.toLowerCase();
      if (tag === 'ul' || tag === 'ol') {
        let index = 1;
        for (const item of child.children) {
          const tick = item.querySelector('.uni-check');
          // A checklist keeps its boxes: [x] and [ ] are what every plain-text
          // to-do convention uses, and they survive being pasted anywhere.
          const mark = tick
            ? tick.textContent.includes('☑')
              ? '[x] '
              : '[ ] '
            : tag === 'ol'
              ? `${index}. `
              : '- ';
          const text = clean(item.textContent.replace(/[☐☑]/g, ''));
          if (text) lines.push(`${prefix}${mark}${text}`);
          index += 1;
        }
        lines.push('');
        continue;
      }
      if (tag === 'blockquote') {
        lines.push(`> ${clean(child.textContent)}`, '');
        continue;
      }
      const text = clean(child.textContent);
      if (!text) continue;
      lines.push(text, '');
    }
  };

  walk(body);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/* -------------------------------- markdown -------------------------------- */

export function toMarkdown(html, title) {
  const body = parse(html);
  const out = [];

  const inline = (node) => {
    let text = '';
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        text += child.nodeValue.replace(/ /g, ' ');
        continue;
      }
      if (child.nodeType !== 1) continue;
      const tag = child.tagName.toLowerCase();
      const inner = inline(child);
      if (!inner.trim() && tag !== 'br') continue;
      if (tag === 'b' || tag === 'strong') text += `**${inner}**`;
      else if (tag === 'i' || tag === 'em') text += `*${inner}*`;
      else if (tag === 's' || tag === 'strike' || tag === 'del') text += `~~${inner}~~`;
      else if (tag === 'a') text += `[${inner}](${child.getAttribute('href') ?? ''})`;
      else if (tag === 'br') text += '\n';
      else text += inner;
    }
    return text;
  };

  for (const child of body.children) {
    const tag = child.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) {
      out.push(`${'#'.repeat(Number(tag[1]))} ${clean(inline(child))}`, '');
    } else if (tag === 'ul' || tag === 'ol') {
      let index = 1;
      for (const item of child.children) {
        const tick = item.querySelector('.uni-check');
        const mark = tick
          ? tick.textContent.includes('☑')
            ? '- [x] '
            : '- [ ] '
          : tag === 'ol'
            ? `${index}. `
            : '- ';
        const text = clean(inline(item).replace(/[☐☑]/g, ''));
        if (text) out.push(`${mark}${text}`);
        index += 1;
      }
      out.push('');
    } else if (tag === 'blockquote') {
      out.push(`> ${clean(inline(child))}`, '');
    } else {
      const text = clean(inline(child));
      if (text) out.push(text, '');
    }
  }

  const heading = title ? `# ${title}\n\n` : '';
  const bodyText = out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  // Don't print the title twice when the document already opens with it.
  return (bodyText.startsWith(`# ${title}`) ? bodyText : heading + bodyText) + '\n';
}

/* ---------------------------------- html ---------------------------------- */

/**
 * A standalone page: styles inlined, so it looks like the document did rather
 * than like unstyled markup when it is opened from a folder years later.
 */
export function toHtml(html, title) {
  const safe = (title ?? 'Document').replace(/[<>&]/g, '');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safe}</title>
<style>
  body { max-width: 46em; margin: 4em auto; padding: 0 1.5em;
         font: 16px/1.65 Georgia, 'Times New Roman', serif; color: #1a1714; }
  h1, h2, h3 { line-height: 1.2; letter-spacing: -0.015em; }
  blockquote { margin: 1.5em 0; padding-left: 1em;
               border-left: 3px solid #d9d2c6; color: #5b5349; }
  ul.uni-checklist { list-style: none; padding-left: 0; }
  ul.uni-checklist li { margin: 0.35em 0; }
  a { color: #12707c; }
</style>
</head>
<body>
<h1>${safe}</h1>
${html ?? ''}
</body>
</html>
`;
}

/* ---------------------------------- word ---------------------------------- */

const xmlEscape = (text) =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * The runs inside one paragraph, as WordprocessingML.
 *
 * Formatting is read from the ancestors of each text node rather than by
 * recursing per tag, which is what makes nesting work: text inside <b><i> gets
 * both marks without the walker needing a case for every combination.
 */
function runsOf(node) {
  const runs = [];
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  let text = walker.nextNode();

  while (text) {
    const value = text.nodeValue.replace(/ /g, ' ');
    if (value.trim() || value === ' ') {
      const marks = [];
      let el = text.parentElement;
      while (el && el !== node.parentElement) {
        const tag = el.tagName.toLowerCase();
        if (tag === 'b' || tag === 'strong') marks.push('<w:b/>');
        if (tag === 'i' || tag === 'em') marks.push('<w:i/>');
        if (tag === 'u') marks.push('<w:u w:val="single"/>');
        if (tag === 's' || tag === 'strike' || tag === 'del') marks.push('<w:strike/>');
        el = el.parentElement;
      }
      const properties = marks.length ? `<w:rPr>${[...new Set(marks)].join('')}</w:rPr>` : '';
      // xml:space="preserve" or Word eats the spaces between runs, so bold
      // words end up jammed against the word after them.
      runs.push(
        `<w:r>${properties}<w:t xml:space="preserve">${xmlEscape(value)}</w:t></w:r>`,
      );
    }
    text = walker.nextNode();
  }

  return runs.join('');
}

const para = (style, runs) =>
  `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}${runs}</w:p>`;

/** A .docx, as a Blob. Opens in Word, Pages, LibreOffice and Google Docs. */
export function toDocx(html, title) {
  const body = parse(html);
  const paragraphs = [];

  /*
   * Don't print the name twice.
   *
   * Most documents here open with an <h1> that is the document's own title,
   * because that is what the templates write and what people type first. Adding
   * a Title paragraph on top of that gives a Word file that says "Start here"
   * twice in a row, in two different sizes, which looks like a bug to whoever
   * receives it.
   */
  const first = body.firstElementChild;
  const opensWithTitle =
    first &&
    /^h[1-2]$/.test(first.tagName.toLowerCase()) &&
    clean(first.textContent).toLowerCase() === clean(title ?? '').toLowerCase();

  if (title && !opensWithTitle) {
    paragraphs.push(
      para('Title', `<w:r><w:t xml:space="preserve">${xmlEscape(title)}</w:t></w:r>`),
    );
  }

  for (const child of body.children) {
    const tag = child.tagName.toLowerCase();
    if (child === first && opensWithTitle) {
      // The document's own opening heading becomes the Word title.
      paragraphs.push(para('Title', runsOf(child)));
      continue;
    }
    if (/^h[1-6]$/.test(tag)) {
      paragraphs.push(para(`Heading${Math.min(3, Number(tag[1]))}`, runsOf(child)));
    } else if (tag === 'ul' || tag === 'ol') {
      for (const item of child.children) {
        const tick = item.querySelector('.uni-check');
        const prefix = tick
          ? `<w:r><w:t xml:space="preserve">${tick.textContent.includes('☑') ? '[x] ' : '[ ] '}</w:t></w:r>`
          : '';
        if (tick) tick.remove();
        paragraphs.push(para('ListParagraph', prefix + runsOf(item)));
      }
    } else if (tag === 'blockquote') {
      paragraphs.push(para('Quote', runsOf(child)));
    } else {
      const runs = runsOf(child);
      paragraphs.push(para('', runs));
    }
  }

  return docxPackage(paragraphs);
}

/**
 * The five parts every .docx needs, wrapped around a list of paragraphs.
 *
 * Split out because Slides exports one too — a deck as a Word outline — and
 * the container is identical; only the paragraphs differ.
 */
function docxPackage(paragraphs) {
  const document_ = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${paragraphs.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body>
</w:document>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:sz w:val="56"/><w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:sz w:val="36"/><w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:spacing w:before="200" w:after="100"/></w:pPr><w:rPr><w:sz w:val="30"/><w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:pPr><w:spacing w:before="180" w:after="80"/></w:pPr><w:rPr><w:sz w:val="26"/><w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:pPr><w:ind w:left="720"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:pPr><w:ind w:left="720"/></w:pPr><w:rPr><w:i/></w:rPr></w:style>
</w:styles>`;

  return zipBytes({
    // The order matters to some readers: [Content_Types].xml must be first.
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    'word/document.xml': document_,
    'word/styles.xml': styles,
  });
}

/* ------------------------------ spreadsheets ------------------------------ */

/**
 * CSV, quoted the way the standard actually requires: a field containing a
 * comma, a quote or a newline is wrapped, and quotes inside are doubled.
 * Getting this wrong is why exported spreadsheets so often arrive with one
 * column of nonsense.
 */
export function toCsv(rows) {
  return (
    rows
      .map((row) =>
        row
          .map((cell) => {
            const value = cell == null ? '' : String(cell);
            return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
          })
          .join(','),
      )
      .join('\r\n') + '\r\n'
  );
}

/* --------------------------------- slides --------------------------------- */

/**
 * A deck as plain text, one slide per block.
 *
 * Speaker notes are included under each slide, because the reason to export a
 * deck as text is almost always to rehearse from it or to hand the words to
 * somebody who has to read them out.
 */
export function deckToText(deck) {
  const slides = deck?.slides ?? [];
  return (
    slides
      .map((slide, index) => {
        const lines = [`${index + 1}. ${slide.title || 'Untitled slide'}`];
        const body = [slide.body, slide.left, slide.right]
          .filter(Boolean)
          .join('\n')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean);
        for (const line of body) lines.push(`   • ${line}`);
        if (slide.quote) lines.push(`   "${slide.quote}"`);
        if (slide.attribution) lines.push(`   — ${slide.attribution}`);
        if (slide.notes) lines.push('', `   Notes: ${slide.notes}`);
        return lines.join('\n');
      })
      .join('\n\n') + '\n'
  );
}

/** A deck as a Word document: one heading and its points per slide. */
export function deckToDocx(deck, title) {
  const paragraphs = [];
  if (title) {
    paragraphs.push(para('Title', `<w:r><w:t xml:space="preserve">${xmlEscape(title)}</w:t></w:r>`));
  }

  for (const slide of deck?.slides ?? []) {
    if (slide.title) {
      paragraphs.push(
        para('Heading1', `<w:r><w:t xml:space="preserve">${xmlEscape(slide.title)}</w:t></w:r>`),
      );
    }
    const body = [slide.body, slide.left, slide.right].filter(Boolean).join('\n');
    for (const line of body.split('\n').map((item) => item.trim()).filter(Boolean)) {
      paragraphs.push(
        para('ListParagraph', `<w:r><w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r>`),
      );
    }
    if (slide.quote) {
      paragraphs.push(
        para('Quote', `<w:r><w:t xml:space="preserve">${xmlEscape(slide.quote)}</w:t></w:r>`),
      );
    }
    if (slide.notes) {
      paragraphs.push(
        para('', `<w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">${xmlEscape(slide.notes)}</w:t></w:r>`),
      );
    }
  }

  return docxPackage(paragraphs);
}

/* --------------------------------- boards --------------------------------- */

/**
 * A board as SVG.
 *
 * SVG rather than PNG as the first offer, because a board is vector data all
 * the way down — nothing on it was ever a bitmap — so exporting it as one
 * would throw away the resolution for no reason. It opens in a browser, in
 * Illustrator, in Figma, and it prints at any size.
 */
export function boardToSvg(board) {
  const shapes = board?.shapes ?? [];
  const pad = 40;

  // The bounding box of everything drawn, so the file is the drawing rather
  // than the drawing adrift in a fixed canvas.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const seen = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  for (const shape of shapes) {
    // Freehand points are a flat [x, y, x, y, …] list, not objects — that is
    // how the board stores them, and reading them as {x, y} silently produced
    // NaN for every one, which is why the first bounding box was the fallback.
    if (shape.points) {
      for (let i = 0; i + 1 < shape.points.length; i += 2) {
        seen(shape.points[i], shape.points[i + 1]);
      }
    }
    if (shape.x != null) seen(shape.x, shape.y);
    if (shape.x != null && shape.w != null) seen(shape.x + shape.w, shape.y + (shape.h ?? 0));
    if (shape.x1 != null) {
      seen(shape.x1, shape.y1);
      seen(shape.x2, shape.y2);
    }
  }

  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 800;
    maxY = 600;
  }

  const width = Math.max(1, maxX - minX) + pad * 2;
  const height = Math.max(1, maxY - minY) + pad * 2;

  const body = shapes
    .map((shape) => {
      const stroke = shape.colour ?? '#111827';
      const w = shape.width ?? 2;
      /*
       * `type`, not `kind`.
       *
       * The first version of this switched on `shape.kind`, which does not
       * exist — every shape fell through to the default and the export was a
       * white rectangle with nothing on it. It downloaded, it opened, it was
       * valid SVG, and it was empty. Caught by counting the elements in the
       * exported file rather than by looking at the download succeeding.
       */
      switch (shape.type) {
        case 'pen': {
          const pairs = [];
          const points = shape.points ?? [];
          for (let i = 0; i + 1 < points.length; i += 2) {
            pairs.push(`${points[i]},${points[i + 1]}`);
          }
          return `<polyline fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" points="${pairs.join(' ')}"/>`;
        }
        case 'line':
          return `<line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>`;
        case 'arrow': {
          // The head is drawn rather than declared with a marker: a marker
          // needs a <defs> entry per colour, and markers are the first thing
          // some SVG importers drop.
          const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
          const size = Math.max(10, w * 3);
          const wing = (offset) =>
            `${shape.x2 - size * Math.cos(angle - offset)},${shape.y2 - size * Math.sin(angle - offset)}`;
          return (
            `<line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>` +
            `<polyline fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" points="${wing(0.4)} ${shape.x2},${shape.y2} ${wing(-0.4)}"/>`
          );
        }
        case 'rect':
          return `<rect x="${shape.x}" y="${shape.y}" width="${shape.w}" height="${shape.h}" fill="none" stroke="${stroke}" stroke-width="${w}" rx="6"/>`;
        case 'ellipse':
          return `<ellipse cx="${shape.x + (shape.w ?? 0) / 2}" cy="${shape.y + (shape.h ?? 0) / 2}" rx="${Math.abs((shape.w ?? 0) / 2)}" ry="${Math.abs((shape.h ?? 0) / 2)}" fill="none" stroke="${stroke}" stroke-width="${w}"/>`;
        case 'text':
          return `<text x="${shape.x}" y="${shape.y}" fill="${stroke}" font-family="Inter, 'Segoe UI', Roboto, sans-serif" font-size="${shape.size ?? 24}">${xmlEscape(shape.text ?? '')}</text>`;
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(width)}" height="${Math.round(height)}" viewBox="${Math.round(minX - pad)} ${Math.round(minY - pad)} ${Math.round(width)} ${Math.round(height)}">
  <rect x="${Math.round(minX - pad)}" y="${Math.round(minY - pad)}" width="${Math.round(width)}" height="${Math.round(height)}" fill="#ffffff"/>
  ${body}
</svg>
`;
}
