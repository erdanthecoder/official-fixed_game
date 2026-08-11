/**
 * Serve a published document as a real web page.
 *
 * This is the half that makes publishing worth having. A link to a JSON API is
 * a link nobody can use; this returns HTML that renders with JavaScript turned
 * off, on a phone with no account, in a browser from 2015 — and carries the
 * Open Graph tags that make it look like something when it is pasted into
 * WhatsApp or Telegram rather than a bare blue URL.
 *
 * Public by design, and deployed with `verify_jwt: false` for that reason:
 * requiring a token would defeat the entire feature. What protects a document
 * is that it is only here because somebody published it, and that its address
 * is 128 bits of randomness.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const escape = (text: string) =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function notFound(): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Not here</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#faf7f2;color:#1a1714;
       font:16px/1.6 Inter,'Segoe UI',Roboto,system-ui,sans-serif;text-align:center;padding:24px}
  h1{font:600 1.5rem/1.2 Georgia,serif;margin:0 0 8px}
  p{color:#6b6157;margin:0}
</style></head><body><div>
<h1>This page is not here</h1>
<p>The link may be wrong, or whoever shared it has taken it down.</p>
</div></body></html>`,
    { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}

Deno.serve(async (request) => {
  const url = new URL(request.url);
  // Everything after the function name is the slug: /page/<slug>. Also accepts
  // ?s=<slug> so the function can be called directly while testing.
  const fromPath = url.pathname.split('/').filter(Boolean).pop() ?? '';
  const slug = (url.searchParams.get('s') || (fromPath === 'page' ? '' : fromPath) || '').slice(0, 64);
  if (!slug || !/^[A-Za-z0-9_-]{8,64}$/.test(slug)) return notFound();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase
    .from('published')
    .select('title, html, excerpt, updated_at, kind')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) return notFound();

  // Counted, but never at the cost of the page: a failed counter must not turn
  // a readable document into an error.
  supabase.rpc('count_view', { page_slug: slug }).then(
    () => {},
    () => {},
  );

  const title = escape(data.title || 'Untitled');
  const excerpt = escape(data.excerpt || '');
  const updated = new Date(data.updated_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${excerpt}">
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${excerpt}">
<meta property="og:site_name" content="Kadam">
<meta name="twitter:card" content="summary">
<!-- A published page is a copy, not the document. Telling crawlers not to
     index it keeps somebody's essay out of search results, which is a
     different thing from having shared a link with one person. -->
<meta name="robots" content="noindex, nofollow">
<style>
  :root{
    --page:#faf7f2; --surface:#ffffff; --text:#1a1714; --muted:#6b6157;
    --border:#e3dcd1; --accent:#12707c;
  }
  @media (prefers-color-scheme: dark){
    :root{ --page:#16130f; --surface:#242019; --text:#ede7dd; --muted:#a79c8d;
           --border:#3a342c; --accent:#6fc7d2; }
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--page);color:var(--text);
       font:17px/1.7 Inter,'Segoe UI',Roboto,system-ui,sans-serif;
       -webkit-text-size-adjust:100%}
  .sheet{max-width:46rem;margin:0 auto;padding:clamp(20px,5vw,56px) clamp(16px,4vw,40px) 80px}
  .paper{background:var(--surface);border:1px solid var(--border);border-radius:14px;
         padding:clamp(22px,5vw,56px);
         box-shadow:0 1px 2px rgba(38,30,22,.06),0 6px 16px -4px rgba(38,30,22,.12)}
  h1,h2,h3{font-family:Georgia,'Times New Roman',serif;line-height:1.2;letter-spacing:-.015em}
  h1{font-size:clamp(1.6rem,4vw,2.2rem);margin:0 0 .6em}
  p,li{overflow-wrap:break-word}
  blockquote{margin:1.5em 0;padding-left:1em;border-left:3px solid var(--border);color:var(--muted)}
  a{color:var(--accent)}
  table{border-collapse:collapse;width:100%;margin:1.2em 0;display:block;overflow-x:auto}
  td,th{border:1px solid var(--border);padding:8px 10px;text-align:left}
  ul.uni-checklist{list-style:none;padding-left:0}
  ul.uni-checklist li{margin:.35em 0}
  .meta{margin:0 0 1.6em;color:var(--muted);font-size:.82rem}
  .foot{margin:28px auto 0;max-width:46rem;text-align:center;color:var(--muted);font-size:.78rem}
  .foot a{color:var(--muted)}
</style>
</head>
<body>
  <main class="sheet">
    <article class="paper">
      <h1>${title}</h1>
      <p class="meta">Updated ${escape(updated)}</p>
      ${data.html}
    </article>
    <p class="foot">Published with Kadam · this is a read-only copy</p>
  </main>
</body>
</html>`;

  return new Response(page, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // A minute of caching so a link doing the rounds in a group chat does not
      // hit the database once per person, while an edit still shows up quickly.
      'cache-control': 'public, max-age=60, s-maxage=60',
      // Belt and braces over the sanitiser: even if something got through, the
      // page will not run it or load anything from anywhere else.
      'content-security-policy':
        "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
    },
  });
});
