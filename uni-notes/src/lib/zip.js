/**
 * A ZIP writer, in about a hundred lines.
 *
 * A .docx is a ZIP of XML files, and so is .xlsx and .pptx. Producing one means
 * either pulling in a compression library — a few hundred kilobytes shipped to
 * every visitor so that a button nobody presses on most days can work — or
 * writing the container format, which is old, stable, and simpler than its
 * reputation.
 *
 * Everything here is *stored*, not deflated. The ZIP format allows it (method
 * 0), every unzipper including Word and Excel accepts it, and the cost is file
 * size: a document that would compress to 8 KB comes out around 30 KB. For a
 * file that is about to be emailed once, that is the right trade against a
 * dependency that has to be audited, updated and paid for on every page load.
 *
 * The two things that are easy to get wrong, and are the reason a hand-rolled
 * ZIP usually fails to open:
 *
 *   · every entry appears twice — once as a local header before its data, once
 *     in the central directory at the end — and the two must agree exactly,
 *     including the CRC and both sizes;
 *   · offsets in the central directory are counted from the very start of the
 *     file, not from the start of the data.
 */

/** CRC-32, table built once on first use. */
const TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const utf8 = (text) => new TextEncoder().encode(text);

/** Little-endian writers — every number in a ZIP header is little-endian. */
function u16(value) {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function u32(value) {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

/**
 * Build a ZIP from `{ name: string | Uint8Array }`.
 *
 * Returns a Blob ready to hand to a download link. Names use forward slashes
 * and no leading slash, which is what the OOXML formats expect.
 */
export function zip(files) {
  const chunks = [];
  const directory = [];
  let offset = 0;

  const push = (bytes) => {
    chunks.push(bytes);
    offset += bytes.length;
  };

  for (const [name, content] of Object.entries(files)) {
    const data = typeof content === 'string' ? utf8(content) : content;
    const nameBytes = utf8(name);
    const sum = crc32(data);
    const start = offset;

    push(
      new Uint8Array([
        0x50, 0x4b, 0x03, 0x04, // local file header
        ...u16(20), // version needed
        ...u16(0), // flags
        ...u16(0), // method 0 = stored
        ...u16(0), // time — fixed, see the note below
        ...u16(0x21), // date — 1 Jan 1980, the epoch of this format
        ...u32(sum),
        ...u32(data.length), // compressed size, same as raw when stored
        ...u32(data.length),
        ...u16(nameBytes.length),
        ...u16(0), // extra field length
      ]),
    );
    push(nameBytes);
    push(data);

    directory.push({ name: nameBytes, sum, size: data.length, start });
  }

  /*
   * Timestamps are fixed at the format's epoch rather than set to "now".
   *
   * A document exported twice from the same content should be the same file,
   * byte for byte — that is what makes an export testable and what stops a
   * backup tool seeing a change that is only a clock. The modification date
   * people care about is the one inside the document, which the app writes.
   */

  const dirStart = offset;
  for (const entry of directory) {
    push(
      new Uint8Array([
        0x50, 0x4b, 0x01, 0x02, // central directory header
        ...u16(20), // version made by
        ...u16(20), // version needed
        ...u16(0),
        ...u16(0),
        ...u16(0),
        ...u16(0x21),
        ...u32(entry.sum),
        ...u32(entry.size),
        ...u32(entry.size),
        ...u16(entry.name.length),
        ...u16(0), // extra
        ...u16(0), // comment
        ...u16(0), // disk number
        ...u16(0), // internal attributes
        ...u32(0), // external attributes
        ...u32(entry.start), // offset from the start of the FILE
      ]),
    );
    push(entry.name);
  }

  push(
    new Uint8Array([
      0x50, 0x4b, 0x05, 0x06, // end of central directory
      ...u16(0),
      ...u16(0),
      ...u16(directory.length),
      ...u16(directory.length),
      ...u32(offset - dirStart),
      ...u32(dirStart),
      ...u16(0), // comment length
    ]),
  );

  return chunks;
}

/** The same thing as one flat Uint8Array, for tests and for Blob construction. */
export function zipBytes(files) {
  const chunks = zip(files);
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}
