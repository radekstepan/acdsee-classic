/**
 * Library model shared by every browser component.
 *
 * The template shipped a static in-memory library. The desktop app walks the
 * real filesystem instead, so folders/photos now live in a small runtime store
 * that the App syncs on every render. Helper names and shapes are unchanged,
 * which keeps BrowserView/Panels/Viewer/Dialogs working untouched.
 */
export type FolderIcon =
  | "computer"
  | "drive"
  | "floppy"
  | "cd"
  | "folder"
  | "mydocs"
  | "pictures"
  | "music"
  | "network"
  | "recycle"
  | "control"
  | "programs";

export type Folder = {
  id: string;
  name: string;
  icon: FolderIcon;
  parent: string | null;
  /** Absolute filesystem path, or "" for virtual nodes (My Computer). */
  path: string;
};

export type Photo = {
  id: string;
  name: string;
  folderId: string;
  /** Thumbnail source (data URL once loaded, "" while pending, demo path in demo mode). */
  src: string;
  /** Full-resolution source for the viewer/preview panes. */
  fullSrc: string;
  /** Absolute filesystem path, or "" in demo mode. */
  path: string;
  width: number;
  height: number;
  size: number;
  date: string;
  camera: string;
  make: string;
  exposure: string;
  aperture: string;
  iso: number;
  focal: string;
  flash: string;
  format: string;
  rotation: number;
  flipped?: boolean;
  rating: number;
  tags: string[];
};

// ---------------------------------------------------------------------------
// Runtime store (synced by App; read by the pure helpers below)
// ---------------------------------------------------------------------------

let runtimeFolders: Folder[] = [];

export function setRuntimeLibrary(nextFolders: Folder[]): void {
  runtimeFolders = nextFolders;
}

export const folderById = (id: string): Folder | undefined =>
  runtimeFolders.find((f) => f.id === id);

export function childFolders(id: string): Folder[] {
  return runtimeFolders.filter((f) => f.parent === id);
}

export function descendantPhotoCount(folderId: string, all: Photo[]): number {
  const ids = new Set<string>([folderId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of runtimeFolders) {
      if (f.parent && ids.has(f.parent) && !ids.has(f.id)) {
        ids.add(f.id);
        changed = true;
      }
    }
  }
  return all.filter((p) => ids.has(p.folderId)).length;
}

export function folderPath(id: string): Folder[] {
  const chain: Folder[] = [];
  let current = folderById(id);
  let guard = 0;
  while (current && guard++ < 40) {
    chain.unshift(current);
    current = current.parent ? folderById(current.parent) : undefined;
  }
  return chain;
}

export function folderPathString(id: string): string {
  const chain = folderPath(id);
  if (!chain.length) return "";
  const leaf = chain[chain.length - 1];
  // Real folders carry their absolute path.
  if (leaf.path) return leaf.path;
  const labels: Record<string, string> = {
    my_computer: "My Computer",
    "my-computer": "My Computer",
    "my-network": "My Network Places",
    "recycle-bin": "Recycle Bin"
  };
  return chain.map((f) => labels[f.id] ?? f.name).join("\\");
}

export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const imageTransform = (p: Photo): string =>
  `rotate(${p.rotation}deg) scaleX(${p.flipped ? -1 : 1})`;

export function sortPhotos(items: Photo[], key: string, dir: "asc" | "desc"): Photo[] {
  const mult = dir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    let av: string | number = a.name.toLowerCase();
    let bv: string | number = b.name.toLowerCase();
    if (key === "date") {
      av = new Date(a.date).getTime();
      bv = new Date(b.date).getTime();
    } else if (key === "size") {
      av = a.size;
      bv = b.size;
    } else if (key === "type") {
      av = a.format;
      bv = b.format;
    } else if (key === "dimensions") {
      av = a.width * a.height;
      bv = b.width * b.height;
    }
    return av < bv ? -mult : av > bv ? mult : 0;
  });
}

export const totalSize = (items: Photo[]): number =>
  items.reduce((sum, item) => sum + item.size, 0);
