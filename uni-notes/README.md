# 🎓 Uni

Five tools for getting into university, in one place: **Notes**, **Sheets**,
**Slides**, an **AI** study helper, and **Languages** vocabulary practice.
Sign in with Google and everything syncs privately to your own account.

The interface speaks **English, Russian and Kyrgyz**.

## ▶ Run it

```bash
cd uni-notes
npm install
npm run dev          # http://localhost:5173
```

It runs with no setup at all — no `.env`, no account — saving to that browser's
local storage, with Uni AI switched off. To turn on Google sign-in, cross-device
sync and AI, follow **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)**.

```bash
npm run build        # production build → dist/
npm run preview      # serve the built files
```

## ✨ The five modules

### 📝 Notes
A Google-Docs-style rich text editor. Bold, italic, underline, H1–H3, bulleted
and numbered lists, text colour and highlight, clear formatting, undo/redo
(toolbar and the usual keyboard shortcuts). Auto-saves with a live
*Saving… / Saved* indicator, and flushes if you close the tab mid-sentence.

Organise into categories — **University List**, **Essay Drafts**, **Scholarship
Notes**, **Comparison Charts**, plus any you add. Templates: University
Comparison Table (School, Location, Tuition, Acceptance Rate, Major, Notes,
Deadline), Application Checklist with clickable ☐→☑ boxes, Essay Outline,
Scholarship Tracker — insertable into an open doc or usable as a whole new one.

### 📊 Sheets
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

### 🖼️ Slides
A deck editor with a thumbnail rail, five layouts (title, title + bullets,
section break, quote, two columns) and four themes — including an **Issyk-Kul**
theme that renders the lake behind your slide. Speaker notes, reorder, duplicate,
and a fullscreen **Present** mode driven by arrow keys / space, `Esc` to exit.
Templates: Why This University, About Me, Research Presentation.

### ✨ AI
A study helper for essays, school research and revision. Quick starts for
brainstorming essay topics, improving a paragraph, explaining an application
term, comparing two universities, and vocabulary quizzing. Conversations are
saved per account.

It runs through a Firebase Cloud Function so **the API key never reaches the
browser**. The function verifies the caller's ID token, rate-limits per user
(8/minute, 200/day), caps input size, and won't write essays for you to submit as
your own — it helps you write your own. Requires the setup in FIREBASE_SETUP.md.

### 🗣️ Languages
Vocabulary decks with a flashcard trainer on a Leitner-style spaced-repetition
schedule (**Again / Hard / Good / Easy** → progressively longer intervals), a
multiple-choice quiz mode, and per-deck progress (new / learning / known).
Starter decks: Academic English, Application Vocabulary.

## 🌍 Languages of the interface

English, Русский, Кыргызча — switchable in **Settings**, stored with your
account so it follows you between devices.

> The Kyrgyz translations were written without a native reviewer. They're
> grammatical and consistent, but a Kyrgyz speaker should read through the `ky`
> block in `src/i18n/translations.js` before this goes in front of real users.

## 🖼️ Photos

The app is built for real Issyk-Kul photography. Drop your own JPEGs into
`public/images/issyk-kul/` using the names in
[`public/images/README.md`](public/images/README.md) and they appear immediately
— no code change. Until then, hand-drawn SVG artwork of the lake and the Tian
Shan stands in, so nothing ever looks unfinished.

## 🔐 Privacy and sync

- Signed in: everything lives under `users/{your uid}` in Firestore. The
  security rules in `firestore.rules` allow each account to touch only its own
  documents — there are no shared collections.
- Not configured: everything stays in that browser. Nothing leaves the device.
- Firestore's offline cache is enabled, so the app keeps working on patchy wifi
  and syncs when the connection returns.
- Work created before you sign in is copied into your account on first sign-in —
  but only if the account is empty, so signing in never overwrites what's there.

## 🧱 How the code is laid out

```
uni-notes/
  firebase.json            hosting + functions + firestore + emulators
  firestore.rules          per-user isolation
  .env.example             Firebase web config template
  FIREBASE_SETUP.md        step-by-step backend setup
  functions/
    index.js               askUniAi — the Claude API proxy
  public/images/           drop Issyk-Kul photos here
  src/
    main.jsx               entry: Auth → Data → i18n → App
    App.jsx                shell + module routing
    context/
      AuthContext.jsx      Google sign-in state
      DataContext.jsx      all data, debounced writes, optimistic overlay
    lib/
      firebase.js          SDK init from env (absent env = local mode)
      repository.js        Firestore or localStorage behind one interface
      formula.js           the spreadsheet engine
      aiClient.js          calls the Cloud Function
      seed.js              first-run content
      text.js  ids.js
      templates/           notes / sheets / slides / vocab starters
    hooks/useHashRoute.js  #/notes, #/sheets/:id, #/slides/:id, …
    i18n/                  provider + en / ru / ky strings
    components/
      Sidebar.jsx  SignInScreen.jsx  Scenery.jsx  SettingsPage.jsx
      LanguagePicker.jsx  SaveIndicator.jsx
      shared/              ModuleHeader, TemplateStrip, ItemCard, EmptyState
      notes/  sheets/  slides/  languages/  ai/
      ui/                  Modal, PromptDialog, ConfirmDialog, MoveDialog
    styles/
      global.css           tokens, buttons, cards, dialogs, Notes editor
      suite.css            scenery, sign-in, nav, Sheets/Slides/Languages/AI
```

### Extending it

- **A new note/sheet/slide/deck template** — add an entry to the relevant file in
  `src/lib/templates/`. The dashboards and Insert menu pick it up automatically.
- **A new spreadsheet function** — add it to `FUNCTIONS` in `src/lib/formula.js`
  (and a line to `FUNCTION_HELP` so it shows in the in-app reference).
- **A new UI language** — add a block to `src/i18n/translations.js` and an entry
  to `LANGUAGES`. Missing keys fall back to English per key, so a partial
  translation is safe to ship.
- **A new module** — add a route to `useHashRoute.js`, an item to `MODULE_ITEMS`
  in `Sidebar.jsx`, and a branch in `App.jsx`. Data comes from `useData()`; you
  don't touch storage.
- **A different AI model** — change `MODEL` / `EFFORT` in `functions/index.js`
  and redeploy.

### Two implementation notes

**The Notes editor** is an uncontrolled `contentEditable` driven by
`document.execCommand`. That API is deprecated, but it's the only zero-dependency
way to get formatting *plus* a working native undo stack. It's all behind one
imperative handle in `notes/editor/RichTextEditor.jsx`, so swapping in a real
editor engine is a single-file change.

**Writes are debounced and optimistic.** `DataContext` merges patches per item
and holds an overlay of pending changes so the UI never lags behind the caret,
dropping each overlay entry once the backend confirms a version at least as new.
Both storage backends shallow-merge patches, matching Firestore's
`{ merge: true }` — a patch like `{ theme: 'night' }` must never wipe a
document's other fields.

## 📌 Good to know

- Uni AI can be wrong. Check anything that costs money or has a deadline against
  the university's own website — the app says this next to the chat box too.
- The Anthropic API is the only part with a real per-use cost. See the **Cost**
  section of FIREBASE_SETUP.md, and set a budget alert.
- Private/incognito browsing can block local storage; the save indicator turns
  red and says so.
