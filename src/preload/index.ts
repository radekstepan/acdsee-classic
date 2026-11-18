import { contextBridge, ipcRenderer } from "electron";
import type { AcdseeApi } from "../shared/api";

const api: AcdseeApi = {
  platform: process.platform,
  systemPaths: () => ipcRenderer.invoke("acdsee:system-paths"),
  listRoots: () => ipcRenderer.invoke("acdsee:list-roots"),
  listChildren: (id: string) => ipcRenderer.invoke("acdsee:list-children", id),
  listDir: (path: string, includeHidden?: boolean) =>
    ipcRenderer.invoke("acdsee:list-dir", path, includeHidden),
  thumbs: (paths: string[], size: number) =>
    ipcRenderer.invoke("acdsee:thumbs", paths, size),
  imageMeta: (path: string) => ipcRenderer.invoke("acdsee:image-meta", path),
  exif: (path: string) => ipcRenderer.invoke("acdsee:exif", path),
  saveDataUrl: (targetDir: string, fileName: string, dataUrl: string) =>
    ipcRenderer.invoke("acdsee:save-data-url", targetDir, fileName, dataUrl),
  loadState: () => ipcRenderer.invoke("acdsee:load-state"),
  saveState: (json: string) => ipcRenderer.invoke("acdsee:save-state", json),
  createFolder: (parentDir: string, name: string) =>
    ipcRenderer.invoke("acdsee:create-folder", parentDir, name),
  rename: (path: string, newName: string) =>
    ipcRenderer.invoke("acdsee:rename", path, newName),
  trash: (paths: string[]) => ipcRenderer.invoke("acdsee:trash", paths),
  copyTo: (paths: string[], targetDir: string) =>
    ipcRenderer.invoke("acdsee:copy-to", paths, targetDir),
  moveTo: (paths: string[], targetDir: string) =>
    ipcRenderer.invoke("acdsee:move-to", paths, targetDir),
  openPath: (path: string) => ipcRenderer.invoke("acdsee:open-path", path),
  showInFolder: (path: string) => ipcRenderer.invoke("acdsee:show-in-folder", path),
  openTrash: () => ipcRenderer.invoke("acdsee:open-trash"),
  setWallpaper: (path: string) => ipcRenderer.invoke("acdsee:set-wallpaper", path),
  window: {
    minimize: () => ipcRenderer.send("acdsee:window-minimize"),
    toggleMaximize: () => ipcRenderer.send("acdsee:window-toggle-maximize"),
    close: () => ipcRenderer.send("acdsee:window-close"),
    isMaximized: () => ipcRenderer.invoke("acdsee:window-is-maximized")
  }
};

contextBridge.exposeInMainWorld("acdsee", api);
