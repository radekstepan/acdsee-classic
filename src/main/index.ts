import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import { BrowserWindow, Menu, app, ipcMain, net, protocol, screen, shell } from "electron";
import { registerFsHandlers } from "./fs";
import { stateDir, stateFile } from "./state";

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;

type WindowState = {
  width: number;
  height: number;
  x: number;
  y: number;
  maximized: boolean;
};

function loadWindowState(): Partial<WindowState> {
  try {
    const raw = JSON.parse(readFileSync(stateFile("window.json"), "utf8")) as Partial<WindowState>;
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

/** Persist size/position, keeping the restored bounds when maximized. */
function saveWindowState(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  // Full screen is temporary viewer state; keep the windowed bounds.
  if (mainWindow.isFullScreen()) return;
  const maximized = mainWindow.isMaximized();
  const bounds = maximized ? mainWindow.getNormalBounds() : mainWindow.getBounds();
  try {
    mkdirSync(stateDir(), { recursive: true });
    writeFileSync(stateFile("window.json"), JSON.stringify({ ...bounds, maximized }), {
      encoding: "utf8",
      mode: 0o600
    });
  } catch {
    /* Remembering the window is best-effort. */
  }
}

let windowSaveTimer: NodeJS.Timeout | undefined;

function saveWindowStateSoon(): void {
  if (windowSaveTimer) clearTimeout(windowSaveTimer);
  windowSaveTimer = setTimeout(saveWindowState, 300);
}

/** Restore geometry, but only when it still lands on a connected display. */
function restoreBounds(saved: Partial<WindowState>): { width: number; height: number; x?: number; y?: number } {
  const width = Math.max(900, Math.min(10000, Math.round(saved.width ?? 0) || 1280));
  const height = Math.max(600, Math.min(10000, Math.round(saved.height ?? 0) || 800));
  const x = typeof saved.x === "number" && Number.isFinite(saved.x) ? Math.round(saved.x) : undefined;
  const y = typeof saved.y === "number" && Number.isFinite(saved.y) ? Math.round(saved.y) : undefined;
  if (x === undefined || y === undefined) return { width, height };
  const visible = screen.getAllDisplays().some(
    ({ workArea }) =>
      x < workArea.x + workArea.width &&
      x + width > workArea.x &&
      y < workArea.y + workArea.height &&
      y + height > workArea.y
  );
  return visible ? { width, height, x, y } : { width, height };
}

/**
 * Window/taskbar icon. Packaged builds ship it via `extraResources` (Linux and
 * Windows use the window icon for the taskbar/dock); dev reads the repo copy.
 * Linux Wayland desktops ignore this and resolve the icon through the installed
 * `.desktop` entry instead — hence `desktopName` in package.json.
 */
function appIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, "icon.png")
    : join(app.getAppPath(), "resources", "icon.png");
}

/**
 * Instant splash screen. The main window stays hidden until the ~1MB renderer
 * bundle boots and the first folder listing resolves, so show a static
 * About-style splash (logo + crawling progress bar) from the main process —
 * it paints immediately instead of waiting on the renderer.
 */
function splashIconDataUrl(): string {
  const candidates = app.isPackaged
    ? [join(process.resourcesPath, "splash-icon.png")]
    : [join(app.getAppPath(), "src", "renderer", "src", "assets", "app-icon.png")];
  for (const candidate of candidates) {
    try {
      return `data:image/png;base64,${readFileSync(candidate).toString("base64")}`;
    } catch {
      /* Missing artwork must never block startup. */
    }
  }
  return "";
}

function splashHtml(): string {
  const icon = splashIconDataUrl();
  const art = icon
    ? `<div class="logo"><img src="${icon}" width="96" height="96" alt="" /></div>`
    : `<div class="logo logo-missing">ACDSee</div>`;
  return `<!doctype html>
<html><head><meta charset="utf-8" /></head><body><div class="frame"><div class="inner">
${art}
<div class="title">ACDSee Classic 3.1</div>
<div class="sub">Image Browser and Viewer</div>
<div class="spacer"></div>
<div class="status">Loading your image library&hellip;</div>
<div class="bar"><i></i></div>
</div></div><style>
html,body{margin:0;height:100%;overflow:hidden}
body{background:#c0c0c0;color:#000;font-family:"MS Sans Serif",Tahoma,Verdana,Arial,sans-serif;font-size:11px;cursor:default;-webkit-user-select:none;user-select:none}
.frame{box-sizing:border-box;height:100%;padding:2px}
.inner{box-sizing:border-box;height:100%;padding:20px 24px 18px;display:flex;flex-direction:column;align-items:center;background:#c0c0c0;box-shadow:inset -1px -1px 0 #0a0a0a,inset 1px 1px 0 #fff,inset -2px -2px 0 #808080,inset 2px 2px 0 #dfdfdf}
.logo{background:#fff;padding:12px;border:1px solid;border-color:#808080 #fff #fff #808080}
.logo img{display:block}
.logo-missing{font-weight:bold;font-size:13px;padding:40px 30px}
.title{margin-top:14px;font-size:16px;font-weight:bold}
.sub{margin-top:3px}
.spacer{flex:1;min-height:14px}
.status{margin-bottom:6px;color:#404040}
.bar{box-sizing:border-box;width:100%;height:18px;background:#fff;border:1px solid;border-color:#808080 #fff #fff #808080;padding:2px}
.bar i{display:block;height:100%;background:repeating-linear-gradient(90deg,#000080 0 8px,rgba(0,0,128,0) 8px 10px);animation:crawl 0.8s linear infinite}
@keyframes crawl{to{background-position:10px 0}}
</style></body></html>`;
}

