# 🎓 Uni Notes

A simplified, Google Docs–style editor for planning university applications — built for two
cousins to share on a laptop or tablet. Write essay drafts, compare schools in a table, tick off
an application checklist, and everything auto-saves.

No accounts, no backend: documents live in the browser's local storage on that device.

## ▶ Run it

```bash
cd uni-notes
npm install
npm run dev          # http://localhost:5173
```

To make a production build:

```bash
npm run build        # outputs to dist/
npm run preview      # serve the built files
```

## ✨ What's in it

**Dashboard**
- Documents as cards: title, preview snippet, last-edited time, word count
- Search across titles and content, sort by last edited / newest / A–Z
- Template tiles to start a new doc, or a blank one
- Card menu: open, rename, make a copy, move to a category, delete

**Editor**
- Bold, italic, underline
- Headings (H1 / H2 / H3) and normal text
- Bulleted and numbered lists
- Text colour and highlight, plus a **Mine** button that highlights in your own profile colour
- Clear formatting, undo / redo (toolbar buttons and the usual `Ctrl`/`Cmd` shortcuts)
- Auto-save with a live **Saving… / Saved** indicator; also flushes if you close the tab
- Rename in place by typing over the title

**University extras**
- **University Comparison Table** — School, Location, Tuition, Acceptance Rate, Major, Notes, Deadline
- **Application Checklist** — essays, recommendation letters, test scores, deadlines, with
  clickable ☐ → ☑ boxes
- **Essay Outline** and **Scholarship Tracker** templates
- Any template can be inserted into an existing doc from the **Insert** menu, or used to start a
  whole new document from the dashboard

**Two profiles**
- Two colour-coded profiles (blue and orange). Double-tap a profile chip to rename it.
- Whoever is active owns new documents; the card's top stripe uses the owner's colour and the
  avatar shows who edited last.

## 🗂 Categories

Four starter categories — University List, Essay Drafts, Scholarship Notes, Comparison Charts —
plus any you add yourself. Deleting a category keeps its documents; they move to “No category”.

## 🧱 How the code is laid out

```
src/
  main.jsx                  entry point
  App.jsx                   shell: sidebar + dashboard/editor switch
  context/AppContext.jsx    all state + actions, and the auto-save loop
  hooks/useHashRoute.js     tiny hash router (#/, #/folder/:id, #/doc/:id)
  lib/
    storage.js              localStorage read/write, profiles, seed data
    templates.js            insertable templates (add new ones here)
    text.js                 previews, word count, date formatting
    ids.js                  id generator
  components/
    Sidebar.jsx             categories + profile switcher
    Dashboard.jsx           card grid, search, sort, template strip
    DocumentCard.jsx        one card and its menu
    ProfileSwitcher.jsx     the two cousin profiles
    SaveIndicator.jsx       "Saving… / Saved"
    editor/
      EditorPage.jsx        header, toolbar, paper
      Toolbar.jsx           formatting buttons
      RichTextEditor.jsx    the contentEditable canvas
      ColorMenu.jsx         colour + highlight swatches
      TemplateMenu.jsx      "Insert" dropdown
      icons.jsx             the two list icons
    ui/                     Modal, PromptDialog, ConfirmDialog, MoveDialog
  styles/global.css         one stylesheet, sectioned top to bottom
```

### Extending it

- **New template**: add a `html()` function and one entry to `TEMPLATES` in `lib/templates.js`.
  The Insert menu and the dashboard tiles both pick it up automatically.
- **Real backend**: `loadState` / `saveState` in `lib/storage.js` are the only two functions that
  touch storage. Swap them for `fetch` calls and the rest of the app is unchanged.
- **More profiles**: add entries to `PROFILES` in `lib/storage.js`.

### One implementation note

The editor is an uncontrolled `contentEditable` driven by `document.execCommand`. That API is
deprecated, but it's the only thing that gives formatting *plus* a working native undo stack with
zero dependencies. It's all funnelled through the imperative handle in `RichTextEditor.jsx`, so
moving to a real editor engine later means rewriting that one file.

## 📌 Good to know

- Notes are saved per-device, per-browser. Two people editing on two devices won't see each
  other's docs — the profiles make edits *visually* distinguishable, they aren't live sync.
- Private/incognito browsing can block local storage; the indicator turns red and says so.
