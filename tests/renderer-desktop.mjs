/**
 * Renderer desktop-mode integration test.
 *
 * Boots the already-built renderer bundle in jsdom with a fake `window.acdsee`
 * that serves a deterministic `/demo` tree, then drives the real UI through
 * navigation, the viewer and destructive file operations.
 *
 * Run `yarn build` first (the test inlines `out/renderer/index.html`).
 */
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import pkg from "jsdom";

const { JSDOM, VirtualConsole } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rendererDir = path.resolve(__dirname, "..", "out", "renderer");

/* ------------------------------------------------------------------ */
/* Fake filesystem + desktop bridge                                     */
/* ------------------------------------------------------------------ */
// 1x1 RGBA PNG (valid signature/IHDR/IDAT/IEND, CRC checked).
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNQaHjwHwAExAKAc00zmAAAAABJRU5ErkJggg==";

const FIXED_MTIME = Date.UTC(2024, 4, 12, 9, 30, 0);

const folderSet = new Set([
  "/demo",
  "/demo/Pictures",
  "/demo/Documents",
  "/demo/Desktop",
  "/demo/Pictures/Trips"
]);
const files = new Map(); // path -> { name, path, size, mtimeMs, ext }
const dims = new Map(); // path -> { width, height, format }
const ops = [];
const listDirCalls = [];

const baseName = (p) => p.split("/").filter(Boolean).pop() ?? p;
const parentPath = (p) => {
  const i = p.lastIndexOf("/");
  return i > 0 ? p.slice(0, i) : null;
};
const extensionOf = (name) => {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
};
const addFile = (p, size, width, height, format) => {
  files.set(p, {
    name: baseName(p),
    path: p,
    size,
    mtimeMs: FIXED_MTIME,
    ext: extensionOf(baseName(p))
  });
  dims.set(p, { width, height, format });
};

// /demo/Pictures
addFile("/demo/Pictures/lake.jpg", 184_320, 900, 600, "jpeg");
addFile("/demo/Pictures/cat.png", 96_540, 640, 480, "png");
// /demo/Pictures/Trips
addFile("/demo/Pictures/Trips/trip-1.jpg", 121_400, 800, 600, "jpeg");
addFile("/demo/Pictures/Trips/trip-2.jpg", 210_900, 1024, 768, "jpeg");

const childFolders = (dir) =>
  [...folderSet].filter((p) => parentPath(p) === dir).sort();
const fileEntries = (dir) =>
  [...files.values()]
    .filter((f) => parentPath(f.path) === dir)
    .sort((a, b) => a.name.localeCompare(b.name));
const dirEntry = (p) => ({
  name: baseName(p),
  path: p,
  size: 0,
  mtimeMs: FIXED_MTIME,
  ext: ""
});

/** Clone `source` into `targetDir`, picking a non-clashing name. */
const cloneInto = (source, targetDir) => {
  const entry = files.get(source);
  if (!entry) return null;
  const used = new Set(fileEntries(targetDir).map((f) => f.name));
  let name = entry.name;
  if (used.has(name)) name = `Copy of ${name}`;
  let n = 2;
  while (used.has(name)) name = `Copy (${n++}) of ${entry.name}`;
  const dest = `${targetDir}/${name}`;
  addFile(dest, entry.size, dims.get(source)?.width ?? 640, dims.get(source)?.height ?? 480, dims.get(source)?.format ?? "jpeg");
  return dest;
};

