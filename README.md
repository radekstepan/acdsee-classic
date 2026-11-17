# ACDSee Classic

A cross-platform love letter to the classic ACDSee 3.x image browser — the Win98-era
chrome, menus, and workflow, running natively on **macOS, Windows, and Linux** and
browsing your **real** photo folders.

![ACDSee Classic icon](resources/icon.png)

## Features

- Classic three-pane browser: folder tree, thumbnails/list/details stage, preview pane
- Real filesystem browsing with fast cached thumbnails, lazy dimensions + EXIF
- Image viewer with zoom, filmstrip, and slide show
- Real file operations: copy/move/rename/rename-series, trash, copy to folder
- Real convert (JPEG/PNG/WebP + quality) and resize, done locally with canvas
- Real "Set as Wallpaper", print, open-with-default-app, show-in-folder
- Full keyboard support (F2 rename, Del, F5 refresh, Alt+Enter properties, …)
- Demo mode: open the dev renderer URL in any browser to click through a sample library

## Requirements

- Node.js 20+ and yarn 4 (`corepack enable` gives you yarn)

## Develop

```sh
yarn install
yarn dev        # launch the desktop app with hot reload
yarn test       # typecheck-safe build + smoke and IPC tests
yarn typecheck  # TS only
```

## Package

```sh
yarn dist:mac    # release/ACDSee Classic.dmg (+ .zip)
yarn dist:win    # NSIS installer (run on Windows)
yarn dist:linux  # AppImage + deb (run on Linux)
```

macOS builds are unsigned unless you have a Developer ID certificate configured —
see the [electron-builder code signing docs](https://electron.build/code-signing).
Windows/Linux installers must be built on their respective platforms (or CI).

## Tech stack

Electron + electron-vite, React 19, TypeScript, Tailwind 4, yarn 4, changesets,
electron-builder. No native Node modules: thumbnails come from Electron's
`nativeImage`, dimensions from `image-size`, EXIF from `exifr`, and convert/resize
from canvas — so the app builds anywhere Node runs.

## Versioning

This repo uses [changesets](https://github.com/changesets/changesets). Add one for
every user-facing change:

```sh
yarn changeset   # then commit the generated markdown file
```

## License

MIT — see [LICENSE](LICENSE). Fan-made recreation; ACDSee and ACD Systems are
trademarks of their respective owners.
