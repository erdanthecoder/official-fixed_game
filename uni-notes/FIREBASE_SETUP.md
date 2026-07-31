# Firebase setup

Everything you need to take Uni from "runs on my laptop" to "syncs to my Google
account, with AI working". Follow it top to bottom; each step says what it
unlocks and how to check it worked.

You need: a Google account, Node 22+, and about 20 minutes. The Anthropic API
key (step 6) costs money per use — see **Cost** at the bottom before you start.

---

## 1. Create the Firebase project

1. Go to <https://console.firebase.google.com> → **Create a project**.
2. Name it (e.g. `uni-notes`). Google Analytics is not needed — turn it off.
3. Wait for it to finish provisioning.

## 2. Register the web app and copy the config

1. In the project, click the **Web** icon (`</>`) to add an app. Nickname it
   `Uni web`. You do **not** need Firebase Hosting yet.
2. Firebase shows a `firebaseConfig` object. Keep that tab open.
3. In this folder:

   ```bash
   cp .env.example .env
   ```

4. Fill each `VITE_FIREBASE_*` value in `.env` from the config object.

> **These values are not secrets.** A Firebase web config is designed to ship in
> the browser — your data is protected by the security rules in step 4 and by
> sign-in, not by hiding the config. The one real secret in this project is the
> Anthropic API key in step 6, which never leaves the server.

**Check it worked:** run `npm run dev`. You should now see the sign-in screen
with a **Continue with Google** button instead of the "Running without an
account" notice.

## 3. Turn on sign-in (Google and email)

1. Console → **Build → Authentication → Get started**.
2. **Sign-in method** tab:
   - **Google** → enable → pick a support email → Save.
   - **Email/Password** → enable → Save. (Leave "Email link" off; the app uses
     a password, and the forgot-password flow works without it.)
   Enable both — the sign-in card offers Google first and email underneath, and
   an account created one way can't sign in the other way.
3. **Settings → Authorized domains**: `localhost` is there by default. Add your
   production domain when you deploy (step 7 adds it automatically if you use
   Firebase Hosting).

**Check it worked:** open the app, click **Let's go**, and try both paths. Google
should open a popup; email should let you create an account with a name,
address and password. Either way you land in Notes with your name at the bottom
of the sidebar.

> If Google sign-in opens and immediately closes, the domain isn't authorised
> (step 3.3). If email sign-up says the method is switched off, you enabled
> Google but not Email/Password.

## 4. Create Firestore and deploy the security rules

This is the step that keeps each account's work private. Do not skip it.

1. Console → **Build → Firestore Database → Create database**.
2. Choose a location close to you (e.g. `europe-west1`, `asia-south1`). **This
   cannot be changed later.**
3. Start in **production mode** (deny-all). The rules below replace it.
4. Install the CLI and point it at your project:

   ```bash
   npm install -g firebase-tools
   firebase login
   cp .firebaserc.example .firebaserc     # then put your real project ID in it
   ```

5. Deploy the rules and the index:

   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

### What the rules actually say

Data sits in two shapes, because collaboration needs one and privacy needs the
other:

| Where | What | Who can touch it |
|---|---|---|
| `docs/{docId}` | Notes, sheets, slide decks, vocab sets | Only the accounts listed in that document's `memberUids`. Owners can do anything; editors can change content but not who has access; viewers can only read. Any member can remove themselves. |
| `users/{uid}/…` | Folders, AI chats, preferences | Only that account. Never shared. |
| `invites/{id}` | Pending invitations | **Nobody**, from the browser. Only the sharing Cloud Functions, which run with admin rights. |

The index is for the invitation lookup when you withdraw an invite — a query
with two equality filters, which Firestore cannot serve without one.

**Check it worked:** Console → Firestore → **Rules** tab shows the deployed
rules. Then open the **Rules Playground** and confirm two things are **denied**:
a read of `users/some-other-uid/folders/x` as yourself, and a read of any
`docs/{id}` whose `memberUids` does not contain your uid.

**Check sync works:** create a note in the app, then reload. Open the app in
another browser (or another device) and sign in with the same account — the note
should be there.

## 5. Enable billing (required for Cloud Functions)

Cloud Functions need the **Blaze** (pay-as-you-go) plan. Firebase's free
allowances are generous — a couple of teenagers using this will almost certainly
stay inside them — but a card must be on file.

Console → the settings gear → **Usage and billing → Details & settings → Modify plan → Blaze**.

**Set a budget alert while you're there** (Google Cloud Console → Billing →
Budgets & alerts). €5/month with an email alert at 50% is plenty for peace of
mind.

