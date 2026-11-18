import { join } from "path";
import { pathToFileURL } from "url";
import { BrowserWindow, Menu, app, ipcMain, net, protocol, shell } from "electron";
import { registerFsHandlers } from "./fs";

let mainWindow: BrowserWindow | null = null;

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
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
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
    mainWindow?.show();
  });

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
