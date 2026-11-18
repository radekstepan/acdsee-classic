import { useEffect, useMemo, useState } from "react";
import { useApp } from "../../store";
import { CONVERT_FORMATS, FORMATS } from "../../data/catalog";
import { Button, Check, Dialog, DialogButtons, GroupBox, Mn, Progress, Radio } from "../ui";
import { Icon, folderIconName } from "../Icons";
import { FolderTree } from "../FolderTree";
import { EditedImage } from "../EditedImage";
import type { Edit, FileEntry } from "../../types";
import { defaultEdit, estimateSize, fitBox, formatBytes, fullName, pathOf } from "../../utils/util";

/* ------------------------------------------------------------------ */
/* Convert                                                              */
/* ------------------------------------------------------------------ */
export function ConvertDialog({ ids }: { ids: string[] }) {
  const app = useApp();
  const files = ids.map((i) => app.getFile(i)).filter(Boolean) as FileEntry[];
  const [fmt, setFmt] = useState("png");
  const [quality, setQuality] = useState(75);
  const [prog, setProg] = useState(0);
  const [dest, setDest] = useState<string>("same");
  const [removeOrig, setRemoveOrig] = useState(false);
  const [running, setRunning] = useState(false);
  const srcFolder = app.fileMap.get(files[0]?.id)?.folderId ?? app.folderId;
  const targetId = dest === "same" ? srcFolder : dest;

  const destOptions = useMemo(
    () =>
      Object.values(app.folders)
        .filter((f) => app.canWriteTo(f.id) && f.kind !== "recycle" && !["cdrom"].includes(f.kind) && f.id !== "mycomputer")
        .map((f) => ({ id: f.id, path: pathOf(app.folders, f.id) }))
        .sort((a, b) => a.path.localeCompare(b.path)),
    [app],
  );

  useEffect(() => {
    if (!running) return;
    const chosen = CONVERT_FORMATS.find((f) => f.ext === fmt) ?? CONVERT_FORMATS[0];
    setProg(4);
    const timer = window.setInterval(() => setProg((x) => Math.min(90, x + 6)), 140);
    let cancelled = false;
    void app
      .convertFiles(files.map((f) => f.id), chosen.format, quality, targetId, removeOrig)
      .then((done) => {
        if (cancelled) return;
        window.clearInterval(timer);
        setProg(100);
        window.setTimeout(() => {
          app.closeDialog();
          window.setTimeout(
            () =>
              app.msg(
                "ACDSee — Convert",
                `${done} image${done === 1 ? " was" : "s were"} converted to ${chosen.label} format.\n\nOutput: ${pathOf(app.folders, targetId)}`,
                done ? "info" : "error"
              ),
            40
          );
        }, 260);
      });
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  if (running) {
    const cur = files[Math.min(Math.floor((prog / 100) * files.length), files.length - 1)];
    return (
      <Dialog title="Converting" icon="convert" width={340} onClose={() => {}} noClose>
        <div className="p-2 flex flex-col gap-2">
          <div>
            Converting {fullName(cur)} to {(FORMATS[fmt]?.short ?? fmt.toUpperCase())}...
          </div>
          <Progress value={prog} />
          <div className="text-[#404040]">
            {prog >= 100 ? `${files.length} of ${files.length} complete` : `Approximately ${Math.ceil((prog / 100) * files.length)} of ${files.length} complete`}
          </div>
          <div className="flex justify-center pt-1">
            <Button onClick={app.closeDialog}>Cancel</Button>
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog title="Convert Images" icon="convert" width={420} onClose={app.closeDialog} onEnter={() => setRunning(true)}>
      <div className="flex gap-3">
        <div className="flex-none w-[150px]">
          <div className="pb-1">
            <Mn text="Convert to &format:" />
          </div>
          <div className="sunken bg-white" style={{ height: 110 }}>
            {CONVERT_FORMATS.map((f) => (
              <div key={f.ext} className={`flex items-center gap-1.5 px-1 h-[18px] ${fmt === f.ext ? "bg-[#000080] text-white" : ""}`} onClick={() => setFmt(f.ext)}>
                <Icon name={`img:${f.ext}`} />
                {f.label}
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <GroupBox title="Options">
            <div className={`flex items-center gap-2 ${fmt === "jpg" ? "" : "opacity-50"}`}>
              <span>Quality:</span>
              <input type="range" className="w98 flex-1" min={10} max={100} value={quality} disabled={fmt !== "jpg"} onChange={(e) => setQuality(Number(e.target.value))} />
              <span className="w-[28px] text-right">{quality}%</span>
            </div>
            {fmt !== "jpg" && <div className="text-[#404040] pt-1">Quality applies to JPEG only.</div>}
          </GroupBox>
          <GroupBox title="Output">
            <div className="flex flex-col gap-1.5">
              <Radio name="dst" label="&Same folder as originals" checked={dest === "same"} onChange={() => setDest("same")} />
              <Radio
                name="dst"
                label="Another &folder:"
                checked={dest !== "same"}
                onChange={() => {
                  const candidate = destOptions.find((f) => f.id !== srcFolder) ?? destOptions[0];
                  if (candidate) setDest(candidate.id);
                }}
              />
              <select className="field ml-5" disabled={dest === "same"} value={dest === "same" ? "" : dest} onChange={(e) => setDest(e.target.value)}>
                {dest === "same" && <option value="">(choose)</option>}
                {destOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.path}
                  </option>
                ))}
              </select>
              <Check label="&Delete originals after converting" checked={removeOrig} onChange={setRemoveOrig} />
            </div>
          </GroupBox>
        </div>
      </div>
      <div className="pt-2 pl-1 text-[#404040]">
        {files.length} image{files.length > 1 ? "s" : ""} selected — estimated output:{" "}
        {formatBytes(files.reduce((a, f) => a + estimateSize(fmt, f.w, f.h, quality), 0))}
      </div>
      <DialogButtons>
        <Button def onClick={() => setRunning(true)}>
          &Convert
        </Button>
        <Button onClick={app.closeDialog}>Cancel</Button>
      </DialogButtons>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Batch rename                                                         */
/* ------------------------------------------------------------------ */
export function BatchRenameDialog({ ids }: { ids: string[] }) {
  const app = useApp();
  const files = ids.map((i) => app.getFile(i)).filter(Boolean) as FileEntry[];
  const [tpl, setTpl] = useState("Photo ###");
  const [start, setStart] = useState(1);
  const [lower, setLower] = useState(false);

  const preview = files.map((_f, i) => {
    const num = start + i;
    let nm = tpl.replace(/#+/g, (m) => String(num).padStart(m.length, "0"));
    if (lower) nm = nm.toLowerCase();
    return nm;
  });

  const err = (() => {
    if (!tpl.trim()) return "Enter a name template.";
    if (/[\\/:*?"<>|]/.test(tpl)) return 'A filename cannot contain any of the following characters: \\ / : * ? " < > |';
    if (!/#/.test(tpl) && files.length > 1) return "Add one or more # characters to number the files (e.g. Holiday ###).";
    return null;
  })();

  const ok = () => {
    if (err) {
      app.msg("Batch Rename", err, "info");
      return;
    }
    // validate collisions with files that are not being renamed
    const folderId = app.fileMap.get(files[0].id)?.folderId ?? app.folderId;
    const others = app.folders[folderId].files.filter((f) => !ids.includes(f.id));
    const seen = new Set<string>();
    for (let i = 0; i < files.length; i++) {
      const key = `${preview[i].toLowerCase()}.${files[i].ext}`;
      if (seen.has(key) || others.some((o) => `${o.name.toLowerCase()}.${o.ext}` === key)) {
        app.msg("Error Renaming File", `Cannot rename: a file named '${preview[i]}.${files[i].ext}' already exists. Specify a different template.`, "error");
        return;
      }
      seen.add(key);
    }
    void app.batchRenameFiles(ids, tpl, start, lower).then((done) => {
      app.closeDialog();
      if (done < files.length) {
        window.setTimeout(
          () => app.msg("Batch Rename", `Renamed ${done} of ${files.length} files.`, done ? "info" : "error"),
          40
        );
      }
    });
  };

  return (
    <Dialog title="Batch Rename" icon="rename" width={440} onClose={app.closeDialog} onEnter={ok}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label className="w-[92px]">
            <Mn text="&Template:" />
          </label>
          <input autoFocus className="field flex-1" value={tpl} onChange={(e) => setTpl(e.target.value)} spellCheck={false} />
        </div>
        <div className="flex items-center gap-2">
          <label className="w-[92px]">
            <Mn text="Start &at:" />
          </label>
          <input type="number" className="field !w-[70px]" value={start} min={0} onChange={(e) => setStart(Number(e.target.value) || 0)} />
          <Check className="ml-4" label="Use &lowercase" checked={lower} onChange={setLower} />
        </div>
        <div className="text-[#404040] leading-[14px]">
          Use <b>#</b> for digits: <b>###</b> becomes 001, 002, 003... The file extension is preserved.
        </div>
        <div className="pt-0.5">Preview ({files.length} files):</div>
        <div className="sunken bg-white overflow-auto" style={{ height: 150 }}>
          {files.map((f, i) => (
            <div key={f.id} className="flex items-center h-[18px] px-1 gap-1">
              <Icon name={`img:${f.ext}`} />
              <span className="w-[170px] truncate">{fullName(f)}</span>
              <span className="text-[#808080]">→</span>
              <span className="flex-1 truncate font-bold">
                {preview[i]}.{f.ext}
              </span>
            </div>
          ))}
        </div>
      </div>
      <DialogButtons>
        <Button def onClick={ok}>
          OK
        </Button>
        <Button onClick={app.closeDialog}>Cancel</Button>
      </DialogButtons>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Folder picker (copy / move)                                          */
/* ------------------------------------------------------------------ */
export function FolderPickerDialog({ mode, ids }: { mode: "copy" | "move"; ids: string[] }) {
  const app = useApp();
  const [sel, setSel] = useState(app.folderId);
  const ok = () => {
    if (!app.canWriteTo(sel) && sel !== "recycle") {
      app.msg(mode === "copy" ? "Copy To Folder" : "Move To Folder", "Please choose a valid destination folder.", "info");
      return;
    }
    app.closeDialog();
    app.transferFiles(ids, sel, mode === "copy");
  };
  const word = mode === "copy" ? "Copy" : "Move";
  return (
    <Dialog title={`${word} To Folder`} icon={mode === "copy" ? "copyTo" : "moveTo"} width={340} onClose={app.closeDialog} onEnter={ok}>
      <div className="p-1 flex flex-col gap-2">
        <div>
          {word} {ids.length} file{ids.length > 1 ? "s" : ""} to:
        </div>
        <div className="sunken p-[2px]" style={{ height: 230 }}>
          <FolderTree
            folders={app.folders}
            selectedId={sel}
            onSelect={(id) => {
              const f = app.folders[id];
              if (f.notReady) {
                app.msg("ACDSee", `${f.drive}:\\ is not accessible.\n\nThe device is not ready.`, "error", ["Retry", "Cancel"]);
                return;
              }
              setSel(id);
            }}
            expanded={app.expanded}
            onToggle={app.toggleExpand}
            className="h-full"
            autoFocus
          />
        </div>
        <div className="flex items-center gap-1.5 text-[#404040] truncate">
          <Icon name={folderIconName(app.folders[sel].kind, true)} /> {pathOf(app.folders, sel)}
        </div>
      </div>
      <DialogButtons>
        <Button
          className="mr-auto"
          onClick={() => {
            if (!app.canWriteTo(sel)) return app.msg("New Folder", "Cannot create a folder here.", "info");
            const name = "New Folder";
            let n = name;
            let i = 2;
            while (app.folders[sel].children.some((c) => app.folders[c].name === n)) n = `${name} (${i++})`;
            void app.createFolder(sel, n).then((id) => {
              if (id) {
                setSel(id);
                app.expandTo(id);
              }
            });
          }}
        >
          &New Folder
        </Button>
        <Button def onClick={ok}>
          OK
        </Button>
        <Button onClick={app.closeDialog}>Cancel</Button>
      </DialogButtons>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Adjust                                                               */
/* ------------------------------------------------------------------ */
export function AdjustDialog({ id }: { id: string }) {
  const app = useApp();
  const f = app.getFile(id);
  const [d, setD] = useState<Edit>(f?.edit ?? defaultEdit);
  if (!f) return null;
  const set = (p: Partial<Edit>) => setD((x) => ({ ...x, ...p }));
  const box = fitBox(f.w, f.h, 280, 210, false);
  const slider = (label: string, key: "brightness" | "contrast" | "saturation" | "hue", min = -100, max = 100) => (
    <div className="flex items-center gap-2">
      <label className="w-[70px]">{label}</label>
      <input type="range" className="w98 flex-1" min={min} max={max} value={d[key]} onChange={(e) => set({ [key]: Number(e.target.value) } as Partial<Edit>)} />
      <span className="w-[32px] text-right">{d[key]}</span>
    </div>
  );
  const ok = () => {
    app.updateEdit(id, { brightness: d.brightness, contrast: d.contrast, saturation: d.saturation, hue: d.hue, gray: d.gray, sepia: d.sepia, invert: d.invert });
    app.closeDialog();
  };
  return (
    <Dialog title={`Adjust — ${fullName(f)}`} icon="adjust" width={560} onClose={app.closeDialog} onEnter={ok}>
      <div className="flex gap-3">
        <div className="flex-none">
          <div className="sunken bg-[#808080] flex items-center justify-center" style={{ width: 292, height: 222 }}>
            <EditedImage file={f} w={box.w} h={box.h} edit={d} />
          </div>
          <div className="text-center pt-1 text-[#404040]">Live preview</div>
        </div>
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <GroupBox title="Light and color">
            <div className="flex flex-col">
              {slider("Brightness", "brightness")}
              {slider("Contrast", "contrast")}
              {slider("Saturation", "saturation")}
              {slider("Hue", "hue", -180, 180)}
            </div>
          </GroupBox>
          <GroupBox title="Effects">
            <div className="flex gap-4 flex-wrap">
              <Check label="&Grayscale" checked={d.gray} onChange={(v) => set({ gray: v })} />
              <Check label="S&epia" checked={d.sepia} onChange={(v) => set({ sepia: v })} />
              <Check label="&Negative" checked={d.invert} onChange={(v) => set({ invert: v })} />
            </div>
          </GroupBox>
        </div>
      </div>
      <DialogButtons>
        <Button className="mr-auto" onClick={() => setD({ ...d, brightness: 0, contrast: 0, saturation: 0, hue: 0, gray: false, sepia: false, invert: false })}>
          &Reset
        </Button>
        <Button def onClick={ok}>
          OK
        </Button>
        <Button onClick={app.closeDialog}>Cancel</Button>
      </DialogButtons>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Resize                                                               */
/* ------------------------------------------------------------------ */
export function ResizeDialog({ id }: { id: string }) {
  const app = useApp();
  const f = app.getFile(id);
  const [mode, setMode] = useState<"px" | "pct">("px");
  const [w, setW] = useState(f?.w ?? 0);
  const [h, setH] = useState(f?.h ?? 0);
  const [pct, setPct] = useState(100);
  const [keep, setKeep] = useState(true);
  if (!f) return null;
  const ratio = f.w / f.h;
  const nw = mode === "pct" ? Math.max(1, Math.round((f.w * pct) / 100)) : w;
  const nh = mode === "pct" ? Math.max(1, Math.round((f.h * pct) / 100)) : h;
  const ok = () => {
    if (nw < 1 || nh < 1 || nw > 10000 || nh > 10000) {
      app.msg("Resize", "Width and height must be between 1 and 10000 pixels.", "warn");
      return;
    }
    void app.resizeImageFile(id, nw, nh).then((ok) => {
      if (ok) app.closeDialog();
    });
  };
  return (
    <Dialog title={`Resize — ${fullName(f)}`} icon="resize" width={340} onClose={app.closeDialog} onEnter={ok}>
      <div className="flex flex-col gap-2">
        <div className="text-[#404040]">
          Current size: {f.w} x {f.h} pixels ({formatBytes(f.size)})
        </div>
        <GroupBox title="New size">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Radio name="rm" label="&Pixels" checked={mode === "px"} onChange={() => setMode("px")} />
              <label className="pl-3">Width:</label>
              <input type="number" className="field !w-[62px]" disabled={mode !== "px"} value={w} onChange={(e) => { const v = Number(e.target.value) || 0; setW(v); if (keep) setH(Math.max(1, Math.round(v / ratio))); }} />
              <label>Height:</label>
              <input type="number" className="field !w-[62px]" disabled={mode !== "px"} value={h} onChange={(e) => { const v = Number(e.target.value) || 0; setH(v); if (keep) setW(Math.max(1, Math.round(v * ratio))); }} />
            </div>
            <div className="flex items-center gap-2">
              <Radio name="rm" label="Perce&nt of original" checked={mode === "pct"} onChange={() => setMode("pct")} />
              <input type="number" className="field !w-[62px]" disabled={mode !== "pct"} value={pct} min={1} max={500} onChange={(e) => setPct(Number(e.target.value) || 1)} />
              <span>%</span>
            </div>
            <div className="flex items-center gap-2">
              <label>Presets:</label>
              <select
                className="field flex-1"
                value=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  const [pw, ph] = e.target.value.split("x").map(Number);
                  setMode("px");
                  const s = Math.min(pw / f.w, ph / f.h);
                  setW(Math.round(f.w * s));
                  setH(Math.round(f.h * s));
                }}
              >
                <option value="">(choose a preset)</option>
                {["320x240", "640x480", "800x600", "1024x768", "1280x1024", "1600x1200"].map((p) => (
                  <option key={p} value={p}>
                    Fit within {p.replace("x", " x ")}
                  </option>
                ))}
              </select>
            </div>
            <Check label="Maintain &aspect ratio" checked={keep} onChange={setKeep} />
          </div>
        </GroupBox>
        <div>
          Result: <b>{nw} x {nh}</b> pixels
        </div>
      </div>
      <DialogButtons>
        <Button def onClick={ok}>
          OK
        </Button>
        <Button onClick={app.closeDialog}>Cancel</Button>
      </DialogButtons>
    </Dialog>
  );
}
