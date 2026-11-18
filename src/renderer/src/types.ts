export type ViewMode = "thumbs" | "filmstrip" | "icons" | "list" | "details";
export type SortKey = "name" | "size" | "type" | "date" | "dims";
export type FolderKind =
  | "desktop"
  | "computer"
  | "floppy"
  | "hdd"
  | "cdrom"
  | "network"
  | "netpc"
  | "recycle"
  | "folder";

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

export interface Edit {
  rot: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  brightness: number; // -100..100
  contrast: number; // -100..100
  saturation: number; // -100..100
  hue: number; // -180..180
  gray: boolean;
  sepia: boolean;
  invert: boolean;
}

export interface ExifEntry {
  make?: string;
  model?: string;
  exposure?: string;
  aperture?: string;
  iso?: number;
  focal?: string;
  flash?: string;
}

/**
 * A file shown in the browser.
 *
 * `id` is the absolute filesystem path in desktop mode (and a stable synthetic
 * id in the web demo), which keeps rename/move/delete wired to the real file.
 */
export interface FileEntry {
  id: string;
  /** Base name without the extension. */
  name: string;
  /** Lower-case extension without a dot. */
  ext: string;
  /** Absolute path on disk, or "" in demo mode. */
  path: string;
  /** Thumbnail source (data URL once loaded, bundled URL in demo mode). */
  src: string;
  /** Full-resolution source used by the viewer/preview. */
  fullSrc: string;
  folderId: string;
  size: number;
  w: number;
  h: number;
  bpp: number;
  created: number;
  modified: number;
  accessed: number;
  attrs: { r: boolean; h: boolean; a: boolean };
  edit: Edit;
  desc: string;
  keywords: string;
  rating: number;
  exif: ExifEntry;
  deletedFrom?: string;
}

export interface Folder {
  id: string;
  name: string;
  parent: string | null;
  kind: FolderKind;
  children: string[];
  files: FileEntry[];
  /** Absolute path on disk. "" for virtual nodes (Desktop, My Computer, ...). */
  path: string;
  /** Original shell icon hint (pictures/mydocs/music/...). */
  icon?: FolderIcon;
  notReady?: boolean;
  drive?: string;
  /** Children were listed at least once. */
  loaded?: boolean;
}

export interface Settings {
  thumbSize: number;
  showNames: boolean;
  showInfo: boolean;
  showFolders: boolean;
  showHidden: boolean;
  thumbBg: "white" | "gray" | "black" | "teal";
  confirmDelete: boolean;
  useRecycle: boolean;
  viewerBg: "black" | "gray" | "teal" | "white";
  fitToWindow: boolean;
  noEnlarge: boolean;
  wheelMode: "navigate" | "zoom";
  slideDelay: number;
  slideLoop: boolean;
  slideRandom: boolean;
  slideTransition: "none" | "fade" | "slide" | "wipe";
  slideCaption: boolean;
  formats: Record<string, boolean>;
  showToolbar: boolean;
  showAddress: boolean;
  showStatus: boolean;
  showPreview: boolean;
  showTree: boolean;
}

export type IconName = string;

export interface MenuItem {
  label?: string;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  checked?: boolean;
  radio?: boolean;
  separator?: boolean;
  submenu?: MenuItem[];
  icon?: IconName;
  bold?: boolean;
}

export type MsgIcon = "info" | "warn" | "error" | "question";

export type DialogSpec =
  | { type: "about" }
  | { type: "props"; ids: string[] }
  | { type: "options"; tab?: number }
  | { type: "slideshow" }
  | { type: "convert"; ids: string[] }
  | { type: "rename"; id: string }
  | { type: "batchRename"; ids: string[] }
  | { type: "folderPicker"; mode: "copy" | "move"; ids: string[] }
  | { type: "newFolder"; parent: string }
  | { type: "adjust"; id: string }
  | { type: "resize"; id: string }
  | { type: "tip" }
  | { type: "filelist"; text: string }
  | {
      type: "msg";
      title: string;
      text: string;
      icon: MsgIcon;
      buttons: string[];
      defaultBtn?: number;
      onResult?: (btn: string) => void;
    };
