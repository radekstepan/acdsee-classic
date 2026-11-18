import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../store";
import { useCommands } from "../commands";
import { FORMATS } from "../data/catalog";
import { formatBytes, formatDate, fullName } from "../utils/util";
import { useElementSize } from "../utils/hooks";
import { EditedImage } from "./EditedImage";
import { Icon } from "./Icons";
import { MenuBar, type MenuDef } from "./ui";
import { ToolBtn, ToolSep, ToolbarRow } from "./Toolbar";
import type { MenuItem } from "../types";

const STEPS = [5, 10, 15, 20, 25, 33, 50, 66, 75, 100, 125, 150, 200, 300, 400, 600, 800, 1200, 1600];
const BGS = { black: "#000000", gray: "#808080", teal: "#008080", white: "#ffffff" } as const;

export function Viewer() {
  const app = useApp();
  const cmd = useCommands();
  const { viewer, settings } = app;
  const file = app.getFile(viewer.fileId);
  const list = app.viewerList;
  const idx = file ? list.indexOf(file.id) : -1;

  const [zoom, setZoom] = useState<number | "fit">(settings.fitToWindow ? "fit" : 1);
  const [showTb, setShowTb] = useState(true);
  const [showSb, setShowSb] = useState(true);
  const [paused, setPaused] = useState(false);
  const [hint, setHint] = useState(true);
  const [stageRef, stage, stageNode] = useElementSize<HTMLDivElement>();
  const panRef = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);
  const [panning, setPanning] = useState(false);

  /* reset zoom on file change */
  useEffect(() => {
    setZoom(settings.fitToWindow ? "fit" : 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer.fileId]);

  useEffect(() => {
    if (!viewer.full) return;
    setHint(true);
    const t = setTimeout(() => setHint(false), 2600);
    return () => clearTimeout(t);
  }, [viewer.full, viewer.slideshow]);

  /* ---------- geometry ---------- */
  const fw = Math.max(1, file?.w ?? 1);
  const fh = Math.max(1, file?.h ?? 1);
  const fitS = (() => {
    if (!stage.w || !stage.h) return 1;
    const s = Math.min(stage.w / fw, stage.h / fh);
    return settings.noEnlarge && !viewer.full ? Math.min(1, s) : s;
  })();
  const scale = zoom === "fit" ? fitS : zoom;
  const dw = Math.max(1, Math.round(fw * scale));
  const dh = Math.max(1, Math.round(fh * scale));
  const pct = Math.round(scale * 100);
  const overflow = dw > stage.w + 1 || dh > stage.h + 1;

  /* ---------- navigation ---------- */
  const goIdx = useCallback(
    (i: number, sync = true) => {
      if (!list.length) return;
      const id = list[i];
      if (!id) return;
      app.patchViewer({ fileId: id });
      if (sync) app.setSelection([id], id);
    },
    [list, app],
  );
  const stopShow = useCallback(() => {
    if (viewer.slideshow) {
      if (viewer.returnToViewer) app.patchViewer({ full: false, slideshow: false, list: null });
      else app.closeViewer();
    } else if (viewer.full) app.patchViewer({ full: false });
    else app.closeViewer();
  }, [viewer.slideshow, viewer.full, viewer.returnToViewer, app]);

  const next = useCallback(() => {
    if (idx < list.length - 1) goIdx(idx + 1);
    else if (viewer.slideshow) {
      if (settings.slideLoop) goIdx(0);
      else stopShow();
    } else goIdx(0);
  }, [idx, list.length, goIdx, viewer.slideshow, settings.slideLoop, stopShow]);
  const prev = useCallback(() => {
    if (idx > 0) goIdx(idx - 1);
    else goIdx(list.length - 1);
  }, [idx, list.length, goIdx]);

  /* slideshow timer */
  useEffect(() => {
    if (!viewer.slideshow || paused) return;
    const t = setTimeout(next, Math.max(1, settings.slideDelay) * 1000);
    return () => clearTimeout(t);
  }, [viewer.slideshow, paused, viewer.fileId, settings.slideDelay, next]);

  /* ---------- zoom ---------- */
  const zoomTo = (p: number) => setZoom(Math.max(0.05, Math.min(16, p / 100)));
  const zoomIn = () => {
    const cur = Math.round(scale * 100);
    const n = STEPS.find((s) => s > cur) ?? STEPS[STEPS.length - 1];
    zoomTo(n);
  };
  const zoomOut = () => {
    const cur = Math.round(scale * 100);
    const n = [...STEPS].reverse().find((s) => s < cur) ?? STEPS[0];
    zoomTo(n);
  };

  /* ---------- wheel ---------- */
  const wheelState = useRef({ last: 0 });
  const handlers = useRef({ next, prev, zoomIn, zoomOut, overflow });
  handlers.current = { next, prev, zoomIn, zoomOut, overflow };
  const wheelMode = settings.wheelMode;
  useEffect(() => {
    const el = stageNode;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const h = handlers.current;
      if (e.ctrlKey || wheelMode === "zoom") {
        e.preventDefault();
        if (e.deltaY < 0) h.zoomIn();
        else h.zoomOut();
        return;
      }
      if (h.overflow) return; // let it scroll
      e.preventDefault();
      const now = Date.now();
      if (now - wheelState.current.last < 120) return;
      wheelState.current.last = now;
      if (e.deltaY > 0) h.next();
      else if (e.deltaY < 0) h.prev();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [stageNode, wheelMode]);

  /* ---------- keyboard ---------- */
  const kb = useRef<(e: KeyboardEvent) => void>(() => {});
  kb.current = (e: KeyboardEvent) => {
    if (app.dialogs.length) return;
    const t = e.target as HTMLElement;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
    const k = e.key;
    const ctrl = e.ctrlKey || e.metaKey;
    const st = stageNode;
    if (k === "Escape") {
      e.preventDefault();
      stopShow();
    } else if (k === "ArrowRight" || k === "PageDown" || (k === " " && !viewer.slideshow)) {
      e.preventDefault();
      if (k === "ArrowRight" && overflow && st) st.scrollLeft += 40;
      else next();
    } else if (k === "ArrowLeft" || k === "PageUp" || k === "Backspace") {
      e.preventDefault();
      if (k === "ArrowLeft" && overflow && st) st.scrollLeft -= 40;
      else prev();
    } else if (k === "ArrowDown") {
      e.preventDefault();
      if (overflow && st) st.scrollTop += 40;
      else next();
    } else if (k === "ArrowUp") {
      e.preventDefault();
      if (overflow && st) st.scrollTop -= 40;
      else prev();
    } else if (k === " " && viewer.slideshow) {
      e.preventDefault();
      setPaused((p) => !p);
    } else if (k === "Home") {
      e.preventDefault();
      goIdx(0);
    } else if (k === "End") {
      e.preventDefault();
      goIdx(list.length - 1);
    } else if (k === "+" || k === "=") {
      e.preventDefault();
      zoomIn();
    } else if (k === "-" || k === "_") {
      e.preventDefault();
      zoomOut();
    } else if (k === "*" || (k.toLowerCase() === "f" && !ctrl)) {
      e.preventDefault();
      setZoom("fit");
    } else if (k === "1" && !ctrl) {
      zoomTo(100);
    } else if (k === "Enter" && !e.altKey) {
      e.preventDefault();
      app.patchViewer({ full: !viewer.full, slideshow: false });
    } else if (k === "Delete" && file) {
      e.preventDefault();
      app.requestDelete([file.id]);
    } else if (ctrl && k.toLowerCase() === "l" && file) {
      e.preventDefault();
      app.rotateFile(file.id, -1);
    } else if (ctrl && k.toLowerCase() === "r" && file) {
      e.preventDefault();
      app.rotateFile(file.id, 1);
    } else if (k === "F2" && file) {
      e.preventDefault();
      app.openDialog({ type: "rename", id: file.id });
    } else if (e.altKey && k === "Enter" && file) {
      e.preventDefault();
      app.openDialog({ type: "props", ids: [file.id] });
    } else if (ctrl && k.toLowerCase() === "s") {
      e.preventDefault();
      app.startSlideshow();
    }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => kb.current(e);
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  if (!file) return null;

  /* ---------- pan ---------- */
  const onStageDown = (e: React.MouseEvent) => {
    const st = stageNode;
    if (!st) return;
    if (e.button === 2 && viewer.full) {
      e.preventDefault();
      prev();
      return;
    }
    if (e.button !== 0) return;
    if (e.clientX > st.getBoundingClientRect().left + st.clientWidth) return;
    if (!overflow) {
      if (viewer.full) next();
      return;
    }
    panRef.current = { x: e.clientX, y: e.clientY, sl: st.scrollLeft, st: st.scrollTop };
    setPanning(true);
    const move = (ev: MouseEvent) => {
      const p = panRef.current;
      if (!p) return;
      st.scrollLeft = p.sl - (ev.clientX - p.x);
      st.scrollTop = p.st - (ev.clientY - p.y);
    };
    const up = () => {
      panRef.current = null;
      setPanning(false);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  /* ---------- menus ---------- */
  const zoomMenu: MenuItem[] = [10, 25, 50, 75, 100, 150, 200, 400].map((p) => ({
    label: `${p}%`,
    checked: zoom !== "fit" && Math.round(zoom * 100) === p,
    radio: true,
    onClick: () => zoomTo(p),
  }));
  const menus: MenuDef[] = [
    {
      label: "&File",
      items: [
        { label: "&Close Viewer", shortcut: "Esc", icon: "thumbs", onClick: app.closeViewer },
        { separator: true },
        { label: "Save &As...", disabled: true },
        { separator: true },
        { label: "P&roperties", icon: "props", shortcut: "Alt+Enter", onClick: () => app.openDialog({ type: "props", ids: [file.id] }) },
        { separator: true },
        { label: "E&xit ACDSee", icon: "exit", shortcut: "Alt+F4", onClick: cmd.exit },
      ],
    },
    {
      label: "&Edit",
      items: [
        { label: "&Copy", icon: "copy", onClick: () => app.copyToClip([file.id], "copy") },
        { label: "&Delete", icon: "delete", shortcut: "Del", onClick: () => app.requestDelete([file.id]) },
        { label: "Rena&me...", icon: "rename", shortcut: "F2", onClick: () => app.openDialog({ type: "rename", id: file.id }) },
        { separator: true },
        { label: "Rotate &Left", icon: "rotateL", shortcut: "Ctrl+L", onClick: () => app.rotateFile(file.id, -1) },
        { label: "Rotate &Right", icon: "rotateR", shortcut: "Ctrl+R", onClick: () => app.rotateFile(file.id, 1) },
        { label: "Flip &Horizontal", icon: "flipH", onClick: () => app.flipFile(file.id, "h") },
        { label: "Flip &Vertical", icon: "flipV", onClick: () => app.flipFile(file.id, "v") },
        { separator: true },
        { label: "&Adjust Brightness / Contrast...", icon: "adjust", onClick: () => app.openDialog({ type: "adjust", id: file.id }) },
        { label: "Re&size...", icon: "resize", onClick: () => app.openDialog({ type: "resize", id: file.id }) },
      ],
    },
    {
      label: "&View",
      items: [
        { label: "&Next Image", icon: "forward", shortcut: "Space", onClick: next },
        { label: "&Previous Image", icon: "back", shortcut: "Backspace", onClick: prev },
        { label: "&First Image", shortcut: "Home", onClick: () => goIdx(0) },
        { label: "&Last Image", shortcut: "End", onClick: () => goIdx(list.length - 1) },
        { separator: true },
        { label: "Zoom &In", icon: "zoomIn", shortcut: "+", onClick: zoomIn },
        { label: "Zoom &Out", icon: "zoomOut", shortcut: "-", onClick: zoomOut },
        { label: "&Fit Image to Window", icon: "fit", shortcut: "F", checked: zoom === "fit", onClick: () => setZoom("fit") },
        { label: "&Actual Size", icon: "actual", shortcut: "1", onClick: () => zoomTo(100) },
        { label: "&Zoom", submenu: zoomMenu },
        { separator: true },
        { label: "F&ull Screen", icon: "fullscreen", shortcut: "Enter", onClick: () => app.patchViewer({ full: true, slideshow: false }) },
        { label: "&Slide Show", icon: "slideshow", shortcut: "Ctrl+S", onClick: () => app.startSlideshow() },
        { separator: true },
        { label: "&Toolbar", checked: showTb, onClick: () => setShowTb(!showTb) },
        { label: "S&tatus Bar", checked: showSb, onClick: () => setShowSb(!showSb) },
      ],
    },
    {
      label: "&Tools",
      items: [
        { label: "Set &Wallpaper", icon: "wallpaper", submenu: cmd.wallpaperItems().map((m) => (m.separator || m.label?.startsWith("&None") ? m : { ...m, disabled: false })) },
        { label: "&Convert...", icon: "convert", onClick: () => app.openDialog({ type: "convert", ids: [file.id] }) },
        { label: "Slide Show &Options...", onClick: cmd.slideshowOptions },
        { separator: true },
        { label: "&Options...", icon: "settings", onClick: () => cmd.options(1) },
      ],
    },
    { label: "&Help", items: cmd.helpMenu() },
  ];

  /* ---------- stage ---------- */
  const animClass =
    viewer.slideshow && settings.slideTransition !== "none"
      ? settings.slideTransition === "fade"
        ? "anim-fade"
        : settings.slideTransition === "slide"
          ? "anim-slide"
          : "anim-wipe"
      : "";

  const bgColor = viewer.full ? "#000" : BGS[settings.viewerBg];

  const stageEl = (
    <div
      ref={stageRef}
      className="flex-1 min-h-0 min-w-0 overflow-auto relative"
      style={{ background: bgColor, cursor: viewer.full && !overflow ? "default" : panning ? "grabbing" : overflow ? "grab" : "default" }}
      onMouseDown={onStageDown}
      onDoubleClick={() => !viewer.full && app.patchViewer({ full: true, slideshow: false })}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex" style={{ minWidth: "100%", minHeight: "100%" }}>
        <div style={{ margin: "auto" }}>
          <div key={file.id} className={animClass}>
            <EditedImage file={file} w={dw} h={dh} className={settings.viewerBg === "white" ? "" : ""} style={zoom !== "fit" && scale > 2 ? { imageRendering: "pixelated" } : undefined} />
          </div>
        </div>
      </div>
    </div>
  );

  const caption = (
    <>
      {viewer.slideshow && settings.slideCaption && (
        <div className="absolute left-0 right-0 bottom-0 px-3 py-1.5 text-white flex justify-between" style={{ background: "rgba(0,0,0,.55)", fontSize: 11 }}>
          <span>
            {fullName(file)} — {file.w}x{file.h}
          </span>
          <span>
            {idx + 1} of {list.length}
            {paused ? "  (paused)" : ""}
          </span>
        </div>
      )}
      {hint && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-white" style={{ background: "rgba(0,0,0,.7)", border: "1px solid #808080" }}>
          {viewer.slideshow ? "Slide show — Esc: stop   Space: pause   ←/→: previous / next" : "Full screen — click: next   right-click: previous   Esc: exit"}
        </div>
      )}
    </>
  );

  if (viewer.full) {
    return createPortal(
      <div className="fixed inset-0 flex flex-col bg-black text-white" style={{ zIndex: 9500 }}>
        {stageEl}
        {caption}
      </div>,
      document.body,
    );
  }

  const zoomValue = zoom === "fit" ? "fit" : String(Math.round(zoom * 100));
  const zoomOpts = [10, 25, 50, 75, 100, 150, 200, 400];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div style={{ boxShadow: "inset 0 -1px 0 #808080, inset 0 -2px 0 #fff" }}>
        <MenuBar menus={menus} />
      </div>
      {showTb && (
        <ToolbarRow>
          <ToolBtn icon="thumbs" tip="Close Viewer — back to Browser (Esc)" onClick={app.closeViewer} label="Browse" />
          <ToolSep />
          <ToolBtn icon="back" tip="Previous Image (Backspace)" onClick={prev} disabled={list.length < 2} />
          <ToolBtn icon="forward" tip="Next Image (Space)" onClick={next} disabled={list.length < 2} />
          <ToolSep />
          <ToolBtn icon="zoomIn" tip="Zoom In (+)" onClick={zoomIn} />
          <ToolBtn icon="zoomOut" tip="Zoom Out (-)" onClick={zoomOut} />
          <select
            className="field !h-[21px] !py-0 mx-0.5"
            style={{ width: 68 }}
            value={zoomValue}
            onChange={(e) => (e.target.value === "fit" ? setZoom("fit") : zoomTo(Number(e.target.value)))}
          >
            <option value="fit">Fit</option>
            {!zoomOpts.includes(Number(zoomValue)) && zoomValue !== "fit" && <option value={zoomValue}>{zoomValue}%</option>}
            {zoomOpts.map((p) => (
              <option key={p} value={p}>
                {p}%
              </option>
            ))}
          </select>
          <ToolBtn icon="fit" tip="Fit Image to Window (F)" on={zoom === "fit"} onClick={() => setZoom("fit")} />
          <ToolBtn icon="actual" tip="Actual Size (1)" on={zoom !== "fit" && pct === 100} onClick={() => zoomTo(100)} />
          <ToolSep />
          <ToolBtn icon="rotateL" tip="Rotate Left (Ctrl+L)" onClick={() => app.rotateFile(file.id, -1)} />
          <ToolBtn icon="rotateR" tip="Rotate Right (Ctrl+R)" onClick={() => app.rotateFile(file.id, 1)} />
          <ToolBtn icon="flipH" tip="Flip Horizontal" onClick={() => app.flipFile(file.id, "h")} />
          <ToolBtn icon="flipV" tip="Flip Vertical" onClick={() => app.flipFile(file.id, "v")} />
          <ToolBtn icon="adjust" tip="Adjust Brightness / Contrast" onClick={() => app.openDialog({ type: "adjust", id: file.id })} />
          <ToolBtn icon="resize" tip="Resize" onClick={() => app.openDialog({ type: "resize", id: file.id })} />
          <ToolSep />
          <ToolBtn icon="slideshow" tip="Slide Show (Ctrl+S)" onClick={() => app.startSlideshow()} />
          <ToolBtn icon="fullscreen" tip="Full Screen (Enter)" onClick={() => app.patchViewer({ full: true, slideshow: false })} />
          <ToolSep />
          <ToolBtn icon="delete" tip="Delete (Del)" onClick={() => app.requestDelete([file.id])} />
          <ToolBtn icon="props" tip="Properties (Alt+Enter)" onClick={() => app.openDialog({ type: "props", ids: [file.id] })} />
          <ToolBtn icon="help" tip="Help (F1)" onClick={cmd.help} />
        </ToolbarRow>
      )}

      <div className="flex flex-1 min-h-0 p-[2px] pt-[3px]">
        <div className="flex flex-col flex-1 min-w-0 min-h-0 sunken" style={{ padding: 2 }}>
          {stageEl}
        </div>
      </div>

      {showSb && (
        <div className="flex gap-[2px] px-[2px] pb-[2px] pt-[1px] flex-none" style={{ boxShadow: "inset 0 1px 0 #dfdfdf" }}>
          <div className="status-panel flex-1 min-w-0 flex items-center gap-1">
            <Icon name={`img:${file.ext}`} size={14} />
            {fullName(file)}
          </div>
          <div className="status-panel" style={{ width: 190 }}>
            {file.w}x{file.h}x{file.bpp} {FORMATS[file.ext]?.short ?? file.ext.toUpperCase()}
          </div>
          <div className="status-panel" style={{ width: 90 }}>
            Zoom: {pct}%
          </div>
          <div className="status-panel" style={{ width: 80 }}>
            {idx + 1} of {list.length}
          </div>
          <div className="status-panel" style={{ width: 210 }}>
            {formatBytes(file.size)}, {formatDate(file.modified)}
          </div>
        </div>
      )}
    </div>
  );
}
