# Kadam

Eight tools for getting into university, in one place: **Notes**, **Sheets**,
**Slides**, **Canvas**, **Tasks**, **UniSave**, an **AI** study helper, and
**Languages** vocabulary practice. Sign in with Google or an email address; everything syncs privately to
your account, and you choose who else can open it.

The interface speaks **English, Русский and Кыргызча**.

Visiting the bare URL gets a landing page that shows each tool working before
asking anyone to sign in — click **Let's go** to start. Inside, the apps live
behind the nine-dot launcher in the top-left corner, the way a suite does.

## Run it

```bash
cd uni-notes
npm install
npm run dev          # http://localhost:5173
```

It runs with no setup at all — no `.env`, no account — saving to that browser's
local storage, with Kadam AI switched off. To turn on Google sign-in, cross-device
sync and AI, follow **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)**.

```bash
npm run build        # production build → dist/
npm run preview      # serve the built files
```

## The eight modules

### Notes
A Google-Docs-style rich text editor. Bold, italic, underline, H1–H3, bulleted
and numbered lists, text colour and highlight, clear formatting, undo/redo
(toolbar and the usual keyboard shortcuts). Auto-saves with a live
*Saving… / Saved* indicator, and flushes if you close the tab mid-sentence.

Organise into categories — **University List**, **Essay Drafts**, **Scholarship
Notes**, **Comparison Charts**, plus any you add. Templates: University
Comparison Table (School, Location, Tuition, Acceptance Rate, Major, Notes,
Deadline), Application Checklist with clickable ☐→☑ boxes, Essay Outline,
Scholarship Tracker — insertable into an open doc or usable as a whole new one.

### Sheets
A real spreadsheet, not a static table. Editable grid with A/B/C columns, a
formula bar, keyboard navigation (arrows, Tab, Enter, F2), bold and alignment,
add/delete rows and columns.

The formula engine supports arithmetic, cell references and ranges, comparisons,
text concatenation, and `SUM AVERAGE MIN MAX COUNT COUNTA ROUND ABS IF AND OR
NOT CONCAT LEN TODAY DAYS`. `IF` short-circuits like a real spreadsheet, so
`=IF(A1=0, "", B1/A1)` is safe. Bad formulas show `#NAME?`, `#DIV/0!` or
`#CIRCULAR!` rather than breaking the sheet.

Templates: Tuition Comparison (with totals worked out), Budget Planner, Deadline
Tracker (days remaining via `DAYS`), Grade Tracker.

### Slides
A deck editor with a thumbnail rail, five layouts (title, title + bullets,
section break, quote, two columns) and four themes — including an **Issyk-Kul**
theme that renders the lake behind your slide. Speaker notes, reorder, duplicate,
and a fullscreen **Present** mode driven by arrow keys / space, `Esc` to exit.
Templates: Why This University, About Me, Research Presentation.

### Canvas
A board you draw on. Pen, straight lines, arrows, rectangles, ellipses and text,
in six inks and three weights, on a plain, grid, dotted or ruled background.
Eraser, undo/redo (toolbar and `Ctrl/Cmd+Z`), and clear.

Everything you draw is stored as **shapes, not pixels**. That is what lets a
board sync like any other document, survive a reload without a resize losing
anything, and stay sharp at any zoom. Templates: Compare Three Schools,
Application Timeline, Essay Map.

### Tasks
A deadline planner for the parts of an application that have dates on them. Each
task carries a due date, a priority, a school and notes; the list groups by
university and calls out what is **overdue** and what is **due this week**, with
a progress bar over the whole plan.

Dates are stored as plain calendar dates rather than timestamps, so a deadline
means the same day wherever you open it. Templates: One Application, Scholarship
Round, Test Preparation.

### UniSave
Everything from every tool in one list, and the place sharing happens. Filter by
type, by what you own, or by what has been shared with you.

Two ways to let someone in, because they are good at different things.

**By email** — invite an address as an **editor** (can change things) or a
**viewer** (can only read). Precise, and it works even if they have no account
yet: the invitation waits and is picked up the first time they sign in. Needs
the Cloud Functions deployed, because only a server may turn an email address
into an account id.

