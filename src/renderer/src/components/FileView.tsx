import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent as RMouseEvent, type ReactNode } from "react";
import { useApp } from "../store";
import type { FileEntry, SortKey } from "../types";
import { cn } from "../utils/cn";
import { fitBox, formatBytes, formatDate, fullName, typeName } from "../utils/util";
import { useElementSize } from "../utils/hooks";
import { EditedImage } from "./EditedImage";
import { Icon, fileIconName, folderIconName } from "./Icons";

interface Props {
  onContext: (e: RMouseEvent, id: string | null) => void;
  onOpen: (id: string) => void;
}

const BG = { white: "#ffffff", gray: "#c0c0c0", black: "#000000", teal: "#008080" } as const;

export function FileView({ onContext, onOpen }: Props) {
  const app = useApp();
  const { items, folders, selection, focusId, viewMode, settings, sort, clip, renamingId } = app;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [marquee, setMarquee] = useState<{ l: number; t: number; w: number; h: number } | null>(null);
  const anchor = useRef<string | null>(null);
  const bg = BG[settings.thumbBg];
  const dark = settings.thumbBg === "black" || settings.thumbBg === "teal";
  const textColor = dark ? "#fff" : "#000";

  /* ---- progressive thumbnail loading ---- */
  const visited = useRef(new Set<string>());
  const itemCount = useRef(items.length);
  itemCount.current = items.length;
  const [ready, setReady] = useState(9999);
  useEffect(() => {
    if (app.desktopMode) {
      setReady(9999);
      return;
    }
    if (visited.current.has(app.folderId)) {
      setReady(9999);
      return;
    }
    visited.current.add(app.folderId);
    let n = 0;
    setReady(0);
    const t = window.setInterval(() => {
      n += 2;
      setReady(n);
      if (n >= itemCount.current) window.clearInterval(t);
    }, 45);
    return () => window.clearInterval(t);
  }, [app.folderId]);

  /* ---- scroll focus into view ---- */
  useEffect(() => {
    if (!focusId) return;
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-id="${focusId}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [focusId, viewMode]);

  const isFolder = (id: string) => id in folders;
  const file = (id: string) => app.getFile(id) as FileEntry;
  const isSel = (id: string) => selection.includes(id);

  /* ---- selection ---- */
  const onItemDown = (e: RMouseEvent, id: string) => {
    if (e.button !== 0 && e.button !== 2) return;
    scrollRef.current?.focus({ preventScroll: true });
    if (e.button === 2) {
      if (!isSel(id)) app.setSelection([id], id);
      return;
    }
    if (e.shiftKey && anchor.current && items.includes(anchor.current)) {
      const a = items.indexOf(anchor.current);
      const b = items.indexOf(id);
      app.setSelection(items.slice(Math.min(a, b), Math.max(a, b) + 1), id);
    } else if (e.ctrlKey || e.metaKey) {
      app.setSelection(isSel(id) ? selection.filter((s) => s !== id) : [...selection, id], id);
      anchor.current = id;
    } else {
      if (!isSel(id)) app.setSelection([id], id);
      else app.setFocusId(id);
      anchor.current = id;
    }
  };
  const onItemClick = (e: RMouseEvent, id: string) => {
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey && selection.length > 1 && isSel(id)) app.setSelection([id], id);
  };

  /* ---- marquee ---- */
  const startMarquee = (e: RMouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-id]")) return;
    const cont = scrollRef.current;
    if (!cont) return;
    const crect = cont.getBoundingClientRect();
    if (e.clientX > crect.left + cont.clientWidth || e.clientY > crect.top + cont.clientHeight) return; // scrollbar
    cont.focus({ preventScroll: true });
    const sx = e.clientX - crect.left + cont.scrollLeft;
    const sy = e.clientY - crect.top + cont.scrollTop;
    const base = e.ctrlKey || e.shiftKey ? selection : [];
    if (!base.length) app.setSelection([], null);
    let moved = false;
    const move = (ev: MouseEvent) => {
      const x = ev.clientX - crect.left + cont.scrollLeft;
      const y = ev.clientY - crect.top + cont.scrollTop;
      if (!moved && Math.abs(x - sx) < 3 && Math.abs(y - sy) < 3) return;
      moved = true;
      const l = Math.min(x, sx);
      const t = Math.min(y, sy);
      const w = Math.abs(x - sx);
      const h = Math.abs(y - sy);
      setMarquee({ l, t, w, h });
      const ids = [...base];
      cont.querySelectorAll<HTMLElement>("[data-id]").forEach((el) => {
        const b = el.getBoundingClientRect();
        const bl = b.left - crect.left + cont.scrollLeft;
        const bt = b.top - crect.top + cont.scrollTop;
        if (bl < l + w && bl + b.width > l && bt < t + h && bt + b.height > t) {
          const id = el.dataset.id!;
          if (!ids.includes(id)) ids.push(id);
        }
      });
      app.setSelection(ids);
    };
    const up = () => {
      setMarquee(null);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  /* ---- keyboard ---- */
  const moveBy = (dir: "left" | "right" | "up" | "down" | "home" | "end" | "pgup" | "pgdn", extend: boolean) => {
    if (!items.length) return;
    const cont = scrollRef.current;
    if (!cont) return;
    const els = Array.from(cont.querySelectorAll<HTMLElement>("[data-id]"));
    const curIdx = focusId ? els.findIndex((el) => el.dataset.id === focusId) : -1;
    let target: string | null = null;
    if (curIdx < 0) target = els[0]?.dataset.id ?? null;
    else if (dir === "home") target = els[0].dataset.id!;
    else if (dir === "end") target = els[els.length - 1].dataset.id!;
    else {
      const cur = els[curIdx];
      const r = cur.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const seqMode = viewMode === "details" || viewMode === "filmstrip";
      if (seqMode) {
        const step = dir === "left" || dir === "up" ? -1 : dir === "right" || dir === "down" ? 1 : dir === "pgup" ? -8 : 8;
        target = els[Math.max(0, Math.min(els.length - 1, curIdx + step))].dataset.id!;
      } else if ((dir === "left" || dir === "right") && viewMode !== "list") {
        target = els[Math.max(0, Math.min(els.length - 1, curIdx + (dir === "left" ? -1 : 1)))].dataset.id!;
      } else if ((dir === "up" || dir === "down") && viewMode === "list") {
        target = els[Math.max(0, Math.min(els.length - 1, curIdx + (dir === "up" ? -1 : 1)))].dataset.id!;
      } else {
        const vertical = dir === "up" || dir === "down" || dir === "pgup" || dir === "pgdn";
        const sign = dir === "up" || dir === "left" || dir === "pgup" ? -1 : 1;
        const cands = els
          .map((el) => ({ el, b: el.getBoundingClientRect() }))
          .filter(({ b }) => {
            const bx = b.left + b.width / 2;
            const by = b.top + b.height / 2;
            return vertical ? (sign < 0 ? by < cy - 4 : by > cy + 4) : sign < 0 ? bx < cx - 4 : bx > cx + 4;
          });
        if (cands.length) {
          const primary = (b: DOMRect) => (vertical ? Math.abs(b.top + b.height / 2 - cy) : Math.abs(b.left + b.width / 2 - cx));
          const secondary = (b: DOMRect) => (vertical ? Math.abs(b.left + b.width / 2 - cx) : Math.abs(b.top + b.height / 2 - cy));
          const minP = Math.min(...cands.map((c) => primary(c.b)));
          const row = cands.filter((c) => primary(c.b) < minP + 6);
          row.sort((a, b) => secondary(a.b) - secondary(b.b));
          target = row[0].el.dataset.id!;
        } else target = cur.dataset.id!;
      }
    }
    if (!target) return;
    if (extend && anchor.current && items.includes(anchor.current)) {
      const a = items.indexOf(anchor.current);
      const b = items.indexOf(target);
      app.setSelection(items.slice(Math.min(a, b), Math.max(a, b) + 1), target);
    } else {
      app.setSelection([target], target);
      anchor.current = target;
    }
  };

  const typeBuf = useRef({ s: "", t: 0 });
  const onKeyDown = (e: KeyboardEvent) => {
    if (renamingId) return;
    const map: Record<string, Parameters<typeof moveBy>[0]> = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
      Home: "home",
      End: "end",
      PageUp: "pgup",
      PageDown: "pgdn",
    };
    if (map[e.key] && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      moveBy(map[e.key], e.shiftKey);
    } else if (e.key === "Enter" && !e.altKey) {
      e.preventDefault();
      const id = focusId && isSel(focusId) ? focusId : selection[0];
      if (id) onOpen(id);
    } else if (e.key === " " && e.ctrlKey && focusId) {
      e.preventDefault();
      app.setSelection(isSel(focusId) ? selection.filter((s) => s !== focusId) : [...selection, focusId], focusId);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && e.key !== " ") {
      const now = Date.now();
      const tb = typeBuf.current;
      tb.s = now - tb.t > 900 ? e.key.toLowerCase() : tb.s + e.key.toLowerCase();
      tb.t = now;
      const name = (id: string) => (isFolder(id) ? folders[id].name : fullName(file(id))).toLowerCase();
      const hit = items.find((id) => name(id).startsWith(tb.s));
      if (hit) {
        app.setSelection([hit], hit);
        anchor.current = hit;
      }
    }
  };

  /* ---- drag & drop ---- */
  const onDragStart = (e: React.DragEvent, id: string) => {
    if (isFolder(id)) {
      e.preventDefault();
      return;
    }
    let ids = selection.filter((s) => !isFolder(s));
    if (!ids.includes(id)) {
      ids = [id];
      app.setSelection([id], id);
    }
    e.dataTransfer.setData("text/x-acdsee", JSON.stringify(ids));
    e.dataTransfer.effectAllowed = "copyMove";
  };

  /* ---- shared renderers ---- */
  const cut = (id: string) => clip?.mode === "cut" && clip.ids.includes(id);

  const labelFor = (id: string, style?: CSSProperties): ReactNode => {
    const folder = isFolder(id);
    const name = folder ? folders[id].name : fullName(file(id));
    if (renamingId === id) {
      return <RenameInput initial={name} isFile={!folder} onDone={(v) => commitRename(id, v)} />;
    }
    const sel = isSel(id);
    return (
      <span
        className={cn("file-label", sel && "sel", sel && !focused && "unfocused", focusId === id && focused && "focus")}
        style={{ color: sel ? undefined : textColor, ...style }}
      >
        {name}
      </span>
    );
  };

  const commitRename = (id: string, v: string | null) => {
    app.setRenamingId(null);
    if (v === null) return;
    if (isFolder(id)) return;
    if (v !== fullName(file(id))) app.renameFile(id, v);
    scrollRef.current?.focus({ preventScroll: true });
  };

  const commonProps = (id: string) => ({
    "data-id": id,
    draggable: !isFolder(id) && !renamingId,
    onMouseDown: (e: RMouseEvent) => onItemDown(e, id),
    onClick: (e: RMouseEvent) => onItemClick(e, id),
    onDoubleClick: () => onOpen(id),
    onContextMenu: (e: RMouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContext(e, id);
    },
    onDragStart: (e: React.DragEvent) => onDragStart(e, id),
  });

  const infoLines = (id: string) => {
    if (!settings.showInfo || isFolder(id)) return null;
    const f = file(id);
    return (
      <div className="leading-[13px] text-center" style={{ color: textColor, opacity: 0.85 }}>
        <div>{formatBytes(f.size)}</div>
        <div>
          {f.w}x{f.h}x{f.bpp}
        </div>
      </div>
    );
  };

  /* ---- grid ---- */
  /* Equal-width tracks that share the full row width, so the last column never
     leaves a gap of dead space on the right of the file view. */
  const tileGrid = (cell: number): CSSProperties => ({
    display: "grid",
    gridTemplateColumns: `repeat(auto-fill, minmax(${cell}px, 1fr))`,
    justifyItems: "center",
    alignContent: "start",
    alignItems: "start"
  });

  /* ---- thumbnails (grid) ---- */
  const thumbItem = (id: string, idx: number, strip = false) => {
    const folder = isFolder(id);
    const size = settings.thumbSize;
    const sel = isSel(id);
    const cellW = size + 20;
    let visual: ReactNode;
    if (folder) {
      const isz = size >= 128 ? 64 : size >= 80 ? 48 : 32;
      const f = folders[id];
      visual = (
        <div style={{ width: size + 8, height: size + 8 }} className="flex items-center justify-center">
          <div className="relative">
            <Icon name={folderIconName(f.kind, false, folders.recycle.files.length > 0, true)} size={isz} style={cut(id) ? { opacity: 0.5 } : undefined} />
            {sel && <div className="absolute inset-0" style={{ background: focused ? "rgba(0,0,128,.5)" : "rgba(128,128,128,.55)", mixBlendMode: "multiply" }} />}
          </div>
        </div>
      );
    } else if (idx >= ready || !file(id).w || !file(id).h) {
      visual = (
        <div style={{ width: size + 8, height: size + 8 }} className="flex items-center justify-center">
          <div className="flex items-center justify-center" style={{ width: Math.round(size * 0.75), height: Math.round(size * 0.56), border: `1px dotted ${dark ? "#aaa" : "#888"}` }}>
            <svg width="12" height="16" viewBox="0 0 12 16" shapeRendering="crispEdges" opacity=".55">
              <path d="M1 0h10v2H9v2L7 7v2l2 3v2h2v2H1v-2h2v-2l2-3V7L3 4V2H1z" fill={dark ? "#fff" : "#000"} />
            </svg>
          </div>
        </div>
      );
    } else {
      const f = file(id);
      const box = fitBox(f.w, f.h, size, size);
      visual = (
        <div
          className="flex items-center justify-center"
          style={{ width: size + 8, height: size + 8, opacity: cut(id) ? 0.5 : 1 }}
        >
          <div style={{ padding: 3, background: sel ? (focused ? "#000080" : "#808080") : "transparent" }}>
            <div style={{ boxShadow: `0 0 0 1px ${dark || sel ? "#c0c0c0" : "#808080"}` }}>
              <EditedImage file={f} w={box.w} h={box.h} thumb />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div
        key={id}
        {...commonProps(id)}
        className={cn("flex flex-col items-center", strip && "flex-none")}
        style={{ width: cellW, padding: "3px 0 5px" }}
      >
        {visual}
        {settings.showNames && <div className="max-w-full flex justify-center mt-0.5">{labelFor(id, { maxWidth: cellW - 2 })}</div>}
        {infoLines(id)}
      </div>
    );
  };

  /* ---- icons ---- */
  const iconItem = (id: string) => {
    const folder = isFolder(id);
    const sel = isSel(id);
    return (
      <div key={id} {...commonProps(id)} className="flex flex-col items-center" style={{ width: 84, padding: "4px 0 6px" }}>
        <div className="relative" style={{ opacity: cut(id) ? 0.5 : 1 }}>
          <Icon name={folder ? folderIconName(folders[id].kind, false, folders.recycle.files.length > 0, true) : fileIconName(file(id).ext)} size={32} />
          {sel && <div className="absolute inset-0" style={{ background: focused ? "rgba(0,0,128,.5)" : "rgba(128,128,128,.55)", mixBlendMode: "multiply" }} />}
        </div>
        <div className="max-w-full flex justify-center mt-1">{labelFor(id, { maxWidth: 82 })}</div>
      </div>
    );
  };

  /* ---- list ---- */
  const listItem = (id: string) => {
    const folder = isFolder(id);
    return (
      <div key={id} {...commonProps(id)} className="flex items-center gap-1 px-1" style={{ width: 210, height: 18, opacity: cut(id) ? 0.5 : 1 }}>
        <Icon name={folder ? folderIconName(folders[id].kind, false, folders.recycle.files.length > 0) : fileIconName(file(id).ext)} />
        <div className="min-w-0 flex">{labelFor(id, { maxWidth: 180 })}</div>
      </div>
    );
  };

  /* ---- details ---- */
  const [cols, setCols] = useState([240, 80, 120, 135, 100]);
  const colKeys: (SortKey | null)[] = ["name", "size", "type", "date", "dims"];
  const colNames = ["Name", "Size", "Type", "Modified", "Dimensions"];
  const resizeCol = (i: number, e: RMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX;
    const w0 = cols[i];
    const move = (ev: MouseEvent) => setCols((c) => c.map((w, j) => (j === i ? Math.max(30, w0 + ev.clientX - sx) : w)));
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const detailRow = (id: string) => {
    const folder = isFolder(id);
    const f = folder ? null : file(id);
    const cell = (w: number, content: ReactNode, right = false) => (
      <div style={{ width: w, flex: "none" }} className={cn("px-1 truncate", right && "text-right pr-3")}>
        {content}
      </div>
    );
    return (
      <div key={id} {...commonProps(id)} className="flex items-center" style={{ height: 18, width: cols.reduce((a, b) => a + b, 0), color: textColor, opacity: cut(id) ? 0.5 : 1 }}>
        <div style={{ width: cols[0], flex: "none" }} className="flex items-center gap-1 px-1 min-w-0">
          <Icon name={folder ? folderIconName(folders[id].kind, false, folders.recycle.files.length > 0) : fileIconName(f!.ext)} />
          <div className="min-w-0 flex">{labelFor(id, { maxWidth: cols[0] - 28 })}</div>
        </div>
        {cell(cols[1], f ? formatBytes(f.size) : "", true)}
        {cell(cols[2], f ? typeName(f) : folders[id].kind === "folder" ? "File Folder" : "System Folder")}
        {cell(cols[3], f ? formatDate(f.modified) : "")}
        {cell(cols[4], f ? `${f.w}x${f.h}x${f.bpp}` : "")}
      </div>
    );
  };

  const empty = items.length === 0;

  const wrapStyle: CSSProperties = { background: bg, color: textColor };

  /* ---- filmstrip ---- */
  const [stageRef, stage] = useElementSize<HTMLDivElement>();
  if (viewMode === "filmstrip") {
    const pid = focusId && !isFolder(focusId) ? focusId : selection.find((s) => !isFolder(s));
    const pf = pid ? file(pid) : undefined;
    const box = pf ? fitBox(pf.w, pf.h, Math.max(40, stage.w - 16), Math.max(40, stage.h - 16), false) : null;
    return (
      <div className="flex flex-col h-full min-h-0 min-w-0 sunken bg-white" style={{ padding: 2, ...wrapStyle }} onContextMenu={(e) => { e.preventDefault(); onContext(e, null); }}>
        <div ref={stageRef} className="flex-1 min-h-0 flex items-center justify-center overflow-hidden" style={{ background: bg === "#ffffff" ? "#808080" : bg }}>
          {pf && box ? (
            <div onDoubleClick={() => onOpen(pf.id)} style={{ boxShadow: "0 0 0 1px #000" }}>
              <EditedImage file={pf} w={box.w} h={box.h} />
            </div>
          ) : (
            <span style={{ color: "#fff" }}>{empty ? "No images in this folder" : "Select an image to preview it here"}</span>
          )}
        </div>
        <div
          ref={scrollRef}
          tabIndex={0}
          className="flex-none overflow-x-auto overflow-y-hidden flex outline-none"
          style={{ background: bg, height: settings.thumbSize + (settings.showNames ? 58 : 36) + (settings.showInfo ? 28 : 0), borderTop: "2px solid #c0c0c0" }}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        >
          {items.map((id, i) => thumbItem(id, i, true))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      tabIndex={0}
      className={cn("relative h-full min-h-0 min-w-0 outline-none sunken", viewMode === "list" ? "overflow-x-auto overflow-y-hidden" : "overflow-auto")}
      style={{ ...wrapStyle, padding: 2 }}
      onKeyDown={onKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onMouseDown={startMarquee}
      onContextMenu={(e) => {
        e.preventDefault();
        onContext(e, null);
      }}
    >
      {viewMode === "details" && (
        <div className="sticky top-0 z-10 flex" style={{ width: cols.reduce((a, b) => a + b, 0) }}>
          {colNames.map((n, i) => (
            <button
              key={n}
              className="col-head flex items-center gap-1"
              style={{ width: cols[i], flex: "none", justifyContent: i === 1 ? "flex-end" : "flex-start", color: "#000" }}
              onClick={() => {
                const key = colKeys[i]!;
                app.setSort({ key, dir: sort.key === key && sort.dir === "asc" ? "desc" : "asc" });
              }}
            >
              {sort.key === colKeys[i] && (
                <svg width="7" height="4" viewBox="0 0 7 4" shapeRendering="crispEdges">
                  {sort.dir === "asc" ? <path d="M3 0h1v1H3zM2 1h3v1H2zM1 2h5v1H1zM0 3h7v1H0z" fill="#000" /> : <path d="M0 0h7v1H0zM1 1h5v1H1zM2 2h3v1H2zM3 3h1v1H3z" fill="#000" />}
                </svg>
              )}
              <span className="truncate">{n}</span>
              <span className="absolute right-0 top-0 bottom-0 w-[5px] cursor-col-resize" onMouseDown={(e) => resizeCol(i, e)} onClick={(e) => e.stopPropagation()} />
            </button>
          ))}
        </div>
      )}

      {viewMode === "thumbs" && <div style={tileGrid(settings.thumbSize + 20)}>{items.map((id, i) => thumbItem(id, i))}</div>}
      {viewMode === "icons" && <div style={tileGrid(84)}>{items.map(iconItem)}</div>}
      {viewMode === "list" && (
        <div className="flex flex-col flex-wrap content-start" style={{ height: "100%" }}>
          {items.map(listItem)}
        </div>
      )}
      {viewMode === "details" && <div>{items.map(detailRow)}</div>}

      {empty && !app.busy && (
        <div className="absolute left-0 right-0 top-1/3 text-center pointer-events-none" style={{ color: dark ? "#c0c0c0" : "#808080" }}>
          {app.folder.kind === "folder" || app.folder.kind === "recycle" || app.folder.kind === "hdd" || app.folder.kind === "cdrom"
            ? "No images in this folder"
            : "Nothing to show here"}
        </div>
      )}

      {marquee && <div className="marquee" style={{ left: marquee.l, top: marquee.t, width: marquee.w, height: marquee.h }} />}
    </div>
  );
}

function RenameInput({ initial, isFile, onDone }: { initial: string; isFile: boolean; onDone: (v: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const dot = initial.lastIndexOf(".");
    el.setSelectionRange(0, isFile && dot > 0 ? dot : initial.length);
  }, [initial, isFile]);
  const finish = (v: string | null) => {
    if (done.current) return;
    done.current = true;
    onDone(v);
  };
  return (
    <input
      ref={ref}
      defaultValue={initial}
      className="px-0.5 outline-none"
      style={{ border: "1px solid #000", background: "#fff", color: "#000", height: 17, minWidth: 80, width: Math.max(80, initial.length * 7 + 12), maxWidth: 220, lineHeight: "13px" }}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") finish(e.currentTarget.value);
        else if (e.key === "Escape") finish(null);
      }}
      onBlur={(e) => finish(e.currentTarget.value)}
    />
  );
}

