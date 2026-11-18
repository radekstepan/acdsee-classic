import { FORMATS } from "../data/catalog";
import type { Edit, FileEntry, Folder, SortKey } from "../types";

export const defaultEdit: Edit = {
  rot: 0,
  flipH: false,
  flipV: false,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  gray: false,
  sepia: false,
  invert: false,
};

export function formatBytes(b: number): string {
  if (b < 1024) return `${b} bytes`;
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1048576).toFixed(1)} MB`;
  return `${(b / 1073741824).toFixed(2)} GB`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatDate(ts: number, withTime = true): string {
  const d = new Date(ts);
  const date = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  if (!withTime) return date;
  let h = d.getHours();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${date} ${h}:${String(d.getMinutes()).padStart(2, "0")} ${ap}`;
}

export function formatLongDate(ts: number): string {
  const d = new Date(ts);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  let h = d.getHours();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${h}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")} ${ap}`;
}

export function fullName(f: FileEntry): string {
  return `${f.name}.${f.ext}`;
}

export function typeName(f: FileEntry): string {
  return FORMATS[f.ext]?.type ?? `${f.ext.toUpperCase()} File`;
}

export function folderLabel(f: Folder): string {
  return f.name;
}

/** Display path. Real folders show their absolute path; virtual nodes use classic labels. */
export function pathOf(folders: Record<string, Folder>, id: string): string {
  const chain: Folder[] = [];
  let cur: Folder | undefined = folders[id];
  let guard = 0;
  while (cur && guard++ < 60) {
    chain.unshift(cur);
    cur = cur.parent ? folders[cur.parent] : undefined;
  }
  if (!chain.length) return "";
  const last = chain[chain.length - 1];
  if (last.path) return last.path;
  const drive = chain.find((c) => c.drive);
  if (drive) {
    const idx = chain.indexOf(drive);
    const rest = chain.slice(idx + 1).map((c) => c.name);
    return `${drive.drive}:\\${rest.join("\\")}`;
  }
  if (last.kind === "desktop") return "Desktop";
  if (last.kind === "computer") return "My Computer";
  if (last.kind === "recycle") return "Recycle Bin";
  if (last.kind === "network" || last.kind === "netpc") {
    const idx = chain.findIndex((c) => c.kind === "network");
    const names = chain.slice(idx).map((c) => c.name);
    if (names.length >= 3) return `\\\\${names[1].toUpperCase()}\\${names.slice(2).join("\\")}`;
    if (names.length === 2) return `\\\\${names[1].toUpperCase()}`;
    return "Network Neighborhood";
  }
  return chain.map((c) => c.name).join("\\");
}

