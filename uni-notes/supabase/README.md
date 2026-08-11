# Publishing, on Supabase

Kadam's documents live in Firestore and stay there. This directory is one
feature and nothing else: **publish a document as a public web page**.

## Why a second database at all

Firestore can hand JSON to a signed-in client. It cannot hand an HTML page to a
stranger who has no account, no JavaScript and a link preview to fill in. That
is a web server's job. This is the smallest honest one — a table and two
functions.

Nothing is copied here automatically. A row exists only because somebody
pressed Publish, and unpublishing deletes it.

## What is here

| File | What it does |
| --- | --- |
| `migrations/20260811090500_published.sql` | The `published` table, RLS, and a counter function |
| `functions/publish/index.ts` | Verifies a Firebase ID token, then writes or deletes a row |
| `functions/page/index.ts` | Serves a published page as HTML to anybody with the link |

## The security model

**The table has RLS on and no policies at all.** That is deliberate. With RLS
enabled and no policy, `anon` and `authenticated` can do nothing — not read,
not write. Every access goes through an edge function holding the service role.

That is not laziness about writing policies; it is the only place the rule can
be enforced. The rule is "this Firebase user may publish this document", and
Postgres has never heard of Firebase. So the check lives where the Firebase
token can actually be verified.

**Both functions are deployed with `verify_jwt: false`**, and both have a
reason:

- `publish` replaces Supabase's JWT check with a stricter one of its own. A
  Firebase token is not signed by Supabase, so the built-in check would reject
  every legitimate caller. Instead the token's signature, issuer, audience and
  expiry are verified against Google's published keys. Nothing gets past it
  without a live token from this exact Firebase project.
- `page` is public on purpose. Requiring a token to read a published page would
  defeat the entire feature.

**A published page is protected by its address**, which is 128 bits of
randomness in 22 characters. It also sends `noindex`, so a shared essay does
not turn up in search results — sharing a link with one person is not the same
as publishing to the world.

**The HTML is sanitised before it is stored**, with an allow-list rather than a
block-list, so anything the editor gains later is dropped until somebody
considers it. `javascript:` and `data:` URLs are refused, style is limited to
properties that cannot fetch anything, and the served page carries a
Content-Security-Policy that would stop a script even if one got through. The
editor's own output is treated as hostile because it can contain pasted markup
and can be edited by a collaborator.

## Applying it

The migration and both functions are written but **not yet applied** — the
connection to Supabase dropped part-way through setting this up. Project
`Kadam` exists (region `eu-central-1`); the table and functions do not.

To apply, either re-run the tooling, or with the Supabase CLI:

```
supabase link --project-ref <ref>
supabase db push
supabase functions deploy publish --no-verify-jwt
supabase functions deploy page --no-verify-jwt
```

No secrets are needed. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are
injected into edge functions automatically, and the Firebase project id in
`publish/index.ts` is not a secret — it ships in every copy of the client.

## Still to do once it is deployed

The client side is not written yet: a "Publish to the web" control in the share
dialog, the copyable link, and an "unpublish" that calls the same function.
Deliberately left until the functions can actually be called, so it can be
tested against a real endpoint rather than written blind.
