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

/** 2x1 test pixels (4 bytes each) returned as every fake thumbnail bitmap. */
export const thumbPattern = Buffer.from([10, 11, 12, 13, 20, 21, 22, 23]);
/** Buffers passed to createFromBuffer by EXIF counter-rotation. */
export const createdThumbBuffers = [];

const fakeImage = (dataUrl) => ({
  isEmpty: () => false,
  getSize: () => ({ width: 2, height: 1 }),
  toBitmap: () => Buffer.from(thumbPattern),
  toDataURL: () => dataUrl
});

export const nativeImage = {
  createThumbnailFromPath: async () => fakeImage("data:image/jpeg;base64,/9j/TEST-THUMB"),
  createFromBuffer: (buffer, options) => {
    createdThumbBuffers.push({ buffer: Buffer.from(buffer), width: options?.width, height: options?.height });
    return fakeImage("data:image/jpeg;base64,/9j/ROTATED-THUMB");
  }
};

export class BrowserWindow {}
export const protocol = { handle: () => undefined };
export const net = { fetch: () => Promise.reject(new Error("no network in tests")) };
export const Menu = { setApplicationMenu: () => undefined, buildFromTemplate: () => ({}) };