export function findFolderByPath(folders: Record<string, Folder>, input: string): string | null {
  const raw = input.trim().replace(/\/+$/, "").toLowerCase();
  if (!raw) return null;
  const win = raw.replace(/\//g, "\\");
  for (const f of Object.values(folders)) {
    const p = f.path.replace(/\/+$/, "").toLowerCase();
    if (p && (p === raw || p.replace(/\//g, "\\") === win)) return f.id;
    const label = pathOf(folders, f.id).replace(/\/+$/, "").toLowerCase();
    if (label && (label === raw || label.replace(/\//g, "\\") === win)) return f.id;
  }
  const byName = Object.values(folders).find((f) => f.name.toLowerCase() === raw);
  return byName?.id ?? null;
}

export function ancestors(folders: Record<string, Folder>, id: string): string[] {
  const out: string[] = [];
  let cur = folders[id]?.parent;
  while (cur) {
    out.unshift(cur);
    cur = folders[cur]?.parent ?? null;
  }
  return out;
}

export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function sortFiles(files: FileEntry[], key: SortKey, dir: "asc" | "desc"): FileEntry[] {
  const m = dir === "asc" ? 1 : -1;
  const arr = [...files];
  arr.sort((a, b) => {
    let r = 0;
    switch (key) {
      case "name":
        r = naturalCompare(fullName(a), fullName(b));
        break;
      case "size":
        r = a.size - b.size;
        break;
      case "type":
        r = naturalCompare(typeName(a), typeName(b)) || naturalCompare(a.name, b.name);
        break;
      case "date":
        r = a.modified - b.modified;
        break;
      case "dims":
        r = a.w * a.h - b.w * b.h;
        break;
    }
    if (r === 0) r = naturalCompare(fullName(a), fullName(b));
    return r * m;
  });
  return arr;
}

export function editFilter(e: Edit): string {
  const parts: string[] = [];
  if (e.brightness) parts.push(`brightness(${(100 + e.brightness) / 100})`);
  if (e.contrast) parts.push(`contrast(${(100 + e.contrast) / 100})`);
  if (e.saturation) parts.push(`saturate(${(100 + e.saturation) / 100})`);
  if (e.hue) parts.push(`hue-rotate(${e.hue}deg)`);
  if (e.gray) parts.push("grayscale(1)");
  if (e.sepia) parts.push("sepia(1)");
  if (e.invert) parts.push("invert(1)");
  return parts.length ? parts.join(" ") : "none";
}

export function editTransform(e: Edit): string {
  // rotate first, then flip in display space
  return `scale(${e.flipH ? -1 : 1}, ${e.flipV ? -1 : 1}) rotate(${e.rot}deg)`;
}

export function fitBox(w: number, h: number, maxW: number, maxH = maxW, allowUpscale = true) {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { w: Math.max(1, Math.round(maxW)), h: Math.max(1, Math.round(maxH)), scale: 1 };
  }
  let s = Math.min(maxW / w, maxH / h);
  if (!allowUpscale) s = Math.min(s, 1);
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)), scale: s };
}

export function hasEdit(e: Edit): boolean {
  return JSON.stringify(e) !== JSON.stringify(defaultEdit);
}

export function uniqueName(existing: FileEntry[], name: string, ext: string): string {
  const has = (n: string) => existing.some((f) => f.name.toLowerCase() === n.toLowerCase() && f.ext === ext);
  if (!has(name)) return name;
  let cand = `Copy of ${name}`;
  let i = 2;
  while (has(cand)) cand = `Copy (${i++}) of ${name}`;
  return cand;
}

export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const CAMERAS = [
  ["Olympus", "C-2020Z"],
  ["NIKON", "E950"],
  ["SONY", "Mavica MVC-FD88"],
  ["KODAK", "DC4800 ZOOM"],
  ["Canon", "PowerShot G1"],
  ["FUJIFILM", "FinePix 2400Z"],
];

export function cameraInfo(f: FileEntry) {
  const h = hash(f.id);
  const [make, model] = CAMERAS[h % CAMERAS.length];
  const fn = [2.8, 3.5, 4, 5.6, 8][h % 5];
  const exp = ["1/30", "1/60", "1/125", "1/250", "1/500", "1/1000"][(h >> 3) % 6];
  const iso = [100, 100, 200, 400][(h >> 5) % 4];
  const focal = [5.8, 7.2, 9.4, 12.6, 21.0][(h >> 7) % 5];
  const flash = (h >> 9) % 4 === 0 ? "Flash fired" : "Flash did not fire";
  const exif = f.exif ?? {};
  return {
    make: exif.make || make,
    model: exif.model || model,
    fn: (exif.aperture || `f/${fn}`).replace(/^f\//i, ""),
    exp: exif.exposure || `${exp} sec`,
    iso: exif.iso ?? iso,
    focal: (exif.focal || `${focal} mm`).replace(/\s*mm$/i, ""),
    flash: exif.flash || flash,
    meter: "Matrix",
    software: "ACDSee Classic"
  };
}

export function estimateSize(ext: string, w: number, h: number, quality = 75): number {
  const px = w * h;
  switch (ext) {
    case "bmp":
      return px * 3 + 54;
    case "gif":
      return Math.round(px * 0.4);
    case "png":
      return Math.round(px * 1.3);
    case "tif":
      return Math.round(px * 2.1 + 8192);
    case "pcx":
      return Math.round(px * 1.05);
    case "tga":
      return px * 3 + 18;
    default:
      return Math.round(px * (0.08 + quality / 100 * 0.45)) + 1500;
  }
}

export function dosName(name: string, ext: string): string {
  const clean = name.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const base = clean.length > 8 ? clean.slice(0, 6) + "~1" : clean || "FILE";
  return `${base}.${ext.toUpperCase().slice(0, 3)}`;
}
