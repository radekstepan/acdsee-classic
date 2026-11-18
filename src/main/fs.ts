import { execFile } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { app, ipcMain, nativeImage, shell } from "electron";
import { imageSizeFromFile } from "image-size/fromFile";
import {
  VIRTUAL_ROOT,
  type DirEntry,
  type ExifInfo,
  type FolderNode,
  type ImageMeta,
  type ListDirResult,
  type SystemPaths,
  type ThumbResult
} from "../shared/api";
import { stateDir, stateFile } from "./state";

const IMAGE_EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".tif",
  ".tiff",
  ".webp",
  ".svg",
  ".avif",
  ".heic",
  ".heif"
]);

const HIDDEN_DIR_NAMES = new Set([
  "$RECYCLE.BIN",
  "System Volume Information",
  "$Recycle.Bin",
  ".Trashes",
  ".Spotlight-V100",
  ".fseventsd"
]);

function isImageFile(fileName: string): boolean {
  return IMAGE_EXTS.has(path.extname(fileName).toLowerCase());
}

async function safeStat(fullPath: string) {
  try {
    return await fs.stat(fullPath);
  } catch {
    return null;
  }
}

/** List volumes/drives depending on the platform. */
async function listVolumes(): Promise<FolderNode[]> {
  if (process.platform === "win32") {
    const drives: FolderNode[] = [];
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const checks = await Promise.all(
      letters.map(async (letter) => {
        const root = `${letter}:\\`;
        try {
          await fs.access(root);
          return root;
        } catch {
          return null;
        }
      })
    );
    for (const root of checks) {
      if (!root) continue;
      const letter = root[0];
      drives.push({
        id: root,
        name: letter === "A" || letter === "B" ? `${letter}: Floppy` : `Local Disk (${letter}:)`,
        icon: letter === "A" || letter === "B" ? "floppy" : "drive",
        path: root,
        parent: VIRTUAL_ROOT
      });
    }
    return drives;
  }

  const nodes: FolderNode[] = [
    {
      id: path.parse(process.cwd()).root,
      name: process.platform === "darwin" ? "Macintosh HD" : "File System",
      icon: "drive",
      path: path.parse(process.cwd()).root,
      parent: VIRTUAL_ROOT
    }
  ];
  const volumesDir = process.platform === "darwin" ? "/Volumes" : `/media/${os.userInfo().username}`;
  try {
    const entries = await fs.readdir(volumesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      if (entry.name === "Macintosh HD") continue;
      const full = path.join(volumesDir, entry.name);
      nodes.push({ id: full, name: entry.name, icon: "drive", path: full, parent: VIRTUAL_ROOT });
    }
  } catch {
    // No extra volumes mounted.
  }
  return nodes;
}

function quickRoots(): FolderNode[] {
  const home = os.homedir();
  const pictures = path.join(home, process.platform === "win32" ? "Pictures" : "Pictures");
  const documents = path.join(home, "Documents");
  const desktop = path.join(home, "Desktop");
  return [
    { id: VIRTUAL_ROOT, name: "My Computer", icon: "computer", path: "", parent: null },
    { id: pictures, name: "My Pictures", icon: "pictures", path: pictures, parent: null },
    { id: documents, name: "My Documents", icon: "mydocs", path: documents, parent: null },
    { id: desktop, name: "Desktop", icon: "folder", path: desktop, parent: null }
  ];
}

function iconForFolder(fullPath: string): FolderNode["icon"] {
  const home = os.homedir();
  if (fullPath === home) return "mydocs";
  const base = path.basename(fullPath).toLowerCase();
  if (base === "pictures" || base === "photos") return "pictures";
  if (base === "music") return "music";
  if (base === "movies" || base === "videos") return "programs";
  return "folder";
}

