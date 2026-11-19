import type { Folder, Settings, SortKey, ViewMode } from "../types";
import { desktop, isDesktop } from "../lib/bridge";
import { defaultSettings } from "./fs";

/**
 * Remembered UI state.
 *
 * Desktop builds keep a JSON blob in `~/.acdsee/state.json` (written by the
 * main process); the web demo falls back to localStorage. Everything here is
 * cosmetic, so a missing or corrupt file simply falls back to the defaults.
 */
export const STATE_VERSION = 1;
const DEMO_STATE_KEY = "acdsee.state.v1";

export interface LayoutState {
  treeWidth: number;
  previewHeight: number;
}

export const defaultLayout: LayoutState = { treeWidth: 230, previewHeight: 190 };

export interface PersistedState {
  version: number;
  settings?: Partial<Settings>;
  /** Current folder id (absolute path or virtual `__` id). */
  location?: string | null;
  history?: string[];
  historyIndex?: number;
  expanded?: string[];
  viewMode?: ViewMode;
  sort?: { key: SortKey; dir: "asc" | "desc" };
  filter?: string;
  layout?: Partial<LayoutState>;
}

const VIEW_MODES: ViewMode[] = ["thumbs", "filmstrip", "icons", "list", "details"];
const SORT_KEYS: SortKey[] = ["name", "size", "type", "date", "dims"];