const createApi = () => ({
  platform: "linux",

  systemPaths: async () => ({
    home: "/home/demo",
    pictures: "/demo/Pictures",
    documents: "/demo/Documents",
    desktop: "/demo/Desktop",
    platform: "linux"
  }),

  listRoots: async () => [
    { id: "__computer__", name: "My Computer", icon: "computer", path: "", parent: null },
    { id: "/demo/Pictures", name: "My Pictures", icon: "pictures", path: "/demo/Pictures", parent: null },
    { id: "/demo/Documents", name: "My Documents", icon: "mydocs", path: "/demo/Documents", parent: null },
    { id: "/demo/Desktop", name: "Desktop", icon: "folder", path: "/demo/Desktop", parent: null }
  ],

  listChildren: async (id) => {
    if (id === "__computer__") {
      return [{ id: "/demo", name: "Demo Disk", icon: "drive", path: "/demo", parent: "__computer__" }];
    }
    return childFolders(id).map((p) => ({
      id: p,
      name: baseName(p),
      icon: "folder",
      path: p,
      parent: id
    }));
  },

  listDir: async (dir) => {
    listDirCalls.push(dir);
    return {
      path: dir,
      parent: parentPath(dir),
      folders: childFolders(dir).map(dirEntry),
      files: fileEntries(dir)
    };
  },

  thumbs: async (paths) => paths.map((p) => ({ path: p, dataUrl: TINY_PNG })),

  imageMeta: async (p) => dims.get(p) ?? { width: 640, height: 480, format: "jpeg" },

  exif: async () => null,

  saveDataUrl: async (targetDir, fileName, dataUrl) => {
    const dest = `${targetDir}/${fileName}`;
    ops.push({ op: "saveDataUrl", targetDir, fileName, bytes: dataUrl.length, path: dest });
    addFile(dest, dataUrl.length, 640, 480, extensionOf(fileName) === "png" ? "png" : "jpeg");
    return dest;
  },

  createFolder: async (parentDir, name) => {
    const root = parentDir.replace(/\/+$/, "");
    const dest = `${root}/${name}`;
    folderSet.add(dest);
    ops.push({ op: "createFolder", parentDir: root, name, path: dest });
    return dest;
  },

  rename: async (oldPath, newName) => {
    const parent = parentPath(oldPath);
    const dest = parent ? `${parent}/${newName}` : newName;
    const entry = files.get(oldPath);
    if (entry) {
      files.delete(oldPath);
      const meta = dims.get(oldPath);
      dims.delete(oldPath);
      addFile(dest, entry.size, meta?.width ?? 640, meta?.height ?? 480, meta?.format ?? "jpeg");
    }
    if (folderSet.has(oldPath)) {
      for (const p of [...folderSet]) {
        if (p === oldPath || p.startsWith(`${oldPath}/`)) {
          folderSet.delete(p);
          folderSet.add(dest + p.slice(oldPath.length));
        }
      }
    }
    ops.push({ op: "rename", path: oldPath, newName, newPath: dest });
    return dest;
  },

  trash: async (paths) => {
    ops.push({ op: "trash", paths: [...paths] });
    for (const p of paths) {
      files.delete(p);
      dims.delete(p);
      for (const folder of [...folderSet]) {
        if (folder === p || folder.startsWith(`${p}/`)) folderSet.delete(folder);
      }
    }
  },

  copyTo: async (paths, targetDir) => {
    ops.push({ op: "copyTo", paths: [...paths], targetDir });
    for (const p of paths) cloneInto(p, targetDir);
  },

  moveTo: async (paths, targetDir) => {
    ops.push({ op: "moveTo", paths: [...paths], targetDir });
    for (const p of paths) {
      cloneInto(p, targetDir);
      files.delete(p);
      dims.delete(p);
    }
  },

  openPath: async () => {},
  showInFolder: async () => {},
  setWallpaper: async () => ({ ok: true, message: "Wallpaper set" }),
  printImage: async () => {},

  window: {
    minimize: () => {},
    toggleMaximize: () => {},
    close: () => {},
    isMaximized: async () => false
  }
});

/* ------------------------------------------------------------------ */
/* Boot jsdom                                                          */
/* ------------------------------------------------------------------ */
const errors = [];
const failures = [];

const source = await buildInlineHtml();
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => errors.push(`jsdom: ${error.message}`));
virtualConsole.on("error", (...args) => errors.push(`console.error: ${args.join(" ")}`));

const dom = new JSDOM(source, {
  url: pathToFileURL(path.join(rendererDir, "index.html")).href,
  resources: "usable",
  runScripts: "dangerously",
  pretendToBeVisual: true,
  virtualConsole,
  beforeParse(window) {
    window.__acdseeTest = { ops, listDirCalls };
    window.acdsee = createApi();

    // jsdom gaps used by the classic panes / viewer.
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    window.requestAnimationFrame = (cb) => window.setTimeout(() => cb(Date.now()), 16);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
    window.HTMLElement.prototype.scrollIntoView = () => {};
  }
});

async function buildInlineHtml() {
  const { readFile } = await import("fs/promises");
  let page = await readFile(path.join(rendererDir, "index.html"), "utf8");
  const scriptMatch = page.match(/src="(\.\/assets\/[^"]+\.js)"/);
  const cssMatch = page.match(/href="(\.\/assets\/[^"]+\.css)"/);
  if (!scriptMatch || !cssMatch) throw new Error("built assets not found in index.html");
  const [js, css] = await Promise.all([
    readFile(path.join(rendererDir, scriptMatch[1]), "utf8"),
    readFile(path.join(rendererDir, cssMatch[1]), "utf8")
  ]);
  page = page.replace(/<script type="module"[^>]*><\/script>/, "");
  page = page.replace(/<link rel="stylesheet"[^>]*>/, () => `<style>${css.replace(/<\/style>/g, "<\\/style>")}</style>`);
  page = page.replace("</body>", () => `<script>${js.replace(/<\/script>/g, "<\\/script>")}</script></body>`);
  return page;
}

