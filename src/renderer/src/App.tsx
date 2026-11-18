import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { AppProvider, useApp } from "./store";
import { ShellCtx, type Shell } from "./shell";
import { useCommands } from "./commands";
import { Browser } from "./components/Browser";
import { Viewer } from "./components/Viewer";
import { DialogHost } from "./components/dialogs/DialogHost";
import { Icon } from "./components/Icons";
import { TitleButtons, TooltipLayer } from "./components/ui";
import { fullName } from "./utils/util";
import { desktop } from "./lib/bridge";

/* ------------------------------------------------------------------ */
/* Window frame                                                         */
/* ------------------------------------------------------------------ */
function AppWindow({
  title,
  z,
  onClose,
  children
}: {
  title: string;
  z: number;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="window98 max absolute inset-0 flex flex-col" style={{ zIndex: z }}>
      <div className="title-bar">
        <div className="title-bar-text">
          <Icon name="appIcon" size={14} />
          <span className="truncate">{title}</span>
        </div>
        <TitleButtons onClose={onClose} />
      </div>
      <div className="flex flex-col flex-1 min-h-0 relative" style={{ background: "var(--face)" }}>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Root                                                                 */
/* ------------------------------------------------------------------ */
function Root() {
  const app = useApp();
  const viewerOpen = app.viewer.open;
  const viewerFile = viewerOpen ? app.getFile(app.viewer.fileId) : null;

  const closeApp = useCallback(() => {
    app.closeViewer();
    if (app.desktopMode) desktop().window.close();
    else app.msg("ACDSee", "You are running the web demo. Close the browser tab to exit.", "info");
  }, [app]);

  const shell: Shell = { closeApp };

  return (
    <ShellCtx.Provider value={shell}>
      <div className="h-full w-full relative overflow-hidden" style={{ background: "var(--face)" }}>
        {app.ready && (
          <>
            <AppWindow title={`ACDSee - ${app.pathText}`} z={100} onClose={closeApp}>
              <Browser />
            </AppWindow>
            {viewerOpen && (
              <AppWindow title={`ACDSee - [${viewerFile ? fullName(viewerFile) : ""}]`} z={120} onClose={app.closeViewer}>
                <Viewer />
              </AppWindow>
            )}
            <Workspace viewerOpen={viewerOpen} />
          </>
        )}
      </div>
      <DialogHost />
      <TooltipLayer />
    </ShellCtx.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Global keyboard shortcuts for the browser                            */
/* ------------------------------------------------------------------ */
function Workspace({ viewerOpen }: { viewerOpen: boolean }) {
  const app = useApp();
  const cmd = useCommands();
  const ref = useRef({ app, cmd, viewerOpen });
  ref.current = { app, cmd, viewerOpen };

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
export default function App() {
  return (
    <AppProvider>
      <Root />
    </AppProvider>
  );
}