## 6. Deploy Uni AI

The Cloud Function in `functions/` is the only thing that ever sees the
Anthropic API key. The browser calls the function; the function calls Claude.

1. Get an API key from <https://console.anthropic.com> → **API keys**.
2. Store it as a Firebase secret (this puts it in Google Secret Manager — it is
   **not** in your repo, your `.env`, or the browser):

   ```bash
   firebase functions:secrets:set ANTHROPIC_API_KEY
   ```

   Paste the key when prompted. It will not be echoed.

3. Deploy. This ships the AI proxy **and** the four sharing functions, which
   UniSave needs:

   ```bash
   cd functions && npm install && cd ..
   firebase deploy --only functions
   ```

   | Function | What it does |
   |---|---|
   | `askUniAi` | Talks to the Claude API with the secret key |
   | `shareDocument` | Turns an email address into an account and grants access |
   | `revokeAccess` | Removes a member, or withdraws a pending invitation |
   | `claimInvites` | Runs on sign-in; picks up invitations sent before the account existed |
   | `listInvites` | Shows pending invitations in the share dialog |

**Check it worked:** open **AI** in the app and ask something. If you see "AI is
not connected yet", check `firebase functions:log` — the usual causes are a
missing secret (`failed-precondition`) or a function that didn't deploy
(`not-found`).

Then open **UniSave**, click **Share** on any document, and invite a second
email address. With a real account behind it, that person sees the document
immediately; without one, the invitation waits and is claimed the first time
they sign in.

> Sharing needs the functions deployed, but **not** the Anthropic key. If you
> only want collaboration and not AI, skip the key: `shareDocument` and friends
> don't use it, and `askUniAi` simply reports that it isn't configured.

### What the function does for you

- **Verifies who's asking.** It's a *callable* function, so Firebase validates
  the caller's ID token before your code runs. An unauthenticated request never
  reaches Claude.
- **Rate limits per user**: 8 requests/minute and 200/day, tracked in
  `users/{uid}/meta/aiUsage`. Change the constants at the top of
  `functions/index.js` if those are wrong for you.
- **Caps input size** before spending a token.
- **Handles refusals.** If Claude's safety classifiers decline a request, the
  API retries on a fallback model automatically rather than failing.

### Model and cost

`functions/index.js` uses `claude-opus-5` — the most capable model. To trade some
quality for a lower bill, change the `MODEL` constant to `claude-sonnet-5`, or
lower `EFFORT` from `'medium'` to `'low'`. Redeploy after editing.

## 7. Deploy the app (optional)

```bash
npm run build
firebase deploy --only hosting
```

This serves `dist/` and adds your `*.web.app` domain to the authorized list for
sign-in. To deploy everything at once: `firebase deploy`.

---

## Cost

| Piece | Realistic cost for two users |
|---|---|
| Firestore reads/writes | Free tier (50K reads, 20K writes per day) |
| Authentication | Free |
| Cloud Functions invocations | Free tier (2M/month) |
| Hosting | Free tier (10 GB/month) |
| **Anthropic API** | **The only real cost.** Billed per token used. |

Claude Opus 5 is $5 per million input tokens and $25 per million output tokens.
A typical back-and-forth in Uni AI is a few thousand tokens, so casual study use
lands in cents per day — but it is real money, and the per-user daily cap in the
function is what stops a surprise. Watch the first week in the Anthropic console
and adjust `MAX_REQUESTS_PER_DAY` to suit.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Sign-in popup opens then closes with nothing | Domain not in **Authorized domains** (step 3) |
| `Missing or insufficient permissions` in the console | Rules not deployed (step 4) |
| Work saves but doesn't appear on another device | Signed in to a different Google account, or Firestore never created |
| AI says "not connected yet" | Function not deployed, or `ANTHROPIC_API_KEY` secret not set |
| AI says "Uni AI is not configured correctly" | The secret exists but the key is wrong or revoked |
| `Too many questions at once` | The per-minute rate limit; wait a moment |
| Everything works but nothing syncs, and the sidebar says "This device only" | `.env` is missing or incomplete (step 2) |

Useful commands:

```bash
firebase functions:log --only askUniAi     # what the AI function actually did
firebase functions:secrets:access ANTHROPIC_API_KEY   # confirm a secret exists
firebase emulators:start                   # run auth + firestore + functions locally
```

## Working without Firebase

The app deliberately still runs with no `.env` at all: it skips sign-in and
saves everything to that browser's local storage. Uni AI is the only feature
that needs the backend. That's what makes it testable before any of the above —
and it's why deleting `.env` is a safe way to demo the app offline.
