/**
 * Uni for Windows.
 *
 * This is a window around the deployed app, not a second copy of it. That is a
 * deliberate choice rather than laziness:
 *
 *  - Signing in has to work. Firebase Auth only trusts origins listed under
 *    Authorized domains, and `file://` can never be one of them. An app that
 *    loaded its own bundled copy off the disk could draw every screen and then
 *    fail at the only one that matters.
 *  - There is one app. Fix something, deploy it, and the desktop app has it on
 *    the next launch — no rebuilding an installer and no version of Uni that is
 *    three weeks behind the one on the phone.
 *  - Offline still works. The site's service worker caches it on first run, so
 *    this window opens without a connection exactly like the phone does.
 *
 * What this file adds on top of "a browser tab" is the part that makes it feel
 * like an installed program: its own icon and taskbar entry, a window that
 * remembers where it was, no address bar, links that open in the real browser
 * instead of hijacking the app window, and a real error screen instead of
 * Chrome's dinosaur.
 */

const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

/**
 * Where this build points. The workflow writes config.json before packaging, so
 * the same source can be built against the live site or a test deployment
 * without editing code. Read from a file rather than an environment variable
 * because an env var set on the build machine is gone by the time someone runs
 * the installed program.
 */
function resolveUrl() {
  if (process.env.UNI_URL) return process.env.UNI_URL; // for `npm start` while developing
  try {
    const { url } = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
    if (url) return url;
  } catch {
    /* fall through to the default below */
  }
  return 'https://unisave-e8483.web.app/';
}

const APP_URL = resolveUrl();
const APP_ORIGIN = new URL(APP_URL).origin;

// Window position and size, so the app opens where it was left rather than
// jumping back to the middle of the screen every launch.
const stateFile = path.join(app.getPath('userData'), 'window.json');

function readState() {
  try {
    const s = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    if (typeof s.width === 'number' && typeof s.height === 'number') return s;
  } catch {
    /* first run, or the file was damaged — the defaults below are fine */
  }
  return { width: 1280, height: 860 };
}

function saveState(win) {
  if (!win || win.isDestroyed()) return;
  try {
    // Never store the maximised bounds as the restore size, or un-maximising
    // does nothing visible.
    const bounds = win.isMaximized() ? win.getNormalBounds() : win.getBounds();
    fs.writeFileSync(stateFile, JSON.stringify({ ...bounds, maximized: win.isMaximized() }));
  } catch {
    /* not being able to remember the window is not worth an error dialog */
  }
}

function createWindow() {
  const state = readState();

  const win = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 380,
    minHeight: 520,
    // Matches the app's dark page, so a cold start does not flash white before
    // the first paint arrives.
    backgroundColor: '#0e1418',
    title: 'Uni',
    show: false,
    autoHideMenuBar: true,
    // Rounded corners so it sits on the desktop like a program rather than a
    // browser someone resized. Deliberately NOT `backgroundMaterial: 'mica'` —
    // it is a Windows 11 effect that cannot be tested from here, it fights an
    // opaque backgroundColor, and an untested window effect that renders wrong
    // is worse than a plain window that renders right.
    roundedCorners: true,
    webPreferences: {
      // This window renders a remote site. It gets no Node, no preload bridge
      // and its own isolated context — the app has never needed anything from
      // the desktop, and handing it those powers would mean anything that ever
      // got injected into the page had them too.
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: true,
    },
  });

  if (state.maximized) win.maximize();

  /*
   * Fade the window in rather than having it appear.
   *
   * Electron shows a window instantly, which after a second of nothing reads as
   * a stutter — the app looks like it hung and then gave up. Starting at zero
   * opacity and easing up over ~180ms costs nothing and is the difference
   * between "it appeared" and "it opened".
   *
   * ready-to-show fires after the first paint, so this never reveals a blank
   * frame.
   */
  win.once('ready-to-show', () => {
    win.setOpacity(0);
    win.show();
    const step = 1 / 11; // ~180ms at 60fps
    let value = 0;
    const timer = setInterval(() => {
      value = Math.min(1, value + step);
      // Cheap ease-out: fast at first, settling at the end.
      win.setOpacity(1 - (1 - value) ** 2);
      if (value >= 1) clearInterval(timer);
    }, 16);
    // A window that never finishes fading is worse than one that never faded.
    setTimeout(() => {
      clearInterval(timer);
      if (!win.isDestroyed()) win.setOpacity(1);
    }, 600);
  });

  // Anything that is not Uni opens in the real browser. Without this, clicking
  // a link to a university's website would replace the app with that website
  // and leave no way back.
  const external = (url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) shell.openExternal(url);
  };

  win.webContents.setWindowOpenHandler(({ url }) => {
    external(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== APP_ORIGIN) {
      event.preventDefault();
      external(url);
    }
  });

  // A real message instead of Chrome's offline page, which mentions a dinosaur
  // game and looks like the app itself is broken.
  win.webContents.on('did-fail-load', (event, code, description, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return; // -3 is a navigation the app cancelled itself
    // The page needs somewhere to send Try again, and it has no bridge to ask
    // through, so the destination rides along in the query string.
    win.loadFile(path.join(__dirname, 'offline.html'), { search: `?u=${encodeURIComponent(APP_URL)}` });
  });

  win.on('close', () => saveState(win));
  win.loadURL(APP_URL);
  return win;
}

// Two copies of a notes app fighting over the same account helps nobody: a
// second launch focuses the window that is already open.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    // No File/Edit/View menu bar — this is one app in one window, and an empty
    // menu is more convincing than a menu full of things that do nothing.
    // The standard shortcuts (copy, paste, reload, devtools) still work.
    Menu.setApplicationMenu(null);
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => app.quit());
}
