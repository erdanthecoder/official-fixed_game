# Uni on Android

Two ways, both free. The first takes about ten seconds and is what you actually
want. The second produces a real `.apk` file, and is only worth the trouble if
you specifically need one.

Neither costs anything. Neither needs the Blaze plan.

---

## 1. Install it from the browser (recommended)

Uni is a **PWA** — a web app the phone is allowed to treat as a real app. Once
installed it gets a home-screen icon, opens full screen with no browser bar,
appears in the app switcher, and **works with no signal**.

1. Deploy it once (`FIREBASE_SETUP.md`, Part One, step 6). You need the `https://`
   address — Android will not install a PWA from `http://`, and `localhost`
   only works for testing.
2. Open that address in **Chrome on Android**.
3. Either wait for Chrome's *Install app* prompt, or use the **⋮** menu →
   **Add to Home screen** / **Install app**.
4. Or, once signed in: **Settings → Install on this device → Install**.

That is it. The icon is the Uni mark, masked to whatever shape your launcher
uses.

**Long-press the icon** and you get shortcuts straight into Notes, Tasks and
Canvas.

### What works offline

| | Offline |
|---|---|
| Opening the app | yes — the service worker serves the app itself |
| Reading documents you have opened before | yes — Firestore keeps them in IndexedDB |
| Editing them | yes — writes queue and sync when you reconnect |
| Signing in for the first time | no, needs network once |
| Opening an invite link | no, needs network |

So a phone in a lift or on a bus keeps working, and catches up on its own.

### Updates

New deploys are picked up automatically, but **never mid-session**. The app
notices a new version, keeps using the one you are running, and shows a small
*"A new version of Uni is ready — Reload"* banner. It swaps when you say so.

That is deliberate. Swapping a running app underneath someone means a page can
ask for a file the new build renamed, and it breaks in front of them while they
are typing. Waiting is slower and correct.

### iPhone

The same install works on iOS — **Share → Add to Home Screen** in Safari. Apple
does not fire the install prompt event, so the button in Settings will not
appear there; the Share menu is the route.

---

## 2. Build a real APK (optional, still free)

This wraps the same web app in a **Trusted Web Activity** — a genuine Android
package you can sideload, send to someone, or later put on Play. It is the same
code; only the container differs.

You need [Node 22+](https://nodejs.org) and a JDK. Bubblewrap fetches the
Android SDK itself.

```bash
npm install -g @bubblewrap/cli

# Point it at your deployed manifest
bubblewrap init --manifest https://<your-project>.web.app/manifest.webmanifest

bubblewrap build
```

That produces `app-release-signed.apk`. Copy it to a phone and open it —
Android will ask you to allow installing from that source once.

### Removing the address bar

A TWA shows a URL bar until Android can verify that you own both the app and the
website. That check is **Digital Asset Links**: a file on your site naming the
app's signing key.

1. `bubblewrap init` prints your SHA-256 fingerprint, and writes
   `assetlinks.json`. If you need it again: `bubblewrap fingerprint list`.
2. Put that file at `public/.well-known/assetlinks.json` in this project.
3. `npm run build && firebase deploy --only hosting`.
4. Confirm it is live at
   `https://<your-project>.web.app/.well-known/assetlinks.json`, then reinstall
   the APK.

Vite copies `public/` verbatim, so the dot-directory ships as-is with no config.

### Putting it on Google Play

Optional, and the only part of any of this that costs money: Google charges a
**one-time $25** developer registration. After that, `bubblewrap build` produces
an `.aab` alongside the APK, which is what Play wants.

You do not need this to use the app on your own phones. Sideloading the APK, or
just installing the PWA, is the same software.

---

## Which should you use?

Install from the browser. It is instant, it updates itself, it needs no tools,
and it is the same app. Build the APK only if you want a file you can hand to
someone who will not click a link.
