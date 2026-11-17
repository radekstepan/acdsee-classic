import { useEffect, useState } from "react";
import { folderPath, formatBytes, formatDate, imageTransform, type Photo } from "../data";
import { BrandIcon, FileTypeIcon, ToolIcon } from "../icons";
import MenuBar, { type MenuDef } from "./MenuBar";

type Props = {
  photos: Photo[];
  photoId: string;
  slideshow: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
  onToggleSlideshow: () => void;
  onRotate: (id: string, delta: number) => void;
  onFlip: (id: string) => void;
  onWallpaper: (photo: Photo) => void;
  notify: (message: string, title?: string) => void;
};

export default function Viewer({
  photos,
  photoId,
  slideshow,
  onSelect,
  onClose,
  onToggleSlideshow,
  onRotate,
  onFlip,
  onWallpaper,
  notify,
}: Props) {
  const [zoom, setZoom] = useState<"fit" | number>("fit");
  const [bg, setBg] = useState<"black" | "gray" | "white">("black");
  const [filmstrip, setFilmstrip] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(true);

  const index = Math.max(0, photos.findIndex((p) => p.id === photoId));
  const photo = photos[index];
  const total = photos.length;

  const next = () => {
    if (!total) return;
    onSelect(photos[(index + 1) % total].id);
  };
  const prev = () => {
    if (!total) return;
    onSelect(photos[(index - 1 + total) % total].id);
  };

  useEffect(() => {
    if (!slideshow) return;
    const timer = window.setInterval(() => {
      const current = photos.findIndex((p) => p.id === photoId);
      if (current >= 0 && current < photos.length - 1) onSelect(photos[current + 1].id);
      else if (photos.length) onSelect(photos[0].id);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [slideshow, photoId, photos, onSelect]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (fullscreen) setFullscreen(false);
        else onClose();
      }
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") prev();
      if (event.key === "+" || event.key === "=") setZoom((z) => (z === "fit" ? 100 : Math.min(400, z + 25)));
      if (event.key === "-") setZoom((z) => (z === "fit" ? 75 : Math.max(25, z - 25)));
      if (event.key === " ") {
        event.preventDefault();
        onToggleSlideshow();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!photo) return null;

  const menus: MenuDef[] = [
    {
      label: "File",
      width: 210,
      items: [
        { label: "Open...", shortcut: "Ctrl+O", action: "v-open" },
        { label: "Save As...", shortcut: "Ctrl+S", action: "v-save" },
        { separator: true },
        { label: "Print...", shortcut: "Ctrl+P", action: "v-print" },
        { label: "Copy to Folder...", action: "v-copy" },
        { separator: true },
        { label: "Close", shortcut: "Esc", action: "v-close" },
      ],
    },
    {
      label: "View",
      width: 232,
      items: [
        { label: "Zoom In", shortcut: "+", action: "v-zoom-in" },
        { label: "Zoom Out", shortcut: "−", action: "v-zoom-out" },
        { label: "Fit to Window", checked: zoom === "fit", action: "v-fit" },
        { label: "Actual Size", checked: zoom === 100, action: "v-actual" },
        { separator: true },
        {
          label: "Background",
          submenu: [
            { label: "Black", checked: bg === "black", action: "v-bg-black" },
            { label: "Gray", checked: bg === "gray", action: "v-bg-gray" },
            { label: "White", checked: bg === "white", action: "v-bg-white" },
          ],
        },
        { label: "Filmstrip", checked: filmstrip, action: "v-film" },
        { label: "Image Information", checked: showInfo, action: "v-info" },
        { separator: true },
        { label: "Full Screen", shortcut: "F", checked: fullscreen, action: "v-full" },
      ],
    },
    {
      label: "Tools",
      width: 230,
      items: [
        { label: "Slide Show", shortcut: "Space", checked: slideshow, action: "v-slideshow" },
        { label: "Rotate Left", action: "v-rotate-left" },
        { label: "Rotate Right", action: "v-rotate-right" },
        { separator: true },
        { label: "Set as Wallpaper", action: "v-wallpaper" },
        { label: "Options...", action: "v-options" },
      ],
    },
    {
      label: "Image",
      width: 208,
      items: [
        { label: "Rotate 90° Left", action: "v-rotate-left" },
        { label: "Rotate 90° Right", action: "v-rotate-right" },
        { label: "Flip Horizontal", action: "v-flip" },
        { separator: true },
        { label: "Resize...", action: "v-resize" },
        { label: "Image Information", action: "v-info" },
      ],
    },
    {
      label: "Help",
      width: 190,
      items: [
        { label: "ACDSee Help Topics", action: "v-help" },
        { separator: true },
        { label: "About ACDSee", action: "v-about" },
      ],
    },
  ];

  const command = (action: string) => {
    switch (action) {
      case "v-close":
        onClose();
        break;
      case "v-next":
        next();
        break;
      case "v-prev":
        prev();
        break;
      case "v-zoom-in":
        setZoom((z) => (z === "fit" ? 100 : Math.min(400, z + 25)));
        break;
      case "v-zoom-out":
        setZoom((z) => (z === "fit" ? 75 : Math.max(25, z - 25)));
        break;
      case "v-fit":
        setZoom("fit");
        break;
      case "v-actual":
        setZoom(100);
        break;
      case "v-bg-black":
        setBg("black");
        break;
      case "v-bg-gray":
        setBg("gray");
        break;
      case "v-bg-white":
        setBg("white");
        break;
      case "v-film":
        setFilmstrip((v) => !v);
        break;
      case "v-info":
        setShowInfo((v) => !v);
        break;
      case "v-full":
        setFullscreen((v) => !v);
        break;
      case "v-slideshow":
        onToggleSlideshow();
        break;
      case "v-rotate-left":
        onRotate(photo.id, -90);
        break;
      case "v-rotate-right":
        onRotate(photo.id, 90);
        break;
      case "v-wallpaper":
        onWallpaper(photo);
        break;
      case "v-flip":
        onFlip(photo.id);
        break;
      case "v-resize":
        notify("Image resized to 1024 × 768 for this demo.", "Resize Image");
        break;
      case "v-save":
        notify("Save As is disabled in this demo — original files are untouched.", "ACDSee Viewer");
        break;
      case "v-print":
        notify(`Sending "${photo.name}" to the default printer...`, "Print");
        break;
      case "v-open":
        notify("Open another image from the browser window.", "ACDSee Viewer");
        break;
      case "v-copy":
        notify(`"${photo.name}" copied to My Pictures.`, "Copy to Folder");
        break;
      case "v-options":
        notify("Viewer options are available in the browser under Tools > Options.", "Options");
        break;
      case "v-help":
        notify("Tip: use ← → to browse, + / − to zoom, and Space for the slide show.", "ACDSee Help");
        break;
      case "v-about":
        notify("ACDSee 3.1 (build 921) · Image viewer demo.", "About ACDSee");
        break;
    }
  };

  const stageStyle =
    bg === "black"
      ? { background: "#111" }
      : bg === "gray"
        ? { background: "#7a7a72" }
        : { background: "#f4f2e9" };

  return (
    <div className={`viewer-overlay ${fullscreen ? "is-fullscreen" : ""}`} role="dialog" aria-modal="true" aria-label="ACDSee image viewer">
      <div className={`viewer-window ${fullscreen ? "viewer-fullscreen" : ""}`}>
        <div className="titlebar viewer-titlebar">
          <div className="titlebar-left">
            <BrandIcon size={16} />
            <span className="titlebar-text">
              ACDSee 3.1 — {photo.name}{slideshow ? " — Slide Show" : ""}
            </span>
          </div>
          <div className="window-controls">
            <button type="button" className="wc-button" title="Minimize" onClick={onClose}>
              <span className="wc-min" />
            </button>
            <button type="button" className="wc-button" title="Maximize" onClick={() => setFullscreen((v) => !v)}>
              <span className="wc-max" />
            </button>
            <button type="button" className="wc-button close" title="Close" onClick={onClose}>
              <span className="wc-x">×</span>
            </button>
          </div>
        </div>
        <MenuBar menus={menus} onCommand={command} />
        <div className="viewer-toolbar">
          <div className="toolbar-group">
            <button type="button" className="tb-button" onClick={prev} title="Previous image (←)">
              <ToolIcon name="prev" size={22} />
            </button>
            <button type="button" className="tb-button" onClick={next} title="Next image (→)">
              <ToolIcon name="next" size={22} />
            </button>
          </div>
          <span className="toolbar-separator" />
          <div className="toolbar-group">
            <button type="button" className="tb-button" onClick={() => command("v-zoom-out")} title="Zoom out">
              <ToolIcon name="zoom-out" size={22} />
            </button>
            <button
              type="button"
              className="tb-button zoom-select"
              onClick={() => setZoom(zoom === "fit" ? 100 : "fit")}
              title="Toggle fit / actual size"
            >
              {zoom === "fit" ? "Fit" : `${zoom}%`}
              <span className="tb-arrow">▾</span>
            </button>
            <button type="button" className="tb-button" onClick={() => command("v-zoom-in")} title="Zoom in">
              <ToolIcon name="zoom-in" size={22} />
            </button>
            <button type="button" className={`tb-button ${zoom === "fit" ? "pressed" : ""}`} onClick={() => setZoom("fit")} title="Fit to window">
              <ToolIcon name="fit" size={22} />
            </button>
            <button type="button" className="tb-button" onClick={() => setZoom(100)} title="Actual size">
              <ToolIcon name="actual" size={22} />
            </button>
          </div>
          <span className="toolbar-separator" />
          <div className="toolbar-group">
            <button type="button" className="tb-button" onClick={() => onRotate(photo.id, -90)} title="Rotate left">
              <ToolIcon name="rotate-left" size={22} />
            </button>
            <button type="button" className="tb-button" onClick={() => onRotate(photo.id, 90)} title="Rotate right">
              <ToolIcon name="rotate-right" size={22} />
            </button>
            <button type="button" className="tb-button" onClick={() => onWallpaper(photo)} title="Set as wallpaper">
              <ToolIcon name="wallpaper" size={22} />
            </button>
          </div>
          <span className="toolbar-separator" />
          <div className="toolbar-group">
            <button
              type="button"
              className={`tb-button ${slideshow ? "pressed" : ""}`}
              onClick={onToggleSlideshow}
              title="Start / stop slide show"
            >
              <ToolIcon name={slideshow ? "pause" : "play"} size={22} />
            </button>
            <button type="button" className={`tb-button ${filmstrip ? "pressed" : ""}`} onClick={() => setFilmstrip((v) => !v)} title="Filmstrip">
              <ToolIcon name="film" size={22} />
            </button>
            <button type="button" className="tb-button" onClick={() => command("v-info")} title="Image information">
              <ToolIcon name="info" size={22} />
            </button>
          </div>
          <div className="viewer-toolbar-right">
            <span className="toolbar-file-label">
              <FileTypeIcon type={photo.format} size={14} /> {photo.name}
            </span>
            <button type="button" className="tb-button" onClick={onClose} title="Close viewer">
              <ToolIcon name="close" size={20} />
            </button>
          </div>
        </div>

        <div className="viewer-stage" style={stageStyle}>
          {slideshow && <div className="slideshow-progress" />}
          {showInfo && (
            <div className={`viewer-info-strip ${bg === "white" ? "dark-text" : ""}`}>
              <span className="viewer-info-index">
                {index + 1} / {total}
              </span>
              <span className="viewer-info-name">{photo.name}</span>
              <span>
                {photo.width} × {photo.height} · {formatBytes(photo.size)} · {formatDate(photo.date)}
              </span>
            </div>
          )}
          <div className="viewer-canvas">
            <img
              key={photo.id}
              src={photo.fullSrc || photo.src}
              alt={photo.name}
              draggable={false}
              className={zoom === "fit" ? "fit" : ""}
              style={{
                transform: imageTransform(photo),
                ...(typeof zoom === "number" ? { width: `${Math.min(zoom * 7.2, 2400)}px`, maxWidth: "none", maxHeight: "none" } : {}),
              }}
            />
            <button type="button" className="viewer-nav left" onClick={prev} title="Previous image">
              ◀
            </button>
            <button type="button" className="viewer-nav right" onClick={next} title="Next image">
              ▶
            </button>
          </div>
          {filmstrip && (
            <div className="filmstrip">
              <div className="filmstrip-inner">
                {photos.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className={`film-thumb ${p.id === photo.id ? "selected" : ""}`}
                    onClick={() => onSelect(p.id)}
                    title={p.name}
                  >
                    <img src={p.src} alt={p.name} style={{ transform: imageTransform(p) }} />
                    <span>{p.name.replace(/\.[^.]+$/, "")}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="viewer-status">
          <span>
            <FileTypeIcon type={photo.format} size={12} /> {folderPath(photo.folderId).map((f) => f.name).join(" › ")}
          </span>
          <span>
            {photo.camera} · {photo.exposure} · {photo.aperture} · ISO {photo.iso}
          </span>
          <span>
            {photo.width} × {photo.height} pixels · {photo.format} · {formatBytes(photo.size)}
          </span>
          <span className="viewer-zoom">{zoom === "fit" ? "Fit to window" : `${zoom}%`}</span>
        </div>
        {slideshow && (
          <button type="button" className="slideshow-stop" onClick={onToggleSlideshow}>
            ■ Stop slide show
          </button>
        )}
      </div>
    </div>
  );
}
