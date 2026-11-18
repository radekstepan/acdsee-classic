import type { Edit, FileEntry, FolderIcon, FolderKind, Settings } from "../types";
import { defaultFormats, formatFor } from "./catalog";
import { defaultEdit } from "../utils/util";

let uid = 1;

export function newFileId(): string {
  return `f${uid++}`;
}

export const defaultSettings: Settings = {
  thumbSize: 96,
  showNames: true,
  showInfo: false,
  showFolders: true,
  showHidden: false,
  thumbBg: "white",
  confirmDelete: true,
  useRecycle: true,
  viewerBg: "black",
  fitToWindow: true,
  noEnlarge: false,
  wheelMode: "navigate",
  slideDelay: 4,
  slideLoop: true,
  slideRandom: false,
  slideTransition: "fade",
  slideCaption: true,
  formats: defaultFormats(),
  showToolbar: true,
  showAddress: true,
  showStatus: true,
  showPreview: true,
  showTree: true
};

/** Map the shell/FolderNode icon hint to the classic tree kind. */
export function kindForIcon(icon: FolderIcon | undefined): FolderKind {
  switch (icon) {
    case "computer":
      return "computer";
    case "drive":
      return "hdd";
    case "floppy":
      return "floppy";
    case "cd":
      return "cdrom";
    case "network":
      return "network";
    case "recycle":
      return "recycle";
    default:
      return "folder";
  }
}

export const baseName = (fileName: string): string => {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(0, dot) : fileName;
};

export const extensionOf = (fileName: string): string => {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : "";
};

export const fullNameOf = (file: FileEntry): string => `${file.name}.${file.ext}`;

/** Timestamped empty file entry used for freshly generated/acquired images. */
export function generatedEntry(init: {
  id: string;
  name: string;
  ext: string;
  folderId: string;
  path?: string;
  src?: string;
  fullSrc?: string;
  w: number;
  h: number;
  size: number;
  now?: number;
  edit?: Edit;
}): FileEntry {
  const now = init.now ?? Date.now();
  const fmt = formatFor(init.ext);
  return {
    id: init.id,
    name: init.name,
    ext: init.ext,
    path: init.path ?? "",
    src: init.src ?? "",
    fullSrc: init.fullSrc ?? "",
    tw: 0,
    th: 0,
    folderId: init.folderId,
    size: init.size,
    w: init.w,
    h: init.h,
    bpp: fmt.bpp,
    orientation: 1,
    created: now,
    modified: now,
    accessed: now,
    attrs: { r: false, h: false, a: true },
    edit: init.edit ?? { ...defaultEdit },
    desc: "",
    keywords: "",
    rating: 0,
    exif: {}
  };
}
