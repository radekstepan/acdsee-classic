import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent as RMouseEvent, type ReactNode } from "react";
import { AppProvider, useApp } from "./store";
import { ShellCtx, type Shell } from "./shell";
import { useCommands } from "./commands";
import { Browser } from "./components/Browser";
import { Viewer } from "./components/Viewer";
import { DialogHost } from "./components/dialogs/DialogHost";
import { Splash } from "./components/Splash";
import { Taskbar, type TaskItem } from "./components/Taskbar";
import { Icon } from "./components/Icons";
import { Button, Dialog, DialogButtons, Radio, TitleButtons, TooltipLayer } from "./components/ui";
import { cn } from "./utils/cn";
import { findFolderByPath, fullName } from "./utils/util";
import { desktop } from "./lib/bridge";
import type { MenuItem } from "./types";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface WinState {
  min: boolean;
  max: boolean;
  rect: Rect;
}

function initialRect(offset = 0): Rect {
  const w = Math.max(640, Math.round(window.innerWidth * 0.84));
  const h = Math.max(420, Math.round((window.innerHeight - 28) * 0.84));
  return {
    x: Math.round((window.innerWidth - w) / 2) + offset,
    y: Math.round((window.innerHeight - 28 - h) / 2) + offset,
    w,
    h
  };
}

