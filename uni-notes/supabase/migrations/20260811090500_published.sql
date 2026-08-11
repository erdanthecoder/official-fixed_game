-- Publish to the web.
--
-- What this is for
-- ----------------
-- Kadam's documents live in Firestore and stay there. This table holds only
-- the ones somebody has deliberately chosen to publish as a public page — a
-- copy, made on purpose, of something they have decided is no longer private.
-- Nothing is written here automatically and unpublishing deletes the row.
--
-- Why Postgres at all, when the app already has a database
-- -------------------------------------------------------
-- Firestore can serve JSON to a signed-in client. It cannot serve an HTML page
-- to a stranger with no account, no JavaScript and a WhatsApp link preview to
-- fill in. That is a web server's job, and this is the smallest honest one:
-- a table and an edge function that renders it.
--
-- The security model, stated plainly
-- ----------------------------------
-- Row Level Security is on and there are NO policies. That is deliberate and
-- it is not an oversight: with RLS enabled and no policy, the anon and
-- authenticated roles can do nothing at all — not select, not insert, not
-- update, not delete. Every access goes through an edge function using the
-- service role, which is the only place the rules about who may publish what
-- can actually be enforced, because the person's identity is a Firebase token
-- that Postgres knows nothing about.
--
-- A published page is readable by anyone who has its address. That is what
-- publishing means. The address is a 22-character random slug, which is why
-- guessing one is not a route in.

create extension if not exists pgcrypto;

create table if not exists public.published (
  -- The slug in the URL. Long and random: a published page is protected by
  -- nobody knowing the address, so the address has to be unguessable.
  -- 16 bytes of base64url is 128 bits — the same order as a UUID, in 22
  -- characters instead of 36.
  slug text primary key,

  -- Which Firebase account published it. Not a foreign key to anything here:
  -- the accounts live in Firebase, and pretending otherwise would be a lie in
  -- the schema. It exists so a person can list and revoke their own pages.
  owner_uid text not null,

  -- The document this came from, so publishing the same document twice
  -- updates the page instead of littering the table with copies.
  doc_id text not null,
  kind text not null default 'note',

  title text not null default 'Untitled',

  -- The rendered body. Sanitised in the edge function before it lands here —
  -- see the note there. Stored as HTML rather than as the app's own format so
  -- the page can be served without the app's code.
  html text not null,

  -- What a link preview shows. Derived at publish time rather than at read
  -- time, because a crawler wants its answer in one round trip.
  excerpt text not null default '',

  views bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A published page is a page, not a filesystem. 400 KB of HTML is a very
  -- long document and a very effective way to fill a free database, so the
  -- limit is stated here rather than trusted to the client.
  constraint published_html_size check (octet_length(html) <= 400000),
  constraint published_title_size check (char_length(title) <= 300)
);

-- One page per document per person: publishing twice updates in place.
create unique index if not exists published_owner_doc_idx
  on public.published (owner_uid, doc_id);

-- "Everything I have published", newest first — the list behind a manage
-- screen. Indexed because it is the only query that is not by primary key.
create index if not exists published_owner_updated_idx
  on public.published (owner_uid, updated_at desc);

alter table public.published enable row level security;

-- Deliberately no policies. See the note at the top of this file: with RLS on
-- and no policy, anon and authenticated are denied everything, and only the
-- service role — which lives inside the edge functions — can reach the table.

-- Counting a read without granting anyone write access.
--
-- The page function calls this instead of issuing an UPDATE, so the only write
-- it can perform on this table is incrementing a counter by one. `security
-- definer` is what lets it do that; the empty search_path is what stops a
-- caller shadowing `public` with their own schema and having this run
-- something else entirely.
create or replace function public.count_view(page_slug text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.published set views = views + 1 where slug = page_slug;
$$;

revoke all on function public.count_view(text) from public;
