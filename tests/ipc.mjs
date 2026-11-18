/** Main-process IPC tests: bundle src/main/fs.ts, stub `electron`, exercise handlers on real files. */
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
  else console.log(`ok - ${message}`);
};

// The packaged app ships no node_modules, so imaging libs must be bundled into main.
const mainBundle = await fs.readFile(path.join(root, "out", "main", "index.js"), "utf8");
assert(!/["']image-size\/fromFile["']/.test(mainBundle), "image-size is bundled into main");
assert(!/import\(["']exifr["']\)/.test(mainBundle), "exifr is bundled into main");

// Closing the last window must quit the app on every platform (no macOS exemption:
// a lingering process after close is the reported bug).
const mainSource = await fs.readFile(path.join(root, "src", "main", "index.ts"), "utf8");
const closedBlock = mainSource.match(/app\.on\("window-all-closed"[\s\S]*?\n\}\)/);
assert(closedBlock?.[0].includes("app.quit()"), "app quits when all windows close");
assert(closedBlock && !closedBlock[0].includes("darwin"), "quit applies on macOS too");

// Bundle the real main-process sources (electron external -> stubbed).
const bundlePath = path.join(root, "out", "test-fs.mjs");
await fs.mkdir(path.dirname(bundlePath), { recursive: true });
await esbuild.build({
  entryPoints: [path.join(root, "src", "main", "fs.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  external: ["electron"],
  outfile: bundlePath,
  logLevel: "silent"
});

const stub = await import("./electron-stub.mjs");
const { registerFsHandlers } = await import(pathToFileURL(bundlePath).href);
registerFsHandlers();

const invoke = async (channel, ...args) => {
  const fn = stub.handlers.get(channel);
  if (!fn) throw new Error(`no handler for ${channel}`);
  return fn({}, ...args);
};

// Fixture library: real JPEGs + subfolder + junk that must be ignored.
const fixture = await fs.mkdtemp(path.join(os.tmpdir(), "acdsee-test-"));
const photosDir = path.join(root, "src", "renderer", "public", "photos");
await fs.cp(path.join(photosDir, "13894051.jpg"), path.join(fixture, "a-lake.jpg"));
await fs.cp(path.join(photosDir, "4127415.jpg"), path.join(fixture, "b-picnic.jpg"));
await fs.cp(path.join(photosDir, "9282736.jpg"), path.join(fixture, "c-show.JPG"));
await fs.writeFile(path.join(fixture, "notes.txt"), "not an image");
await fs.writeFile(path.join(fixture, ".hidden.jpg"), "fake");
await fs.mkdir(path.join(fixture, "sub"));
await fs.cp(path.join(photosDir, "697244.jpg"), path.join(fixture, "sub", "d-trip.jpg"));

const systemPaths = await invoke("acdsee:system-paths");
assert(systemPaths.home && systemPaths.pictures, `system paths resolve (${systemPaths.pictures})`);

const roots = await invoke("acdsee:list-roots");
assert(roots.length === 4, `four tree roots (${roots.map((r) => r.name).join(", ")})`);
assert(roots[0].id === "__computer__", "virtual My Computer root first");

const volumes = await invoke("acdsee:list-children", "__computer__");
assert(volumes.length >= 1 && volumes.every((v) => v.parent === "__computer__"), `volumes listed (${volumes.length})`);

const listing = await invoke("acdsee:list-dir", fixture);
assert(listing.folders.length === 1 && listing.folders[0].name === "sub", "subfolder listed");
assert(listing.files.length === 3, `three images listed, junk ignored (${listing.files.map((f) => f.name).join(", ")})`);
assert(listing.files.every((f) => f.size > 0 && f.mtimeMs > 0), "stat fields populated");

const hiddenListing = await invoke("acdsee:list-dir", fixture, true);
assert(hiddenListing.files.some((f) => f.name === ".hidden.jpg"), "includeHidden lists dot files");

const sub = await invoke("acdsee:list-dir", path.join(fixture, "sub"));
assert(sub.files.length === 1 && sub.parent === fixture, "nested folder + parent link");

const meta = await invoke("acdsee:image-meta", path.join(fixture, "a-lake.jpg"));
assert(meta && meta.width > 0 && meta.height > 0 && meta.format === "JPG", `real dimensions detected (${meta?.width}x${meta?.height} ${meta?.format})`);
const missingMeta = await invoke("acdsee:image-meta", path.join(fixture, "nope.jpg"));
assert(missingMeta === null, "missing file meta is null");

// Minimal EXIF-orientation JPEG: SOI + APP1 (EXIF orientation tag) + SOF0
// declaring a stored 8x4 landscape frame + EOI. image-size only reads the
// headers, so no scan data is needed. Browsers auto-rotate for display, so
// orientations 5-8 must report the swapped (displayed) dimensions.
const orientedJpeg = (orientation) =>
  Buffer.from([
    0xff, 0xd8,
    0xff, 0xe1, 0x00, 0x22,
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00,
    0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, orientation, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x04, 0x00, 0x08, 0x01, 0x01, 0x11, 0x00,
    0xff, 0xd9
  ]);
for (let orientation = 1; orientation <= 8; orientation++) {
  const orientedPath = path.join(fixture, `orient-${orientation}.jpg`);
  await fs.writeFile(orientedPath, orientedJpeg(orientation));
  const orientedMeta = await invoke("acdsee:image-meta", orientedPath);
  const swapped = orientation >= 5;
  const expected = swapped ? "4x8" : "8x4";
  assert(
    orientedMeta?.width === (swapped ? 4 : 8) && orientedMeta?.height === (swapped ? 8 : 4),
    `orientation ${orientation} reports displayed ${expected} dimensions (${orientedMeta?.width}x${orientedMeta?.height})`
  );
  assert(
    orientedMeta?.orientation === orientation,
    `orientation ${orientation} flag is exposed for callers (${orientedMeta?.orientation})`
  );
}

const exif = await invoke("acdsee:exif", path.join(fixture, "a-lake.jpg"));
assert(exif === null || typeof exif === "object", "exif does not throw");

const thumbs = await invoke("acdsee:thumbs", [path.join(fixture, "a-lake.jpg"), path.join(fixture, "nope.jpg")], 192);
assert(thumbs[0].dataUrl?.startsWith("data:image/"), "thumbnail data URL returned");
assert(thumbs[1].dataUrl === null, "missing file thumbnail is null");
assert(thumbs[0].width === 192 && thumbs[0].height === 128, "thumbnail reports bitmap dims for tile sizing");
assert(thumbs[1].width === 0 && thumbs[1].height === 0, "missing file thumbnail dims are zero");

// REGRESSION (squished tiles): small OS thumbnail requests return
// cover-cropped bitmaps, so the handler must scale tile sizes up to the
// aspect-preserving range (384px+ verified via QuickLook).
const lastRequest = () => stub.thumbRequests.at(-1);
// NOTE: each case uses a distinct path — makeThumb caches by path+mtime+size,
// so reusing a path would hit the cache and record no new request.
await invoke("acdsee:thumbs", [path.join(fixture, "a-lake.jpg")], 96);
assert(lastRequest() === 384, `tile size 96 requests a 384px bitmap (${lastRequest()})`);
await invoke("acdsee:thumbs", [path.join(fixture, "sub", "d-trip.jpg")], 8);
assert(lastRequest() === 128, `tiny tile sizes clamp to a 128px floor (${lastRequest()})`);
await invoke("acdsee:thumbs", [path.join(fixture, "notes.txt")], 9999);
assert(lastRequest() === 512, `huge tile sizes clamp to a 512px ceiling (${lastRequest()})`);

const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const saved = await invoke("acdsee:save-data-url", fixture, "pixel.png", pixel);
const savedStat = await fs.stat(saved);
assert(savedStat.size > 0, "data URL saved to disk");
const savedAgain = await invoke("acdsee:save-data-url", fixture, "pixel.png", pixel);
assert(savedAgain !== saved, "name clash gets a unique suffix");

const newDir = path.join(fixture, "fresh");
await fs.mkdir(newDir);

const createdDir = await invoke("acdsee:create-folder", fixture, "New Folder");
assert(createdDir === path.join(fixture, "New Folder") && (await fs.stat(createdDir)).isDirectory(), "create-folder works");
let rejected = false;
try {
  await invoke("acdsee:create-folder", fixture, "../escape");
} catch {
  rejected = true;
}
assert(rejected, "create-folder rejects path traversal");

const renamed = await invoke("acdsee:rename", path.join(fixture, "b-picnic.jpg"), "b-renamed.jpg");
assert(path.basename(renamed) === "b-renamed.jpg", "rename works");

await invoke("acdsee:copy-to", [path.join(fixture, "a-lake.jpg")], newDir);
assert((await fs.stat(path.join(newDir, "a-lake.jpg"))).size > 0, "copy-to works");

await invoke("acdsee:move-to", [path.join(fixture, "c-show.JPG")], newDir);
assert((await fs.stat(path.join(newDir, "c-show.JPG"))).size > 0, "move-to works");

await invoke("acdsee:trash", [path.join(fixture, "a-lake.jpg")]);
assert(stub.trashed.length === 1, "trash delegates to shell");

await invoke("acdsee:open-path", path.join(fixture, "notes.txt"));
await invoke("acdsee:show-in-folder", path.join(fixture, "notes.txt"));
assert(stub.opened.length === 1 && stub.shownInFolder.length === 1, "open/show-in-folder delegate to shell");

const openedBefore = stub.opened.length;
await invoke("acdsee:open-trash");
assert(stub.opened.length === openedBefore + 1, "open-trash delegates to the platform trash location");

// Channel parity: every channel the preload calls must have a main handler.
const preloadSource = await fs.readFile(path.join(root, "out", "preload", "index.mjs"), "utf8");
const called = [...new Set([...preloadSource.matchAll(/"(acdsee:[a-z-]+)"/g)].map((m) => m[1]))];
const windowSends = [
  "acdsee:window-minimize",
  "acdsee:window-toggle-maximize",
  "acdsee:window-close",
  "acdsee:window-is-maximized",
  "acdsee:window-set-fullscreen",
  "acdsee:window-fullscreen-changed"
];
for (const channel of called) {
  if (windowSends.includes(channel)) continue; // registered in main/index.ts, not fs.ts
  assert(stub.handlers.has(channel), `handler registered for ${channel}`);
}

await fs.rm(fixture, { recursive: true, force: true });
if (failures.length) {
  console.error(`\nIPC FAIL (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nIPC PASS: filesystem backend works on real files.");
