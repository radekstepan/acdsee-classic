# AGENTS.md — ACDSee Classic

A cross-platform ACDSee 3.x-style image browser for macOS, Windows, and Linux.
Electron + React 19 + TypeScript + Tailwind 4. Package manager is **yarn 4**
(`nodeLinker: node-modules`), releases via **changesets**, packaging via
**electron-builder**.

## Commands

| Command | What it does |
|---|---|
| `yarn install` | Install dependencies |
| `yarn dev` | Run the desktop app with hot reload |
| `yarn typecheck` | `tsc --noEmit` on main+preload and renderer projects |
| `yarn build` | Typecheck + electron-vite production build into `out/` |
| `yarn test` | Build, then demo + desktop renderer tests + main-process IPC tests |
| `yarn dist:mac` / `dist:win` / `dist:linux` | Build + package installer into `release/` |
| `yarn changeset` / `yarn version-packages` | Changeset workflow |

Opening the `electron-vite dev` renderer URL in a plain browser runs the app in
**demo mode** (static sample library, no filesystem access) — handy for UI tweaks.

## Layout

```
src/
  main/        Electron main: window, local-file:// protocol, IPC handlers
    index.ts   app lifecycle, frameless window, protocol with CORS headers
    fs.ts      all acdsee:* filesystem/image handlers (registerFsHandlers)
    state.ts   ~/.acdsee path helper for remembered state + window geometry
  preload/     contextBridge exposing window.acdsee (see src/shared/api.ts)
  shared/api.ts  IPC contract shared by main/preload/renderer (single source of truth)
  renderer/    React app (electron-vite renderer root)
    index.html
    src/
      App.tsx        app root: full-window ACDSee browser + viewer frames
      store.tsx      single app store: real folders/files, selection, viewer, dialogs
      types.ts       Folder/FileEntry/Settings/DialogSpec model
      commands.tsx   menus, toolbar commands, context menus
      shell.tsx      close/run-command bridge for the app frame
      data/fs.ts     initial shell, settings, file-entry helpers
      data/state.ts  remembered UI state (settings, last folder, layout) + ~/.acdsee persistence
      data/catalog.ts image formats + bundled demo-photo list
      demo-data.ts   static sample library for browser/demo mode
      lib/bridge.ts  isDesktop()/desktop() accessors, platform labels
      lib/imaging.ts canvas convert/resize (no native deps)
      app.css        frameless-window drag regions
      components/    Browser, FileView, FolderTree, PreviewPane, Viewer,
                     Toolbar, EditedImage, Icons, ui
      components/dialogs/  Basic, Tools, DialogHost (classic modal dialogs)
      index.css      classic Win98/ACDSee theme (keep intact)
    public/photos/   demo-mode sample images (also shipped in the app bundle)
tests/
  smoke.mjs            boots the built renderer in jsdom (demo mode)
  renderer-desktop.mjs boots it with a mocked window.acdsee and real-path fixtures
  ipc.mjs              bundles src/main/fs.ts with electron stubbed, tests handlers on real files
resources/     icon.png/icon.icns/icon.ico (+ icon-src.png master art,
               icons/ 16–1024 hicolor PNGs for the Linux launcher)
```

## Architecture notes

- **Full-window app.** The UI boots straight into the classic ACDSee browser
  filling the frameless Electron window, with the viewer opening as a second
  frame on top. There is no virtual desktop, taskbar/Start menu or splash screen;
  the classic title bar doubles as the native drag surface (`app.css`).
- **Data flow:** `store.tsx` is the single source of truth (`useApp()`). It owns
  `folders`, selection, settings, viewer state and the dialog stack. Folder/files
  are loaded lazily from `window.acdsee` (listRoots → listChildren/listDir), while
  commands, menus and dialogs read the same store.
- **Images:** full-size via the `local-file://file/<encoded-path>` protocol (with
  `Access-Control-Allow-Origin: *` so canvas convert/resize can read pixels;
  browsers auto-rotate it for EXIF); thumbnails via `acdsee:thumbs` IPC
  (`nativeImage.createThumbnailFromPath`, upright bitmaps from the OS
  thumbnailer requested large — small requests return cover-crops — JPEGs
  encoded as JPEG, LRU cached; never counter-rotated, that double-rotates);
  `image-meta` reports displayed (orientation-applied) dimensions plus the raw
  `orientation` flag (best-effort 1-8 via image-size, photomator's
  readOrientation contract). `FileEntry.src` = thumbnail (with `tw`/`th`
  bitmap dims for tile sizing), `FileEntry.fullSrc` = full image; components
  use `fullSrc || src`. Tiles fit to the bitmap dims with aspect-preserving
  contain so a mismatch can never skew.
