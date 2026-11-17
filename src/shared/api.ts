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
  hint?: string;
};

export type DirEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
  isImage: boolean;
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
};

export type ExifInfo = {
  make?: string;
  model?: string;
  exposureTime?: string;
  fNumber?: string;
  iso?: number;
  focalLength?: string;
  flash?: string;
  dateTaken?: string;
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
  listDir: (path: string) => Promise<ListDirResult>;
  /** Thumbnails as JPEG data URLs. Returns null per path when unavailable. */
  thumbs: (paths: string[], size: number) => Promise<ThumbResult[]>;
  /** Pixel dimensions + detected format, without decoding the whole file. */
  imageMeta: (path: string) => Promise<ImageMeta | null>;
  /** EXIF block for the preview/properties panes (best effort). */
  exif: (path: string) => Promise<ExifInfo | null>;
  /** Save a data URL to disk (used by Convert / Resize). */
  saveDataUrl: (targetDir: string, fileName: string, dataUrl: string) => Promise<string>;
  mkdir: (parentDir: string, name: string) => Promise<string>;
  rename: (path: string, newName: string) => Promise<string>;
  trash: (paths: string[]) => Promise<void>;
  copyTo: (paths: string[], targetDir: string) => Promise<void>;
  moveTo: (paths: string[], targetDir: string) => Promise<void>;
  openPath: (path: string) => Promise<void>;
  showInFolder: (path: string) => Promise<void>;
  setWallpaper: (path: string) => Promise<{ ok: boolean; message: string }>;
  printImage: (path: string) => Promise<void>;
  window: {
    minimize: () => void;
    toggleMaximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
  };
};

declare global {
  interface Window {
    acdsee?: AcdseeApi;
  }
}
