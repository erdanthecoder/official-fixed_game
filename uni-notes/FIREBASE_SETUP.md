# Firebase setup

Takes Kadam from "runs on my laptop" to "syncs to my account, shares with my
cousin, and lives at a real web address" — **on the free plan, with no card
anywhere.** That is the whole of Part One, and it is the part you want.

Part Two exists only for the two features that genuinely cannot work without a
server. It is clearly marked and entirely optional. If you never read it,
nothing in Part One stops working.

You need a Google account, Node 22+, and about twenty minutes.

---

## What free actually gets you

| | Free (Spark) | Needs Part Two |
|---|---|---|
| Google and email sign-in | yes | |
| Every document syncing to your account | yes | |
| Offline, then catching up when you reconnect | yes | |
| Notes, Sheets, Slides, Canvas, Tasks, Languages, UniSave | yes | |
| **Sharing by link** | yes | |
| Hosting it at a real URL | yes | |
| Sharing by email address | | yes |
| Kadam AI | | yes |

The free allowances are 50,000 reads and 20,000 writes a day, 10 GB of hosting,
and unlimited sign-ins. Two people writing essays will use a rounding error of
that. Nothing in Part One can generate a bill, because there is no card to bill.

---

# Part One — the free setup

## 1. Create the project

1. Go to <https://console.firebase.google.com> and click **Create a project**.
2. Name it (`uni` is fine). **Turn Google Analytics off** — it is not needed and
   it asks for extra consent you do not want to think about.
3. Wait for it to provision.

Leave the plan alone. A new project is on Spark, which is free, and it stays
there unless somebody deliberately upgrades it.

## 2. Register the web app and fill in .env

1. On the project overview, click the **Web** icon (`</>`). Nickname it
   `Kadam web`. Tick **"Also set up Firebase Hosting"** — you will want it in
   step 6 and it costs nothing.
2. Firebase shows a `firebaseConfig` object. Keep that tab open.
3. In this folder:

   ```bash
   cp .env.example .env
   ```

4. Copy each value across into `.env`.

> **These are not secrets.** A Firebase web config is designed to ship inside
> the browser. What protects your data is the security rules in step 4 and
> sign-in — not hiding these six strings. `.env` is gitignored anyway.

**Check it worked:** `npm run dev`, then open the app. The sign-in screen should
offer **Continue with Google** instead of saying "running without an account".

## 3. Turn on sign-in

1. Console → **Build → Authentication → Get started**.
2. On the **Sign-in method** tab:
   - **Google** → enable → choose a support email → Save.
   - **Email/Password** → enable → Save. Leave "Email link" off.

   Enable both. The card offers Google first and email underneath, and an
   account made one way cannot sign in the other way.
3. **Settings → Authorized domains** already has `localhost`. Step 6 adds your
   live domain automatically.

**Check it worked:** click **Let's go**, then try both. You should land in Notes
with your name at the bottom of the sidebar.

> Popup opens and immediately closes → the domain is not authorised.
> "Sign-in method is disabled" → you enabled Google but not Email/Password.

## 4. Create Firestore and deploy the rules

This is the step that keeps each account's work private, and the step that makes
invite links work. **Do not skip it** — until the rules are deployed the
database denies everything and nothing will save.

1. Console → **Build → Firestore Database → Create database**.
2. Pick a location near you (`europe-west1`, `asia-south1`…). **It cannot be
   changed later.**
3. Start in **production mode**. The rules below replace the default.
4. Install the CLI and point it at your project:

   ```bash
   npm install -g firebase-tools
   firebase login
   cp .firebaserc.example .firebaserc     # then put your real project ID in it
   ```

5. Deploy:

   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

### What the rules say

| Where | What | Who can touch it |
|---|---|---|
| `docs/{docId}` | Notes, sheets, slide decks, canvas boards, task plans, vocab sets | Only accounts in that document's `memberUids`. Owners can do anything; editors can change content but not who has access; viewers can only read. Any member can remove themselves. Someone holding a valid invite link can add themselves, and nothing else. |
| `users/{uid}/…` | Folders, AI chats, preferences | That account only. Never shared. |
| `joinCodes/{code}` | Invite links | Readable by any signed-in account **that already has the code** — the code is the credential. Listable by nobody. Only the document's owner can mint or revoke one. |
| `invites/{id}` | Pending email invitations | Nobody, from the browser. Part Two only. |

The rules do not care what *kind* a document is, so adding a module never needs
a rules change.

