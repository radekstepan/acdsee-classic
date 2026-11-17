import { join } from "path";
import { pathToFileURL } from "url";
import { BrowserWindow, Menu, app, ipcMain, net, protocol, shell } from "electron";
import { registerFsHandlers } from "./fs";

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    // Frameless: the app draws its own classic Win98-style title bar.
    frame: false,
    backgroundColor: "#c3c3c3",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
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
      return await net.fetch(pathToFileURL(filePath).href);
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
  registerFsHandlers(() => mainWindow);
  setupMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
