import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import { BrowserWindow, Menu, app, ipcMain, net, protocol, screen, shell } from "electron";
import { registerFsHandlers } from "./fs";
import { stateDir, stateFile } from "./state";

let mainWindow: BrowserWindow | null = null;

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
    // decorations round frameless windows, so opt out at the source.
    ...(process.platform === "linux" ? { roundedCorners: false } : {}),
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
  });

  mainWindow.on("resize", saveWindowStateSoon);
  mainWindow.on("move", saveWindowStateSoon);
  mainWindow.on("maximize", saveWindowStateSoon);
  mainWindow.on("unmaximize", saveWindowStateSoon);
  mainWindow.on("close", saveWindowState);

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
