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
| `yarn test` | Build, then renderer smoke test + main-process IPC tests |
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
  preload/     contextBridge exposing window.acdsee (see src/shared/api.ts)
  shared/api.ts  IPC contract shared by main/preload/renderer (single source of truth)
  renderer/    React app (electron-vite renderer root)
    index.html
    src/
      App.tsx        browser state + all classic chrome (menus, toolbars, panes)
      data.ts        Folder/Photo model + pure helpers over a runtime store
      demo-data.ts   static sample library for browser/demo mode
      lib/bridge.ts  isDesktop()/desktop() accessors, platform labels
      lib/imaging.ts canvas convert/resize (no native deps)
      app.css        desktop shell overrides (drag region, boot splash)
      components/    BrowserView, Panels, Viewer, MenuBar, Dialogs, icons
      index.css      classic Win98/ACDSee theme (from the template, keep intact)
    public/photos/   demo-mode sample images (also shipped in the app bundle)
tests/
  smoke.mjs    boots the built renderer in jsdom, asserts the classic UI renders
  ipc.mjs      bundles src/main/fs.ts with electron stubbed, tests handlers on real files
resources/     icon.png/icon.icns/icon.ico (+ icon-src.png master art)
vendor/original-templates/  the two template zips this app was built from
```

## Architecture notes

- **No Shell.** The template simulated a whole Windows 98 desktop; the app ships
  only the ACDSee browser window itself, frameless (`frame: false`), with the
  classic title bar as the drag region (`-webkit-app-region`, see `app.css`).
- **Data flow:** `App.tsx` owns `folders` + `photoCache` state and syncs them into
  `data.ts` via `setRuntimeLibrary()` every render, so the template's pure helpers
  (`folderById`, `childFolders`, `folderPathString`, …) keep working for all components.
- **Images:** full-size via the `local-file://file/<encoded-path>` protocol (with
  `Access-Control-Allow-Origin: *` so canvas convert/resize can read pixels);
  thumbnails via `acdsee:thumbs` IPC (`nativeImage.createThumbnailFromPath`, LRU cached).
  `Photo.src` = thumbnail, `Photo.fullSrc` = full image; components use `fullSrc || src`.
- **IDs:** real folders/photos use absolute paths as ids; `__computer__` is the only
  virtual node. Demo mode uses template string ids with `path: ""`.
- **Imaging without native deps:** dimensions via `image-size`, EXIF via `exifr`,
  convert/resize via canvas + `saveDataUrl`. Both libs are **bundled into main**
  (`exclude` in `electron.vite.config.ts`) because the packaged app ships no
  `node_modules` — `tests/ipc.mjs` asserts this stays true.
- **Preload output is ESM** (`out/preload/index.mjs`); keep `src/main/index.ts` in sync.
- **Rotate/flip/rating** are in-memory view state carried across folder reloads by
  photo id; they never modify files on disk.

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
