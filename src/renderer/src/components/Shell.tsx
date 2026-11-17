import { useEffect, useRef, useState, type ReactNode } from "react";
import { BrandIcon, FolderGlyph, StartFlag } from "../icons";

export type WindowState = "normal" | "maximized" | "minimized" | "closed";

type Props = {
  children: ReactNode;
  wallpaper: string | null;
  windowState: WindowState;
  taskCaption: string;
  onRestore: () => void;
  onMinimize: () => void;
  onOpenFolder: (id: string) => void;
  onNotify: (message: string, title?: string) => void;
  onAbout: () => void;
  onFind: () => void;
  onShutdown: () => void;
  onOpenViewer: () => void;
  onToggleWallpaper: () => void;
};

export default function Shell({
  children,
  wallpaper,
  windowState,
  taskCaption,
  onRestore,
  onMinimize,
  onOpenFolder,
  onNotify,
  onAbout,
  onFind,
  onShutdown,
  onOpenViewer,
  onToggleWallpaper,
}: Props) {
  const [startOpen, setStartOpen] = useState(false);
  const [programsOpen, setProgramsOpen] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const startRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!startOpen) return;
    const close = (event: MouseEvent) => {
      if (!startRef.current?.contains(event.target as Node)) {
        setStartOpen(false);
        setProgramsOpen(false);
      }
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [startOpen]);

  const appVisible = windowState !== "minimized" && windowState !== "closed";
  const isMinimized = windowState === "minimized" || windowState === "closed";
  const startAction = (action: string) => {
    setStartOpen(false);
    setProgramsOpen(false);
    if (action === "acdsee") onRestore();
    else if (action === "pictures") {
      onRestore();
      onOpenFolder("my-pictures");
    } else if (action === "documents") {
      onRestore();
      onOpenFolder("my-documents");
    } else if (action === "computer") {
      onRestore();
      onOpenFolder("my-computer");
    } else if (action === "find") onFind();
    else if (action === "about") onAbout();
    else if (action === "wallpaper") onToggleWallpaper();
    else if (action === "shutdown") onShutdown();
    else if (action === "viewer") onOpenViewer();
    else if (action === "recycle") {
      onRestore();
      onOpenFolder("recycle-bin");
    } else onNotify("This is a demo of the ACDSee in Windows 98. Try ACDSee 3.1 from Programs.", "Windows");
  };

  return (
    <div className={`desktop ${wallpaper ? "has-wallpaper" : ""}`} style={wallpaper ? { backgroundImage: `url("${wallpaper}")` } : undefined}>
      <div className="desktop-watermark">ACDSee 3.1 · Demo Edition</div>

      <div className="desktop-icons">
        <DesktopIcon icon="computer" label="My Computer" onOpen={() => { onRestore(); onOpenFolder("my-computer"); }} />
        <DesktopIcon icon="mydocs" label="My Documents" onOpen={() => { onRestore(); onOpenFolder("my-documents"); }} />
        <DesktopIcon icon="pictures" label="My Pictures" onOpen={() => { onRestore(); onOpenFolder("my-pictures"); }} />
        <DesktopIcon icon="acdsee" label="ACDSee 3.1" onOpen={onRestore} />
        <DesktopIcon icon="recycle" label="Recycle Bin" onOpen={() => { onRestore(); onOpenFolder("recycle-bin"); }} />
        <DesktopIcon icon="network" label="My Network Places" onOpen={() => { onRestore(); onOpenFolder("my-network"); }} />
      </div>

      {isMinimized && (
        <div className="desktop-hint">
          <BrandIcon size={40} />
          <div>
            <strong>ACDSee 3.1</strong>
            <span>{windowState === "closed" ? "Double-click the ACDSee icon or the taskbar button to reopen the browser." : "Click the ACDSee taskbar button to restore the browser."}</span>
          </div>
        </div>
      )}

      <div className={`app-window ${windowState === "maximized" ? "is-maximized" : ""} ${appVisible ? "" : "is-hidden"}`}>{children}</div>

      <div className="taskbar" ref={startRef}>
        <button type="button" className={`start-button ${startOpen ? "pressed" : ""}`} onClick={() => setStartOpen((v) => !v)}>
          <StartFlag size={19} />
          <span className="start-label">Start</span>
        </button>
        <div className="taskbar-divider" />
        <div className="quick-launch">
          <button type="button" title="Show Desktop" onClick={onMinimize}>
            <span className="quick-desktop" />
          </button>
          <button type="button" title="Internet Explorer" onClick={() => startAction("internet")}>
            <span className="quick-ie">e</span>
          </button>
          <button type="button" title="ACDSee 3.1" onClick={onRestore}>
            <BrandIcon size={17} />
          </button>
          <span className="quick-grip" />
        </div>
        <div className="taskbar-divider" />
        <button type="button" className={`task-button ${appVisible ? "active" : ""}`} onClick={() => (appVisible ? onMinimize() : onRestore())} title="ACDSee 3.1">
          <BrandIcon size={17} />
          <span className="task-button-label">{taskCaption}</span>
        </button>
        <div className="taskbar-spacer" />
        <div className="tray" title={clock.toLocaleDateString()}>
          <button type="button" className="tray-icon" title="Volume" onClick={() => onNotify("Volume: 42% · SoundMAX Integrated Digital Audio", "Volume Control")}>
            <span className="speaker-glyph">◖</span>
            <span className="speaker-wave">)))</span>
          </button>
          <button type="button" className="tray-icon tray-acd" title="ACDSee thumbnail cache" onClick={() => onNotify("ACDSee thumbnail cache is up to date (2.4 MB).", "ACDSee Tray")}>
            <BrandIcon size={15} />
          </button>
          <div className="tray-clock">{clock.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
        </div>

        {startOpen && (
          <div className="start-menu" role="menu">
            <div className="start-rail">
              <span>Windows</span>
              <strong>98</strong>
            </div>
            <div className="start-items">
              <div
                className="start-item has-flyout"
                onMouseEnter={() => setProgramsOpen(true)}
                onMouseLeave={() => setProgramsOpen(false)}
              >
                <span className="start-item-icon">⌸</span>
                <span className="start-item-text">
                  <strong>Programs</strong>
                  <em>Accessories, ACD Systems...</em>
                </span>
                <span className="start-arrow">▶</span>
                {programsOpen && (
                  <div className="start-flyout">
                    <div className="flyout-section">ACD Systems</div>
                    <button type="button" className="start-item" onClick={() => startAction("acdsee")}>
                      <BrandIcon size={18} /> <span className="start-plain">ACDSee 3.1</span>
                    </button>
                    <button type="button" className="start-item" onClick={() => startAction("viewer")}>
                      <BrandIcon size={18} /> <span className="start-plain">ACDSee Viewer</span>
                    </button>
                    <div className="flyout-separator" />
                    <button type="button" className="start-item" onClick={() => startAction("internet")}>
                      <span className="quick-ie flyout-icon">e</span> <span className="start-plain">Internet Explorer</span>
                    </button>
                    <button type="button" className="start-item" onClick={() => startAction("notepad")}>
                      <span className="notepad-icon">▤</span> <span className="start-plain">Notepad</span>
                    </button>
                    <div className="flyout-separator" />
                    <button type="button" className="start-item" onClick={() => startAction("about")}>
                      <span className="start-item-icon">ⓘ</span> <span className="start-plain">About ACDSee</span>
                    </button>
                  </div>
                )}
              </div>
              <button type="button" className="start-item" onClick={() => startAction("pictures")}>
                <span className="start-item-icon">▣</span>
                <span className="start-item-text">
                  <strong>Favorites</strong>
                  <em>My Pictures, Wallpapers...</em>
                </span>
                <span className="start-arrow">▶</span>
              </button>
              <button type="button" className="start-item" onClick={() => startAction("documents")}>
                <span className="start-item-icon">▤</span>
                <span className="start-item-text">
                  <strong>Documents</strong>
                  <em>My Documents</em>
                </span>
                <span className="start-arrow">▶</span>
              </button>
              <button type="button" className="start-item" onClick={() => startAction("settings")}>
                <span className="start-item-icon">⚙</span>
                <span className="start-item-text">
                  <strong>Settings</strong>
                  <em>Control Panel, Printers</em>
                </span>
                <span className="start-arrow">▶</span>
              </button>
              <button type="button" className="start-item" onClick={() => startAction("find")}>
                <span className="start-item-icon">⌕</span>
                <span className="start-item-text">
                  <strong>Find</strong>
                  <em>Files or Folders...</em>
                </span>
              </button>
              <button type="button" className="start-item" onClick={() => startAction("about")}>
                <span className="start-item-icon">?</span>
                <span className="start-item-text">
                  <strong>Help</strong>
                  <em>ACDSee Help Topics</em>
                </span>
              </button>
              <button type="button" className="start-item" onClick={() => startAction("run")}>
                <span className="start-item-icon">▷</span>
                <span className="start-item-text">
                  <strong>Run...</strong>
                </span>
              </button>
              <div className="start-separator" />
              <button type="button" className="start-item" onClick={() => startAction("shutdown")}>
                <span className="start-item-icon">⏻</span>
                <span className="start-item-text">
                  <strong>Shut Down...</strong>
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DesktopIcon({ icon, label, onOpen }: { icon: string; label: string; onOpen: () => void }) {
  return (
    <button type="button" className="desktop-icon" onDoubleClick={onOpen} onClick={() => undefined} title={`Double-click to open ${label}`}>
      <span className="desktop-icon-art">
        {icon === "acdsee" ? (
          <BrandIcon size={42} />
        ) : icon === "computer" ? (
          <FolderGlyph icon="computer" size={42} />
        ) : icon === "recycle" ? (
          <span className="desktop-recycle">
            <FolderGlyph icon="recycle" size={42} />
          </span>
        ) : (
          <span className={`desktop-folder folder-${icon}`}>
            <FolderGlyph icon={icon} size={42} />
          </span>
        )}
      </span>
      <span className="desktop-icon-label">{label}</span>
    </button>
  );
}
