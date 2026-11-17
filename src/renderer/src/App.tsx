import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import {
  childFolders,
  descendantPhotoCount,
  folderById,
  folderPath,
  folderPathString,
  formatBytes,
  setRuntimeLibrary,
  sortPhotos,
  totalSize,
  type Folder,
  type Photo
} from "./data";
import { demoFolders, demoPhotos } from "./demo-data";
import { desktop, isDesktop, trashLabel } from "./lib/bridge";
import { convertImage, formatInfo, mimeForFileName, resizeImage } from "./lib/imaging";
import type { SystemPaths } from "../../shared/api";
import { localFileUrl } from "../../shared/api";
import { BrandIcon, FileTypeIcon, FolderGlyph, ToolIcon } from "./icons";
import MenuBar, { type MenuDef } from "./components/MenuBar";
import BrowserView, { StatusBar, type ThumbSize, type ViewMode } from "./components/BrowserView";
import { Inspector, TreePane } from "./components/Panels";
import Viewer from "./components/Viewer";
import DialogHost, { type DialogState } from "./components/Dialogs";

type Toast = { id: number; title: string; message: string };
type ClipboardState = { ids: string[]; mode: "copy" | "cut" } | null;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const THUMB_PX: Record<ThumbSize, number> = { small: 96, medium: 192, large: 320 };

function formatFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "JPEG";
    case ".png":
      return "PNG";
    case ".gif":
      return "GIF";
    case ".bmp":
      return "BMP";
    case ".tif":
    case ".tiff":
      return "TIFF";
    case ".webp":
      return "WEBP";
    case ".svg":
      return "SVG";
    case ".avif":
      return "AVIF";
    case ".heic":
    case ".heif":
      return "HEIC";
    default:
      return ext ? ext.replace(".", "").toUpperCase() : "Image";
  }
}

function ancestorsOf(id: string, all: Folder[]): string[] {
  const byId = new Map(all.map((f) => [f.id, f]));
  const result: string[] = [];
  let current = byId.get(id);
  let guard = 0;
  while (current && guard++ < 40) {
    result.push(current.id);
    current = current.parent ? byId.get(current.parent) : undefined;
  }
  return result;
}

