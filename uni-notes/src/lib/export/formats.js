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