- **IDs:** real files/folders use absolute paths as ids, so rename/move/delete map
  1:1 to disk. Virtual nodes use `__` ids: `__computer__`, `__pictures__`,
  `__documents__`, `__desktopdir__`, `__network__`, `recycle`, `desktop`.
  Demo mode uses stable synthetic ids with `path: ""`.
- **Real operations:** trash, copy/move, rename, new folder, convert/resize,
  print, wallpaper and open/show-in-folder all go through `src/shared/api.ts`.
  Find walks the real tree via `listDir`; conversions use canvas + `saveDataUrl`.
- **Remembered state:** `data/state.ts` saves settings, view mode, sort/filter,
  expanded tree, pane layout, last folder and the Back/Forward trail to
  `~/.acdsee/state.json` through `acdsee:load-state`/`acdsee:save-state`. The
  main process keeps window bounds/maximized in `~/.acdsee/window.json`; the web
  demo uses localStorage. Missing or corrupt state falls back to the defaults,
  and a remembered folder is re-opened even when its parent chain was never
  listed (see `adoptPath`).
- **Imaging without native deps:** dimensions via `image-size`, EXIF via `exifr`,
  convert/resize via canvas + `saveDataUrl`. Both libs are **bundled into main**
  (`exclude` in `electron.vite.config.ts`) because the packaged app ships no
  `node_modules` — `tests/ipc.mjs` asserts this stays true.
- **Preload output is ESM** (`out/preload/index.mjs`); keep `src/main/index.ts` in sync.
- **Rotate/flip/brightness/adjust** are in-memory view state carried across folder
  reloads by file id; they never modify files on disk. Convert/resize save new files.

## Conventions for changes

- The IPC contract in `src/shared/api.ts` is the source of truth: add the method
  there first, then preload, then the `fs.ts` handler, then the renderer caller.
  `tests/ipc.mjs` checks preload/main channel parity — keep it passing.
- Keep the classic look 1:1: edit `index.css` only to fix real bugs; put new
  desktop-shell styles in `app.css`.
- Every user-facing change gets a changeset file (`yarn changeset`).
- UI text uses classic title case ("Copy to Folder..."); Trash on macOS/Linux,
  Recycle Bin on Windows (see `trashLabel()`).

## Environment quirks (sandboxed shells)

- The sandbox proxy port changes per command: run yarn with
  `YARN_HTTP_PROXY="$http_proxy" YARN_HTTPS_PROXY="$https_proxy"`.
- `.yarnrc.yml` intentionally uses a project-local cache
  (`cacheFolder`, `enableGlobalCache: false`, `enableMirror: false`) — do not
  "fix" this back to the global cache.
- Electron/builder caches live outside the writable roots; in sandboxed shells use
  `electron_config_cache=/tmp/electron-cache` for the Electron install and
  `ELECTRON_BUILDER_CACHE=/tmp/builder-cache` plus
  `-c.electronDist=/tmp/electron-cache/*/*.zip` for packaging.
- Chromium-based processes abort inside the sandbox, so `yarn dev` and the
  packaged app can only be launched **outside** the sandbox. In-sandbox
  verification = `yarn typecheck` + `yarn test` + `yarn dist:mac`.
- macOS packages are unsigned without a Developer ID cert (expected warning).

## Regenerating icons

`resources/icon.png` (1024²) is the master. `.icns`/`.ico` are PNG-entry packed
(`iconutil` rejects sips-made sets on this machine). Recipe: resize the master
with `sips -z` to 16…1024, pack ICNS entries
(`icp4,icp5,icp6,ic07,ic08,ic09,ic10`) and ICO entries (16…256) with PNG payloads.
Keep the per-size PNGs in `resources/icons/NxN.png` in sync — the Linux launcher
installs those into `~/.local/share/icons/hicolor`.
