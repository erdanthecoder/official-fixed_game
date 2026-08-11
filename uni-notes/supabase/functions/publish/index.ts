/**
 * Publish a Kadam document as a public page, or take it down again.
 *
 * The awkward part of this app's shape: people sign in with Firebase, and this
 * runs on Supabase. Supabase has no idea who they are. So the caller sends
 * their Firebase ID token and this function verifies it properly — signature,
 * issuer, audience, expiry — against Google's public keys, and only then
 * touches the table with the service role.
 *
 * Deployed with `verify_jwt: false`. That flag sounds alarming and is correct
 * here: it disables Supabase's own JWT check, which would reject a Firebase
 * token as forged because it was not signed by Supabase. The check is not
 * removed, it is replaced by the one below, and no request gets past it
 * without a valid, unexpired token from this exact Firebase project.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5';

/**
 * The Firebase project whose users may publish.
 *
 * Not a secret — it ships inside every copy of the client — but it is the
 * audience the token must be addressed to, so it is what stops a valid token
 * from somebody else's Firebase project being accepted here.
 */
const FIREBASE_PROJECT = 'unisave-e8483';

/**
 * Google's public keys for Firebase ID tokens.
 *
 * `createRemoteJWKSet` caches them and re-fetches when it meets a key id it
 * does not know, which is what makes this survive Google's key rotation
 * without a deploy.
 */
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });

/** Who is calling, or null. */
async function whoIsThis(request: Request): Promise<string | null> {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT}`,
      audience: FIREBASE_PROJECT,
    });
    // `sub` is the Firebase uid. `auth_time` in the future would mean a token
    // minted by a clock we do not trust; jose already rejects expiry and
    // not-before, which covers the rest.
    return typeof payload.sub === 'string' && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Strip anything from the document that would run, phone home, or escape the
 * page it is printed on.
 *
 * The HTML comes from a rich-text editor this app controls, which is exactly
 * the reasoning that produces cross-site scripting: the editor can be fed
 * pasted markup, the stored document can be edited by a collaborator, and the
 * result is served to strangers from a URL that will be trusted because it
 * looks official. So it is treated as hostile.
 *
 * An allow-list, not a block-list. Anything not named here is dropped, which
 * fails closed when the editor gains a feature nobody remembered to consider.
 */
const ALLOWED = new Set([
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'a', 'span', 'div',
  'table', 'thead', 'tbody', 'tr', 'td', 'th', 'hr', 'code', 'pre',
]);

function sanitise(html: string): string {
  let out = html;

  // Whole elements whose content is code or fetched: removed with their
  // contents, not just their tags.
  out = out.replace(
    /<\s*(script|style|iframe|object|embed|link|meta|form|input|button|svg|math)\b[\s\S]*?<\s*\/\s*\1\s*>/gi,
    '',
  );
  // …and the self-closing or unterminated versions of the same.
  out = out.replace(/<\s*(script|iframe|object|embed|link|meta|form|input|svg)\b[^>]*>/gi, '');

  // Every remaining tag is checked by name and rebuilt with only the
  // attributes that cannot execute anything.
  out = out.replace(/<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (_all, slash, rawName, attrs) => {
    const name = String(rawName).toLowerCase();
    if (!ALLOWED.has(name)) return '';
    if (slash) return `</${name}>`;

    const keep: string[] = [];

    if (name === 'a') {
      const href = /href\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
      const value = (href?.[2] ?? href?.[3] ?? '').trim();
      // http and https only. `javascript:` is the obvious one; `data:` is the
      // one people forget, and it can carry a whole HTML document.
      if (/^https?:\/\//i.test(value)) {
        const safe = value.replace(/"/g, '&quot;').replace(/</g, '&lt;');
        // noopener because the opened page can otherwise reach back through
        // window.opener; nofollow because this is user-submitted.
        keep.push(`href="${safe}" target="_blank" rel="noopener noreferrer nofollow"`);
      }
    }

    // Text colour and highlight are the only styling the editor writes that is
    // worth keeping, and only in shapes that cannot smuggle a url() into CSS.
    const style = /style\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
    const styleValue = style?.[2] ?? style?.[3] ?? '';
    if (styleValue) {
      const safeBits = styleValue
        .split(';')
        .map((bit) => bit.trim())
        .filter((bit) =>
          /^(color|background-color|font-size|font-family|font-weight|text-align)\s*:\s*[#a-zA-Z0-9(),.%'"\s-]+$/.test(
            bit,
          ) && !/url\s*\(|expression|@import/i.test(bit),
        );
      if (safeBits.length) keep.push(`style="${safeBits.join('; ').replace(/"/g, '')}"`);
    }

    // The checklist class, so ticked boxes still look like ticked boxes.
    if (/class\s*=\s*("|')[^"']*uni-check/i.test(attrs)) keep.push('class="uni-check"');
    else if (/class\s*=\s*("|')[^"']*uni-checklist/i.test(attrs)) keep.push('class="uni-checklist"');

    return `<${name}${keep.length ? ' ' + keep.join(' ') : ''}>`;
  });

  return out;
}

/** The first sentence or so, for a link preview. */
function excerptOf(html: string): string {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 200 ? `${text.slice(0, 197)}…` : text;
}

/** 128 bits, base64url, 22 characters. */
function makeSlug(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  const uid = await whoIsThis(request);
  if (!uid) return json({ error: 'Sign in to publish.' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Expected JSON.' }, 400);
  }

  const docId = String(body.docId ?? '').slice(0, 200);
  if (!docId) return json({ error: 'Which document?' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    // Injected by Supabase. It bypasses RLS, which is precisely why it never
    // leaves this function and why the checks above run before it is used.
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  /* ------------------------------ unpublish ------------------------------ */
  if (body.action === 'unpublish') {
    // Scoped to the caller's own uid: the row is theirs or nothing happens.
    const { error } = await supabase
      .from('published')
      .delete()
      .eq('owner_uid', uid)
      .eq('doc_id', docId);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  /* ------------------------------- publish ------------------------------- */
  const title = String(body.title ?? 'Untitled').slice(0, 300) || 'Untitled';
  const rawHtml = String(body.html ?? '');
  if (rawHtml.length > 400000) return json({ error: 'That document is too long to publish.' }, 413);

  const html = sanitise(rawHtml);

  // Keep the slug a document already has, so a link that has been sent to
  // somebody keeps working when the document is republished.
  const { data: existing } = await supabase
    .from('published')
    .select('slug')
    .eq('owner_uid', uid)
    .eq('doc_id', docId)
    .maybeSingle();

  const slug = existing?.slug ?? makeSlug();

  const { error } = await supabase.from('published').upsert(
    {
      slug,
      owner_uid: uid,
      doc_id: docId,
      kind: String(body.kind ?? 'note').slice(0, 40),
      title,
      html,
      excerpt: excerptOf(html),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'slug' },
  );

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, slug });
});