**By link** — mint a link, send it however you like, and whoever opens it joins
at the role you chose. Needs no server at all: the code is the credential and
the security rules check it, so **this works on Firebase's free plan**, which is
why it is listed first in the share dialog. One live link per document;
replacing or revoking it kills the old one at once. The trade-off is inherent to
link sharing — whoever holds it can use it.

Owners can change roles or remove people; anyone else can leave a shared
document without deleting it for the rest.

A document lives in one place and every member edits the same copy — there are
no per-person duplicates to reconcile.

### AI
A study helper for essays, school research and revision. Quick starts for
brainstorming essay topics, improving a paragraph, explaining an application
term, comparing two universities, and vocabulary quizzing. Conversations are
saved per account.

Needs Cloud Functions, so it is the one part of the app that requires a paid
Firebase plan — see FIREBASE_SETUP.md, Part Two. Everything else works free.

It runs through a Firebase Cloud Function so **the API key never reaches the
browser**. The function verifies the caller's ID token, rate-limits per user
(8/minute, 200/day), caps input size, and won't write essays for you to submit as
your own — it helps you write your own. Requires the setup in FIREBASE_SETUP.md.

### Languages
Vocabulary decks with a flashcard trainer on a Leitner-style spaced-repetition
schedule (**Again / Hard / Good / Easy** → progressively longer intervals), a
multiple-choice quiz mode, and per-deck progress (new / learning / known).
Starter decks: Academic English, Application Vocabulary.

## Languages of the interface

English, Русский, Кыргызча — switchable in **Settings**, stored with your
account so it follows you between devices.

> The Kyrgyz translations were written without a native reviewer. They're
> grammatical and consistent, but a Kyrgyz speaker should read through the `ky`
> block in `src/i18n/translations.js` before this goes in front of real users.

## Photos

The app is built for real Issyk-Kul photography. Drop your own JPEGs into
`public/images/issyk-kul/` using the names in
[`public/images/README.md`](public/images/README.md) and they appear immediately
— no code change. Until then, hand-drawn SVG artwork of the lake and the Tian
Shan stands in, so nothing ever looks unfinished.

## Privacy, sync, and not losing work

**Who can see what.** Documents live in `docs/{id}` carrying their own member
list; folders, AI chats and settings live under `users/{uid}` and are never
shared. The rules in `firestore.rules` let an account touch a document only if
it is named in that document's `memberUids`, and only owners can change that
list — membership changes go through Cloud Functions, because turning an email
address into an account needs admin rights the browser must never have.

**Reloading is safe.** Writes are debounced, which normally leaves a window
where an edit exists only in memory. Kadam closes that window: every edit is
appended to a local-storage journal *synchronously* before anything else, and
flushed on `pagehide`. Anything still in the journal at startup is replayed and
you get a note saying so. Closing the tab mid-sentence loses nothing.

**Offline.** Firestore's persistent cache is on, so the app works on patchy wifi
and syncs when the connection returns.

**Before you sign in.** With no Firebase config the app runs entirely in the
browser. Work made that way is lifted into your account on first sign-in — but
only into an empty account, so signing in never overwrites what is already
there.

## How the code is laid out

