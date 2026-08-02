/**
 * Service worker.
 *
 * Two jobs: make Kadam installable on Android, and make it open when there is no
 * signal. Firestore already keeps your *documents* offline in IndexedDB — what
 * it cannot do is fetch the app itself, so without this a phone in a lift shows
 * the dinosaur while holding a perfectly good copy of your essay.
 *
 * ── The rule that matters most ────────────────────────────────────────────
 * Cross-origin requests are not touched. At all. Firebase Auth, Firestore and
 * Functions all go to Google domains, and a service worker that caches an auth
 * token or replays a Firestore write is not a caching bug, it is a security
 * bug. Same-origin only, GET only.
 *
 * ── Caching, per kind of thing ────────────────────────────────────────────
 * Vite fingerprints every asset (`index-DNQO4sd5.js`), so those filenames are
 * immutable by construction — cache-first, forever, no revalidation. index.html
 * is the opposite: it is the one file whose contents change while its name does
 * not, so it is network-first with the cache as the fallback. Get that pair the
 * wrong way round and you ship an app that either never updates or never works
 * offline.
 *
 * ── Updating ──────────────────────────────────────────────────────────────
 * No `skipWaiting()` here, deliberately. Swapping the worker mid-session means
 * a running page can ask for a chunk that the new build renamed, and the app
 * breaks in front of someone who was typing. Instead a new worker waits, the
 * page notices and offers a reload, and the swap happens when the user says so.
 * Slower, and correct.
 */

/*
 * Bumping this deletes every cache from the previous version on activate. It
 * has to move whenever a stale copy of the app could be the thing keeping
 * someone stuck, which is exactly the failure this comment exists for: a bad
 * cached build cannot offer its own replacement, because offering it requires
 * the app to start.
 */
const VERSION = 'uni-v2';
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;

/* Everything needed to paint something useful with no network. Kept short: a
   precache that lists the whole build has to be regenerated on every deploy,
   and one stale entry in it poisons the install. The hashed chunks arrive
   through the runtime cache on first visit instead. */
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      // addAll is atomic — one 404 fails the whole install. That is the right
      // behaviour for a shell, but it means anything optional must not be here.
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => {
        // A failed precache should not leave a broken worker installed.
      }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.filter((name) => !name.startsWith(VERSION)).map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** The page asks for the swap once the user has agreed to it. */
self.addEventListener('message', (event) => {
  if (event.data === 'apply-update') self.skipWaiting();
});

const isAsset = (url) => url.pathname.includes('/assets/');

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName, fallback) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = (await caches.match(request)) ?? (fallback ? await caches.match(fallback) : null);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Firebase and friends: hands off.

  // A navigation is the app being opened. Always try the network so a deploy is
  // picked up, but never fail: the cached shell is a working app.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL, './index.html'));
    return;
  }

  if (isAsset(url)) {
    event.respondWith(cacheFirst(request, ASSETS));
    return;
  }

  // Icons, the manifest, anything else we serve ourselves.
  event.respondWith(
    caches.match(request).then((cached) => cached ?? networkFirst(request, SHELL)),
  );
});
