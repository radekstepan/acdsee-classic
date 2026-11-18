import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  DialogSpec,
  Edit,
  ExifEntry,
  FileEntry,
  Folder,
  FolderIcon,
  FolderKind,
  MsgIcon,
  Settings,
  SortKey,
  ViewMode
} from "./types";
import { baseName, defaultSettings, kindForIcon, newFileId } from "./data/fs";
import { FORMATS, formatFor } from "./data/catalog";
import { ancestors, defaultEdit, fullName, pathOf, sortFiles, uniqueName } from "./utils/util";
import { DEMO_START_FOLDER, demoFolders } from "./demo-data";
import { desktop, isDesktop, platformName, trashLabel } from "./lib/bridge";
import { convertImage, formatInfo, mimeForFileName, resizeImage } from "./lib/imaging";
import {
  adoptPath,
  defaultLayout,
  loadPersistedState,
  mergeSettings,
  restoreHistory,
  savePersistedState,
  STATE_VERSION,
  type LayoutState,
  type PersistedState
} from "./data/state";
import { localFileUrl, type FolderNode, type ListDirResult } from "../../shared/api";

export const DESKTOP_ID = "desktop";
export const MY_COMPUTER_ID = "__computer__";
export const MY_PICTURES_ID = "__pictures__";
export const MY_DOCUMENTS_ID = "__documents__";
export const DESKTOP_DIR_ID = "__desktopdir__";
export const NETWORK_ID = "__network__";
export const RECYCLE_ID = "recycle";

export interface ViewerState {
  open: boolean;
  fileId: string | null;
  full: boolean;
  slideshow: boolean;
  list: string[] | null;
  returnToViewer?: boolean;
}

export interface Clip {
  ids: string[];
  mode: "copy" | "cut";
}

export interface Wallpaper {
  src: string;
  mode: "center" | "tile" | "stretch";
}

const emptyFolder = (id: string): Folder => ({
  id,
  name: "…",
  parent: null,
  kind: "folder",
  children: [],
  files: [],
  path: ""
});