async function listSubfolders(dirPath: string, parentId: string): Promise<FolderNode[]> {
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
  const folders: FolderNode[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    if (entry.name.startsWith(".") || HIDDEN_DIR_NAMES.has(entry.name)) continue;
    const full = path.join(dirPath, entry.name);
    const st = await safeStat(full);
    if (!st || !st.isDirectory()) continue;
    folders.push({
      id: full,
      name: entry.name,
      icon: iconForFolder(full),
      path: full,
      parent: parentId
    });
  }
  folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  return folders;
}

// ---------------------------------------------------------------------------
// Thumbnail cache (in-memory LRU over data URLs, keyed by path+mtime+size)
// ---------------------------------------------------------------------------

const thumbCache = new Map<string, string>();
const THUMB_CACHE_LIMIT = 600;

function thumbCacheGet(key: string): string | undefined {
  const hit = thumbCache.get(key);
  if (hit === undefined) return undefined;
  thumbCache.delete(key);
  thumbCache.set(key, hit);
  return hit;
}

function thumbCacheSet(key: string, value: string): void {
  if (thumbCache.size >= THUMB_CACHE_LIMIT) {
    const oldest = thumbCache.keys().next();
    if (!oldest.done) thumbCache.delete(oldest.value);
  }
  thumbCache.set(key, value);
}