/* ------------------------------------------------------------------ */
/* Window frame                                                         */
/* ------------------------------------------------------------------ */
function AppWindow({
  title,
  icon,
  active,
  state,
  setState,
  z,
  onFocus,
  onClose,
  children
}: {
  title: string;
  icon: string;
  active: boolean;
  state: WinState;
  setState: (fn: (s: WinState) => WinState) => void;
  z: number;
  onFocus: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const { rect, max, min } = state;

  const startDrag = (e: RMouseEvent) => {
    if (max || e.button !== 0) return;
    const sx = e.clientX;
    const sy = e.clientY;
    const r0 = rect;
    const move = (ev: MouseEvent) =>
      setState((s) => ({
        ...s,
        rect: {
          ...s.rect,
          x: r0.x + ev.clientX - sx,
          y: Math.max(-4, Math.min(window.innerHeight - 60, r0.y + ev.clientY - sy))
        }
      }));
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const startResize = (dir: string) => (e: RMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX;
    const sy = e.clientY;
    const r0 = rect;
    const minW = 560;
    const minH = 360;
    const move = (ev: MouseEvent) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      let { x, y, w, h } = r0;
      if (dir.includes("e")) w = Math.max(minW, r0.w + dx);
      if (dir.includes("s")) h = Math.max(minH, r0.h + dy);
      if (dir.includes("w")) {
        w = Math.max(minW, r0.w - dx);
        x = r0.x + (r0.w - w);
      }
      if (dir.includes("n")) {
        h = Math.max(minH, r0.h - dy);
        y = r0.y + (r0.h - h);
      }
      setState((s) => ({ ...s, rect: { x, y, w, h } }));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const style: CSSProperties = max
    ? { left: 0, top: 0, right: 0, bottom: 0 }
    : { left: rect.x, top: rect.y, width: rect.w, height: rect.h };
  const handles: [string, CSSProperties, string][] = [
    ["n", { top: 0, left: 6, right: 6, height: 4 }, "ns-resize"],
    ["s", { bottom: 0, left: 6, right: 6, height: 4 }, "ns-resize"],
    ["w", { left: 0, top: 6, bottom: 6, width: 4 }, "ew-resize"],
    ["e", { right: 0, top: 6, bottom: 6, width: 4 }, "ew-resize"],
    ["nw", { left: 0, top: 0, width: 8, height: 8 }, "nwse-resize"],
    ["ne", { right: 0, top: 0, width: 8, height: 8 }, "nesw-resize"],
    ["sw", { left: 0, bottom: 0, width: 8, height: 8 }, "nesw-resize"],
    ["se", { right: 0, bottom: 0, width: 12, height: 12 }, "nwse-resize"]
  ];

  return (
    <div
      className={cn("window98 absolute flex-col", max && "max", min ? "hidden" : "flex")}
      style={{ ...style, zIndex: z, boxShadow: max ? "none" : undefined }}
      onMouseDownCapture={onFocus}
    >
      <div
        className={cn("title-bar", !active && "inactive")}
        onMouseDown={startDrag}
        onDoubleClick={() => setState((s) => ({ ...s, max: !s.max }))}
      >
        <div className="title-bar-text">
          <Icon name={icon} size={14} />
          <span className="truncate">{title}</span>
        </div>
        <TitleButtons
          maximized={max}
          onMin={() => setState((s) => ({ ...s, min: true }))}
          onMax={() => setState((s) => ({ ...s, max: !s.max }))}
          onClose={onClose}
        />
      </div>
      <div className="flex flex-col flex-1 min-h-0 relative" style={{ background: "var(--face)" }}>
        {children}
      </div>
      {!max &&
        handles.map(([d, st, cur]) => (
          <div
            key={d}
            className="absolute"
            style={{ ...st, cursor: cur, zIndex: 20 }}
            onMouseDown={startResize(d)}
          />
        ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Desktop icons                                                        */
/* ------------------------------------------------------------------ */
function DesktopIcon({
  icon,
  label,
  selected,
  onSelect,
  onOpen
}: {
  icon: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center w-[78px] py-1 cursor-default"
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={onOpen}
    >
      <div className="relative">
        <Icon name={icon} size={32} />
        {selected && (
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,128,.5)", mixBlendMode: "multiply" }}
          />
        )}
      </div>
      <span
        className="mt-1 px-0.5 text-center leading-[13px]"
        style={{
          color: "#fff",
          background: selected ? "#000080" : "transparent",
          border: selected ? "1px dotted #ffff80" : "1px solid transparent",
          textShadow: selected ? "none" : "1px 1px 0 #000"
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Root                                                                 */
/* ------------------------------------------------------------------ */
function Root({ onRestart }: { onRestart: () => void }) {
  const app = useApp();
  const [splashDone, setSplashDone] = useState(false);
  const [appOpen, setAppOpen] = useState(true);
  const [bw, setBw] = useState<WinState>(() => ({ min: false, max: true, rect: initialRect(0) }));
  const [vw, setVw] = useState<WinState>(() => ({ min: false, max: true, rect: initialRect(24) }));
  const [active, setActive] = useState<"browser" | "viewer">("browser");
  const [deskSel, setDeskSel] = useState<string | null>(null);
  const [shutdown, setShutdown] = useState<null | "dialog" | "off" | "restarting">(null);
  const booting = !splashDone || !app.ready;

  const viewerOpen = app.viewer.open && appOpen;
  const prevViewerOpen = useRef(false);
  useEffect(() => {
    if (viewerOpen && !prevViewerOpen.current) {
      setVw((s) => ({ ...s, min: false }));
      setActive("viewer");
    }
    if (!viewerOpen && prevViewerOpen.current) setActive("browser");
    prevViewerOpen.current = viewerOpen;
  }, [viewerOpen]);

  const launch = useCallback(
    (folder?: string) => {
      setAppOpen(true);
      setBw((s) => ({ ...s, min: false }));
      setActive("browser");
      if (folder) app.goTo(folder);
    },
    [app]
  );

  const closeApp = useCallback(() => {
    app.closeViewer();
    if (app.desktopMode) {
      desktop().window.close();
      return;
    }
    setAppOpen(false);
  }, [app]);

  useEffect(() => {
    if (!appOpen && !app.viewer.open) return;
    // The store can close the viewer on its own (delete/slide-show end).
    if (!app.viewer.open && viewerOpen) setActive("browser");
  }, [appOpen, app.viewer.open, viewerOpen]);

  const shell: Shell = {
    closeApp,
    minimizeApp: () => {
      setBw((s) => ({ ...s, min: true }));
      setVw((s) => ({ ...s, min: true }));
    },
    shutdown: () => setShutdown("dialog"),
    runCommand: (raw) => {
      const cmd = raw.trim();
      if (!cmd) return null;
      const low = cmd.toLowerCase().replace(/"/g, "");
      if (/^(acdsee(32)?|acdsee32\.exe|acdsee\.exe)$/.test(low)) {
        launch();
        return null;
      }
      if (/^(explorer|my computer|computer)$/.test(low)) {
        if (app.quick.computerId) launch(app.quick.computerId);
        return null;
      }
      const id = findFolderByPath(app.folders, cmd) ?? Object.values(app.folders).find((f) => f.name.toLowerCase() === low)?.id;
      if (id) {
        launch(id);
        return null;
      }
      return `Cannot find the file '${cmd}' (or one of its components). Make sure the path and filename are correct and that all required libraries are available.`;
    }
  };

  /* ---- wallpaper ---- */
  const wp = app.wallpaper;
  const desktopStyle: CSSProperties = {
    background: wp ? `#008080 url(${wp.src})` : "#008080",
    backgroundRepeat: wp?.mode === "tile" ? "repeat" : "no-repeat",
    backgroundPosition: "center",
    backgroundSize: wp?.mode === "stretch" ? "100% 100%" : "auto"
  };

  const picturesId = app.quick.picturesId;
  const documentsId = app.quick.documentsId;
  const computerId = app.quick.computerId;
  const networkId = app.quick.networkId;
  const recycleId = app.quick.recycleId;
  const recycleCount = recycleId ? app.folders[recycleId]?.files.length ?? 0 : 0;

  /* ---- taskbar ---- */
  const tasks: TaskItem[] = [];
  if (appOpen) {
    tasks.push({
      id: "browser",
      title: `ACDSee - ${app.pathText}`,
      icon: "appIcon",
      active: !bw.min && (active === "browser" || !viewerOpen),
      onClick: () => {
        if (!bw.min && active === "browser") setBw((s) => ({ ...s, min: true }));
        else {
          setBw((s) => ({ ...s, min: false }));
          setActive("browser");
        }
      }
    });
    if (viewerOpen) {
      const f = app.getFile(app.viewer.fileId);
      tasks.push({
        id: "viewer",
        title: `ACDSee - [${f ? fullName(f) : "Viewer"}]`,
        icon: "appIcon",
        active: !vw.min && active === "viewer",
        onClick: () => {
          if (!vw.min && active === "viewer") setVw((s) => ({ ...s, min: true }));
          else {
            setVw((s) => ({ ...s, min: false }));
            setActive("viewer");
          }
        }
      });
    }
  }

  const docItems: MenuItem[] = [];
  if (picturesId)
    docItems.push({ label: "My Pictures", icon: "folder", onClick: () => launch(picturesId) });
  if (documentsId)
    docItems.push({ label: "My Documents", icon: "docs", onClick: () => launch(documentsId) });
  docItems.push({ separator: true });
  for (const fol of Object.values(app.folders)
    .filter((f) => f.kind === "folder" && f.parent === picturesId)
    .slice(0, 12)) {
    docItems.push({ label: fol.name, icon: "folder", onClick: () => launch(fol.id) });
  }

  const startItems: MenuItem[] = [
    {
      label: "&Programs",
      icon: "programs",
      submenu: [
        { label: "ACDSee 3.1", icon: "appIcon", onClick: () => launch() },
        { label: "ACDSee Help", icon: "help", onClick: () => app.msg("ACDSee Help", "The ACDSee help file could not be found.", "info") },
        { separator: true },
        ...(computerId
          ? [{ label: "Windows Explorer", icon: "computer", onClick: () => launch(computerId) } as MenuItem]
          : []),
        { label: "Accessories", icon: "folder", submenu: [
          { label: "Calculator", icon: "docs", onClick: () => app.msg("Calculator", "Calculator is not part of this build.", "info") },
          { label: "Paint", icon: "docs", onClick: () => app.msg("Paint", "Paint is not part of this build.", "info") }
        ] },
        { label: "Internet Explorer", icon: "globe", onClick: () => app.msg("Internet Explorer", "You are not connected to the Internet.", "warn") }
      ]
    },
    {
      label: "&Documents",
      icon: "docs",
      submenu: docItems
    },
    {
      label: "&Settings",
      icon: "settings",
      submenu: [
        { label: "Control Panel", icon: "settings", onClick: () => app.msg("Control Panel", "Control Panel is not part of this build.", "info") },
        { label: "Printers", icon: "print", onClick: () => app.msg("Printers", "Printers folder is not part of this build.", "info") },
        { separator: true },
        { label: "ACDSee Options...", icon: "settings", onClick: () => app.openDialog({ type: "options" }) }
      ]
    },
    {
      label: "&Find",
      icon: "find",
      submenu: [
        {
          label: "&Files or Folders...",
          icon: "find",
          onClick: () => {
            launch();
            window.setTimeout(() => app.openDialog({ type: "find" }), 30);
          }
        }
      ]
    },
    { label: "&Help", icon: "help", onClick: () => app.msg("Windows Help", "Windows Help is not part of this build.", "info") },
    { label: "&Run...", icon: "run", onClick: () => app.openDialog({ type: "run" }) },
    { separator: true },
    { label: "&Log Off Windows User...", icon: "exit", onClick: () => app.msg("Log Off Windows", "Are you sure you want to log off?\n\n(There is only one user on this computer.)", "question", ["Yes", "No"]) },
    { label: "Sh&ut Down...", icon: "shutdown", onClick: () => setShutdown("dialog") }
  ];

  const desktopIcons: [string, string, string, () => void][] = [];
  if (computerId) desktopIcons.push(["my", "computer", "My Computer", () => launch(computerId)]);
  if (networkId) desktopIcons.push(["net", "network", "Network Neighborhood", () => launch(networkId)]);
  if (recycleId) desktopIcons.push(["rec", recycleCount ? "recycleFull" : "recycle", "Recycle Bin", () => launch(recycleId)]);
  desktopIcons.push(["acd", "appIcon", "ACDSee 3.1", () => launch()]);
  if (picturesId) desktopIcons.push(["docs", "folder", "My Pictures", () => launch(picturesId)]);

  /* ---- shutdown flow ---- */
  useEffect(() => {
    if (shutdown !== "restarting") return;
    const t = window.setTimeout(onRestart, 1800);
    return () => window.clearTimeout(t);
  }, [shutdown, onRestart]);

  if (shutdown === "off") {
    return (
      <div
        className="fixed inset-0 bg-black flex items-center justify-center cursor-default"
        style={{ zIndex: 99999 }}
        onClick={() => setShutdown("restarting")}
        onKeyDown={() => setShutdown("restarting")}
        tabIndex={0}
        autoFocus
      >
        <div className="text-center" style={{ color: "#ffa600", fontFamily: "W98, Arial, sans-serif", fontSize: 22, lineHeight: "30px", letterSpacing: 1 }}>
          It's now safe to turn off
          <br />
          your computer.
          <div className="mt-10 text-[11px]" style={{ color: "#a06600" }}>
            (click anywhere to restart)
          </div>
        </div>
      </div>
    );
  }
  if (shutdown === "restarting") {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center" style={{ zIndex: 99999 }}>
        <div style={{ color: "#c0c0c0", fontFamily: "W98, Arial", fontSize: 12 }}>
          Windows is restarting<span className="anim-blink">_</span>
        </div>
      </div>
    );
  }

  return (
    <ShellCtx.Provider value={shell}>
      <div className="h-full w-full flex flex-col">
        {/* desktop */}
        <div className="desktop-area flex-1 min-h-0 relative overflow-hidden" style={desktopStyle} onMouseDown={() => setDeskSel(null)}>
          <div className="absolute left-2 top-2 flex flex-col gap-2">
            {desktopIcons.map(([id, icon, label, open]) => (
              <DesktopIcon key={id} icon={icon} label={label} selected={deskSel === id} onSelect={() => setDeskSel(id)} onOpen={open} />
            ))}
          </div>

          {appOpen && !booting && (
            <>
              <AppWindow
                title={`ACDSee - ${app.pathText}`}
                icon="appIcon"
                active={active === "browser" || !viewerOpen}
                state={bw}
                setState={(fn) => setBw(fn)}
                z={active === "browser" ? 120 : 100}
                onFocus={() => setActive("browser")}
                onClose={closeApp}
              >
                <Browser />
              </AppWindow>
              {viewerOpen && (
                <AppWindow
                  title={`ACDSee - [${app.getFile(app.viewer.fileId) ? fullName(app.getFile(app.viewer.fileId)!) : ""}]`}
                  icon="appIcon"
                  active={active === "viewer"}
                  state={vw}
                  setState={(fn) => setVw(fn)}
                  z={active === "viewer" ? 120 : 100}
                  onFocus={() => setActive("viewer")}
                  onClose={app.closeViewer}
                >
                  <Viewer />
                </AppWindow>
              )}
              <Workspace active={active} viewerOpen={viewerOpen} />
            </>
          )}
        </div>
        <Taskbar tasks={tasks} startItems={startItems} />
      </div>

      {booting && <Splash onDone={() => setSplashDone(true)} />}
      <DialogHost />
      {shutdown === "dialog" && (
        <ShutdownDialog
          onCancel={() => setShutdown(null)}
          onOk={(mode) => {
            if (app.desktopMode) {
              if (mode === "restart") window.location.reload();
              else desktop().window.close();
              return;
            }
            setShutdown(mode === "shutdown" ? "off" : "restarting");
          }}
        />
      )}
      <TooltipLayer />
    </ShellCtx.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Global keyboard shortcuts for the browser                            */
/* ------------------------------------------------------------------ */
function Workspace({ active, viewerOpen }: { active: "browser" | "viewer"; viewerOpen: boolean }) {
  const app = useApp();
  const cmd = useCommands();
  const ref = useRef({ app, cmd, active, viewerOpen });
  ref.current = { app, cmd, active, viewerOpen };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const { app, cmd, viewerOpen } = ref.current;
      if (app.dialogs.length || viewerOpen) return;
      const t = e.target as HTMLElement | null;
      if (t && typeof t.closest === "function" && t.closest("input,textarea,select")) return;
      const k = e.key;
      const ctrl = e.ctrlKey || e.metaKey;
      const lk = k.toLowerCase();
      let handled = true;
      if (k === "F5") cmd.refresh();
      else if (k === "F2") cmd.rename();
      else if (k === "F3") cmd.find();
      else if (k === "F6") cmd.moveTo();
      else if (k === "F7") cmd.copyTo();
      else if (k === "F1") cmd.help();
      else if (k === "Delete") cmd.del();
      else if (k === "Escape") app.setSelection([], null);
      else if (k === "Backspace") app.goUp();
      else if (k === "F11") {
        if (app.desktopMode) desktop().window.toggleMaximize();
      } else if (e.altKey && k === "Enter") cmd.props();
      else if (e.altKey && k === "ArrowLeft") app.goBack();
      else if (e.altKey && k === "ArrowRight") app.goForward();
      else if (e.altKey && k === "ArrowUp") app.goUp();
      else if (e.altKey && lk === "o") cmd.options(0);
      else if (ctrl && e.shiftKey && lk === "c") cmd.convert();
      else if (ctrl && e.shiftKey && lk === "r") cmd.batchRename();
      else if (ctrl && lk === "a") cmd.selectAll();
      else if (ctrl && lk === "i") cmd.invert();
      else if (ctrl && lk === "d") cmd.deselect();
      else if (ctrl && lk === "c") cmd.copy();
      else if (ctrl && lk === "x") cmd.cut();
      else if (ctrl && lk === "v") cmd.paste();
      else if (ctrl && lk === "n") cmd.newFolder();
      else if (ctrl && lk === "l") cmd.rotate(-1);
      else if (ctrl && lk === "r") cmd.rotate(1);
      else if (ctrl && lk === "s") cmd.slideshow();
      else if (ctrl && lk === "p") cmd.print();
      else if (ctrl && lk === "f") cmd.find();
      else if (ctrl && lk === "b") {
        app.setSettings({ showTree: true });
      } else handled = false;
      if (handled) e.preventDefault();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  return null;
}

/* ------------------------------------------------------------------ */
function ShutdownDialog({ onCancel, onOk }: { onCancel: () => void; onOk: (mode: "shutdown" | "restart") => void }) {
  const [mode, setMode] = useState<"shutdown" | "restart" | "dos">("shutdown");
  const ok = () => onOk(mode === "shutdown" ? "shutdown" : "restart");
  return (
    <Dialog title="Shut Down Windows" width={340} onClose={onCancel} onEnter={ok}>
      <div className="flex gap-4 p-2">
        <Icon name="computer" size={32} />
        <div className="flex flex-col gap-2">
          <div>What do you want the computer to do?</div>
          <Radio name="sd" label="&Shut down" checked={mode === "shutdown"} onChange={() => setMode("shutdown")} />
          <Radio name="sd" label="&Restart" checked={mode === "restart"} onChange={() => setMode("restart")} />
          <Radio name="sd" label="Restart in &MS-DOS mode" checked={mode === "dos"} onChange={() => setMode("dos")} />
        </div>
      </div>
      <DialogButtons className="justify-center">
        <Button def onClick={ok}>
          OK
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
        <Button disabled>Help</Button>
      </DialogButtons>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
export default function App() {
  const [session, setSession] = useState(0);
  return (
    <AppProvider key={session}>
      <Root key={session} onRestart={() => setSession((s) => s + 1)} />
    </AppProvider>
  );
}
