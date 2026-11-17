import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import {
  childFolders,
  descendantPhotoCount,
  folderById,
  folderPathString,
  folders,
  formatBytes,
  photos as seedPhotos,
  sortPhotos,
  totalSize,
  type Photo,
} from "./data";
import { BrandIcon, FileTypeIcon, FolderGlyph, ToolIcon } from "./icons";
import MenuBar, { type MenuDef } from "./components/MenuBar";
import BrowserView, { StatusBar, type ThumbSize, type ViewMode } from "./components/BrowserView";
import { Inspector, TreePane } from "./components/Panels";
import Viewer from "./components/Viewer";
import DialogHost, { type DialogState } from "./components/Dialogs";
import Shell, { type WindowState } from "./components/Shell";

type Toast = { id: number; title: string; message: string };
type ClipboardState = { ids: string[]; mode: "copy" | "cut" } | null;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function ancestorsOf(id: string): string[] {
  const result: string[] = [];
  let current = folderById(id);
  while (current) {
    result.push(current.id);
    current = current.parent ? folderById(current.parent) : undefined;
  }
  return result;
}

const initialPhoto = seedPhotos.find((p) => p.folderId === "vacation-2001")!;

export default function App() {
  const [library, setLibrary] = useState<Photo[]>(seedPhotos);
  const [currentFolderId, setCurrentFolderId] = useState("vacation-2001");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(ancestorsOf("vacation-2001")));
  const [history, setHistory] = useState<{ items: string[]; index: number }>({ items: ["vacation-2001"], index: 0 });
  const [selectedIds, setSelectedIds] = useState<string[]>([initialPhoto.id]);
  const [anchorId, setAnchorId] = useState<string | null>(initialPhoto.id);
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
  const [wallpaper, setWallpaper] = useState<string | null>(null);
  const [windowState, setWindowState] = useState<WindowState>("normal");
  const [clipboard, setClipboard] = useState<ClipboardState>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [prefs, setPrefs] = useState({ showThumbs: true, showExtensions: true });
  const bodyRef = useRef<HTMLDivElement>(null);

  const folder = folderById(currentFolderId) ?? folderById("my-pictures")!;
  const children = childFolders(currentFolderId);
  const directPhotos = library.filter((p) => p.folderId === currentFolderId);
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
  const selectedPhotos = library.filter((p) => selectedIds.includes(p.id));
  const primary = selectedPhotos[0] ?? visiblePhotos[0] ?? null;
  const viewerPhotos = visiblePhotos;
  const totalBytes = totalSize(visiblePhotos);
  const canBack = history.index > 0;
  const canForward = history.index < history.items.length - 1;
  const pathLabel = folderPathString(currentFolderId) || folder.name;
  const hasSelection = selectedPhotos.length > 0;

  const notify = (message: string, title = "ACDSee 3.1") => setToast({ id: Date.now(), title, message });

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

  const expandAncestors = (id: string) => setExpanded((prev) => new Set([...prev, ...ancestorsOf(id)]));

  const navigateTo = (id: string, push = true) => {
    const nextDirect = library.filter((p) => p.folderId === id);
    setCurrentFolderId(id);
    setSelectedIds(nextDirect[0] ? [nextDirect[0].id] : []);
    setAnchorId(nextDirect[0]?.id ?? null);
    setQuery("");
    setViewerId(null);
    setSlideshow(false);
    expandAncestors(id);
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

  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => {
      setRefreshing(false);
      setLibrary((items) => [...items]);
      notify(`"${folder.name}" refreshed. ${visiblePhotos.length} image${visiblePhotos.length === 1 ? "" : "s"} found.`, "Refresh");
    }, 550);
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
    setLibrary((items) =>
      items.map((p) => (targets.includes(p.id) ? { ...p, rotation: (p.rotation + delta + 360) % 360 } : p))
    );
    notify(`Rotated ${targets.length} image${targets.length === 1 ? "" : "s"} ${delta > 0 ? "right" : "left"} by 90°.`, "Rotate");
  };

  const setAsWallpaper = (photo: Photo | null) => {
    if (!photo) return;
    setWallpaper(photo.src);
    setWindowState((state) => (state === "closed" || state === "minimized" ? "normal" : state));
    notify(`"${photo.name}" is now displayed on your desktop. Choose another image, or use Start to restore the default desktop.`, "Set as Wallpaper");
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
      id,
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
    setDialog({ kind: "delete", ids: selectedIds, fromRecycle: currentFolderId === "recycle-bin" });
  };

  const commitDelete = () => {
    if (!dialog || dialog.kind !== "delete") return;
    const ids = dialog.ids;
    if (dialog.fromRecycle) {
      setLibrary((items) => items.filter((p) => !ids.includes(p.id)));
      notify(`Permanently deleted ${ids.length} file${ids.length === 1 ? "" : "s"}.`, "Recycle Bin");
    } else {
      setLibrary((items) => items.map((p) => (ids.includes(p.id) ? { ...p, folderId: "recycle-bin" } : p)));
      notify(`${ids.length} file${ids.length === 1 ? "" : "s"} moved to the Recycle Bin.`, "Delete");
    }
    setSelectedIds([]);
    setDialog(null);
  };

  const commitTransfer = (target: string, mode: "copy" | "move") => {
    if (!dialog || dialog.kind !== "transfer") return;
    const ids = dialog.ids;
    if (mode === "copy") {
      const stamp = Date.now();
      const copies = library
        .filter((p) => ids.includes(p.id))
        .map((p, index) => ({
          ...p,
          id: `${p.id}-copy-${stamp}-${index}`,
          folderId: target,
          name: p.name.replace(/\.(jpg|jpeg|png|bmp|tif|tiff)$/i, "") + " (Copy)" + p.name.slice(p.name.lastIndexOf(".")),
        }));
      setLibrary((items) => [...items, ...copies]);
    } else {
      setLibrary((items) => items.map((p) => (ids.includes(p.id) ? { ...p, folderId: target } : p)));
    }
    const targetName = folderById(target)?.name ?? target;
    notify(`${mode === "copy" ? "Copied" : "Moved"} ${ids.length} file${ids.length === 1 ? "" : "s"} to "${targetName}".`, mode === "copy" ? "Copy to Folder" : "Move to Folder");
    setDialog(null);
  };

  const commitRename = (name: string) => {
    if (!dialog || dialog.kind !== "rename") return;
    setLibrary((items) => items.map((p) => (p.id === dialog.ids[0] ? { ...p, name } : p)));
    notify(`File renamed to "${name}".`, "Rename");
    setDialog(null);
  };

  const commitConvert = (format: string, quality: number, target: string) => {
    if (!dialog || dialog.kind !== "convert") return;
    const ids = dialog.ids;
    const ext = format === "JPEG" ? "jpg" : format.toLowerCase();
    setLibrary((items) =>
      items.map((p) =>
        ids.includes(p.id)
          ? {
              ...p,
              format: format as Photo["format"],
              name: p.name.replace(/\.[^.]+$/, `.${ext}`),
              folderId: target === "same-folder" ? p.folderId : target,
            }
          : p
      )
    );
    notify(`${ids.length} image${ids.length === 1 ? "" : "s"} converted to ${format} at ${quality}% quality.`, "Convert");
    setDialog(null);
  };

  const commitResize = (width: number, height: number) => {
    if (!dialog || dialog.kind !== "resize") return;
    setLibrary((items) => items.map((p) => (p.id === dialog.id ? { ...p, width, height } : p)));
    notify(`Image resized to ${width} × ${height} pixels (demo metadata).`, "Resize");
    setDialog(null);
  };

  const commitSeries = (prefix: string, start: number, digits: number) => {
    if (!dialog || dialog.kind !== "series") return;
    const ids = dialog.ids;
    setLibrary((items) =>
      items.map((p) => {
        const index = ids.indexOf(p.id);
        if (index < 0) return p;
        return { ...p, name: `${prefix} ${String(start + index).padStart(digits, "0")}.jpg` };
      })
    );
    notify(`Renamed ${ids.length} files as a series.`, "Rename Series");
    setDialog(null);
  };

  const commitFind = (value: string) => {
    setQuery(value.trim());
    setDialog(null);
    const matches = directPhotos.filter(
      (p) => p.name.toLowerCase().includes(value.trim().toLowerCase()) || p.format.toLowerCase().includes(value.trim().toLowerCase())
    );
    if (value.trim()) notify(`${matches.length} matching image${matches.length === 1 ? "" : "s"} found.`, "Find: " + value.trim());
    if (matches[0]) {
      setSelectedIds([matches[0].id]);
      setAnchorId(matches[0].id);
    }
  };

  const commitPrint = (printer: string, copies: number) => {
    notify(`Sent ${dialog?.kind === "print" ? dialog.ids.length : 0} image(s) to ${printer} (${copies} copies).`, "Print");
    setDialog(null);
  };

  const paste = () => {
    if (!clipboard) {
      notify("The clipboard is empty.", "Paste");
      return;
    }
    if (clipboard.mode === "cut") {
      setLibrary((items) => items.map((p) => (clipboard.ids.includes(p.id) ? { ...p, folderId: currentFolderId } : p)));
      notify(`Moved ${clipboard.ids.length} file${clipboard.ids.length === 1 ? "" : "s"} to "${folder.name}".`, "Paste");
      setClipboard(null);
    } else {
      const stamp = Date.now();
      const copies = library
        .filter((p) => clipboard.ids.includes(p.id))
        .map((p, index) => ({ ...p, id: `${p.id}-paste-${stamp}-${index}`, folderId: currentFolderId }));
      setLibrary((items) => [...items, ...copies]);
      notify(`${copies.length} file${copies.length === 1 ? "" : "s"} pasted into "${folder.name}".`, "Paste");
    }
  };

  const showFileList = () => {
    const items = selectedPhotos.length ? selectedPhotos : visiblePhotos;
    const text = items
      .map(
        (p) =>
          `${p.name}\t${p.width}x${p.height}\t${formatBytes(p.size)}\t${folderPathString(p.folderId)}`
      )
      .join("\n");
    setDialog({ kind: "filelist", text });
  };

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
        navigateTo("my-pictures");
        return;
      case "refresh":
        refresh();
        return;
      case "open":
      case "view":
        if (selectedPhotos[0]) openPhoto(selectedPhotos[0].id);
        else notify("Select an image to open.", "ACDSee");
        return;
      case "open-with":
        notify("Choose a program to open this image. ACDSee is the default image viewer.", "Open With");
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
        setLibrary((items) => items.map((p) => (selectedIds.includes(p.id) ? { ...p, flipped: !p.flipped } : p)));
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
        setAsWallpaper(primary);
        return;
      case "wallpaper-toggle":
        if (wallpaper) {
          setWallpaper(null);
          notify("The default desktop has been restored.", "Display Properties");
        } else {
          setAsWallpaper(primary);
        }
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
        paste();
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
        setWindowState((state) => (state === "maximized" ? "normal" : "maximized"));
        return;
      case "minimize":
        setWindowState("minimized");
        return;
      case "exit":
        setWindowState("closed");
        notify("ACDSee has exited. Double-click the ACDSee desktop icon to reopen.", "ACDSee 3.1");
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
      case "feedback":
        notify("This feature is part of the ACDSee kitchen-sink demo.", "ACDSee");
        return;
      default:
        notify("That command is not available in this demo.", "ACDSee");
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
        refresh();
      } else if (event.key === "F11") {
        event.preventDefault();
        setWindowState((state) => (state === "maximized" ? "normal" : "maximized"));
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
        { label: "Exit", shortcut: "Alt+F4", action: "exit" },
      ],
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
        { label: "Find...", shortcut: "Ctrl+F", action: "find" },
      ],
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
            { label: "Large", checked: thumbSize === "large", action: "size-large" },
          ],
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
            { label: "Ascending", checked: sortDir === "asc", action: "sort-dir" },
          ],
        },
        { separator: true },
        { label: "Full Screen", shortcut: "F11", checked: windowState === "maximized", action: "app-fullscreen" },
        { label: "Refresh", shortcut: "F5", action: "refresh" },
      ],
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
        { label: "Restore Desktop", action: "wallpaper-toggle", disabled: !wallpaper },
        { separator: true },
        { label: "Options...", action: "options" },
      ],
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
        { label: "Switch to Details", checked: viewMode === "details", action: "view-details" },
      ],
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
        { label: "Set as Wallpaper", action: "set-wallpaper", disabled: !hasSelection },
      ],
    },
    {
      label: "Help",
      width: 214,
      items: [
        { label: "ACDSee Help Topics", shortcut: "F1", action: "help" },
        { label: "Keyboard Shortcuts", action: "help" },
        { separator: true },
        { label: "About ACDSee...", action: "about" },
      ],
    },
  ];

  const toolbarGroups: { icon: string; title: string; action: string; disabled?: boolean }[][] = [
    [
      { icon: "open", title: "Open image", action: "open", disabled: !hasSelection },
      { icon: "browse", title: "Browse folders", action: "browse" },
    ],
    [
      { icon: "back", title: "Back", action: "back", disabled: !canBack },
      { icon: "forward", title: "Forward", action: "forward", disabled: !canForward },
      { icon: "up", title: "Up one level", action: "up" },
      { icon: "refresh", title: "Refresh", action: "refresh" },
      { icon: "home", title: "Home", action: "home" },
    ],
    [
      { icon: "view", title: "View image", action: "open", disabled: !hasSelection },
      { icon: "slideshow", title: "Slide show", action: "slideshow", disabled: !visiblePhotos.length },
    ],
    [
      { icon: "rotate-left", title: "Rotate left", action: "rotate-left", disabled: !hasSelection },
      { icon: "rotate-right", title: "Rotate right", action: "rotate-right", disabled: !hasSelection },
      { icon: "copy", title: "Copy to folder", action: "copy-to", disabled: !hasSelection },
      { icon: "move", title: "Move to folder", action: "move-to", disabled: !hasSelection },
      { icon: "delete", title: "Delete", action: "delete", disabled: !hasSelection },
      { icon: "rename", title: "Rename", action: "rename", disabled: selectedPhotos.length !== 1 },
      { icon: "convert", title: "Convert", action: "convert", disabled: !hasSelection },
      { icon: "print", title: "Print", action: "print", disabled: !visiblePhotos.length },
    ],
    [
      { icon: "find", title: "Find files", action: "find" },
      { icon: "wallpaper", title: "Set as wallpaper", action: "set-wallpaper", disabled: !hasSelection },
      { icon: "options", title: "Options", action: "options" },
      { icon: "help", title: "Help", action: "help" },
    ],
  ];

  const contextItems = [
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
    { label: "Set as Wallpaper", action: "set-wallpaper" },
    { label: "Properties", action: "properties", shortcut: "Alt+Enter" },
  ];

  const restoreWindow = () => setWindowState((state) => (state === "closed" || state === "minimized" ? "normal" : state));

  return (
    <>
      <Shell
        wallpaper={wallpaper}
        windowState={windowState}
        taskCaption={`ACDSee 3.1 - ${folder.name}`}
        onRestore={restoreWindow}
        onMinimize={() => setWindowState("minimized")}
        onOpenFolder={(id) => {
          navigateTo(id);
          setWindowState((state) => (state === "closed" || state === "minimized" ? "normal" : state));
        }}
        onNotify={notify}
        onAbout={() => setDialog({ kind: "about" })}
        onFind={() => setDialog({ kind: "find", initial: query })}
        onShutdown={() => notify("It is now safe to turn off your computer. (This is a demo — your desktop is fine.)", "Shut Down Windows")}
        onOpenViewer={() => handleCommand("open")}
        onToggleWallpaper={() => handleCommand("wallpaper-toggle")}
      >
        <div className="titlebar main-titlebar" onDoubleClick={() => setWindowState((s) => (s === "maximized" ? "normal" : "maximized"))}>
          <div className="titlebar-left">
            <BrandIcon size={16} />
            <span className="titlebar-text">ACDSee 3.1 - {folder.name}</span>
            <span className="titlebar-demo">DEMO</span>
          </div>
          <div className="window-controls">
            <button type="button" className="wc-button" title="Minimize" onClick={() => setWindowState("minimized")}>
              <span className="wc-min" />
            </button>
            <button
              type="button"
              className="wc-button"
              title={windowState === "maximized" ? "Restore Down" : "Maximize"}
              onClick={() => setWindowState((state) => (state === "maximized" ? "normal" : "maximized"))}
            >
              <span className={windowState === "maximized" ? "wc-restore" : "wc-max"} />
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
                  {(["my-computer", "c-drive", "my-documents", "my-pictures", "vacation-2001", "family-friends", "wallpapers", "scanned-photos", "sample-images", "recycle-bin", "my-network"] as const).map((id) => (
                    <option value={id} key={id} title={folderPathString(id)}>
                      {folderById(id)?.name}
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
          <button type="button" className="refresh-mini" title="Refresh folder (F5)" onClick={refresh}>
            <ToolIcon name="refresh" size={15} />
          </button>
        </div>

        <div className={`app-body ${refreshing ? "refreshing" : ""}`} ref={bodyRef}>
          {showTree && (
            <>
              <div className="side-column" style={{ width: treeWidth }}>
                <TreePane
                  folders={folders}
                  photos={library}
                  currentId={currentFolderId}
                  expanded={expanded}
                  onSelect={navigateTo}
                  onToggle={(id) =>
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    })
                  }
                  onExpandAll={() => setExpanded(new Set(folders.filter((f) => childFolders(f.id).length).map((f) => f.id)))}
                  onCollapse={() => setExpanded(new Set(["my-computer"]))}
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
                  <span>{descendantPhotoCount(folder.id, library)} images in this branch</span>
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
                  onWallpaper={() => setAsWallpaper(primary)}
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
                    setLibrary((items) => items.map((p) => (p.id === primary.id ? { ...p, rating: value } : p)));
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
            wallpaperActive={Boolean(wallpaper)}
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
      </Shell>

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
            setLibrary((items) => items.map((p) => (p.id === id ? { ...p, flipped: !p.flipped } : p)));
          }}
          onWallpaper={(photo) => setAsWallpaper(photo)}
          notify={notify}
        />
      )}

      {dialog && (
        <DialogHost
          dialog={dialog}
          photos={library}
          folders={folders}
          onClose={() => setDialog(null)}
          onRename={commitRename}
          onDelete={commitDelete}
          onTransfer={commitTransfer}
          onConvert={commitConvert}
          onFind={commitFind}
          onResize={commitResize}
          onSeries={commitSeries}
          onPrint={commitPrint}
          onNotify={notify}
          onOpenViewer={(id) => {
            setDialog(null);
            openPhoto(id);
          }}
          onSetWallpaper={(photo) => {
            setDialog(null);
            setAsWallpaper(photo);
          }}
        />
      )}

      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onMouseDown={(event) => event.stopPropagation()}>
          <div className="context-header">
            <FileTypeIcon size={13} />
            <span>{library.find((p) => p.id === contextMenu.id)?.name}</span>
          </div>
          {contextItems.map((item, index) =>
            "separator" in item && item.separator ? (
              <div className="menu-separator" key={index} />
            ) : (
              <button
                type="button"
                key={item.action}
                className="menu-item"
                onClick={() => {
                  setContextMenu(null);
                  if (item.action) handleCommand(item.action);
                }}
              >
                <span className="menu-check" />
                <span className="menu-label">{item.label}</span>
                <span className="menu-shortcut">{item.shortcut ?? ""}</span>
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
