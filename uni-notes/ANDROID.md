# Kadam on Android

Two ways, both free. The first takes about ten seconds and is what you actually
want. The second produces a real `.apk` file, and is only worth the trouble if
you specifically need one.

Neither costs anything. Neither needs the Blaze plan.

---

## 1. Install it from the browser (recommended)

Kadam is a **PWA** — a web app the phone is allowed to treat as a real app. Once
installed it gets a home-screen icon, opens full screen with no browser bar,
appears in the app switcher, and **works with no signal**.

1. Deploy it once (`FIREBASE_SETUP.md`, Part One, step 6). You need the `https://`
   address — Android will not install a PWA from `http://`, and `localhost`
   only works for testing.
2. Open that address in **Chrome on Android**.
3. Either wait for Chrome's *Install app* prompt, or use the **⋮** menu →
   **Add to Home screen** / **Install app**.
4. Or, once signed in: **Settings → Install on this device → Install**.

That is it. The icon is the Kadam mark, masked to whatever shape your launcher
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
*"A new version of Kadam is ready — Reload"* banner. It swaps when you say so.

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
package you can sideload or send to someone. Same code; only the container
differs.

**You do not need any Android tooling.** GitHub builds it:

1. Deploy the site first (`npm run deploy`) — the build reads the live manifest.
2. Repo → **Actions** → **Build Android APK** → **Run workflow**.
3. Download the **uni-android** artifact. `app-release-signed.apk` is inside.
4. Copy it to the phone and open it. Android asks once whether to allow
   installing from that source.

**Save the keystore after the first run.** The workflow generates one and puts
it in the artifact; put it in repo secrets as `ANDROID_KEYSTORE_BASE64` (run
`base64 -w0 android.keystore` to get the value). Android refuses to install an
update signed with a different key than the version already on the phone, so
without this every build has to be uninstalled and reinstalled by hand.

The settings live in `uni-notes/twa-manifest.json`, which is checked in — that
is what makes the build non-interactive.

<details>
<summary>Doing it locally instead</summary>

Needs Node 22+ and a JDK; Bubblewrap fetches the Android SDK itself.

```bash
npm install -g @bubblewrap/cli
cd uni-notes
bubblewrap build          # uses the checked-in twa-manifest.json
```
</details>

### Removing the address bar

A TWA shows a URL bar until Android can verify that you own both the app and the
website. That check is **Digital Asset Links**: a file on your site naming the
app's signing key.

1. The workflow uploads it as the **uni-assetlinks** artifact. (Locally:
   `bubblewrap fingerprint generateAssetLinks --output assetlinks.json`.)
2. Put that file at `uni-notes/public/.well-known/assetlinks.json`.
3. `npm run deploy`.
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