export default function App() {
  const [desktopMode] = useState(() => isDesktop());
  const [ready, setReady] = useState(false);
  const [sysPaths, setSysPaths] = useState<SystemPaths | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [photoCache, setPhotoCache] = useState<Record<string, Photo[]>>({});
  const [currentFolderId, setCurrentFolderId] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<{ items: string[]; index: number }>({ items: [], index: -1 });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("thumbnails");
  const [thumbSize, setThumbSize] = useState<ThumbSize>("medium");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [query, setQuery] = useState("");
  const [showTree, setShowTree] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  const [showToolbar, setShowToolbar] = useState(true);
  const [showStatus, setShowStatus] = useState(true);
  const [treeWidth, setTreeWidth] = useState(232);
  const [inspectorWidth, setInspectorWidth] = useState(306);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [slideshow, setSlideshow] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardState>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [prefs, setPrefs] = useState({ showThumbs: true, showExtensions: true });

  const foldersRef = useRef<Folder[]>([]);
  const cacheRef = useRef<Record<string, Photo[]>>({});
  const childrenLoadedRef = useRef<Set<string>>(new Set());
  const exifDoneRef = useRef<Set<string>>(new Set());
  const loadSeqRef = useRef(0);
  const thumbSizeRef = useRef<ThumbSize>("medium");
  foldersRef.current = folders;
  cacheRef.current = photoCache;
  thumbSizeRef.current = thumbSize;
  const bodyRef = useRef<HTMLDivElement>(null);

  const notify = (message: string, title = "ACDSee Classic") =>
    setToast({ id: Date.now(), title, message });

  const mergeFolders = (incoming: Folder[]) => {
    if (!incoming.length) return;
    setFolders((prev) => {
      const byId = new Map(prev.map((f) => [f.id, f]));
      for (const folder of incoming) byId.set(folder.id, { ...byId.get(folder.id), ...folder });
      return [...byId.values()];
    });
  };

  const patchPhotos = (folderId: string, patch: (photos: Photo[]) => Photo[]) => {
    setPhotoCache((prev) => ({ ...prev, [folderId]: patch(prev[folderId] ?? []) }));
  };

  /** Update one photo everywhere it is cached (ids are globally unique). */
  const patchPhotoEverywhere = (id: string, patch: (photo: Photo) => Photo) => {
    setPhotoCache((prev) => {
      const next: Record<string, Photo[]> = {};
      for (const [folderId, photos] of Object.entries(prev)) {
        next[folderId] = photos.map((p) => (p.id === id ? patch(p) : p));
      }
      return next;
    });
  };

  const ensureChildren = async (id: string): Promise<void> => {
    if (!desktopMode || childrenLoadedRef.current.has(id)) return;
    childrenLoadedRef.current.add(id);
    try {
      const children = await desktop().listChildren(id);
      mergeFolders(children.map((c) => ({ ...c, parent: id })));
    } catch (error) {
      childrenLoadedRef.current.delete(id);
      notify(error instanceof Error ? error.message : String(error), "Folders");
    }
  };

  const loadDir = async (id: string, options: { selectFirst?: boolean } = {}): Promise<Photo[]> => {
    const folder = foldersRef.current.find((f) => f.id === id);
    if (!folder) return [];
    if (!folder.path) {
      // Virtual node (My Computer): folders only, no files.
      await ensureChildren(id);
      if (options.selectFirst) {
        setSelectedIds([]);
        setAnchorId(null);
      }
      return [];
    }
    const seq = ++loadSeqRef.current;
    let listing;
    try {
      listing = await desktop().listDir(folder.path);
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), folder.name);
      return [];
    }
    if (seq !== loadSeqRef.current) return [];
    mergeFolders(
      listing.folders.map((entry) => ({
        id: entry.path,
        name: entry.name,
        icon: "folder" as const,
        path: entry.path,
        parent: id
      }))
    );
    // Carry view state (rotation, rating, EXIF) across reloads.
    const previous = new Map((cacheRef.current[id] ?? []).map((p) => [p.id, p]));
    const photos: Photo[] = listing.files.map((entry) => {
      const old = previous.get(entry.path);
      return {
        id: entry.path,
        name: entry.name,
        folderId: id,
        src: "",
        fullSrc: localFileUrl(entry.path),
        path: entry.path,
        width: old?.width ?? 0,
        height: old?.height ?? 0,
        size: entry.size,
        date: new Date(entry.mtimeMs).toISOString(),
        camera: old?.camera ?? "",
        make: old?.make ?? "",
        exposure: old?.exposure ?? "",
        aperture: old?.aperture ?? "",
        iso: old?.iso ?? 0,
        focal: old?.focal ?? "",
        flash: old?.flash ?? "",
        format: old?.format ?? formatFromExt(entry.ext),
        rotation: old?.rotation ?? 0,
        flipped: old?.flipped ?? false,
        rating: old?.rating ?? 0,
        tags: old?.tags ?? []
      };
    });
    setPhotoCache((prev) => ({ ...prev, [id]: photos }));
    if (options.selectFirst) {
      setSelectedIds(photos[0] ? [photos[0].id] : []);
      setAnchorId(photos[0]?.id ?? null);
    }
    void ensureChildren(id);

    // Progressive enrichment: thumbnails, then dimensions.
    const paths = photos.map((p) => p.path);
    if (paths.length) {
      desktop()
        .thumbs(paths, THUMB_PX[thumbSizeRef.current])
        .then((results) => {
          const byPath = new Map(results.map((r) => [r.path, r.dataUrl]));
          patchPhotos(id, (items) =>
            items.map((p) => {
              const url = byPath.get(p.path);
              return url ? { ...p, src: url } : p;
            })
          );
        })
        .catch(() => undefined);
      void (async () => {
        const CHUNK = 8;
        for (let i = 0; i < paths.length; i += CHUNK) {
          const chunk = paths.slice(i, i + CHUNK);
          const metas = await Promise.all(chunk.map((p) => desktop().imageMeta(p).catch(() => null)));
          const byPath = new Map<string, { width: number; height: number; format: string }>();
          chunk.forEach((p, index) => {
            const meta = metas[index];
            if (meta) byPath.set(p, meta);
          });
          if (byPath.size) {
            patchPhotos(id, (items) =>
              items.map((p) => {
                const meta = byPath.get(p.path);
                return meta ? { ...p, width: meta.width, height: meta.height, format: meta.format || p.format } : p;
              })
            );
          }
        }
      })();
    }
    return photos;
  };

  // Boot: real filesystem on desktop, demo library in a plain browser.
  useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (!isDesktop()) {
        if (cancelled) return;
        setFolders(demoFolders);
        const grouped: Record<string, Photo[]> = {};
        for (const photo of demoPhotos) {
          (grouped[photo.folderId] ??= []).push(photo);
        }
        setPhotoCache(grouped);
        const start = "vacation-2001";
        setCurrentFolderId(start);
        setExpanded(new Set(ancestorsOf(start, demoFolders)));
        setHistory({ items: [start], index: 0 });
        const first = grouped[start]?.[0];
        setSelectedIds(first ? [first.id] : []);
        setAnchorId(first?.id ?? null);
        setReady(true);
        return;
      }
      try {
        const paths = await desktop().systemPaths();
        if (cancelled) return;
        setSysPaths(paths);
        const roots = await desktop().listRoots();
        if (cancelled) return;
        mergeFolders(roots.map((r) => ({ ...r })));
        await Promise.all(roots.map((r) => ensureChildren(r.id)));
        if (cancelled) return;
        const pictures = roots.find((r) => r.icon === "pictures") ?? roots.find((r) => r.path) ?? roots[0];
        const start = pictures.id;
        try {
          setZoomed(await desktop().window.isMaximized());
        } catch {
          // Non-fatal.
        }
        setCurrentFolderId(start);
        setExpanded(new Set([start, ...roots.map((r) => r.id)]));
        setHistory({ items: [start], index: 0 });
        await loadDir(start, { selectFirst: true });
        if (!cancelled) setReady(true);
      } catch (error) {
        if (cancelled) return;
        notify(error instanceof Error ? error.message : String(error), "Startup");
        setReady(true);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const libraryFlat = useMemo(() => Object.values(photoCache).flat(), [photoCache]);
  setRuntimeLibrary(folders, libraryFlat);

  const folder: Folder = folderById(currentFolderId) ?? {
    id: currentFolderId || "unknown",
    name: "…",
    icon: "folder",
    parent: null,
    path: ""
  };
  const children = useMemo(() => childFolders(currentFolderId), [folders, currentFolderId]);
  const directPhotos = photoCache[currentFolderId] ?? [];
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? directPhotos.filter(
        (p) =>
          p.name.toLowerCase().includes(normalizedQuery) ||
          p.format.toLowerCase().includes(normalizedQuery) ||
          p.tags.some((t) => t.includes(normalizedQuery))
      )
    : directPhotos;
  const visiblePhotos = sortPhotos(filtered, sortKey, sortDir);
  const selectedPhotos = libraryFlat.filter((p) => selectedIds.includes(p.id));
  const primary = selectedPhotos[0] ?? visiblePhotos[0] ?? null;
  const viewerPhotos = visiblePhotos;
  const totalBytes = totalSize(visiblePhotos);
  const canBack = history.index > 0;
  const canForward = history.index < history.items.length - 1;
  const pathLabel = folderPathString(currentFolderId) || folder.name;
  const hasSelection = selectedPhotos.length > 0;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [contextMenu]);

  // Re-request thumbnails at the new size when the slider moves.
  useEffect(() => {
    if (!desktopMode || !ready || !folder.path) return;
    const ids = (cacheRef.current[currentFolderId] ?? []).map((p) => p.path);
    if (!ids.length) return;
    desktop()
      .thumbs(ids, THUMB_PX[thumbSize])
      .then((results) => {
        const byPath = new Map(results.map((r) => [r.path, r.dataUrl]));
        patchPhotos(currentFolderId, (items) =>
          items.map((p) => {
            const url = byPath.get(p.path);
            return url ? { ...p, src: url } : p;
          })
        );
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbSize]);

  // Lazy EXIF for the preview/properties panes.
  useEffect(() => {
    if (!desktopMode || !primary?.path || exifDoneRef.current.has(primary.id)) return;
    exifDoneRef.current.add(primary.id);
    desktop()
      .exif(primary.path)
      .then((info) => {
        if (!info) return;
        patchPhotoEverywhere(primary.id, (p) => ({
          ...p,
          make: info.make ?? p.make,
          camera: info.model ?? p.camera,
          exposure: info.exposureTime ?? p.exposure,
          aperture: info.fNumber ?? p.aperture,
          iso: info.iso ?? p.iso,
          focal: info.focalLength ?? p.focal,
          flash: info.flash ?? p.flash
        }));
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primary?.id]);

  const expandAncestors = (id: string) =>
    setExpanded((prev) => new Set([...prev, ...ancestorsOf(id, foldersRef.current)]));

  const navigateTo = (id: string, push = true) => {
    const target = foldersRef.current.find((f) => f.id === id);
    if (!target) return;
    setCurrentFolderId(id);
    setSelectedIds([]);
    setAnchorId(null);
    setQuery("");
    setViewerId(null);
    setSlideshow(false);
    expandAncestors(id);
    if (desktopMode) {
      void ensureChildren(id);
      void loadDir(id, { selectFirst: true });
    } else {
      const nextDirect = cacheRef.current[id] ?? [];
      setSelectedIds(nextDirect[0] ? [nextDirect[0].id] : []);
      setAnchorId(nextDirect[0]?.id ?? null);
    }
    if (push) {
      setHistory((prev) => {
        const items = [...prev.items.slice(0, prev.index + 1), id];
        return { items, index: items.length - 1 };
      });
    }
  };

  const goBack = () => {
    if (!canBack) return;
    const targetIndex = history.index - 1;
    const target = history.items[targetIndex];
    setHistory((prev) => ({ ...prev, index: targetIndex }));
    navigateTo(target, false);
  };

  const goForward = () => {
    if (!canForward) return;
    const targetIndex = history.index + 1;
    const target = history.items[targetIndex];
    setHistory((prev) => ({ ...prev, index: targetIndex }));
    navigateTo(target, false);
  };

  const goUp = () => {
    if (folder.parent) navigateTo(folder.parent);
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      if (desktopMode && currentFolderId) {
        childrenLoadedRef.current.delete(currentFolderId);
        await ensureChildren(currentFolderId);
        const photos = await loadDir(currentFolderId);
        setSelectedIds((prev) => prev.filter((id) => photos.some((p) => p.id === id)));
        notify(`"${folder.name}" refreshed. ${photos.length} image${photos.length === 1 ? "" : "s"} found.`, "Refresh");
      } else {
        setPhotoCache((prev) => ({ ...prev }));
        notify(`"${folder.name}" refreshed. ${visiblePhotos.length} image${visiblePhotos.length === 1 ? "" : "s"} found.`, "Refresh");
      }
    } finally {
      window.setTimeout(() => setRefreshing(false), 350);
    }
  };

  const openPhoto = (id: string) => {
    if (!id) return;
    setViewerId(id);
    setSlideshow(false);
    setSelectedIds([id]);
  };

  const startSlideshow = () => {
    const first = selectedPhotos[0] ?? visiblePhotos[0];
    if (!first) {
      notify("Select at least one image before starting a slide show.", "Slide Show");
      return;
    }
    setSelectedIds([first.id]);
    setViewerId(first.id);
    setSlideshow(true);
  };

  const rotate = (id: string | undefined, delta: number) => {
    const targets = id ? [id] : selectedIds;
    if (!targets.length) {
      notify("Select an image to rotate.", "Rotate");
      return;
    }
    setPhotoCache((prev) => {
      const next: Record<string, Photo[]> = {};
      for (const [folderId, photos] of Object.entries(prev)) {
        next[folderId] = photos.map((p) =>
          targets.includes(p.id) ? { ...p, rotation: (p.rotation + delta + 360) % 360 } : p
        );
      }
      return next;
    });
    notify(`Rotated ${targets.length} image${targets.length === 1 ? "" : "s"} ${delta > 0 ? "right" : "left"} by ${Math.abs(delta)}°.`, "Rotate");
  };

  const setAsWallpaper = async (photo: Photo | null) => {
    if (!photo) return;
    if (!desktopMode || !photo.path) {
      notify("Setting the wallpaper needs the desktop app.", "Set as Wallpaper");
      return;
    }
    const result = await desktop().setWallpaper(photo.path);
    notify(result.ok ? `"${photo.name}" is now your desktop wallpaper.` : result.message, "Set as Wallpaper");
  };

  const changeSort = (key: string) => {
    if (key === sortKey) setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const selectPhoto = (id: string, event: MouseEvent) => {
    if (!id) return;
    const ordered = visiblePhotos.map((p) => p.id);
    if (event.shiftKey && anchorId) {
      const a = ordered.indexOf(anchorId);
      const b = ordered.indexOf(id);
      if (a >= 0 && b >= 0) {
        const [start, end] = a < b ? [a, b] : [b, a];
        const range = ordered.slice(start, end + 1);
        setSelectedIds((prev) => Array.from(new Set([...prev, ...range])));
        return;
      }
    }
    if (event.ctrlKey || event.metaKey) {
      setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
      setAnchorId(id);
      return;
    }
    setSelectedIds([id]);
    setAnchorId(id);
  };

  const selectAll = () => {
    setSelectedIds(visiblePhotos.map((p) => p.id));
    notify(`${visiblePhotos.length} images selected.`, "Select All");
  };

  const invertSelection = () => {
    setSelectedIds((prev) => visiblePhotos.filter((p) => !prev.includes(p.id)).map((p) => p.id));
  };

  const openContextMenu = (event: MouseEvent, id: string) => {
    event.preventDefault();
    event.stopPropagation();
    if (!selectedIds.includes(id)) {
      setSelectedIds([id]);
      setAnchorId(id);
    }
    setContextMenu({
      x: clamp(event.clientX, 8, window.innerWidth - 232),
      y: clamp(event.clientY, 8, window.innerHeight - 388),
      id
    });
  };

  const openProperties = (id?: string) => {
    const target = id ?? selectedPhotos[0]?.id;
    if (!target) {
      notify("Select an image first.", "Properties");
      return;
    }
    setDialog({ kind: "properties", id: target });
  };

  const deleteSelection = () => {
    if (!selectedIds.length) {
      notify("There are no selected files to delete.", "Delete");
      return;
    }
    setDialog({
      kind: "delete",
      ids: selectedIds,
      names: selectedPhotos.map((p) => p.name),
      trash: trashLabel(),
      fromRecycle: false
    });
  };

  const commitDelete = async () => {
    if (!dialog || dialog.kind !== "delete") return;
    const ids = dialog.ids;
    if (desktopMode) {
      const paths = libraryFlat.filter((p) => ids.includes(p.id)).map((p) => p.path).filter(Boolean);
      try {
        await desktop().trash(paths);
        notify(`${ids.length} file${ids.length === 1 ? "" : "s"} moved to the ${trashLabel()}.`, "Delete");
      } catch (error) {
        notify(error instanceof Error ? error.message : String(error), "Delete");
      }
      setSelectedIds([]);
      setDialog(null);
      void loadDir(currentFolderId);
      return;
    }
    setPhotoCache((prev) => {
      const next: Record<string, Photo[]> = {};
      const moved: Photo[] = [];
      for (const [folderId, photos] of Object.entries(prev)) {
        next[folderId] = photos.filter((p) => {
          if (ids.includes(p.id)) {
            moved.push({ ...p, folderId: "recycle-bin" });
            return false;
          }
          return true;
        });
      }
      next["recycle-bin"] = [...(next["recycle-bin"] ?? []), ...moved];
      return next;
    });
    notify(`${ids.length} file${ids.length === 1 ? "" : "s"} moved to the Recycle Bin.`, "Delete");
    setSelectedIds([]);
    setDialog(null);
  };

  const commitTransfer = async (target: string, mode: "copy" | "move") => {
    if (!dialog || dialog.kind !== "transfer") return;
    const ids = dialog.ids;
    const targetName = folderById(target)?.name ?? target;
    if (desktopMode) {
      const targetPath = folderById(target)?.path;
      const paths = libraryFlat.filter((p) => ids.includes(p.id)).map((p) => p.path).filter(Boolean);
      if (!targetPath) {
        notify("Choose a real folder as the destination.", mode === "copy" ? "Copy to Folder" : "Move to Folder");
        return;
      }
      try {
        if (mode === "copy") await desktop().copyTo(paths, targetPath);
        else await desktop().moveTo(paths, targetPath);
        notify(`${mode === "copy" ? "Copied" : "Moved"} ${ids.length} file${ids.length === 1 ? "" : "s"} to "${targetName}".`, mode === "copy" ? "Copy to Folder" : "Move to Folder");
      } catch (error) {
        notify(error instanceof Error ? error.message : String(error), mode === "copy" ? "Copy to Folder" : "Move to Folder");
      }
      setDialog(null);
      void loadDir(currentFolderId);
      return;
    }
    const stamp = Date.now();
    setPhotoCache((prev) => {
      const flat = Object.values(prev).flat();
      if (mode === "copy") {
        const copies = flat
          .filter((p) => ids.includes(p.id))
          .map((p, index) => ({
            ...p,
            id: `${p.id}-copy-${stamp}-${index}`,
            folderId: target,
            name: p.name.replace(/\.(jpg|jpeg|png|bmp|tif|tiff|gif|webp)$/i, "") + " (Copy)" + p.name.slice(p.name.lastIndexOf("."))
          }));
        return { ...prev, [target]: [...(prev[target] ?? []), ...copies] };
      }
      const next: Record<string, Photo[]> = {};
      for (const [folderId, photos] of Object.entries(prev)) {
        next[folderId] = photos.filter((p) => !ids.includes(p.id));
      }
      const moved = flat.filter((p) => ids.includes(p.id)).map((p) => ({ ...p, folderId: target }));
      next[target] = [...(next[target] ?? []), ...moved];
      return next;
    });
    notify(`${mode === "copy" ? "Copied" : "Moved"} ${ids.length} file${ids.length === 1 ? "" : "s"} to "${targetName}".`, mode === "copy" ? "Copy to Folder" : "Move to Folder");
    setDialog(null);
  };

  const commitRename = async (name: string) => {
    if (!dialog || dialog.kind !== "rename") return;
    const id = dialog.ids[0];
    if (desktopMode) {
      const photo = libraryFlat.find((p) => p.id === id);
      if (!photo?.path) {
        notify("Select a file to rename.", "Rename");
        return;
      }
      try {
        await desktop().rename(photo.path, name);
        notify(`File renamed to "${name}".`, "Rename");
      } catch (error) {
        notify(error instanceof Error ? error.message : String(error), "Rename");
      }
      setDialog(null);
      void loadDir(currentFolderId);
      return;
    }
    patchPhotoEverywhere(id, (p) => ({ ...p, name }));
    notify(`File renamed to "${name}".`, "Rename");
    setDialog(null);
  };

  const commitConvert = async (format: string, quality: number, target: string) => {
    if (!dialog || dialog.kind !== "convert") return;
    const ids = dialog.ids;
    if (desktopMode) {
      const targetDir = target === "same-folder" ? folder.path : (folderById(target)?.path ?? folder.path);
      if (!targetDir) {
        notify("Choose a real folder for the converted files.", "Convert");
        return;
      }
      const { ext } = formatInfo(format);
      const targets = libraryFlat.filter((p) => ids.includes(p.id) && p.path);
      let done = 0;
      for (const photo of targets) {
        try {
          const { dataUrl } = await convertImage(photo.fullSrc, format, quality);
          const base = photo.name.replace(/\.[^.]+$/, "");
          await desktop().saveDataUrl(targetDir, `${base}.${ext}`, dataUrl);
          done += 1;
        } catch (error) {
          notify(`"${photo.name}": ${error instanceof Error ? error.message : String(error)}`, "Convert");
        }
      }
      notify(`${done} image${done === 1 ? "" : "s"} converted to ${format} at ${quality}% quality.`, "Convert");
      setDialog(null);
      if (targetDir === folder.path) void loadDir(currentFolderId);
      return;
    }
    setPhotoCache((prev) => {
      const next: Record<string, Photo[]> = {};
      for (const [folderId, photos] of Object.entries(prev)) {
        next[folderId] = photos.filter((p) => !(ids.includes(p.id) && target !== "same-folder" && target !== folderId));
      }
      const flat = Object.values(prev).flat();
      const ext = format === "JPEG" ? "jpg" : format.toLowerCase();
      for (const photo of flat.filter((p) => ids.includes(p.id))) {
        const dest = target === "same-folder" ? photo.folderId : target;
        const converted = { ...photo, format, name: photo.name.replace(/\.[^.]+$/, `.${ext}`), folderId: dest };
        next[dest] = [...(next[dest] ?? []), converted];
        if (dest === photo.folderId) next[dest] = next[dest].filter((p) => p.id !== photo.id || p === converted);
      }
      return next;
    });
    notify(`${ids.length} image${ids.length === 1 ? "" : "s"} converted to ${format} at ${quality}% quality.`, "Convert");
    setDialog(null);
  };

  const commitResize = async (width: number, height: number) => {
    if (!dialog || dialog.kind !== "resize") return;
    const photo = libraryFlat.find((p) => p.id === dialog.id);
    if (desktopMode) {
      if (!photo?.path || !folder.path) {
        notify("Select an image to resize.", "Resize");
        return;
      }
      try {
        const dataUrl = await resizeImage(photo.fullSrc, width, height, mimeForFileName(photo.name));
        const dot = photo.name.lastIndexOf(".");
        const base = dot >= 0 ? photo.name.slice(0, dot) : photo.name;
        const ext = dot >= 0 ? photo.name.slice(dot) : ".jpg";
        await desktop().saveDataUrl(folder.path, `${base} (Resized)${ext}`, dataUrl);
        notify(`Saved a ${width} × ${height} copy of "${photo.name}".`, "Resize");
      } catch (error) {
        notify(error instanceof Error ? error.message : String(error), "Resize");
      }
      setDialog(null);
      void loadDir(currentFolderId);
      return;
    }
    if (photo) patchPhotoEverywhere(photo.id, (p) => ({ ...p, width, height }));
    notify(`Image resized to ${width} × ${height} pixels.`, "Resize");
    setDialog(null);
  };

  const commitSeries = async (prefix: string, start: number, digits: number) => {
    if (!dialog || dialog.kind !== "series") return;
    const ids = dialog.ids;
    if (desktopMode) {
      const ordered = visiblePhotos.filter((p) => ids.includes(p.id));
      let done = 0;
      for (let index = 0; index < ordered.length; index += 1) {
        const photo = ordered[index];
        if (!photo.path) continue;
        const dot = photo.name.lastIndexOf(".");
        const ext = dot >= 0 ? photo.name.slice(dot) : "";
        try {
          await desktop().rename(photo.path, `${prefix} ${String(start + index).padStart(digits, "0")}${ext}`);
          done += 1;
        } catch (error) {
          notify(`"${photo.name}": ${error instanceof Error ? error.message : String(error)}`, "Rename Series");
          break;
        }
      }
      notify(`Renamed ${done} file${done === 1 ? "" : "s"} as a series.`, "Rename Series");
      setDialog(null);
      void loadDir(currentFolderId);
      return;
    }
    setPhotoCache((prev) => {
      const next: Record<string, Photo[]> = {};
      for (const [folderId, photos] of Object.entries(prev)) {
        next[folderId] = photos.map((p) => {
          const index = ids.indexOf(p.id);
          if (index < 0) return p;
          return { ...p, name: `${prefix} ${String(start + index).padStart(digits, "0")}.jpg` };
        });
      }
      return next;
    });
    notify(`Renamed ${ids.length} files as a series.`, "Rename Series");
    setDialog(null);
  };

  const commitFind = (value: string) => {
    setQuery(value.trim());
    setDialog(null);
    const needle = value.trim().toLowerCase();
    const matches = directPhotos.filter(
      (p) => p.name.toLowerCase().includes(needle) || p.format.toLowerCase().includes(needle)
    );
    if (value.trim()) notify(`${matches.length} matching image${matches.length === 1 ? "" : "s"} found.`, "Find: " + value.trim());
    if (matches[0]) {
      setSelectedIds([matches[0].id]);
      setAnchorId(matches[0].id);
    }
  };

  const commitPrint = async (printer: string, copies: number) => {
    const count = dialog?.kind === "print" ? dialog.ids.length : 0;
    if (desktopMode && dialog?.kind === "print") {
      const first = libraryFlat.find((p) => p.id === dialog.ids[0]);
      if (first?.path) {
        await desktop().printImage(first.path);
        notify(`Sent ${count} image(s) to ${printer} (${copies} ${copies === 1 ? "copy" : "copies"}).`, "Print");
        setDialog(null);
        return;
      }
    }
    notify(`Sent ${count} image(s) to ${printer} (${copies} ${copies === 1 ? "copy" : "copies"}).`, "Print");
    setDialog(null);
  };

  const paste = async () => {
    if (!clipboard) {
      notify("The clipboard is empty.", "Paste");
      return;
    }
    if (desktopMode) {
      if (!folder.path) {
        notify("Open a real folder before pasting.", "Paste");
        return;
      }
      const paths = libraryFlat.filter((p) => clipboard.ids.includes(p.id)).map((p) => p.path).filter(Boolean);
      try {
        if (clipboard.mode === "cut") {
          await desktop().moveTo(paths, folder.path);
          notify(`Moved ${paths.length} file${paths.length === 1 ? "" : "s"} to "${folder.name}".`, "Paste");
          setClipboard(null);
        } else {
          await desktop().copyTo(paths, folder.path);
          notify(`${paths.length} file${paths.length === 1 ? "" : "s"} pasted into "${folder.name}".`, "Paste");
        }
      } catch (error) {
        notify(error instanceof Error ? error.message : String(error), "Paste");
      }
      void loadDir(currentFolderId);
      return;
    }
    if (clipboard.mode === "cut") {
      const ids = clipboard.ids;
      setPhotoCache((prev) => {
        const flat = Object.values(prev).flat();
        const next: Record<string, Photo[]> = {};
        for (const [folderId, photos] of Object.entries(prev)) {
          next[folderId] = photos.filter((p) => !ids.includes(p.id));
        }
        const moved = flat.filter((p) => ids.includes(p.id)).map((p) => ({ ...p, folderId: currentFolderId }));
        next[currentFolderId] = [...(next[currentFolderId] ?? []), ...moved];
        return next;
      });
      notify(`Moved ${clipboard.ids.length} file${clipboard.ids.length === 1 ? "" : "s"} to "${folder.name}".`, "Paste");
      setClipboard(null);
    } else {
      const stamp = Date.now();
      setPhotoCache((prev) => {
        const flat = Object.values(prev).flat();
        const copies = flat
          .filter((p) => clipboard.ids.includes(p.id))
          .map((p, index) => ({ ...p, id: `${p.id}-paste-${stamp}-${index}`, folderId: currentFolderId }));
        return { ...prev, [currentFolderId]: [...(prev[currentFolderId] ?? []), ...copies] };
      });
      notify(`${clipboard.ids.length} file${clipboard.ids.length === 1 ? "" : "s"} pasted into "${folder.name}".`, "Paste");
    }
  };

  const showFileList = () => {
    const items = selectedPhotos.length ? selectedPhotos : visiblePhotos;
    const text = items
      .map((p) => `${p.name}\t${p.width}x${p.height}\t${formatBytes(p.size)}\t${folderPathString(p.folderId)}`)
      .join("\n");
    setDialog({ kind: "filelist", text });
  };

  const toggleMaximize = async () => {
    if (!desktopMode) {
      notify("Window controls need the desktop app.", "ACDSee Classic");
      return;
    }
    desktop().window.toggleMaximize();
    window.setTimeout(async () => {
      try {
        setZoomed(await desktop().window.isMaximized());
      } catch {
        // Ignore.
      }
    }, 120);
  };

  const homeId = useMemo(() => {
    const pictures = folders.find((f) => f.icon === "pictures");
    if (pictures) return pictures.id;
    if (sysPaths) {
      const match = folders.find((f) => f.path === sysPaths.pictures || f.path === sysPaths.home);
      if (match) return match.id;
    }
    return folders.find((f) => f.path)?.id ?? folders[0]?.id ?? "";
  }, [folders, sysPaths]);

  const handleCommand = (action: string) => {
    switch (action) {
      case "back":
        goBack();
        return;
      case "forward":
        goForward();
        return;
      case "up":
        goUp();
        return;
      case "home":
        if (homeId) navigateTo(homeId);
        return;
      case "refresh":
        void refresh();
        return;
      case "open":
      case "view":
        if (selectedPhotos[0]) openPhoto(selectedPhotos[0].id);
        else notify("Select an image to open.", "ACDSee Classic");
        return;
      case "open-with":
        if (desktopMode && primary?.path) void desktop().openPath(primary.path);
        else notify("Choose a program to open this image. ACDSee is the default image viewer.", "Open With");
        return;
      case "show-in-folder":
        if (desktopMode && primary?.path) void desktop().showInFolder(primary.path);
        return;
      case "slideshow":
        startSlideshow();
        return;
      case "browse":
        setShowTree(true);
        notify("Folder browser is ready. Choose a folder from the tree.", "Browser");
        return;
      case "print":
        if (!visiblePhotos.length) notify("There are no images to print.", "Print");
        else setDialog({ kind: "print", ids: selectedIds.length ? selectedIds : [primary?.id ?? visiblePhotos[0].id] });
        return;
      case "copy-to":
        if (!selectedIds.length) return notify("Select one or more images first.", "Copy to Folder");
        setDialog({ kind: "transfer", mode: "copy", ids: selectedIds });
        return;
      case "move-to":
        if (!selectedIds.length) return notify("Select one or more images first.", "Move to Folder");
        setDialog({ kind: "transfer", mode: "move", ids: selectedIds });
        return;
      case "delete":
        deleteSelection();
        return;
      case "rename":
        if (selectedPhotos.length !== 1) return notify("Select exactly one file to rename.", "Rename");
        setDialog({ kind: "rename", ids: [selectedPhotos[0].id], current: selectedPhotos[0].name });
        return;
      case "rename-series":
        if (!selectedIds.length) return notify("Select the images to rename as a series.", "Rename Series");
        setDialog({ kind: "series", ids: selectedIds, firstName: selectedPhotos[0]?.name ?? "Image.jpg" });
        return;
      case "convert":
        if (!selectedIds.length) return notify("Select one or more images to convert.", "Convert");
        setDialog({ kind: "convert", ids: selectedIds });
        return;
      case "rotate-left":
        rotate(undefined, -90);
        return;
      case "rotate-right":
        rotate(undefined, 90);
        return;
      case "rotate-180":
        rotate(undefined, 180);
        return;
      case "flip":
        if (!selectedIds.length) return notify("Select an image to flip.", "Flip");
        setPhotoCache((prev) => {
          const next: Record<string, Photo[]> = {};
          for (const [folderId, photos] of Object.entries(prev)) {
            next[folderId] = photos.map((p) => (selectedIds.includes(p.id) ? { ...p, flipped: !p.flipped } : p));
          }
          return next;
        });
        notify(`Flipped ${selectedIds.length} image${selectedIds.length === 1 ? "" : "s"} horizontally.`, "Flip Horizontal");
        return;
      case "toggle-extensions":
        setPrefs((prev) => ({ ...prev, showExtensions: !prev.showExtensions }));
        return;
      case "image-resize":
        if (!selectedPhotos.length) return notify("Select an image to resize.", "Resize");
        setDialog({ kind: "resize", id: selectedPhotos[0].id, width: selectedPhotos[0].width, height: selectedPhotos[0].height });
        return;
      case "set-wallpaper":
        void setAsWallpaper(primary);
        return;
      case "properties":
        openProperties();
        return;
      case "copy":
        if (!hasSelection) return notify("Select one or more images first.", "Copy");
        setClipboard({ ids: selectedIds, mode: "copy" });
        notify(`${selectedIds.length} file${selectedIds.length === 1 ? "" : "s"} copied to the clipboard.`, "Copy");
        return;
      case "cut":
        if (!hasSelection) return notify("Select one or more images first.", "Cut");
        setClipboard({ ids: selectedIds, mode: "cut" });
        notify(`${selectedIds.length} file${selectedIds.length === 1 ? "" : "s"} ready to move.`, "Cut");
        return;
      case "paste":
        void paste();
        return;
      case "clear":
        setSelectedIds([]);
        return;
      case "select-all":
        selectAll();
        return;
      case "invert-selection":
        invertSelection();
        return;
      case "find":
        setDialog({ kind: "find", initial: query });
        return;
      case "toggle-toolbar":
        setShowToolbar((v) => !v);
        return;
      case "toggle-status":
        setShowStatus((v) => !v);
        return;
      case "toggle-tree":
        setShowTree((v) => !v);
        return;
      case "toggle-preview":
        setShowInspector((v) => !v);
        return;
      case "view-thumbnails":
        setViewMode("thumbnails");
        return;
      case "view-list":
        setViewMode("list");
        return;
      case "view-details":
        setViewMode("details");
        return;
      case "size-small":
        setThumbSize("small");
        return;
      case "size-medium":
        setThumbSize("medium");
        return;
      case "size-large":
        setThumbSize("large");
        return;
      case "sort-name":
        setSortKey("name");
        return;
      case "sort-date":
        setSortKey("date");
        return;
      case "sort-size":
        setSortKey("size");
        return;
      case "sort-type":
        setSortKey("type");
        return;
      case "sort-dir":
        setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
        return;
      case "toggle-thumbs":
        setPrefs((prev) => ({ ...prev, showThumbs: !prev.showThumbs }));
        return;
      case "app-fullscreen":
        void toggleMaximize();
        return;
      case "minimize":
        if (desktopMode) desktop().window.minimize();
        else notify("Window controls need the desktop app.", "ACDSee Classic");
        return;
      case "exit":
        if (desktopMode) desktop().window.close();
        else notify("This demo runs in a browser tab — just close the tab.", "ACDSee Classic");
        return;
      case "options":
        setDialog({ kind: "options" });
        return;
      case "about":
        setDialog({ kind: "about" });
        return;
      case "help":
        notify("Tip: double-click any thumbnail to open the viewer. Use the arrow keys in the viewer, F2 to rename, and Delete to remove.", "ACDSee Help Topics");
        return;
      case "generate-filelist":
        showFileList();
        return;
      default:
        notify("That command is not available.", "ACDSee Classic");
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (viewerId || dialog) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "Delete") {
        event.preventDefault();
        deleteSelection();
      } else if (event.key === "F2") {
        event.preventDefault();
        handleCommand("rename");
      } else if (event.key === "Enter" && selectedPhotos[0]) {
        event.preventDefault();
        openPhoto(selectedPhotos[0].id);
      } else if (event.key === "Escape") {
        setContextMenu(null);
      } else if (event.altKey && event.key === "Enter") {
        event.preventDefault();
        openProperties();
      } else if (event.key === "F5") {
        event.preventDefault();
        void refresh();
      } else if (event.key === "F11") {
        event.preventDefault();
        void toggleMaximize();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        handleCommand("copy");
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "x") {
        event.preventDefault();
        handleCommand("cut");
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
        event.preventDefault();
        handleCommand("paste");
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        selectAll();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setDialog({ kind: "find", initial: query });
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        handleCommand("print");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const beginResize = (side: "tree" | "inspector") => (event: PointerEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = side === "tree" ? treeWidth : inspectorWidth;
    const move = (moveEvent: globalThis.PointerEvent) => {
      if (side === "tree") setTreeWidth(clamp(startWidth + moveEvent.clientX - startX, 170, 390));
      else setInspectorWidth(clamp(startWidth - (moveEvent.clientX - startX), 230, 440));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.classList.remove("resizing");
    };
    document.body.classList.add("resizing");
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const menus: MenuDef[] = [
    {
      label: "File",
      width: 236,
      items: [
        { label: "Open...", shortcut: "Enter", action: "open", disabled: !hasSelection },
        { label: "Open With...", action: "open-with", disabled: !hasSelection },
        { label: "Browse", shortcut: "Ctrl+B", action: "browse" },
        { separator: true },
        { label: "Copy to Folder...", action: "copy-to", disabled: !hasSelection },
        { label: "Move to Folder...", action: "move-to", disabled: !hasSelection },
        { label: "Delete...", shortcut: "Del", action: "delete", disabled: !hasSelection },
        { label: "Rename...", shortcut: "F2", action: "rename", disabled: selectedPhotos.length !== 1 },
        { separator: true },
        { label: "Slide Show...", action: "slideshow", disabled: !visiblePhotos.length },
        { label: "Convert...", action: "convert", disabled: !hasSelection },
        { label: "Print...", shortcut: "Ctrl+P", action: "print", disabled: !visiblePhotos.length },
        { separator: true },
        { label: "Properties", shortcut: "Alt+Enter", action: "properties", disabled: !hasSelection },
        { separator: true },
        { label: "Exit", shortcut: "Alt+F4", action: "exit" }
      ]
    },
    {
      label: "Edit",
      width: 218,
      items: [
        { label: "Cut", shortcut: "Ctrl+X", action: "cut", disabled: !hasSelection },
        { label: "Copy", shortcut: "Ctrl+C", action: "copy", disabled: !hasSelection },
        { label: "Paste", shortcut: "Ctrl+V", action: "paste", disabled: !clipboard },
        { label: "Clear Selection", shortcut: "Esc", action: "clear", disabled: !hasSelection },
        { separator: true },
        { label: "Select All", shortcut: "Ctrl+A", action: "select-all", disabled: !visiblePhotos.length },
        { label: "Invert Selection", action: "invert-selection", disabled: !visiblePhotos.length },
        { separator: true },
        { label: "Find...", shortcut: "Ctrl+F", action: "find" }
      ]
    },
    {
      label: "View",
      width: 248,
      items: [
        { label: "Toolbar", checked: showToolbar, action: "toggle-toolbar" },
        { label: "Status Bar", checked: showStatus, action: "toggle-status" },
        { label: "Folders Pane", checked: showTree, action: "toggle-tree" },
        { label: "Preview Pane", checked: showInspector, action: "toggle-preview" },
        { separator: true },
        { label: "Thumbnails", checked: viewMode === "thumbnails", action: "view-thumbnails" },
        { label: "List", checked: viewMode === "list", action: "view-list" },
        { label: "Details", checked: viewMode === "details", action: "view-details" },
        { separator: true },
        {
          label: "Thumbnail Size",
          submenu: [
            { label: "Small", checked: thumbSize === "small", action: "size-small" },
            { label: "Medium", checked: thumbSize === "medium", action: "size-medium" },
            { label: "Large", checked: thumbSize === "large", action: "size-large" }
          ]
        },
        { label: "Show Thumbnails", checked: prefs.showThumbs, action: "toggle-thumbs" },
        { label: "Show File Extensions", checked: prefs.showExtensions, action: "toggle-extensions" },
        {
          label: "Sort By",
          submenu: [
            { label: "Name", checked: sortKey === "name", action: "sort-name" },
            { label: "Date Modified", checked: sortKey === "date", action: "sort-date" },
            { label: "File Size", checked: sortKey === "size", action: "sort-size" },
            { label: "File Type", checked: sortKey === "type", action: "sort-type" },
            { separator: true },
            { label: "Ascending", checked: sortDir === "asc", action: "sort-dir" }
          ]
        },
        { separator: true },
        { label: "Zoom", shortcut: "F11", checked: zoomed, action: "app-fullscreen" },
        { label: "Refresh", shortcut: "F5", action: "refresh" }
      ]
    },
    {
      label: "Tools",
      width: 238,
      items: [
        { label: "Find Files...", action: "find" },
        { label: "Convert Image Files...", action: "convert", disabled: !hasSelection },
        { label: "Rename Series...", action: "rename-series", disabled: !hasSelection },
        { label: "Generate File List...", action: "generate-filelist", disabled: !visiblePhotos.length },
        { separator: true },
        { label: "Set as Wallpaper", action: "set-wallpaper", disabled: !hasSelection },
        { separator: true },
        { label: "Options...", action: "options" }
      ]
    },
    {
      label: "Browser",
      width: 228,
      items: [
        { label: "Back", shortcut: "Alt+Left", action: "back", disabled: !canBack },
        { label: "Forward", shortcut: "Alt+Right", action: "forward", disabled: !canForward },
        { label: "Up One Level", shortcut: "Alt+Up", action: "up" },
        { label: "Home", action: "home" },
        { label: "Refresh", shortcut: "F5", action: "refresh" },
        { separator: true },
        { label: "Folders Pane", checked: showTree, action: "toggle-tree" },
        { label: "Preview Pane", checked: showInspector, action: "toggle-preview" },
        { label: "Switch to Thumbnails", checked: viewMode === "thumbnails", action: "view-thumbnails" },
        { label: "Switch to Details", checked: viewMode === "details", action: "view-details" }
      ]
    },
    {
      label: "Image",
      width: 222,
      items: [
        { label: "Rotate 90° Left", action: "rotate-left", disabled: !hasSelection },
        { label: "Rotate 90° Right", action: "rotate-right", disabled: !hasSelection },
        { label: "Rotate 180°", action: "rotate-180", disabled: !hasSelection },
        { label: "Flip Horizontal", action: "flip", disabled: !hasSelection },
        { separator: true },
        { label: "Resize...", action: "image-resize", disabled: !hasSelection },
        { label: "Convert...", action: "convert", disabled: !hasSelection },
        { separator: true },
        { label: "Set as Wallpaper", action: "set-wallpaper", disabled: !hasSelection }
      ]
    },
    {
      label: "Help",
      width: 214,
      items: [
        { label: "ACDSee Help Topics", shortcut: "F1", action: "help" },
        { label: "Keyboard Shortcuts", action: "help" },
        { separator: true },
        { label: "About ACDSee...", action: "about" }
      ]
    }
  ];

  const toolbarGroups: { icon: string; title: string; action: string; disabled?: boolean }[][] = [
    [
      { icon: "open", title: "Open image", action: "open", disabled: !hasSelection },
      { icon: "browse", title: "Browse folders", action: "browse" }
    ],
    [
      { icon: "back", title: "Back", action: "back", disabled: !canBack },
      { icon: "forward", title: "Forward", action: "forward", disabled: !canForward },
      { icon: "up", title: "Up one level", action: "up" },
      { icon: "refresh", title: "Refresh", action: "refresh" },
      { icon: "home", title: "Home", action: "home" }
    ],
    [
      { icon: "view", title: "View image", action: "open", disabled: !hasSelection },
      { icon: "slideshow", title: "Slide show", action: "slideshow", disabled: !visiblePhotos.length }
    ],
    [
      { icon: "rotate-left", title: "Rotate left", action: "rotate-left", disabled: !hasSelection },
      { icon: "rotate-right", title: "Rotate right", action: "rotate-right", disabled: !hasSelection },
      { icon: "copy", title: "Copy to folder", action: "copy-to", disabled: !hasSelection },
      { icon: "move", title: "Move to folder", action: "move-to", disabled: !hasSelection },
      { icon: "delete", title: "Delete", action: "delete", disabled: !hasSelection },
      { icon: "rename", title: "Rename", action: "rename", disabled: selectedPhotos.length !== 1 },
      { icon: "convert", title: "Convert", action: "convert", disabled: !hasSelection },
      { icon: "print", title: "Print", action: "print", disabled: !visiblePhotos.length }
    ],
    [
      { icon: "find", title: "Find files", action: "find" },
      { icon: "wallpaper", title: "Set as wallpaper", action: "set-wallpaper", disabled: !hasSelection },
      { icon: "options", title: "Options", action: "options" },
      { icon: "help", title: "Help", action: "help" }
    ]
  ];

  const contextItems: ({ label: string; action: string; shortcut?: string } | { separator: boolean })[] = [
    { label: "Open", action: "open", shortcut: "Enter" },
    { label: "View", action: "view" },
    { separator: true },
    { label: "Copy", action: "copy", shortcut: "Ctrl+C" },
    { label: "Cut", action: "cut", shortcut: "Ctrl+X" },
    { label: "Copy to Folder...", action: "copy-to" },
    { label: "Move to Folder...", action: "move-to" },
    { separator: true },
    { label: "Rotate Left", action: "rotate-left" },
    { label: "Rotate Right", action: "rotate-right" },
    { label: "Convert...", action: "convert" },
    { separator: true },
    { label: "Rename...", action: "rename", shortcut: "F2" },
    { label: "Delete...", action: "delete", shortcut: "Del" },
    { separator: true },
    ...(desktopMode ? [{ label: "Show in Folder", action: "show-in-folder" }] : []),
    { label: "Set as Wallpaper", action: "set-wallpaper" },
    { label: "Properties", action: "properties", shortcut: "Alt+Enter" }
  ];

  const lookInOptions = useMemo(() => {
    const chain = folderPath(currentFolderId);
    const roots = folders.filter((f) => f.parent === null);
    const seen = new Set<string>();
    const options: Folder[] = [];
    for (const item of [...roots, ...chain]) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      options.push(item);
    }
    return options;
  }, [folders, currentFolderId]);

  const transferDestinations = useMemo(() => {
    const chain = folderPath(currentFolderId);
    const roots = folders.filter((f) => f.parent === null);
    const seen = new Set<string>();
    const options: Folder[] = [];
    const ordered = [folder, ...chain, ...roots, ...children];
    for (const item of ordered) {
      if (!item || !item.path || seen.has(item.id)) continue;
      seen.add(item.id);
      options.push(item);
    }
    return options;
  }, [folders, children, currentFolderId, folder]);

  const picturesId = useMemo(
    () => folders.find((f) => f.icon === "pictures")?.id ?? homeId,
    [folders, homeId]
  );

  if (!ready) {
    return (
      <div className="app-window app-root boot-screen">
        <div className="dialog-window boot-box" role="status">
          <div className="titlebar dialog-titlebar">
            <div className="titlebar-left">
              <BrandIcon size={15} />
              <span className="titlebar-text">ACDSee Classic</span>
            </div>
          </div>
          <div className="dialog-content boot-content">
            <BrandIcon size={54} />
            <strong>ACDSee Classic</strong>
            <span>{desktopMode ? "Reading your folders..." : "Loading the demo library..."}</span>
            <div className="boot-bar">
              <span />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="app-window app-root">
        <div className="titlebar main-titlebar" onDoubleClick={() => void toggleMaximize()}>
          <div className="titlebar-left">
            <BrandIcon size={16} />
            <span className="titlebar-text">ACDSee Classic - {folder.name}</span>
            {!desktopMode && <span className="titlebar-demo">WEB DEMO</span>}
          </div>
          <div className="window-controls">
            <button type="button" className="wc-button" title="Minimize" onClick={() => handleCommand("minimize")}>
              <span className="wc-min" />
            </button>
            <button type="button" className="wc-button" title={zoomed ? "Restore Down" : "Maximize"} onClick={() => void toggleMaximize()}>
              <span className={zoomed ? "wc-restore" : "wc-max"} />
            </button>
            <button type="button" className="wc-button close" title="Close" onClick={() => handleCommand("exit")}>
              <span className="wc-x">×</span>
            </button>
          </div>
        </div>

        <MenuBar menus={menus} onCommand={handleCommand} />

        {showToolbar && (
          <>
            <div className="toolbar main-toolbar">
              {toolbarGroups.map((group, groupIndex) => (
                <div className="toolbar-group" key={groupIndex}>
                  {group.map((item) => (
                    <button
                      type="button"
                      key={item.action + item.icon}
                      className="tb-button"
                      title={item.title}
                      onClick={() => handleCommand(item.action)}
                      disabled={item.disabled}
                    >
                      <ToolIcon name={item.icon} size={24} />
                    </button>
                  ))}
                  {groupIndex < toolbarGroups.length - 1 && <span className="toolbar-separator" />}
                </div>
              ))}
              <div className="toolbar-spacer" />
              <span className="toolbar-badge">Image Browser</span>
            </div>

            <div className="location-bar">
              <button type="button" className="location-up" title="Up one level" onClick={goUp} disabled={!folder.parent}>
                <span className="loc-up-arrow">↑</span>
                <span>Up</span>
              </button>
              <span className="toolbar-separator" />
              <label className="location-label" htmlFor="look-in">
                <FolderGlyph icon={folder.icon} size={15} /> Look in:
              </label>
              <div className="combo-wrap location-combo">
                <select
                  id="look-in"
                  value={currentFolderId}
                  onChange={(event) => navigateTo(event.target.value)}
                  title="Navigate to folder"
                >
                  {lookInOptions.map((option) => (
                    <option value={option.id} key={option.id} title={folderPathString(option.id)}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <span className="combo-arrow">▾</span>
              </div>
              <div className="location-path" title={pathLabel}>
                {pathLabel}
              </div>
              <div className="location-actions">
                <button type="button" className="small-tool" title="Find files" onClick={() => handleCommand("find")}>
                  <ToolIcon name="find" size={16} /> <span>Find</span>
                </button>
                <button
                  type="button"
                  className={`small-tool ${showTree ? "pressed" : ""}`}
                  title="Toggle folders pane"
                  onClick={() => setShowTree((v) => !v)}
                >
                  <ToolIcon name="folder" size={16} />
                </button>
                <button
                  type="button"
                  className={`small-tool ${showInspector ? "pressed" : ""}`}
                  title="Toggle preview pane"
                  onClick={() => setShowInspector((v) => !v)}
                >
                  <ToolIcon name="view" size={16} />
                </button>
              </div>
            </div>
          </>
        )}

        <div className="view-bar">
          <div className="view-modes" role="group" aria-label="View mode">
            <button type="button" className={viewMode === "thumbnails" ? "pressed" : ""} onClick={() => setViewMode("thumbnails")} title="Thumbnails">
              <ToolIcon name="thumbnails" size={17} /> Thumbnails
            </button>
            <button type="button" className={viewMode === "list" ? "pressed" : ""} onClick={() => setViewMode("list")} title="List">
              <ToolIcon name="list" size={17} /> List
            </button>
            <button type="button" className={viewMode === "details" ? "pressed" : ""} onClick={() => setViewMode("details")} title="Details">
              <ToolIcon name="details" size={17} /> Details
            </button>
          </div>
          <span className="view-separator" />
          {viewMode === "thumbnails" && (
            <div className="size-control">
              <span>Thumbnail size:</span>
              <input
                type="range"
                min={1}
                max={3}
                step={1}
                value={thumbSize === "small" ? 1 : thumbSize === "medium" ? 2 : 3}
                onChange={(event) => setThumbSize((Number(event.target.value) === 1 ? "small" : Number(event.target.value) === 3 ? "large" : "medium") as ThumbSize)}
                aria-label="Thumbnail size"
                className="classic-slider thumb-slider"
              />
              <span className="size-label">{thumbSize === "small" ? "Small" : thumbSize === "medium" ? "Medium" : "Large"}</span>
            </div>
          )}
          <div className="sort-control">
            <label htmlFor="sort-select">Sort by:</label>
            <div className="combo-wrap small-combo">
              <select id="sort-select" value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
                <option value="name">Name</option>
                <option value="date">Date Modified</option>
                <option value="size">File Size</option>
                <option value="type">File Type</option>
                <option value="dimensions">Dimensions</option>
              </select>
              <span className="combo-arrow">▾</span>
            </div>
            <button type="button" className="sort-direction" onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))} title={sortDir === "asc" ? "Ascending" : "Descending"}>
              {sortDir === "asc" ? "▲" : "▼"}
            </button>
          </div>
          <div className="view-bar-spacer" />
          <span className="view-object-count">
            {visiblePhotos.length} image{visiblePhotos.length === 1 ? "" : "s"}
            {children.length ? ` · ${children.length} folder${children.length === 1 ? "" : "s"}` : ""}
          </span>
          <button type="button" className="refresh-mini" title="Refresh folder (F5)" onClick={() => void refresh()}>
            <ToolIcon name="refresh" size={15} />
          </button>
        </div>

        <div className={`app-body ${refreshing ? "refreshing" : ""}`} ref={bodyRef}>
          {showTree && (
            <>
              <div className="side-column" style={{ width: treeWidth }}>
                <TreePane
                  folders={folders}
                  photos={libraryFlat}
                  currentId={currentFolderId}
                  expanded={expanded}
                  onSelect={navigateTo}
                  onToggle={(id) => {
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id);
                      else {
                        next.add(id);
                        void ensureChildren(id);
                      }
                      return next;
                    });
                  }}
                  onExpandAll={() => setExpanded(new Set(folders.filter((f) => childFolders(f.id).length).map((f) => f.id)))}
                  onCollapse={() => setExpanded(new Set(folders.filter((f) => f.parent === null).map((f) => f.id)))}
                  onClose={() => setShowTree(false)}
                />
              </div>
              <div className="splitter vertical" onPointerDown={beginResize("tree")} title="Drag to resize" role="separator" aria-orientation="vertical">
                <span className="splitter-grip" />
              </div>
            </>
          )}

          <div className="center-column">
            <div className="center-heading">
              <div className="center-folder">
                <FolderGlyph icon={folder.icon} size={20} />
                <div>
                  <strong>{folder.name}</strong>
                  <span>{descendantPhotoCount(folder.id, libraryFlat)} images in this branch</span>
                </div>
              </div>
              <div className="center-heading-actions">
                <button type="button" className="classic-button compact" onClick={() => handleCommand("slideshow")} disabled={!visiblePhotos.length}>
                  <ToolIcon name={slideshow ? "pause" : "play"} size={12} /> Slide Show
                </button>
                <button type="button" className="classic-button compact" onClick={() => handleCommand("open")} disabled={!hasSelection}>
                  View
                </button>
              </div>
            </div>
            <BrowserView
              folder={folder}
              folderChildren={children}
              photos={visiblePhotos}
              allPhotoCount={directPhotos.length}
              selected={new Set(selectedIds)}
              viewMode={viewMode}
              thumbSize={thumbSize}
              sortKey={sortKey}
              sortDir={sortDir}
              query={query}
              onClearQuery={() => setQuery("")}
              onSelect={selectPhoto}
              onOpenPhoto={openPhoto}
              onOpenFolder={(id) => navigateTo(id)}
              onContextMenu={openContextMenu}
              onSorted={changeSort}
              showThumbs={prefs.showThumbs}
              showExtensions={prefs.showExtensions}
            />
          </div>

          {showInspector && (
            <>
              <div className="splitter vertical inspector-splitter" onPointerDown={beginResize("inspector")} title="Drag to resize" role="separator" aria-orientation="vertical">
                <span className="splitter-grip" />
              </div>
              <div className="side-column inspector-column" style={{ width: inspectorWidth }}>
                <Inspector
                  photo={primary}
                  selectedCount={selectedPhotos.length}
                  onOpen={() => primary && openPhoto(primary.id)}
                  onWallpaper={() => void setAsWallpaper(primary)}
                  onNext={() => {
                    if (!visiblePhotos.length || !primary) return;
                    const idx = visiblePhotos.findIndex((p) => p.id === primary.id);
                    const next = visiblePhotos[(idx + 1) % visiblePhotos.length];
                    setSelectedIds([next.id]);
                    setAnchorId(next.id);
                  }}
                  onPrev={() => {
                    if (!visiblePhotos.length || !primary) return;
                    const idx = visiblePhotos.findIndex((p) => p.id === primary.id);
                    const prev = visiblePhotos[(idx - 1 + visiblePhotos.length) % visiblePhotos.length];
                    setSelectedIds([prev.id]);
                    setAnchorId(prev.id);
                  }}
                  onClose={() => setShowInspector(false)}
                  onRate={(value) => {
                    if (!primary) return;
                    patchPhotoEverywhere(primary.id, (p) => ({ ...p, rating: value }));
                    notify(`Rated "${primary.name}" ${value} of 5 stars.`, "Rating");
                  }}
                />
              </div>
            </>
          )}
        </div>

        {showStatus && (
          <StatusBar
            count={visiblePhotos.length}
            folders={children.length}
            totalBytes={totalBytes}
            selectedPhotos={selectedPhotos}
            folderName={folder.name}
            filterActive={Boolean(normalizedQuery)}
            wallpaperActive={false}
          />
        )}

        {refreshing && (
          <div className="refresh-overlay">
            <div className="refresh-box">
              <div className="hourglass">⌛</div>
              <span>Refreshing folder contents...</span>
            </div>
          </div>
        )}
      </div>

      {viewerId && viewerPhotos.length > 0 && (
        <Viewer
          photos={viewerPhotos}
          photoId={viewerId}
          slideshow={slideshow}
          onSelect={(id) => {
            setViewerId(id);
            setSelectedIds([id]);
          }}
          onClose={() => {
            setViewerId(null);
            setSlideshow(false);
          }}
          onToggleSlideshow={() => setSlideshow((v) => !v)}
          onRotate={(id, delta) => rotate(id, delta)}
          onFlip={(id) => {
            setPhotoCache((prev) => {
              const next: Record<string, Photo[]> = {};
              for (const [folderId, photos] of Object.entries(prev)) {
                next[folderId] = photos.map((p) => (p.id === id ? { ...p, flipped: !p.flipped } : p));
              }
              return next;
            });
          }}
          onWallpaper={(photo) => void setAsWallpaper(photo)}
          notify={notify}
        />
      )}

      {dialog && (
        <DialogHost
          dialog={dialog}
          photos={libraryFlat}
          folders={transferDestinations}
          picturesId={picturesId}
          onClose={() => setDialog(null)}
          onRename={(name) => void commitRename(name)}
          onDelete={() => void commitDelete()}
          onTransfer={(target, mode) => void commitTransfer(target, mode)}
          onConvert={(format, quality, target) => void commitConvert(format, quality, target)}
          onFind={commitFind}
          onResize={(width, height) => void commitResize(width, height)}
          onSeries={(prefix, start, digits) => void commitSeries(prefix, start, digits)}
          onPrint={(printer, copies) => void commitPrint(printer, copies)}
          onNotify={notify}
          onOpenViewer={(id) => {
            setDialog(null);
            openPhoto(id);
          }}
          onSetWallpaper={(photo) => {
            setDialog(null);
            void setAsWallpaper(photo);
          }}
        />
      )}

      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onMouseDown={(event) => event.stopPropagation()}>
          <div className="context-header">
            <FileTypeIcon size={13} />
            <span>{libraryFlat.find((p) => p.id === contextMenu.id)?.name}</span>
          </div>
          {contextItems.map((item, index) =>
            "separator" in item && item.separator ? (
              <div className="menu-separator" key={index} />
            ) : (
              <button
                type="button"
                key={"action" in item ? item.action : index}
                className="menu-item"
                onClick={() => {
                  setContextMenu(null);
                  if ("action" in item && item.action) handleCommand(item.action);
                }}
              >
                <span className="menu-check" />
                <span className="menu-label">{"label" in item ? item.label : ""}</span>
                <span className="menu-shortcut">{"shortcut" in item ? (item.shortcut ?? "") : ""}</span>
              </button>
            )
          )}
        </div>
      )}

      {toast && (
        <div className="toast" key={toast.id} role="status">
          <div className="toast-head">
            <BrandIcon size={18} />
            <strong>{toast.title}</strong>
            <button type="button" className="toast-close" onClick={() => setToast(null)} aria-label="Dismiss">
              ×
            </button>
          </div>
          <div className="toast-body">{toast.message}</div>
          <button type="button" className="toast-ok" onClick={() => setToast(null)}>
            OK
          </button>
        </div>
      )}
    </>
  );
}