```
uni-notes/
  firebase.json            hosting + functions + firestore + emulators
  firestore.rules          document membership + per-user isolation
  firestore.indexes.json
  .env.example             Firebase web config template
  FIREBASE_SETUP.md        step-by-step backend setup
  functions/
    admin.js               one Admin app, imported by both function files
    index.js               askUniAi — the Claude API proxy
    sharing.js             shareDocument / revokeAccess / claimInvites
  public/
    icon.svg               the app mark; PNGs beside it are generated from it
    manifest.webmanifest
    images/                drop Issyk-Kul photos here
  src/
    main.jsx               entry: Auth → Data → i18n → App
    App.jsx                landing / sign-in / app-shell routing
    context/
      AuthContext.jsx      Google + email sign-in state
      DataContext.jsx      all data, debounced writes, overlay, journal replay
    lib/
      firebase.js          SDK init from env (absent env = local mode)
      model.js             what a document is; roles and permissions
      repository.js        Firestore or localStorage behind one interface
      journal.js           the write-ahead log that survives a reload
      sharing.js           calls the collaboration functions
      formula.js           the spreadsheet engine
      aiClient.js          calls the AI function
      seed.js              first-run content
      text.js  ids.js
      templates/           notes / sheets / slides / canvas / tasks / vocab
    hooks/useHashRoute.js  #/, #/signin, #/notes, #/unisave, …
    i18n/                  provider + en / ru / ky strings + loading tips
    components/
      brand/               Logo (mark, wordmark, lockups), ProductIcon
                           (per-module colour + glyph)
      landing/             LandingPage, ModulePreview
      AuthScreen.jsx  Sidebar.jsx  AppLauncher.jsx  Scenery.jsx
      SettingsPage.jsx
      TipLine.jsx  LanguagePicker.jsx  SaveIndicator.jsx
      shared/              ModuleHeader, TemplateStrip, ItemCard, EmptyState
      notes/  sheets/  slides/  canvas/  tasks/  unisave/  languages/  ai/
      ui/                  Modal, PromptDialog, ConfirmDialog, MoveDialog
    styles/
      global.css           tokens, buttons, cards, dialogs, Notes editor
      suite.css            scenery, nav, Sheets/Slides/Canvas/Tasks/Languages/AI
      brand.css            type, product identity, landing, auth, UniSave
```

### Extending it

- **A new note/sheet/slide/deck template** — add an entry to the relevant file in
  `src/lib/templates/`. The dashboards and Insert menu pick it up automatically.
- **A new spreadsheet function** — add it to `FUNCTIONS` in `src/lib/formula.js`
  (and a line to `FUNCTION_HELP` so it shows in the in-app reference).
- **A new UI language** — add a block to `src/i18n/translations.js` and an entry
  to `LANGUAGES`. Missing keys fall back to English per key, so a partial
  translation is safe to ship.
- **A new module** — add it to `MODULES` in `useHashRoute.js`, give it a colour
  and glyph in `brand/ProductIcon.jsx`, add it to `LAUNCHER_APPS` in
  `AppLauncher.jsx`, and branch on it in `App.jsx`. Keep `LAUNCHER_APPS` at nine:
  the launcher is a 3x3 grid and the button in front of it is nine dots. Data comes from `useData()`; you don't touch
  storage. If its documents should be shareable, add the kind to `SHARED_KINDS`
  in `lib/model.js` and it appears in UniSave automatically.
- **A new loading tip** — add a line to each language array in `i18n/tips.js`.
- **Anything touching the security rules** — change `firestore.rules`, then run
  `npm run test:rules`. It boots the Firestore emulator and asserts both what
  must work and what must not, which is the only way to be sure about a rule
  that lets a non-member write.
- **The app icon** — edit `public/icon.svg`; the PNGs are generated from it (see
  the note in that file's header).
- **A different AI model** — change `MODEL` / `EFFORT` in `functions/index.js`
  and redeploy.

### Two implementation notes

**The Notes editor** is an uncontrolled `contentEditable` driven by
`document.execCommand`. That API is deprecated, but it's the only zero-dependency
way to get formatting *plus* a working native undo stack. It's all behind one
imperative handle in `notes/editor/RichTextEditor.jsx`, so swapping in a real
editor engine is a single-file change.

**Writes are debounced, optimistic, and journalled.** `DataContext` merges
patches per item and holds an overlay of pending changes so the UI never lags
behind the caret, dropping each overlay entry once the backend confirms a
version at least as new. The same patch goes to `journal.js` synchronously
first, so a crash inside the debounce window is recoverable. Both storage
backends shallow-merge patches, matching Firestore's `{ merge: true }` — a patch
like `{ theme: 'night' }` must never wipe a document's other fields.

**Sharing is server-side on purpose.** `lib/sharing.js` only calls functions.
Resolving an email to a uid needs admin privileges, and the rules deliberately
stop a client writing anyone's membership — including its own.

## Good to know

- Kadam AI can be wrong. Check anything that costs money or has a deadline against
  the university's own website — the app says this next to the chat box too.
- The Anthropic API is the only part with a real per-use cost. See the **Cost**
  section of FIREBASE_SETUP.md, and set a budget alert.
- Private/incognito browsing can block local storage; the save indicator turns
  red and says so.