function initialShell(): Record<string, Folder> {
  return {
    [DESKTOP_ID]: {
      id: DESKTOP_ID,
      name: "Desktop",
      parent: null,
      kind: "desktop",
      children: [],
      files: [],
      path: "",
      loaded: true
    },
    [MY_COMPUTER_ID]: {
      id: MY_COMPUTER_ID,
      name: "My Computer",
      parent: DESKTOP_ID,
      kind: "computer",
      children: [],
      files: [],
      path: "",
      icon: "computer"
    },
    [NETWORK_ID]: {
      id: NETWORK_ID,
      name: "Network Neighborhood",
      parent: DESKTOP_ID,
      kind: "network",
      children: [],
      files: [],
      path: "",
      icon: "network"
    },
    [RECYCLE_ID]: {
      id: RECYCLE_ID,
      name: "Recycle Bin",
      parent: DESKTOP_ID,
      kind: "recycle",
      children: [],
      files: [],
      path: "",
      icon: "recycle",
      loaded: true
    }
  };
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function fileFromDirEntry(entry: { name: string; path: string; size: number; mtimeMs: number; ext: string }, folderId: string, old?: FileEntry): FileEntry {
  const ext = entry.ext.replace(/^\./, "").toLowerCase();
  const fmt = formatFor(ext);
  return {
    id: entry.path,
    name: baseName(entry.name),
    ext,
    path: entry.path,
    src: old?.src ?? "",
    fullSrc: localFileUrl(entry.path),
    tw: old?.tw ?? 0,
    th: old?.th ?? 0,
    folderId,
    size: entry.size,
    w: old?.w ?? 0,
    h: old?.h ?? 0,
    bpp: old?.bpp ?? fmt.bpp,
    orientation: old?.orientation ?? 1,
    created: old?.created ?? entry.mtimeMs,
    modified: entry.mtimeMs,
    accessed: old?.accessed ?? entry.mtimeMs,
    attrs: old?.attrs ?? { r: false, h: entry.name.startsWith("."), a: true },
    edit: old?.edit ?? { ...defaultEdit },
    desc: old?.desc ?? "",
    keywords: old?.keywords ?? "",
    rating: old?.rating ?? 0,
    exif: old?.exif ?? {},
    deletedFrom: old?.deletedFrom
  };
}

function nodeFolder(node: FolderNode, parent: string): Folder {
  return {
    id: node.id,
    name: node.name,
    parent,
    kind: kindForIcon(node.icon),
    children: [],
    files: [],
    path: node.path,
    icon: node.icon
  };
}

function useStoreImpl() {
  const desktopMode = isDesktop();
  const [folders, setFolders] = useState<Record<string, Folder>>(() =>
    desktopMode ? initialShell() : demoFolders
  );
  const foldersRef = useRef(folders);
  foldersRef.current = folders;

  const [settings, setSettingsState] = useState<Settings>(defaultSettings);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const setSettings = useCallback(
    (patch: Partial<Settings>) => setSettingsState((s) => ({ ...s, ...patch })),
    []
  );

  const [layout, setLayoutState] = useState<LayoutState>(defaultLayout);
  const setLayout = useCallback(
    (patch: Partial<LayoutState>) => setLayoutState((l) => ({ ...l, ...patch })),
    []
  );

  const [ready, setReady] = useState(false);
  const [nav, setNav] = useState({
    folderId: desktopMode ? MY_COMPUTER_ID : DEMO_START_FOLDER,
    hist: [desktopMode ? MY_COMPUTER_ID : DEMO_START_FOLDER],
    idx: 0
  });
  const navRef = useRef(nav);
  navRef.current = nav;
  const folderId = nav.folderId;

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set([DESKTOP_ID, MY_COMPUTER_ID, "c", "mydocs", "mypics"])
  );
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  const [selection, setSelectionState] = useState<string[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("thumbs");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const [filter, setFilter] = useState<string>("all");
  const [clip, setClip] = useState<Clip | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wallpaper, setWallpaper] = useState<Wallpaper | null>(null);

  const [dialogs, setDialogs] = useState<DialogSpec[]>([]);
  const [viewer, setViewer] = useState<ViewerState>({
    open: false,
    fileId: null,
    full: false,
    slideshow: false,
    list: null
  });
  const viewerRef = useRef(viewer);
  viewerRef.current = viewer;

  const foldersTimer = useRef<number | undefined>(undefined);
  const loadSeq = useRef(0);
  const exifDone = useRef<Set<string>>(new Set());

  /* ---------------- derived ---------------- */
  const folder = folders[folderId] ?? emptyFolder(folderId);

  const visibleFiles = useMemo(() => {
    const files = folder.files.filter((f) => {
      const fmtKey = f.ext === "jpeg" ? "jpg" : f.ext === "tiff" ? "tif" : f.ext;
      return (
        settings.formats[fmtKey] !== false &&
        (filter === "all" || f.ext === filter || formatFor(f.ext).type === formatFor(filter).type) &&
        (settings.showHidden || !f.attrs.h)
      );
    });
    return sortFiles(files, sort.key, sort.dir);
  }, [folder, settings.formats, settings.showHidden, filter, sort]);

  const subfolders = useMemo(() => {
    if (!settings.showFolders) return [] as Folder[];
    const kids = folder.children.map((c) => folders[c]).filter(Boolean);
    if (folder.kind === "computer" || folder.kind === "desktop") return kids;
    return [...kids].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    );
  }, [folder, folders, settings.showFolders]);

  const items = useMemo(
    () => [...subfolders.map((f) => f.id), ...visibleFiles.map((f) => f.id)],
    [subfolders, visibleFiles]
  );

  const fileMap = useMemo(() => {
    const m = new Map<string, { file: FileEntry; folderId: string }>();
    for (const f of Object.values(folders)) for (const file of f.files) m.set(file.id, { file, folderId: f.id });
    return m;
  }, [folders]);
  const fileMapRef = useRef(fileMap);
  fileMapRef.current = fileMap;

  const getFile = useCallback(
    (id: string | null | undefined) => (id ? fileMapRef.current.get(id)?.file : undefined),
    []
  );

  const selectedFiles = useMemo(
    () => selection.map((id) => visibleFiles.find((f) => f.id === id)).filter(Boolean) as FileEntry[],
    [selection, visibleFiles]
  );

  const quick = useMemo(() => {
    const all = Object.values(folders);
    const byIcon = (icon: FolderIcon) => all.find((f) => f.icon === icon);
    const pictures =
      byIcon("pictures") ??
      all.find((f) => f.kind === "folder" && /^(my )?(pictures|photos)$/i.test(f.name)) ??
      all.find((f) => f.path && /pictures|photos/i.test(f.path));
    const documents = byIcon("mydocs") ?? all.find((f) => /documents/i.test(f.name));
    const computer = byIcon("computer") ?? all.find((f) => f.kind === "computer");
    const network = byIcon("network") ?? all.find((f) => f.kind === "network");
    const recycle = byIcon("recycle") ?? all.find((f) => f.kind === "recycle");
    const desktopDir = all.find((f) => f.kind === "folder" && /^desktop$/i.test(f.name));
    return {
      picturesId: pictures?.id ?? null,
      documentsId: documents?.id ?? null,
      computerId: computer?.id ?? null,
      networkId: network?.id ?? null,
      recycleId: recycle?.id ?? null,
      desktopDirId: desktopDir?.id ?? null
    };
  }, [folders]);

  /* ---------------- dialogs ---------------- */
  const openDialog = useCallback((d: DialogSpec) => setDialogs((ds) => [...ds, d]), []);
  const closeDialog = useCallback(() => setDialogs((ds) => ds.slice(0, -1)), []);
  const msg = useCallback(
    (
      title: string,
      text: string,
      icon: MsgIcon = "info",
      buttons: string[] = ["OK"],
      onResult?: (b: string) => void,
      defaultBtn = 0
    ) => openDialog({ type: "msg", title, text, icon, buttons, onResult, defaultBtn }),
    [openDialog]
  );

  /* ---------------- selection ---------------- */
  const setSelection = useCallback((ids: string[], focus?: string | null) => {
    setSelectionState(ids);
    if (focus !== undefined) setFocusId(focus);
  }, []);

  /* ---------------- navigation ---------------- */
  const expandTo = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const a of ancestors(foldersRef.current, id)) next.add(a);
      next.add(id);
      return next;
    });
  }, []);

  const setBusySoon = useCallback(() => {
    setBusy(true);
    window.clearTimeout(foldersTimer.current);
    foldersTimer.current = window.setTimeout(() => setBusy(false), 180);
  }, []);

  const loadThumbs = useCallback(async (targetId: string, files: FileEntry[], thumbSize: number) => {
    if (!desktopMode) return;
    const paths = files.map((f) => f.path).filter(Boolean);
    if (!paths.length) return;
    try {
      // Tile size; main scales the OS request up (see thumbs handler).
      const results = await desktop().thumbs(paths, Math.round(thumbSize));
      const byPath = new Map(results.map((r) => [r.path, r]));
      setFolders((prev) => {
        const fol = prev[targetId];
        if (!fol) return prev;
        return {
          ...prev,
          [targetId]: {
            ...fol,
            files: fol.files.map((file) => {
              const t = byPath.get(file.path);
              return t?.dataUrl ? { ...file, src: t.dataUrl, tw: t.width, th: t.height } : file;
            })
          }
        };
      });
    } catch {
      /* thumbnails are best-effort */
    }
  }, [desktopMode]);

  const loadMeta = useCallback(
    async (targetId: string, files: FileEntry[]) => {
      if (!desktopMode) return;
      const CHUNK = 8;
      for (let i = 0; i < files.length; i += CHUNK) {
        const chunk = files.slice(i, i + CHUNK);
        const metas = await Promise.all(
          chunk.map((f) => desktop().imageMeta(f.path).catch(() => null))
        );
        const byPath = new Map<string, { width: number; height: number; format: string; orientation: number }>();
        chunk.forEach((f, index) => {
          const meta = metas[index];
          if (meta) byPath.set(f.path, meta);
        });
        if (byPath.size) {
          setFolders((prev) => {
            const fol = prev[targetId];
            if (!fol) return prev;
            return {
              ...prev,
              [targetId]: {
                ...fol,
                files: fol.files.map((file) => {
                  const meta = byPath.get(file.path);
                  return meta
                    ? { ...file, w: meta.width, h: meta.height, bpp: formatFor(file.ext).bpp, orientation: meta.orientation ?? 1 }
                    : file;
                })
              }
            };
          });
        }
      }
    },
    [desktopMode]
  );

  const ensureChildren = useCallback(
    async (id: string): Promise<void> => {
      if (!desktopMode) return;
      const current = foldersRef.current[id];
      if (!current || current.loaded) return;
      const requestId =
        id === MY_COMPUTER_ID ? MY_COMPUTER_ID : current.path || (current.kind === "computer" ? id : "");
      if (!requestId) return;
      try {
        const children = await desktop().listChildren(requestId);
        setFolders((prev) => {
          const next = { ...prev };
          const parent = next[id];
          if (!parent) return prev;
          for (const child of children) {
            const existing = next[child.id];
            next[child.id] = {
              ...(existing ?? nodeFolder(child, id)),
              ...nodeFolder(child, id),
              children: existing?.children ?? [],
              files: existing?.files ?? [],
              loaded: existing?.loaded
            };
          }
          next[id] = {
            ...parent,
            children: Array.from(new Set([...parent.children, ...children.map((c) => c.id)])),
            loaded: true
          };
          foldersRef.current = next;
          return next;
        });
      } catch {
        /* listing a drive can fail; the tree simply stays empty */
      }
    },
    [desktopMode]
  );

  const setSelectedFirst = useCallback((id: string | null) => {
    setSelectionState(id ? [id] : []);
    setFocusId(id);
  }, []);

  const loadFolder = useCallback(
    async (id: string, options: { selectFirst?: boolean } = {}): Promise<FileEntry[]> => {
      const target = foldersRef.current[id];
      if (!target) return [];
      const seq = ++loadSeq.current;
      setBusy(true);
      if (!desktopMode) {
        setBusySoon();
        if (options.selectFirst) {
          const first = foldersRef.current[id]?.files[0];
          setSelectedFirst(first?.id ?? null);
        }
        return foldersRef.current[id]?.files ?? [];
      }
      if (!target.path) {
        if (target.kind === "computer") void ensureChildren(id);
        setBusySoon();
        if (options.selectFirst) setSelectedFirst(null);
        return [];
      }
      try {
        const listing: ListDirResult = await desktop().listDir(target.path, settingsRef.current.showHidden);
        if (seq !== loadSeq.current) return [];
        const previous = new Map((foldersRef.current[id]?.files ?? []).map((f) => [f.id, f]));
        const files = listing.files.map((entry) => fileFromDirEntry(entry, id, previous.get(entry.path)));
        const childIds = listing.folders.map((f) => f.path);
        setFolders((prev) => {
          const next = { ...prev };
          for (const child of listing.folders) {
            const existing = next[child.path];
            next[child.path] = {
              ...(existing ?? {
                id: child.path,
                name: child.name,
                parent: id,
                kind: "folder" as FolderKind,
                children: [],
                files: [],
                path: child.path,
                icon: child.name.toLowerCase().includes("picture") ? ("pictures" as FolderIcon) : ("folder" as FolderIcon)
              }),
              name: child.name,
              parent: id,
              path: child.path
            };
          }
          next[id] = {
            ...next[id],
            children: childIds,
            files,
            loaded: true
          };
          foldersRef.current = next;
          return next;
        });
        if (options.selectFirst) {
          const first = files[0];
          setSelection(first ? [first.id] : [], first?.id ?? null);
        }
        void loadThumbs(id, files, settingsRef.current.thumbSize);
        void loadMeta(id, files);
        setBusySoon();
        return files;
      } catch (error) {
        if (seq === loadSeq.current) {
          msg("Folder", error instanceof Error ? error.message : String(error), "error");
        }
        setBusySoon();
        return [];
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [desktopMode, ensureChildren, loadMeta, loadThumbs, msg, setBusySoon, setSelectedFirst]
  );

  const goTo = useCallback(
    (id: string, record = true, selectId?: string) => {
      const f = foldersRef.current[id];
      if (!f) return;
      if (f.notReady) {
        const show = () =>
          msg(
            "ACDSee",
            `${f.drive ?? "A"}:\\ is not accessible.\n\nThe device is not ready.`,
            "error",
            ["Retry", "Cancel"],
            (b) => {
              if (b === "Retry") window.setTimeout(show, 150);
            }
          );
        show();
        return;
      }
      setNav((n) => {
        const next = record
          ? { folderId: id, hist: [...n.hist.slice(0, n.idx + 1), id], idx: n.idx + 1 }
          : { ...n, folderId: id };
        navRef.current = next;
        return next;
      });
      setSelectionState([]);
      setFocusId(null);
      setRenamingId(null);
      expandTo(id);
      if (desktopMode && f.path) {
        // Clear the old contents immediately, then fill from disk.
        setFolders((prev) => {
          if (!prev[id]) return prev;
          const next = { ...prev, [id]: { ...prev[id], files: [] } };
          foldersRef.current = next;
          return next;
        });
      }
      void loadFolder(id, { selectFirst: !selectId }).then((files) => {
        if (!selectId) return;
        const hit = files.find((f) => f.id === selectId);
        if (hit) setSelection([hit.id], hit.id);
      });
    },
    [desktopMode, expandTo, loadFolder, msg]
  );

  const goBack = useCallback(() => {
    const n = navRef.current;
    if (n.idx <= 0) return;
    const idx = n.idx - 1;
    const id = n.hist[idx];
    const next = { ...n, idx, folderId: id };
    navRef.current = next;
    setNav(next);
    setSelectionState([]);
    setFocusId(null);
    void loadFolder(id, { selectFirst: true });
  }, [loadFolder]);

  const goForward = useCallback(() => {
    const n = navRef.current;
    if (n.idx >= n.hist.length - 1) return;
    const idx = n.idx + 1;
    const id = n.hist[idx];
    const next = { ...n, idx, folderId: id };
    navRef.current = next;
    setNav(next);
    setSelectionState([]);
    setFocusId(null);
    void loadFolder(id, { selectFirst: true });
  }, [loadFolder]);

  const goUp = useCallback(() => {
    const p = foldersRef.current[navRef.current.folderId]?.parent;
    if (p) goTo(p);
  }, [goTo]);

  const toggleExpand = useCallback(
    (id: string) => {
      const isOpen = expandedRef.current.has(id);
      if (!isOpen) void ensureChildren(id);
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        expandedRef.current = next;
        return next;
      });
    },
    [ensureChildren]
  );

  const refresh = useCallback(() => {
    const id = navRef.current.folderId;
    if (!desktopMode) {
      setBusy(true);
      window.setTimeout(() => setBusy(false), 350);
      return;
    }
    const fol = foldersRef.current[id];
    if (fol) {
      setFolders((prev) => {
        const next = { ...prev, [id]: { ...prev[id], loaded: false } };
        foldersRef.current = next;
        return next;
      });
    }
    void loadFolder(id);
    if (fol?.parent) void ensureChildren(fol.parent);
  }, [desktopMode, ensureChildren, loadFolder]);

  useEffect(() => {
    expandTo(nav.folderId);
  }, [nav.folderId, expandTo]);

  // Re-request thumbnails at the new size.
  useEffect(() => {
    if (!desktopMode || !ready) return;
    const fol = foldersRef.current[folderId];
    if (!fol?.path || !fol.files.length) return;
    void loadThumbs(folderId, fol.files, settings.thumbSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.thumbSize]);

  // Re-list the current folder when hidden-file visibility changes.
  useEffect(() => {
    if (!desktopMode || !ready) return;
    const fol = foldersRef.current[folderId];
    if (fol?.path) void loadFolder(folderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.showHidden]);

  /* ---------------- boot ---------------- */
  useEffect(() => {
    let cancelled = false;

    const applySavedPrefs = (saved: PersistedState | null) => {
      if (!saved) return;
      const merged = mergeSettings(saved.settings);
      setSettingsState(merged);
      settingsRef.current = merged;
      if (saved.viewMode) setViewMode(saved.viewMode);
      if (saved.sort) setSort(saved.sort);
      if (saved.filter) setFilter(saved.filter);
      if (saved.layout) setLayoutState((l) => ({ ...l, ...saved.layout }));
    };

    async function boot() {
      const saved = await loadPersistedState();
      if (cancelled) return;
      applySavedPrefs(saved);

      if (!desktopMode) {
        const folders: Record<string, Folder> = { ...demoFolders };
        const start =
          saved?.location && folders[saved.location] ? saved.location : DEMO_START_FOLDER;
        const startNav = { folderId: start, ...restoreHistory(folders, saved, start) };
        setFolders(folders);
        foldersRef.current = folders;
        setNav(startNav);
        navRef.current = startNav;
        const keep = new Set<string>([DESKTOP_ID, "mycomputer", "c", "mydocs", "mypics", start, ...(saved?.expanded ?? [])]);
        setExpanded(new Set([...keep].filter((id) => !!folders[id])));
        const first = folders[start]?.files[0];
        setSelectionState(first ? [first.id] : []);
        setFocusId(first?.id ?? null);
        setReady(true);
        return;
      }
      try {
        const roots = await desktop().listRoots();
        if (cancelled) return;
        const shell = initialShell();
        const top: string[] = [];
        for (const node of roots) {
          if (node.id === MY_COMPUTER_ID || node.icon === "computer") {
            shell[MY_COMPUTER_ID] = {
              ...shell[MY_COMPUTER_ID],
              name: node.name || "My Computer",
              path: node.path || "",
              icon: "computer"
            };
            top.push(MY_COMPUTER_ID);
            continue;
          }
          let id = node.id;
          if (node.icon === "pictures") id = MY_PICTURES_ID;
          else if (node.icon === "mydocs") id = MY_DOCUMENTS_ID;
          else if (/^desktop$/i.test(node.name)) id = DESKTOP_DIR_ID;
          shell[id] = nodeFolder({ ...node, id }, DESKTOP_ID);
          top.push(id);
        }
        shell[NETWORK_ID] = { ...shell[NETWORK_ID], parent: DESKTOP_ID };
        shell[RECYCLE_ID] = { ...shell[RECYCLE_ID], parent: DESKTOP_ID };
        shell[DESKTOP_ID] = {
          ...shell[DESKTOP_ID],
          children: Array.from(new Set([...top, NETWORK_ID, RECYCLE_ID]))
        };
        // Re-open the last folder when it still exists; deep paths get their
        // parent chain rebuilt so the tree and Up button keep working.
        const folders: Record<string, Folder> = { ...shell };
        const remembered = saved?.location
          ? folders[saved.location]
            ? saved.location
            : adoptPath(folders, saved.location)
          : null;
        const fallback =
          folders[MY_PICTURES_ID] ??
          Object.values(folders).find((f) => f.parent === DESKTOP_ID && f.path && f.kind === "folder") ??
          folders[MY_COMPUTER_ID];
        const startId = remembered ?? fallback.id;
        const startNav = { folderId: startId, ...restoreHistory(folders, saved, startId) };
        setFolders(folders);
        foldersRef.current = folders;
        setNav(startNav);
        navRef.current = startNav;
        const keep = new Set<string>([
          DESKTOP_ID,
          startId,
          ...ancestors(folders, startId),
          ...(saved?.expanded ?? [])
        ]);
        setExpanded(new Set([...keep].filter((id) => !!folders[id])));
        setReady(true);
        void ensureChildren(MY_COMPUTER_ID);
        await loadFolder(startId, { selectFirst: true });
      } catch (error) {
        if (cancelled) return;
        setReady(true);
        msg("Startup", error instanceof Error ? error.message : String(error), "error");
      }
    }
    void boot();
    return () => {
      cancelled = true;
      window.clearTimeout(foldersTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- remember app state ---------------- */
  const saveStateTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!ready) return;
    const offset = Math.max(0, nav.hist.length - 30);
    const payload: PersistedState = {
      version: STATE_VERSION,
      settings,
      location: folderId,
      history: nav.hist.slice(offset),
      historyIndex: clamp(nav.idx - offset, 0, nav.hist.length - offset - 1),
      expanded: [...expanded],
      viewMode,
      sort,
      filter,
      layout
    };
    window.clearTimeout(saveStateTimer.current);
    saveStateTimer.current = window.setTimeout(() => void savePersistedState(payload), 250);
    return () => window.clearTimeout(saveStateTimer.current);
  }, [ready, settings, folderId, nav.hist, nav.idx, viewMode, sort, filter, expanded, layout]);

  // Lazy EXIF for the focused image.
  /* ---------------- file operations ---------------- */
  const updateFile = useCallback(
    (id: string, patch: Partial<FileEntry> | ((f: FileEntry) => Partial<FileEntry>)) => {
      setFolders((prev) => {
        let changed = false;
        const next: Record<string, Folder> = { ...prev };
        for (const fid of Object.keys(prev)) {
          const idx = prev[fid].files.findIndex((f) => f.id === id);
          if (idx >= 0) {
            const f = prev[fid].files[idx];
            const p = typeof patch === "function" ? patch(f) : patch;
            const files = [...prev[fid].files];
            files[idx] = { ...f, ...p };
            next[fid] = { ...prev[fid], files };
            changed = true;
            break;
          }
        }
        if (changed) foldersRef.current = next;
        return changed ? next : prev;
      });
    },
    []
  );

  // Lazy EXIF for the focused image.
  useEffect(() => {
    if (!desktopMode || !focusId) return;
    const entry = fileMapRef.current.get(focusId)?.file;
    if (!entry?.path || exifDone.current.has(entry.id)) return;
    if (!["jpg", "jpeg", "tif", "tiff", "heic", "heif"].includes(entry.ext)) return;
    exifDone.current.add(entry.id);
    desktop()
      .exif(entry.path)
      .then((info) => {
        if (!info) return;
        const exif: ExifEntry = {
          make: info.make,
          model: info.model,
          exposure: info.exposureTime,
          aperture: info.fNumber,
          iso: info.iso,
          focal: info.focalLength,
          flash: info.flash
        };
        updateFile(entry.id, { exif });
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, desktopMode, updateFile]);


  const updateEdit = useCallback(
    (id: string, e: Partial<Edit>) => {
      updateFile(id, (f) => ({ edit: { ...f.edit, ...e }, modified: Date.now() }));
    },
    [updateFile]
  );

  const rotateFile = useCallback(
    (id: string, dir: 1 | -1) => {
      updateFile(id, (f) => {
        const rot = ((((f.edit.rot + dir * 90) % 360) + 360) % 360) as Edit["rot"];
        const swapped = f.edit.rot % 180 !== rot % 180;
        return {
          edit: { ...f.edit, rot },
          w: swapped ? f.h : f.w,
          h: swapped ? f.w : f.h,
          modified: Date.now()
        };
      });
    },
    [updateFile]
  );

  const flipFile = useCallback(
    (id: string, axis: "h" | "v") => {
      updateFile(id, (f) => ({
        edit:
          axis === "h"
            ? { ...f.edit, flipH: !f.edit.flipH }
            : { ...f.edit, flipV: !f.edit.flipV },
        modified: Date.now()
      }));
    },
    [updateFile]
  );

  const dropFiles = useCallback((ids: string[]) => {
    setFolders((prev) => {
      const next: Record<string, Folder> = {};
      for (const [fid, fol] of Object.entries(prev)) {
        next[fid] = { ...fol, files: fol.files.filter((f) => !ids.includes(f.id)) };
      }
      foldersRef.current = next;
      return next;
    });
  }, []);

  const deleteFilesNow = useCallback((ids: string[], permanent: boolean) => {
    setFolders((prev) => {
      const next: Record<string, Folder> = {};
      const recycled: FileEntry[] = [];
      for (const fid of Object.keys(prev)) {
        const fol = prev[fid];
        const rem = fol.files.filter((f) => ids.includes(f.id));
        if (rem.length) {
          next[fid] = { ...fol, files: fol.files.filter((f) => !ids.includes(f.id)) };
          if (!permanent && fid !== RECYCLE_ID)
            recycled.push(...rem.map((f) => ({ ...f, deletedFrom: fid, folderId: RECYCLE_ID })));
        } else next[fid] = fol;
      }
      if (recycled.length && next[RECYCLE_ID]) {
        next[RECYCLE_ID] = {
          ...next[RECYCLE_ID],
          files: [...next[RECYCLE_ID].files, ...recycled]
        };
      }
      foldersRef.current = next;
      return next;
    });
  }, []);

  const neighborAfterDelete = useCallback(
    (ids: string[]) => {
      const currentItems = items;
      const idxs = ids.map((id) => currentItems.indexOf(id)).filter((i) => i >= 0);
      if (!idxs.length) return null;
      const start = Math.min(...idxs);
      const rest = currentItems.filter((id) => !ids.includes(id));
      if (!rest.length) return null;
      const cand = currentItems.slice(start).find((id) => !ids.includes(id) && !(id in foldersRef.current));
      if (cand) return cand;
      const before = [...currentItems.slice(0, start)]
        .reverse()
        .find((id) => !ids.includes(id) && !(id in foldersRef.current));
      return before ?? null;
    },
    [items]
  );

  const performDelete = useCallback(
    (ids: string[], permanent: boolean) => {
      const nb = neighborAfterDelete(ids);
      const v = viewerRef.current;
      if (v.open && v.fileId && ids.includes(v.fileId)) {
        const list = v.list ?? visibleFiles.map((f) => f.id);
        const i = list.indexOf(v.fileId);
        const rest = list.filter((x) => !ids.includes(x));
        if (!rest.length)
          setViewer({ open: false, fileId: null, full: false, slideshow: false, list: null });
        else setViewer({ ...v, fileId: rest[Math.min(i, rest.length - 1)], list: v.list ? rest : null });
      }
      if (desktopMode) {
        const paths = ids
          .map((id) => fileMapRef.current.get(id)?.file.path)
          .filter((p): p is string => Boolean(p));
        if (!paths.length) return;
        desktop()
          .trash(paths)
          .then(() => {
            dropFiles(ids);
            setSelectionState(nb ? [nb] : []);
            setFocusId(nb);
            void loadFolder(navRef.current.folderId);
          })
          .catch((error) =>
            msg("Delete", error instanceof Error ? error.message : String(error), "error")
          );
        return;
      }
      deleteFilesNow(ids, permanent);
      setSelectionState(nb ? [nb] : []);
      setFocusId(nb);
    },
    [deleteFilesNow, dropFiles, loadFolder, msg, neighborAfterDelete, visibleFiles, desktopMode]
  );

  const requestDelete = useCallback(
    (ids: string[]) => {
      const fileIds = ids.filter((id) => fileMapRef.current.has(id));
      if (!fileIds.length) return;
      const inRecycle = fileIds.every(
        (id) => fileMapRef.current.get(id)?.folderId === RECYCLE_ID
      );
      // Desktop mode always delegates to the OS Trash (shell.trashItem).
      const permanent = !desktopMode && (inRecycle || !settingsRef.current.useRecycle);
      const first = fileMapRef.current.get(fileIds[0])!.file;
      const one = fileIds.length === 1;
      if (!settingsRef.current.confirmDelete) {
        performDelete(fileIds, permanent);
        return;
      }
      const trash = trashLabel();
      const text = permanent
        ? one
          ? `Are you sure you want to delete '${fullName(first)}'?`
          : `Are you sure you want to delete these ${fileIds.length} items?`
        : one
          ? `Are you sure you want to send '${fullName(first)}' to the ${trash}?`
          : `Are you sure you want to send these ${fileIds.length} items to the ${trash}?`;
      msg(
        one ? "Confirm File Delete" : "Confirm Multiple File Delete",
        text,
        "question",
        ["Yes", "No"],
        (b) => {
          if (b === "Yes") performDelete(fileIds, permanent);
        }
      );
    },
    [desktopMode, msg, performDelete]
  );

  const canWriteTo = useCallback((targetId: string) => {
    const f = foldersRef.current[targetId];
    if (!f) return false;
    if (["desktop", "computer", "network", "netpc", "floppy", "recycle"].includes(f.kind)) return false;
    if (desktopMode && !f.path) return false;
    return true;
  }, [desktopMode]);

  const transferFiles = useCallback(
    (ids: string[], targetId: string, copy: boolean) => {
      const fm = foldersRef.current;
      const target = fm[targetId];
      if (!target) return false;
      if (target.kind === "recycle" || targetId === RECYCLE_ID) {
        requestDelete(ids);
        return false;
      }
      if (!canWriteTo(targetId)) {
        msg(
          "Error Copying File or Folder",
          `Cannot ${copy ? "copy" : "move"} files: the destination is not a valid folder.`,
          "error"
        );
        return false;
      }
      if (ancestors(fm, targetId).some((a) => fm[a]?.kind === "cdrom") || fm[targetId].kind === "cdrom") {
        msg(
          "Error Copying File or Folder",
          `Cannot ${copy ? "copy" : "move"} files: the disk is write-protected.\n\nRemove the write-protection or use another disk.`,
          "error"
        );
        return false;
      }
      const fileIds = ids.filter((id) => fileMapRef.current.has(id));
      if (!fileIds.length) return false;
      if (!copy && fileIds.every((id) => fileMapRef.current.get(id)!.folderId === targetId)) return false;
      if (!copy) {
        const v = viewerRef.current;
        if (v.open && v.fileId && fileIds.includes(v.fileId)) closeViewer();
      }

      if (desktopMode) {
        const paths = fileIds
          .map((id) => fileMapRef.current.get(id)?.file.path)
          .filter((p): p is string => Boolean(p));
        if (!paths.length || !target.path) {
          msg(
            "Error Copying File or Folder",
            `Cannot ${copy ? "copy" : "move"} files: the destination is not a real folder.`,
            "error"
          );
          return false;
        }
        const action = copy ? desktop().copyTo(paths, target.path) : desktop().moveTo(paths, target.path);
        action
          .then(() => {
            if (!copy) {
              dropFiles(fileIds);
              setSelectionState([]);
              setFocusId(null);
            }
            void loadFolder(navRef.current.folderId);
          })
          .catch((error) =>
            msg(
              copy ? "Copy to Folder" : "Move to Folder",
              error instanceof Error ? error.message : String(error),
              "error"
            )
          );
        return true;
      }

      const nb = copy ? null : neighborAfterDelete(fileIds);
      setFolders((prev) => {
        const next = { ...prev };
        const moved: FileEntry[] = [];
        for (const fid of Object.keys(prev)) {
          const sel = prev[fid].files.filter((f) => fileIds.includes(f.id));
          if (sel.length) {
            moved.push(...sel);
            if (!copy) next[fid] = { ...next[fid], files: next[fid].files.filter((f) => !fileIds.includes(f.id)) };
          }
        }
        const files = [...next[targetId].files];
        for (const f of moved) {
          const name = uniqueName(files, f.name, f.ext);
          if (!copy) {
            files.push({ ...f, name, folderId: targetId, deletedFrom: undefined, accessed: Date.now() });
          } else {
            files.push({
              ...f,
              id: newFileId(),
              name,
              folderId: targetId,
              deletedFrom: undefined,
              accessed: Date.now()
            });
          }
        }
        next[targetId] = { ...next[targetId], files };
        foldersRef.current = next;
        return next;
      });
      if (!copy) {
        setSelectionState(nb ? [nb] : []);
        setFocusId(nb);
      }
      return true;
    },
    [
      canWriteTo,
      desktopMode,
      dropFiles,
      loadFolder,
      msg,
      neighborAfterDelete,
      requestDelete
    ]
  );

  const copyToClip = useCallback((ids: string[], mode: "copy" | "cut") => {
    const fileIds = ids.filter((id) => fileMapRef.current.has(id));
    if (fileIds.length) setClip({ ids: fileIds, mode });
  }, []);

  const paste = useCallback(() => {
    if (!clip) return;
    const ok = transferFiles(clip.ids, navRef.current.folderId, clip.mode === "copy");
    if (ok && clip.mode === "cut") setClip(null);
  }, [clip, transferFiles]);

  const renameFile = useCallback(
    (id: string, newFull: string): boolean => {
      const entry = fileMapRef.current.get(id);
      if (!entry) return false;
      const trimmed = newFull.trim();
      if (!trimmed) {
        msg("Rename", "You must type a filename.", "info");
        return false;
      }
      if (/[\\/:*?"<>|]/.test(trimmed)) {
        msg(
          "Rename",
          'A filename cannot contain any of the following characters:\n\n\\ / : * ? " < > |',
          "info"
        );
        return false;
      }
      let name = trimmed;
      let ext = entry.file.ext;
      const dot = trimmed.lastIndexOf(".");
      if (dot > 0) {
        const e = trimmed.slice(dot + 1).toLowerCase();
        const norm = e === "jpeg" || e === "jpe" ? "jpg" : e === "tiff" ? "tif" : e;
        if (FORMATS[norm]) {
          name = trimmed.slice(0, dot);
          ext = norm;
        }
      }
      const fol = foldersRef.current[entry.folderId];
      const clash =
        fol?.files.some(
          (f) => f.id !== id && f.name.toLowerCase() === name.toLowerCase() && f.ext === ext
        ) ?? false;
      if (clash) {
        msg(
          "Error Renaming File or Folder",
          `Cannot rename ${fullName(entry.file)}: A file with the name you specified already exists. Specify a different filename.`,
          "error"
        );
        return false;
      }

      if (desktopMode && entry.file.path) {
        const newName = `${name}.${ext}`;
        const oldId = entry.file.id;
        desktop()
          .rename(entry.file.path, newName)
          .then((newPath) => {
            setFolders((prev) => {
              const next: Record<string, Folder> = {};
              for (const [fid, f] of Object.entries(prev)) {
                next[fid] = {
                  ...f,
                  files: f.files.map((file) =>
                    file.id === oldId
                      ? {
                          ...file,
                          id: newPath,
                          path: newPath,
                          name,
                          ext,
                          fullSrc: localFileUrl(newPath),
                          folderId: fid,
                          modified: Date.now()
                        }
                      : file
                  )
                };
              }
              foldersRef.current = next;
              return next;
            });
            setSelectionState((sel) => sel.map((s) => (s === oldId ? newPath : s)));
            setFocusId((f) => (f === oldId ? newPath : f));
            setViewer((v) => ({
              ...v,
              fileId: v.fileId === oldId ? newPath : v.fileId,
              list: v.list ? v.list.map((x) => (x === oldId ? newPath : x)) : null
            }));
            exifDone.current.delete(oldId);
            void loadFolder(navRef.current.folderId);
          })
          .catch((error) =>
            msg("Rename", error instanceof Error ? error.message : String(error), "error")
          );
        return true;
      }

      updateFile(id, { name, ext });
      return true;
    },
    [desktopMode, loadFolder, msg, updateFile]
  );

  const createFolder = useCallback(
    async (parentId: string, name: string): Promise<string | null> => {
      const clean = name.trim();
      if (!clean) return null;
      if (/[\\/:*?"<>|]/.test(clean)) {
        msg(
          "New Folder",
          'A folder name cannot contain any of the following characters:\n\n\\ / : * ? " < > |',
          "info"
        );
        return null;
      }
      const parent = foldersRef.current[parentId];
      if (!parent) return null;
      const clash = parent.children.some(
        (c) => foldersRef.current[c]?.name.toLowerCase() === clean.toLowerCase()
      );
      if (clash) {
        msg(
          "Error Creating Folder",
          `Cannot create folder ${clean}: A folder with the name you specified already exists. Specify a different filename.`,
          "error"
        );
        return null;
      }

      if (desktopMode) {
        if (!parent.path) return null;
        try {
          const newPath = await desktop().createFolder(parent.path, clean);
          const newFolder: Folder = {
            id: newPath,
            name: clean,
            parent: parentId,
            kind: "folder",
            children: [],
            files: [],
            path: newPath,
            icon: "folder",
            loaded: true
          };
          setFolders((prev) => {
            const next = {
              ...prev,
              [newPath]: newFolder,
              [parentId]: { ...prev[parentId], children: [...prev[parentId].children, newPath] }
            };
            foldersRef.current = next;
            return next;
          });
          setExpanded((e) => {
            const n = new Set(e).add(parentId);
            expandedRef.current = n;
            return n;
          });
          return newPath;
        } catch (error) {
          msg("New Folder", error instanceof Error ? error.message : String(error), "error");
          return null;
        }
      }

      const id = `dir${Object.keys(foldersRef.current).length}_${Math.floor(Math.random() * 1e6)}`;
      setFolders((prev) => {
        const next = {
          ...prev,
          [id]: {
            id,
            name: clean,
            parent: parentId,
            kind: "folder" as FolderKind,
            children: [],
            files: [],
            path: ""
          },
          [parentId]: { ...prev[parentId], children: [...prev[parentId].children, id] }
        };
        foldersRef.current = next;
        return next;
      });
      setExpanded((e) => {
        const n = new Set(e).add(parentId);
        expandedRef.current = n;
        return n;
      });
      return id;
    },
    [desktopMode, msg]
  );

  const emptyRecycle = useCallback(() => {
    msg(
      "Confirm Multiple File Delete",
      "Are you sure you want to delete all the items in the Recycle Bin?",
      "question",
      ["Yes", "No"],
      (b) => {
        if (b !== "Yes") return;
        if (desktopMode) {
          msg(
            "Recycle Bin",
            "The system Trash is managed by your operating system. Open it from the desktop to empty it.",
            "info"
          );
          return;
        }
        setFolders((p) => ({ ...p, [RECYCLE_ID]: { ...p[RECYCLE_ID], files: [] } }));
        setSelectionState([]);
        setFocusId(null);
      }
    );
  }, [desktopMode, msg]);

  const restoreFiles = useCallback(
    (ids: string[]) => {
      if (desktopMode) {
        msg(
          "Recycle Bin",
          "Restore is handled by the operating system's Trash. Use Open Trash in the Recycle Bin view.",
          "info"
        );
        return;
      }
      setFolders((prev) => {
        const next = { ...prev };
        const rec = prev[RECYCLE_ID];
        for (const f of rec.files.filter((x) => ids.includes(x.id))) {
          const dest = f.deletedFrom && next[f.deletedFrom] ? f.deletedFrom : "mypics";
          const files = [...next[dest].files];
          files.push({ ...f, name: uniqueName(files, f.name, f.ext), deletedFrom: undefined, folderId: dest });
          next[dest] = { ...next[dest], files };
        }
        next[RECYCLE_ID] = { ...rec, files: rec.files.filter((x) => !ids.includes(x.id)) };
        foldersRef.current = next;
        return next;
      });
      setSelectionState([]);
    },
    [desktopMode, msg]
  );

  const addGeneratedFiles = useCallback((targetId: string, files: FileEntry[]) => {
    setFolders((prev) => {
      if (!prev[targetId]) return prev;
      const next = {
        ...prev,
        [targetId]: { ...prev[targetId], files: [...prev[targetId].files, ...files] }
      };
      foldersRef.current = next;
      return next;
    });
  }, []);

  /* ---------------- viewer ---------------- */
  const openViewer = useCallback((id: string, list: string[] | null = null) => {
    setViewer({ open: true, fileId: id, full: false, slideshow: false, list });
    setSelectionState([id]);
    setFocusId(id);
  }, []);
  const closeViewer = useCallback(
    () => setViewer({ open: false, fileId: null, full: false, slideshow: false, list: null }),
    []
  );
  const patchViewer = useCallback((p: Partial<ViewerState>) => setViewer((v) => ({ ...v, ...p })), []);

  const viewerList = useMemo(
    () => viewer.list ?? visibleFiles.map((f) => f.id),
    [viewer.list, visibleFiles]
  );

  const startSlideshow = useCallback(
    (ids?: string[]) => {
      const files = visibleFiles.map((f) => f.id);
      if (!files.length) {
        msg("ACDSee", "There are no images in this folder to display.", "info");
        return;
      }
      const sel = selection.filter((id) => files.includes(id));
      let list: string[];
      let first: string;
      if (ids && ids.length > 1) {
        list = ids;
        first = ids[0];
      } else if (sel.length > 1) {
        list = files.filter((f) => sel.includes(f));
        first = list[0];
      } else {
        list = files;
        first = sel[0] ?? files[0];
      }
      if (settingsRef.current.slideRandom) {
        list = [...list].sort(() => Math.random() - 0.5);
        first = list[0];
      }
      setViewer({
        open: true,
        fileId: first,
        full: true,
        slideshow: true,
        list,
        returnToViewer: viewerRef.current.open
      });
    },
    [visibleFiles, selection, msg]
  );

  /* ---------------- real-file helpers ---------------- */
  const openWith = useCallback(
    (id: string) => {
      const entry = fileMapRef.current.get(id)?.file;
      if (!entry?.path) {
        msg("Open With", "Choose a program to open this image. ACDSee is the default image viewer.", "info");
        return;
      }
      if (!desktopMode) return;
      desktop()
        .openPath(entry.path)
        .catch((error) => msg("Open With", error instanceof Error ? error.message : String(error), "error"));
    },
    [desktopMode, msg]
  );

  const showInFolder = useCallback(
    (id: string) => {
      const entry = fileMapRef.current.get(id)?.file;
      if (!entry?.path || !desktopMode) return;
      desktop().showInFolder(entry.path);
    },
    [desktopMode]
  );

  const openRecycleBin = useCallback(() => {
    if (!desktopMode) return;
    desktop()
      .openTrash()
      .catch((error) => msg("Recycle Bin", error instanceof Error ? error.message : String(error), "error"));
  }, [desktopMode, msg]);

  const applyWallpaper = useCallback(
    (id: string, mode: "center" | "tile" | "stretch") => {
      const entry = fileMapRef.current.get(id)?.file;
      if (!entry) return;
      const src = entry.fullSrc || entry.src;
      setWallpaper({ src, mode });
      if (desktopMode && entry.path) {
        desktop()
          .setWallpaper(entry.path)
          .then((result) =>
            msg(
              "ACDSee",
              result.ok
                ? `'${fullName(entry)}' is now your desktop wallpaper (${mode === "center" ? "Center" : mode === "tile" ? "Tile" : "Stretch"}).`
                : result.message,
              result.ok ? "info" : "error"
            )
          )
          .catch((error) => msg("Set Wallpaper", error instanceof Error ? error.message : String(error), "error"));
        return;
      }
      msg(
        "ACDSee",
        `'${fullName(entry)}' is now your desktop wallpaper (${mode === "center" ? "Center" : mode === "tile" ? "Tile" : "Stretch"}).\n\nMinimize ACDSee to see your new desktop.`,
        "info"
      );
    },
    [desktopMode, msg]
  );

  const convertFiles = useCallback(
    async (
      ids: string[],
      format: string,
      quality: number,
      targetId: string,
      removeOrig: boolean
    ): Promise<number> => {
      const targets = ids
        .map((id) => fileMapRef.current.get(id)?.file)
        .filter((f): f is FileEntry => Boolean(f));
      if (!targets.length) return 0;
      const target = foldersRef.current[targetId] ?? foldersRef.current[navRef.current.folderId];
      const { ext } = formatInfo(format);

      if (desktopMode) {
        const targetPath = target?.path;
        if (!targetPath) {
          msg("Convert", "Choose a real destination folder.", "error");
          return 0;
        }
        let done = 0;
        for (const photo of targets) {
          try {
            const { dataUrl } = await convertImage(photo.fullSrc, format, quality);
            await desktop().saveDataUrl(targetPath, `${photo.name}.${ext}`, dataUrl);
            done += 1;
          } catch (error) {
            msg(
              `Convert — ${fullName(photo)}`,
              error instanceof Error ? error.message : String(error),
              "error"
            );
          }
        }
        if (removeOrig) {
          const paths = targets.map((f) => f.path).filter(Boolean);
          if (paths.length) await desktop().trash(paths).catch(() => undefined);
          const v = viewerRef.current;
          if (v.open && v.fileId && targets.some((f) => f.id === v.fileId)) closeViewer();
        }
        await loadFolder(navRef.current.folderId);
        if (targetId !== navRef.current.folderId && target) await loadFolder(targetId);
        return done;
      }

      const fmt = formatFor(ext);
      const made: FileEntry[] = targets.map((f) => ({
        ...f,
        id: newFileId(),
        name: uniqueName(target?.files ?? [], f.name, ext),
        ext,
        bpp: fmt.bpp,
        size: Math.max(512, Math.round(f.size * 0.8)),
        modified: Date.now(),
        created: Date.now(),
        deletedFrom: undefined
      }));
      if (removeOrig) performDelete(ids, false);
      addGeneratedFiles(targetId, made);
      return made.length;
    },
    [addGeneratedFiles, desktopMode, loadFolder, msg, performDelete]
  );

  const resizeImageFile = useCallback(
    async (id: string, width: number, height: number): Promise<boolean> => {
      const entry = fileMapRef.current.get(id)?.file;
      if (!entry) return false;
      if (desktopMode) {
        const folderId = fileMapRef.current.get(id)?.folderId ?? navRef.current.folderId;
        const fol = foldersRef.current[folderId];
        if (!entry.path || !fol?.path) {
          msg("Resize", "Choose a real image in a real folder.", "error");
          return false;
        }
        try {
          const dataUrl = await resizeImage(
            entry.fullSrc,
            width,
            height,
            mimeForFileName(`${entry.name}.${entry.ext}`)
          );
          await desktop().saveDataUrl(
            fol.path,
            `${entry.name} (Resized).${entry.ext}`,
            dataUrl
          );
          await loadFolder(folderId);
          return true;
        } catch (error) {
          msg("Resize", error instanceof Error ? error.message : String(error), "error");
          return false;
        }
      }
      updateFile(id, { w: width, h: height, orientation: 1, modified: Date.now() });
      return true;
    },
    [desktopMode, loadFolder, msg, updateFile]
  );

  const batchRenameFiles = useCallback(
    async (ids: string[], template: string, start: number, lower: boolean): Promise<number> => {
      const files = ids
        .map((id) => fileMapRef.current.get(id)?.file)
        .filter((f): f is FileEntry => Boolean(f));
      if (!files.length) return 0;
      const preview = files.map((_f, i) => {
        const num = start + i;
        let nm = template.replace(/#+/g, (m) => String(num).padStart(m.length, "0"));
        if (lower) nm = nm.toLowerCase();
        return nm;
      });
      if (desktopMode) {
        let done = 0;
        for (let i = 0; i < files.length; i += 1) {
          const file = files[i];
          if (!file.path) continue;
          try {
            await desktop().rename(file.path, `${preview[i]}.${file.ext}`);
            done += 1;
          } catch (error) {
            msg(
              "Batch Rename",
              `"${fullName(file)}": ${error instanceof Error ? error.message : String(error)}`,
              "error"
            );
            break;
          }
        }
        const folderId = fileMapRef.current.get(files[0].id)?.folderId ?? navRef.current.folderId;
        await loadFolder(folderId);
        return done;
      }
      let done = 0;
      for (let i = 0; i < files.length; i += 1) {
        if (renameFile(files[i].id, `${preview[i]}.${files[i].ext}`)) done += 1;
      }
      return done;
    },
    [desktopMode, loadFolder, msg, renameFile]
  );

  const generateFileList = useCallback(
    (ids?: string[]) => {
      const target = ids?.length
        ? visibleFiles.filter((f) => ids.includes(f.id))
        : selectedFiles.length
          ? selectedFiles
          : visibleFiles;
      if (!target.length) {
        msg("ACDSee", "There are no files to list.", "info");
        return;
      }
      const text = target
        .map((p) => `${fullName(p)}\t${p.w}x${p.h}\t${p.size}\t${pathOf(foldersRef.current, p.folderId)}`)
        .join("\n");
      openDialog({ type: "filelist", text });
    },
    [msg, openDialog, selectedFiles, visibleFiles]
  );

  /* ---------------- misc ---------------- */
  const pathText = pathOf(folders, folderId);
  const platform = desktopMode ? platformName() : "Web demo";

  return {
    desktopMode,
    platform,
    ready,
    folders,
    folder,
    folderId,
    pathText,
    settings,
    setSettings,
    layout,
    setLayout,
    nav,
    canBack: nav.idx > 0,
    canForward: nav.idx < nav.hist.length - 1,
    goTo,
    goBack,
    goForward,
    goUp,
    refresh,
    expanded,
    toggleExpand,
    expandTo,
    selection,
    setSelection,
    focusId,
    setFocusId,
    viewMode,
    setViewMode,
    sort,
    setSort,
    filter,
    setFilter,
    clip,
    renamingId,
    setRenamingId,
    busy,
    wallpaper,
    setWallpaper,
    visibleFiles,
    subfolders,
    items,
    selectedFiles,
    getFile,
    fileMap,
    dialogs,
    openDialog,
    closeDialog,
    msg,
    updateFile,
    updateEdit,
    rotateFile,
    flipFile,
    requestDelete,
    performDelete,
    transferFiles,
    copyToClip,
    paste,
    renameFile,
    createFolder,
    emptyRecycle,
    restoreFiles,
    addGeneratedFiles,
    viewer,
    openViewer,
    closeViewer,
    patchViewer,
    viewerList,
    startSlideshow,
    canWriteTo,
    // real-file helpers
    quick,
    openWith,
    showInFolder,
    openRecycleBin,
    applyWallpaper,
    convertFiles,
    resizeImageFile,
    batchRenameFiles,
    generateFileList
  };
}

export type AppStore = ReturnType<typeof useStoreImpl>;

const Ctx = createContext<AppStore | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const store = useStoreImpl();
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useApp(): AppStore {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
}
