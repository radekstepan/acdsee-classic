/** Shared contract between the Electron main process and the renderer. */

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

export type FolderNode = {
  /** Stable id. Real folders use their absolute path; virtual nodes use a `__`-prefixed id. */
  id: string;
  name: string;
  icon: FolderIcon;
  /** Absolute path, or "" for virtual nodes. */
  path: string;
  parent: string | null;
};

export type DirEntry = {
  name: string;
  path: string;
  size: number;
  mtimeMs: number;
  ext: string;
};

export type ListDirResult = {
  path: string;
  parent: string | null;
  folders: DirEntry[];
  files: DirEntry[];
};

export type ImageMeta = {
  width: number;
  height: number;
  format: string;
  /** EXIF orientation flag (1-8) as stored in the file; 1 when absent. */
  orientation: number;
};

export type ExifInfo = {
  make?: string;
  model?: string;
  exposureTime?: string;
  fNumber?: string;
  iso?: number;
  focalLength?: string;
  flash?: string;
};

export type SystemPaths = {
  home: string;
  pictures: string;
  documents: string;
  desktop: string;
  platform: NodeJS.Platform;
};

export type ThumbResult = {
  path: string;
  dataUrl: string | null;
  /** Bitmap dimensions in points (aspect only — tiles fit to these). */
  width: number;
  height: number;
};

/** Full-file URL for a local path, served by the `local-file://` protocol. */
export const localFileUrl = (path: string): string =>
  `local-file://file/${encodeURIComponent(path)}`;

export const VIRTUAL_ROOT = "__computer__";

export type AcdseeApi = {
  platform: NodeJS.Platform;
  systemPaths: () => Promise<SystemPaths>;
  /** Top-level tree nodes (virtual root + quick locations). */
  listRoots: () => Promise<FolderNode[]>;
  /** Child folders of a tree node id (virtual root id or real folder path). */
  listChildren: (id: string) => Promise<FolderNode[]>;
  /** Folder contents for the file stage. */
  listDir: (path: string, includeHidden?: boolean) => Promise<ListDirResult>;
  /** OS trash contents for the Recycle Bin view (empty on platforms without a listable trash). */
  listTrash: (includeHidden?: boolean) => Promise<ListDirResult>;
  /** Thumbnails as JPEG data URLs. `size` is the tile size; the main process
      scales the OS request up (small requests return cover-crops). Returns
      null per path when unavailable, with bitmap dims for tile sizing. */
  thumbs: (paths: string[], size: number) => Promise<ThumbResult[]>;
  /** Pixel dimensions + detected format, without decoding the whole file. */
  imageMeta: (path: string) => Promise<ImageMeta | null>;
  /** EXIF block for the preview/properties panes (best effort). */
  exif: (path: string) => Promise<ExifInfo | null>;
  /** Save a data URL to disk (used by Convert / Resize). */
  saveDataUrl: (targetDir: string, fileName: string, dataUrl: string) => Promise<string>;
  /** Remembered UI state as JSON (`~/.acdsee/state.json`), or null on first run. */
  loadState: () => Promise<string | null>;
  /** Replace the remembered UI state on disk. */
  saveState: (json: string) => Promise<void>;
  createFolder: (parentDir: string, name: string) => Promise<string>;
  rename: (path: string, newName: string) => Promise<string>;
  trash: (paths: string[]) => Promise<void>;
  copyTo: (paths: string[], targetDir: string) => Promise<void>;
  moveTo: (paths: string[], targetDir: string) => Promise<void>;
  openPath: (path: string) => Promise<void>;
  showInFolder: (path: string) => Promise<void>;
  openTrash: () => Promise<void>;
  setWallpaper: (path: string) => Promise<{ ok: boolean; message: string }>;
  window: {
    minimize: () => void;
    toggleMaximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    setFullScreen: (full: boolean) => void;
    /** Subscribe to OS full-screen changes; returns an unsubscribe function. */
    onFullScreenChange: (callback: (full: boolean) => void) => () => void;
  };
};

declare global {
  interface Window {
    acdsee?: AcdseeApi;
  }
}