const SETTING_ENUMS: Partial<Record<keyof Settings, readonly string[]>> = {
  thumbBg: ["white", "gray", "black", "teal"],
  viewerBg: ["black", "gray", "teal", "white"],
  wheelMode: ["navigate", "zoom"],
  slideTransition: ["none", "fade", "slide", "wipe"]
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Merge a stored settings patch over the defaults, dropping unknown/invalid values. */
export function mergeSettings(raw: unknown): Settings {
  const out: Settings = { ...defaultSettings };
  if (isRecord(raw)) {
    for (const key of Object.keys(defaultSettings) as (keyof Settings)[]) {
      if (key === "formats") continue;
      const value = raw[key];
      if (value === undefined || typeof value !== typeof defaultSettings[key]) continue;
      const allowed = SETTING_ENUMS[key];
      if (allowed && typeof value === "string" && !allowed.includes(value)) continue;
      (out as unknown as Record<string, unknown>)[key] = value;
    }
    if (isRecord(raw.formats)) {
      out.formats = { ...defaultSettings.formats };
      for (const [ext, on] of Object.entries(raw.formats)) {
        if (typeof on === "boolean") out.formats[ext] = on;
      }
    }
  }
  out.thumbSize = clamp(Math.round(out.thumbSize), 48, 160);
  out.slideDelay = clamp(Math.round(out.slideDelay), 1, 60);
  out.uiScale =
    typeof out.uiScale === "number" && Number.isFinite(out.uiScale)
      ? clamp(Math.round(out.uiScale * 100) / 100, 0.75, 2)
      : 1;
  return out;
}

/** Validate a parsed state blob; returns null when the version is unknown. */
export function sanitizeState(raw: unknown): PersistedState | null {
  if (!isRecord(raw) || raw.version !== STATE_VERSION) return null;
  const state: PersistedState = { version: STATE_VERSION };
  if (isRecord(raw.settings)) state.settings = raw.settings as Partial<Settings>;
  if (typeof raw.location === "string" || raw.location === null) state.location = raw.location;
  if (Array.isArray(raw.history)) {
    state.history = raw.history.filter((id): id is string => typeof id === "string").slice(-30);
  }
  if (typeof raw.historyIndex === "number" && Number.isFinite(raw.historyIndex)) {
    state.historyIndex = Math.max(0, Math.round(raw.historyIndex));
  }
  if (Array.isArray(raw.expanded)) {
    state.expanded = raw.expanded.filter((id): id is string => typeof id === "string");
  }
  if (VIEW_MODES.includes(raw.viewMode as ViewMode)) state.viewMode = raw.viewMode as ViewMode;
  if (isRecord(raw.sort) && SORT_KEYS.includes(raw.sort.key as SortKey)) {
    const dir = raw.sort.dir === "desc" ? "desc" : raw.sort.dir === "asc" ? "asc" : null;
    if (dir) state.sort = { key: raw.sort.key as SortKey, dir };
  }
  if (typeof raw.filter === "string") state.filter = raw.filter;
  if (isRecord(raw.layout)) {
    const layout: Partial<LayoutState> = {};
    if (typeof raw.layout.treeWidth === "number" && Number.isFinite(raw.layout.treeWidth)) {
      layout.treeWidth = clamp(Math.round(raw.layout.treeWidth), 120, 520);
    }
    if (typeof raw.layout.previewHeight === "number" && Number.isFinite(raw.layout.previewHeight)) {
      layout.previewHeight = clamp(Math.round(raw.layout.previewHeight), 80, 500);
    }
    state.layout = layout;
  }
  return state;
}

export async function loadPersistedState(): Promise<PersistedState | null> {
  try {
    if (isDesktop()) {
      const api = desktop() as { loadState?: () => Promise<string | null> };
      if (typeof api.loadState !== "function") return null;
      const raw = await api.loadState();
      return raw ? sanitizeState(JSON.parse(raw)) : null;
    }
    const raw = window.localStorage.getItem(DEMO_STATE_KEY);
    return raw ? sanitizeState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export async function savePersistedState(state: PersistedState): Promise<void> {
  try {
    const json = JSON.stringify(state);
    if (isDesktop()) {
      const api = desktop() as { saveState?: (json: string) => Promise<void> };
      if (typeof api.saveState === "function") await api.saveState(json);
    } else {
      window.localStorage.setItem(DEMO_STATE_KEY, json);
    }
  } catch {
    /* Persistence is best-effort; never interrupt the UI for it. */
  }
}

/**
 * Rebuild the Back/Forward trail around the restored folder. Entries that no
 * longer resolve are dropped; if the current folder is missing, start fresh.
 */
export function restoreHistory(
  folders: Record<string, Folder>,
  saved: PersistedState | null,
  startId: string
): { hist: string[]; idx: number } {
  let hist = (saved?.history ?? []).filter((id) => !!folders[id]);
  let idx = Math.min(Math.max(saved?.historyIndex ?? -1, 0), hist.length - 1);
  if (hist[idx] !== startId) idx = hist.lastIndexOf(startId);
  if (idx < 0) return { hist: [startId], idx: 0 };
  if (hist.length > 30) {
    const drop = hist.length - 30;
    hist = hist.slice(drop);
    idx = Math.max(0, idx - drop);
  }
  return { hist, idx };
}

const isAbsolutePath = (p: string) => p.startsWith("/") || /^[A-Za-z]:[\\/]/.test(p) || p.startsWith("\\\\");
const trimSeparators = (p: string) => p.replace(/[\\/]+$/, "");
const splitPath = (p: string) => p.split(/[\\/]/).filter(Boolean);

/**
 * Make a remembered absolute folder path reachable in the tree, creating the
 * intermediate nodes when they have not been listed yet. Returns the folder id
 * or null when the path is unrelated to any known location.
 */
export function adoptPath(folders: Record<string, Folder>, target: string): string | null {
  if (!isAbsolutePath(target)) return null;
  const wanted = trimSeparators(target);
  const lower = wanted.toLowerCase();
  let base: Folder | null = null;
  for (const folder of Object.values(folders)) {
    if (!folder.path) continue;
    const known = trimSeparators(folder.path);
    if (known.toLowerCase() === lower) return folder.id;
    const prefix = `${known.toLowerCase()}/`;
    const prefixWin = `${known.toLowerCase()}\\`;
    if (
      (lower.startsWith(prefix) || lower.startsWith(prefixWin)) &&
      (!base || known.length > trimSeparators(base.path).length)
    ) {
      base = folder;
    }
  }
  if (!base) return null;

  const sep = wanted.includes("\\") && !wanted.startsWith("/") ? "\\" : "/";
  const rest = wanted.slice(trimSeparators(base.path).length);
  let parentId = base.id;
  let currentPath = trimSeparators(base.path);
  let current = base;
  for (const name of splitPath(rest)) {
    currentPath = `${currentPath}${sep}${name}`;
    const known = Object.values(folders).find(
      (f) => f.path && trimSeparators(f.path).toLowerCase() === currentPath.toLowerCase()
    );
    if (known) {
      parentId = known.id;
      current = known;
      continue;
    }
    const node: Folder = {
      id: currentPath,
      name,
      parent: parentId,
      kind: "folder",
      children: [],
      files: [],
      path: currentPath,
      icon: "folder"
    };
    folders[currentPath] = node;
    folders[parentId] = {
      ...folders[parentId],
      children: Array.from(new Set([...folders[parentId].children, currentPath]))
    };
    parentId = currentPath;
    current = node;
  }
  return current.id;
}