**Check it worked:**

```bash
npm run test:rules
```

That boots the Firestore emulator locally and runs 38 assertions — including
every way an invite link must *fail*. All 38 should pass. Then Console →
Firestore → **Rules** shows what is deployed.

**Check sync works:** make a note, reload, then sign in on another browser or
device with the same account. The note should be there.

## 5. Share something

You now have working collaboration. Open any document → **Share** → *Create
link*, pick **Can edit** or **Can view**, and send the link however you like.
Whoever opens it signs in and joins at that role.

There is one live link per document. *Replace with a new link* or *Turn the link
off* kills the old one immediately, everywhere.

The trade-off is the one every link-share has: **whoever holds the link can use
it.** There is no email check, so treat it like a key — fine for your cousin,
not for anything you would mind a forwarded message exposing. Per-person invites
by email address are in Part Two.

## 6. Put it on the internet (still free)

```bash
cd uni-notes
npm run deploy       # build + rules + hosting, in one
```

Firebase gives you `https://<your-project>.web.app` and adds it to the
authorized domains for sign-in automatically. Hosting on Spark includes 10 GB of
storage and 360 MB of transfer a day.

**That is the whole free setup.** Everything below is optional.

---

# Part Two — the two things that need a server

**Only read this if you want email invitations or Kadam AI.** Skipping it costs
you nothing you already have.

Both need Cloud Functions, and Cloud Functions require the **Blaze** plan, which
means a card on the account. Two honest notes before you decide:

- Blaze keeps every free allowance. You pay only past them, and Cloud Functions
  gives 2 million invocations a month — so the *Google* bill for two people is
  realistically €0.00.
- The **Anthropic API** is a real cost, billed per token, and there is no free
  substitute. That one is genuinely money.
- Google requires the billing account holder to be **18 or over**, so this needs
  an adult's card and their Google account.

### The steps, if you ever want them

1. Console → gear icon → **Usage and billing → Details & settings → Modify plan
   → Blaze**. Then set a budget alert in Google Cloud Console → Billing →
   Budgets & alerts. (A budget *alerts*; it does not stop spending. The
   `maxInstances: 10` cap in the functions is the real ceiling.)
2. For AI only: get a key from <https://console.anthropic.com>, set a monthly
   spend limit there too — that one *is* a hard cap — then:

   ```bash
   firebase functions:secrets:set ANTHROPIC_API_KEY
   ```

   Paste it at the prompt. It goes to Google Secret Manager, never to your repo,
   your `.env`, or the browser.
3. Deploy:

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

Sharing by email needs the functions but **not** the Anthropic key. If you want
per-person invites without AI, skip step 2 — `askUniAi` simply reports that it
is not configured.

### What the AI function does for you

- **Verifies who is asking.** It is a callable function, so Firebase validates
  the caller's ID token before your code runs.
- **Rate limits per user**: 8 requests/minute, 200/day, tracked in
  `users/{uid}/meta/aiUsage`. Both constants are at the top of
  `functions/index.js`. Lower `MAX_REQUESTS_PER_DAY` if you want a tighter cap.
- **Caps input size** before spending a token.
- **Handles refusals** by retrying on a fallback model rather than failing.

`functions/index.js` uses `claude-opus-5`. Change `MODEL` to `claude-sonnet-5`,
or `EFFORT` from `'medium'` to `'low'`, for a cheaper bill. Redeploy after
editing.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Sign-in popup opens then closes with nothing | Domain not in **Authorized domains** (step 3) |
| `Missing or insufficient permissions` | Rules not deployed (step 4) |
| Saves, but nothing on the other device | Different Google account, or Firestore never created |
| Sidebar says "This device only" | `.env` missing or incomplete (step 2) |
| An invite link says it expired when it shouldn't | The owner replaced it — one live link per document |
| "Sharing is not set up in this project yet" on the **email** form | Expected on the free plan. Use a link instead, or do Part Two. |
| AI says "not connected yet" | Expected on the free plan — Part Two |

Useful commands:

```bash
npm run test:rules                         # 38 assertions against the emulator
firebase emulators:start                   # auth + firestore locally
firebase functions:log --only askUniAi     # Part Two only
```

## Working without Firebase at all

The app still runs with no `.env`: it skips sign-in and saves to that browser's
local storage. Nothing syncs and nothing shares, but every module works. That is
what makes it testable before any of the above, and why deleting `.env` is a
safe way to demo it offline.
