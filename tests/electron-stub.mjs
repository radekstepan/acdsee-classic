/** Minimal `electron` stub for main-process tests (loaded via electron-hooks.mjs). */
import os from "os";
import path from "path";

export const handlers = new Map();
export const listeners = new Map();
export const trashed = [];
export const opened = [];
export const shownInFolder = [];

export const ipcMain = {
  handle: (channel, fn) => handlers.set(channel, fn),
  on: (channel, fn) => listeners.set(channel, fn)
};

export const app = {
  getPath: (name) => {
    const home = os.homedir();
    if (name === "pictures") return path.join(home, "Pictures");
    if (name === "documents") return path.join(home, "Documents");
    if (name === "desktop") return path.join(home, "Desktop");
    return home;
  }
};

export const shell = {
  trashItem: async (target) => trashed.push(target),
  openPath: async (target) => opened.push(target),
  showItemInFolder: (target) => shownInFolder.push(target)
};

export const nativeImage = {
  createThumbnailFromPath: async () => ({
    isEmpty: () => false,
    toDataURL: () => "data:image/jpeg;base64,/9j/TEST-THUMB"
  })
};

export class BrowserWindow {}
export const protocol = { handle: () => undefined };
export const net = { fetch: () => Promise.reject(new Error("no network in tests")) };
export const Menu = { setApplicationMenu: () => undefined, buildFromTemplate: () => ({}) };