async function makeThumb(fullPath: string, size: number): Promise<string | null> {
  const st = await safeStat(fullPath);
  if (!st) return null;
  const key = `${fullPath}:${st.mtimeMs}:${size}`;
  const cached = thumbCacheGet(key);
  if (cached) return cached;
  try {
    const image = await nativeImage.createThumbnailFromPath(fullPath, {
      width: size,
      height: size
    });
    if (image.isEmpty()) return null;
    const dataUrl = image.toDataURL();
    thumbCacheSet(key, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}

async function uniqueTargetPath(dir: string, fileName: string): Promise<string> {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let candidate = path.join(dir, fileName);
  let n = 2;
  while (true) {
    try {
      await fs.access(candidate);
      candidate = path.join(dir, `${base} (${n})${ext}`);
      n += 1;
    } catch {
      return candidate;
    }
  }
}

// ---------------------------------------------------------------------------
// IPC registration
// ---------------------------------------------------------------------------

export function registerFsHandlers(): void {
  ipcMain.handle("acdsee:system-paths", (): SystemPaths => {
    const home = os.homedir();
    return {
      home,
      pictures: app.getPath("pictures"),
      documents: app.getPath("documents"),
      desktop: app.getPath("desktop"),
      platform: process.platform
    };
  });

  ipcMain.handle("acdsee:list-roots", async (): Promise<FolderNode[]> => quickRoots());

  ipcMain.handle("acdsee:list-children", async (_event, id: string): Promise<FolderNode[]> => {
    if (id === VIRTUAL_ROOT) return listVolumes();
    return listSubfolders(id, id);
  });

  ipcMain.handle("acdsee:list-dir", async (_event, dirPath: string, includeHidden = false): Promise<ListDirResult> => {
    let entries;
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch {
      return { path: dirPath, parent: path.dirname(dirPath), folders: [], files: [] };
    }
    const folders: DirEntry[] = [];
    const files: DirEntry[] = [];
    await Promise.all(
      entries.map(async (entry) => {
        if (entry.name.startsWith(".") && !includeHidden) return;
        if (HIDDEN_DIR_NAMES.has(entry.name) && !includeHidden) return;
        const full = path.join(dirPath, entry.name);
        const st = await safeStat(full);
        if (!st) return;
        if (st.isDirectory()) {
          folders.push({
            name: entry.name,
            path: full,
            size: 0,
            mtimeMs: st.mtimeMs,
            ext: ""
          });
          return;
        }
        if (!st.isFile() || !isImageFile(entry.name)) return;
        files.push({
          name: entry.name,
          path: full,
          size: st.size,
          mtimeMs: st.mtimeMs,
          ext: path.extname(entry.name).toLowerCase()
        });
      })
    );
    const byName = (a: DirEntry, b: DirEntry) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    folders.sort(byName);
    files.sort(byName);
    const parent = path.dirname(dirPath);
    return { path: dirPath, parent: parent === dirPath ? null : parent, folders, files };
  });

  ipcMain.handle(
    "acdsee:thumbs",
    async (_event, paths: string[], size: number): Promise<ThumbResult[]> => {
      const clamped = Math.min(512, Math.max(32, size || 256));
      const results: ThumbResult[] = [];
      const CHUNK = 16;
      for (let i = 0; i < paths.length; i += CHUNK) {
        const chunk = paths.slice(i, i + CHUNK);
        const urls = await Promise.all(chunk.map((p) => makeThumb(p, clamped)));
        chunk.forEach((p, index) => results.push({ path: p, dataUrl: urls[index] }));
      }
      return results;
    }
  );

  ipcMain.handle("acdsee:image-meta", async (_event, fullPath: string): Promise<ImageMeta | null> => {
    try {
      const info = await imageSizeFromFile(fullPath);
      if (!info.width || !info.height) return null;
      return { width: info.width, height: info.height, format: (info.type ?? "").toUpperCase() };
    } catch {
      return null;
    }
  });

  ipcMain.handle("acdsee:exif", async (_event, fullPath: string): Promise<ExifInfo | null> => {
    try {
      const { default: exifr } = await import("exifr");
      const tags = await exifr.parse(fullPath, {
        pick: ["Make", "Model", "ExposureTime", "FNumber", "ISO", "FocalLength", "Flash"]
      });
      if (!tags) return null;
      const info: ExifInfo = {};
      if (tags.Make != null) info.make = String(tags.Make).trim();
      if (tags.Model != null) info.model = String(tags.Model).trim();
      if (tags.ExposureTime != null) {
        const t = Number(tags.ExposureTime);
        info.exposureTime = Number.isFinite(t) && t > 0 && t < 1 ? `1/${Math.round(1 / t)} sec` : `${tags.ExposureTime} sec`;
      }
      if (tags.FNumber != null) info.fNumber = `f/${Number(tags.FNumber)}`;
      if (tags.ISO != null) info.iso = Number(tags.ISO);
      if (tags.FocalLength != null) info.focalLength = `${Number(tags.FocalLength)} mm`;
      if (tags.Flash != null) info.flash = String(tags.Flash).toLowerCase().includes("did not") ? "No" : "Yes";
      return info;
    } catch {
      return null;
    }
  });

  ipcMain.handle(
    "acdsee:save-data-url",
    async (_event, targetDir: string, fileName: string, dataUrl: string): Promise<string> => {
      const match = /^data:(.+?);base64,(.+)$/.exec(dataUrl);
      if (!match) throw new Error("Invalid data URL");
      const target = await uniqueTargetPath(targetDir, fileName);
      await fs.writeFile(target, Buffer.from(match[2], "base64"));
      return target;
    }
  );

  ipcMain.handle("acdsee:load-state", async (): Promise<string | null> => {
    try {
      return await fs.readFile(stateFile("state.json"), "utf8");
    } catch {
      return null;
    }
  });

  ipcMain.handle("acdsee:save-state", async (_event, json: string): Promise<void> => {
    if (typeof json !== "string" || json.length > 1024 * 1024) throw new Error("Invalid state");
    await fs.mkdir(stateDir(), { recursive: true });
    await fs.writeFile(stateFile("state.json"), json, { encoding: "utf8", mode: 0o600 });
  });

  ipcMain.handle("acdsee:create-folder", async (_event, parentDir: string, name: string): Promise<string> => {
    const clean = name.trim();
    if (!clean || clean === "." || clean === ".." || /[\\/]/.test(clean)) {
      throw new Error("Invalid folder name");
    }
    const target = await uniqueTargetPath(parentDir, clean);
    await fs.mkdir(target, { recursive: false });
    return target;
  });

  ipcMain.handle("acdsee:rename", async (_event, fullPath: string, newName: string): Promise<string> => {
    const target = path.join(path.dirname(fullPath), newName);
    await fs.rename(fullPath, target);
    return target;
  });

  ipcMain.handle("acdsee:trash", async (_event, paths: string[]): Promise<void> => {
    for (const p of paths) {
      await shell.trashItem(p);
    }
  });

  ipcMain.handle("acdsee:copy-to", async (_event, paths: string[], targetDir: string): Promise<void> => {
    for (const p of paths) {
      const target = await uniqueTargetPath(targetDir, path.basename(p));
      await fs.cp(p, target, { recursive: true });
    }
  });

  ipcMain.handle("acdsee:move-to", async (_event, paths: string[], targetDir: string): Promise<void> => {
    for (const p of paths) {
      const target = await uniqueTargetPath(targetDir, path.basename(p));
      try {
        await fs.rename(p, target);
      } catch (error) {
        // Moving across filesystems (e.g. to a USB drive) needs a copy + unlink.
        if ((error as NodeJS.ErrnoException).code !== "EXDEV") throw error;
        await fs.cp(p, target, { recursive: true });
        await fs.rm(p, { recursive: true, force: true });
      }
    }
  });

  ipcMain.handle("acdsee:open-path", async (_event, fullPath: string): Promise<void> => {
    await shell.openPath(fullPath);
  });

  ipcMain.handle("acdsee:show-in-folder", async (_event, fullPath: string): Promise<void> => {
    shell.showItemInFolder(fullPath);
  });

  ipcMain.handle("acdsee:open-trash", async (): Promise<void> => {
    if (process.platform === "darwin") {
      await shell.openPath(path.join(os.homedir(), ".Trash"));
      return;
    }
    if (process.platform === "win32") {
      await new Promise<void>((resolvePromise, rejectPromise) => {
        execFile("explorer.exe", ["shell:RecycleBinFolder"], (error) =>
          error ? rejectPromise(error) : resolvePromise()
        );
      });
      return;
    }
    const candidates = [
      path.join(os.homedir(), ".local", "share", "Trash", "files"),
      path.join(os.homedir(), ".local", "share", "Trash")
    ];
    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        await shell.openPath(candidate);
        return;
      } catch {
        // try the next candidate
      }
    }
    await shell.openPath(os.homedir());
  });

  ipcMain.handle(
    "acdsee:set-wallpaper",
    async (_event, fullPath: string): Promise<{ ok: boolean; message: string }> => {
      try {
        if (process.platform === "darwin") {
          await new Promise<void>((resolvePromise, rejectPromise) => {
            execFile(
              "/usr/bin/osascript",
              ["-e", `tell application "Finder" to set desktop picture to POSIX file "${fullPath}"`],
              (error) => (error ? rejectPromise(error) : resolvePromise())
            );
          });
          return { ok: true, message: "Desktop picture updated." };
        }
        if (process.platform === "win32") {
          const script = `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class W { [DllImport("user32.dll")] public static extern int SystemParametersInfo(int a,int b,string c,int d); }'; [W]::SystemParametersInfo(20, 0, '${fullPath.replace(/'/g, "''")}', 3)`;
          await new Promise<void>((resolvePromise, rejectPromise) => {
            execFile("powershell", ["-NoProfile", "-Command", script], (error) =>
              error ? rejectPromise(error) : resolvePromise()
            );
          });
          return { ok: true, message: "Desktop wallpaper updated." };
        }
        await new Promise<void>((resolvePromise, rejectPromise) => {
          execFile(
            "gsettings",
            ["set", "org.gnome.desktop.background", "picture-uri", `file://${fullPath}`],
            (error) => (error ? rejectPromise(error) : resolvePromise())
          );
        });
        return { ok: true, message: "Desktop wallpaper updated." };
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : String(error) };
      }
    }
  );
}