const { window } = dom;
const { document } = window;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Poll until `predicate` returns truthy; resolves to its value or null. */
async function waitFor(predicate, timeout = 15000, interval = 40) {
  const deadline = Date.now() + timeout;
  for (;;) {
    try {
      const value = predicate();
      if (value) return value;
    } catch {
      /* ignore transient DOM/React states */
    }
    if (Date.now() >= deadline) return null;
    await sleep(interval);
  }
}

const assert = (condition, message) => {
  if (!condition) failures.push(message);
  else console.log(`ok - ${message}`);
};

const finish = () => {
  const fatal = errors.filter((message) => !/Could not load img|Could not load link/i.test(message));
  if (fatal.length) failures.push(`page errors:\n  - ${fatal.slice(0, 8).join("\n  - ")}`);
  window.close();
  if (failures.length) {
    console.error(`\nDESKTOP RENDERER FAIL (${failures.length}):\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log("\nDESKTOP RENDERER PASS");
};

/* ------------------------------------------------------------------ */
/* DOM helpers                                                          */
/* ------------------------------------------------------------------ */
const byText = (selector, text) =>
  [...document.querySelectorAll(selector)].find(
    (el) => (el.textContent ?? "").trim() === text || (el.textContent ?? "").includes(text)
  ) ?? null;

const fileLabel = (text) => byText(".file-label", text);
const fileItem = (text) => fileLabel(text)?.closest("[data-id]") ?? null;

const windowTitle = (el) => (el.querySelector(".title-bar-text")?.textContent ?? "").trim();
const windowByTitle = (text) =>
  [...document.querySelectorAll(".window98")].find((el) => windowTitle(el).includes(text)) ?? null;

const treeLabel = (text) =>
  [...document.querySelectorAll(".tv-label")].find((el) => (el.textContent ?? "").trim() === text) ?? null;

const mouse = (type) =>
  new window.MouseEvent(type, { bubbles: true, cancelable: true, view: window, button: 0 });

const clickElement = (el) => {
  el.dispatchEvent(mouse("mousedown"));
  el.dispatchEvent(mouse("click"));
};

/* ------------------------------------------------------------------ */
/* Boot                                                                 */
/* ------------------------------------------------------------------ */
const booted = await waitFor(() => document.querySelector(".menubar-item"), 15000);
if (!booted) {
  failures.push("app did not render the classic browser window within 15s");
  finish();
}

// The start folder is the real quick-root from listRoots(), not the demo library.
const browserTitle = windowTitle(document.querySelector(".window98"));
assert(
  browserTitle.includes("/demo/Pictures"),
  `desktop mode opens the real Pictures root (title: "${browserTitle}")`
);
assert(
  !/desktop\s*\\\s*my computer/i.test(browserTitle) && !/Web demo/i.test(browserTitle),
  `demo library is not active (title: "${browserTitle}")`
);
const addressInput = [...document.querySelectorAll(".window98 input")].find(
  (el) => el.value === "/demo/Pictures"
);
assert(addressInput, "address bar shows /demo/Pictures");

/* ---------------- classic shell ---------------- */
assert(!document.querySelector(".taskbar"), "no Win98 taskbar / Start menu");
assert(document.querySelectorAll(".status-panel").length >= 3, "classic status bar renders");

const treeLabels = [...document.querySelectorAll(".tv-label")].map((el) => (el.textContent ?? "").trim());
for (const label of ["Desktop", "My Computer", "My Pictures", "Documents", "Recycle Bin"]) {
  assert(
    treeLabels.some((t) => t === label || t.includes(label)),
    `tree contains "${label}"`
  );
}

/* ---------------- initial folder contents ---------------- */
const initialFiles = await waitFor(() => fileLabel("lake.jpg") && fileLabel("cat.png"), 10000);
assert(initialFiles, "lake.jpg and cat.png render from listDir(/demo/Pictures)");
assert(
  fileItem("Trips")?.dataset.id === "/demo/Pictures/Trips",
  "Trips renders as a folder tile with its absolute path id"
);
assert(listDirCalls.includes("/demo/Pictures"), "listDir was called for the start folder");

/* ---------------- tree navigation ---------------- */
const tripsLabel = treeLabel("Trips");
assert(tripsLabel, "Trips subfolder appears in the folder tree");
if (tripsLabel) clickElement(tripsLabel);

const arrived = await waitFor(() => fileLabel("trip-1.jpg"), 10000);
assert(arrived, "clicking Trips in the tree loads its files");
assert(listDirCalls.includes("/demo/Pictures/Trips"), "listDir was called with /demo/Pictures/Trips");

/* ---------------- viewer ---------------- */
const tripItem = fileItem("trip-1.jpg");
assert(tripItem, "trip-1.jpg file item has a data-id");
if (tripItem) tripItem.dispatchEvent(new window.MouseEvent("dblclick", { bubbles: true, cancelable: true, view: window, button: 0 }));

const viewer = await waitFor(() => windowByTitle("trip-1.jpg"), 6000);
assert(viewer, "double-clicking trip-1.jpg opens a second window titled trip-1.jpg");
assert(
  [...document.querySelectorAll(".window98")].length >= 2,
  "a separate viewer window is open next to the browser"
);
const zoomPanel = viewer
  ? [...viewer.querySelectorAll(".status-panel")].find((el) => (el.textContent ?? "").includes("Zoom:"))
  : null;
assert(zoomPanel && /Zoom:\s*\d+%/.test(zoomPanel.textContent ?? ""), "viewer status bar shows the zoom level");

document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
const viewerClosed = await waitFor(() => !windowByTitle("trip-1.jpg"), 6000);
assert(viewerClosed, "Escape closes the viewer");

/* ---------------- delete through the OS trash ---------------- */
const deleteTarget = fileItem("trip-1.jpg");
assert(deleteTarget, "trip-1.jpg is still listed after closing the viewer");
if (deleteTarget) deleteTarget.dispatchEvent(mouse("mousedown"));

const deleteButton = await waitFor(
  () => [...document.querySelectorAll('[data-tip^="Delete"]')].find((el) => !el.disabled),
  3000
);
assert(deleteButton, "toolbar Delete is enabled for the selected file");
if (deleteButton) deleteButton.click();

const confirm = await waitFor(
  () => document.querySelector('[role="dialog"][aria-label="Confirm File Delete"]'),
  4000
);
assert(confirm, "Delete asks for confirmation");
assert(
  confirm &&
    (confirm.textContent ?? "").includes("Trash") &&
    (confirm.textContent ?? "").includes("trip-1.jpg"),
  `confirmation mentions Trash and the file ("${(confirm?.textContent ?? "").trim().slice(0, 80)}...")`
);

const yes = confirm ? [...confirm.querySelectorAll("button")].find((el) => (el.textContent ?? "").trim() === "Yes") : null;
assert(yes, "confirmation dialog offers Yes");
if (yes) yes.click();

const trashOp = await waitFor(() => ops.find((op) => op.op === "trash"), 4000);
assert(trashOp, "trash() was called on the desktop bridge");
assert(
  trashOp && JSON.stringify(trashOp.paths) === JSON.stringify(["/demo/Pictures/Trips/trip-1.jpg"]),
  `trash() received the absolute path (${JSON.stringify(trashOp?.paths)})`
);
const gone = await waitFor(() => !fileLabel("trip-1.jpg"), 6000);
assert(gone, "the deleted file disappears after listDir refreshes");

/* ---------------- File > New Folder ---------------- */
const fileMenu = [...document.querySelectorAll(".menubar-item")].find(
  (el) => (el.textContent ?? "").trim() === "File"
);
assert(fileMenu, 'File menu is present');
if (fileMenu) fileMenu.dispatchEvent(mouse("mousedown"));

const popup = await waitFor(() => document.querySelector(".menu-popup"), 3000);
const newFolderItem = popup
  ? [...popup.querySelectorAll(".menu-item")].find((el) => (el.textContent ?? "").includes("New Folder"))
  : null;
assert(newFolderItem, "File menu contains New Folder...");
if (newFolderItem) newFolderItem.click();

const newFolderDialog = await waitFor(
  () => document.querySelector('[role="dialog"][aria-label="New Folder"]'),
  4000
);
assert(newFolderDialog, "New Folder dialog opens");
if (newFolderDialog) {
  const input = newFolderDialog.querySelector("input");
  if (input) {
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setValue.call(input, "Vacation");
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  }
  const ok = [...newFolderDialog.querySelectorAll("button")].find(
    (el) => (el.textContent ?? "").trim() === "OK"
  );
  if (ok) ok.click();
}

const folderOp = await waitFor(
  () => ops.find((op) => op.op === "createFolder" && op.name === "Vacation"),
  4000
);
assert(folderOp, "createFolder() was called on the desktop bridge");
assert(
  folderOp && folderOp.parentDir === "/demo/Pictures/Trips" && folderOp.path === "/demo/Pictures/Trips/Vacation",
  `new folder was created in the current real folder (${folderOp?.path})`
);
const newTile = await waitFor(() => fileLabel("Vacation"), 4000);
assert(newTile, "the new folder tile appears in the browser");

finish();