function showSplash(): void {
  splashWindow = new BrowserWindow({
    width: 440,
    height: 340,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    center: true,
    frame: false,
    ...(process.platform === "linux" || process.platform === "darwin" ? { roundedCorners: false } : {}),
    backgroundColor: "#c0c0c0",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      sandbox: true,
      contextIsolation: true
    }
  });
  void splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml())}`);
  splashWindow.once("ready-to-show", () => splashWindow?.show());
  // Failsafe: a stuck splash must never trap the user.
  setTimeout(() => {
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    splashWindow = null;
  }, 20000);
}

function hideSplashSoon(): void {
  setTimeout(() => {
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    splashWindow = null;
  }, 300);
}

function createWindow(): void {
  const saved = loadWindowState();
  const bounds = restoreBounds(saved);
  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    ...(bounds.x !== undefined ? { x: bounds.x, y: bounds.y } : {}),
    minWidth: 900,
    minHeight: 600,
    icon: appIconPath(),
    // Frameless: the app draws its own classic Win98-style title bar.
    frame: false,
    // Win98 chrome is square. Linux desktops that support client-side
    // decorations round frameless windows, and so does macOS, so opt out
    // at the source on both.
    ...(process.platform === "linux" || process.platform === "darwin" ? { roundedCorners: false } : {}),
    backgroundColor: "#c3c3c3",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false,
      contextIsolation: true
    }
  });

  mainWindow.on("ready-to-show", () => {
    if (saved.maximized) mainWindow?.maximize();
    mainWindow?.show();
    hideSplashSoon();
  });

  mainWindow.on("resize", saveWindowStateSoon);
  mainWindow.on("move", saveWindowStateSoon);
  mainWindow.on("maximize", saveWindowStateSoon);
  mainWindow.on("unmaximize", saveWindowStateSoon);
  mainWindow.on("close", saveWindowState);
  mainWindow.on("enter-full-screen", () =>
    mainWindow?.webContents.send("acdsee:window-fullscreen-changed", true)
  );
  mainWindow.on("leave-full-screen", () =>
    mainWindow?.webContents.send("acdsee:window-fullscreen-changed", false)
  );

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    void mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

/** Serve local files to the renderer as `local-file://file/<encoded-absolute-path>`. */
function registerLocalFileProtocol(): void {
  protocol.handle("local-file", async (request) => {
    try {
      const url = new URL(request.url);
      if (url.host !== "file") return new Response("Not found", { status: 404 });
      const filePath = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
      if (!filePath) return new Response("Not found", { status: 404 });
      const upstream = await net.fetch(pathToFileURL(filePath).href);
      // Re-emit with CORS headers so canvas convert/resize can read pixels.
      const headers = new Headers();
      const contentType = upstream.headers.get("content-type");
      headers.set("content-type", contentType ?? "application/octet-stream");
      headers.set("access-control-allow-origin", "*");
      return new Response(await upstream.arrayBuffer(), { status: upstream.status, headers });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  });
}

function registerWindowControls(): void {
  ipcMain.on("acdsee:window-minimize", () => mainWindow?.minimize());
  ipcMain.on("acdsee:window-toggle-maximize", () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on("acdsee:window-close", () => mainWindow?.close());
  ipcMain.handle("acdsee:window-is-maximized", () => mainWindow?.isMaximized() ?? false);
  ipcMain.on("acdsee:window-set-fullscreen", (_event, full: unknown) => {
    mainWindow?.setFullScreen(full === true);
  });
  ipcMain.on("acdsee:window-set-zoom", (_event, factor: unknown) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const next =
      typeof factor === "number" && Number.isFinite(factor)
        ? Math.min(2, Math.max(0.75, factor))
        : 1;
    mainWindow.webContents.setZoomFactor(next);
  });
}

function setupMenu(): void {
  if (process.platform === "darwin") {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" }
          ]
        },
        {
          label: "Edit",
          submenu: [
            { role: "cut" },
            { role: "copy" },
            { role: "paste" },
            { role: "selectAll" }
          ]
        },
        {
          label: "Window",
          submenu: [{ role: "minimize" }, { role: "zoom" }, { role: "close" }]
        }
      ])
    );
  } else {
    Menu.setApplicationMenu(null);
  }
}

void app.whenReady().then(() => {
  registerLocalFileProtocol();
  registerWindowControls();
  registerFsHandlers();
  setupMenu();
  showSplash();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Classic behavior: closing the window quits the app on every platform.
// (The macOS convention of lingering without windows only confuses here.)
app.on("window-all-closed", () => {
  app.quit();
});
