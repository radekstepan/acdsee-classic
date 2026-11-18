import { useEffect, useRef, useState } from "react";
import { useApp } from "../../store";
import { useShell } from "../../shell";
import { FORMAT_LIST, FORMATS } from "../../data/catalog";
import { Button, Check, Dialog, DialogButtons, GroupBox, Mn, Progress, Radio, Tabs } from "../ui";
import { Icon } from "../Icons";
import { EditedImage } from "../EditedImage";
import { cameraInfo, dosName, fitBox, formatBytes, formatDate, formatLongDate, formatNumber, fullName, pathOf, typeName } from "../../utils/util";
import { defaultSettings } from "../../data/fs";
import type { FileEntry, Settings } from "../../types";

/* ------------------------------------------------------------------ */
export function AboutDialog() {
  const app = useApp();
  const close = app.closeDialog;
  return (
    <Dialog title="About ACDSee" icon="appIcon" width={400} onClose={close} onEnter={close}>
      <div className="flex gap-4 p-2">
        <div className="flex-none pt-1">
          <div className="sunken-thin bg-white p-2">
            <Icon name="appIcon" size={48} />
          </div>
        </div>
        <div className="leading-[15px]">
          <div className="font-bold text-[13px]">ACDSee Classic 3.1</div>
          <div>Image Browser and Viewer</div>
          <div className="mt-1">Version 3.1.0.1999 — Build 217</div>
          <div>Copyright © 1994-1999 ACD Systems, Ltd.</div>
          <div className="mt-2">This product is licensed to:</div>
          <div className="pl-4 font-bold">Windows 98 User</div>
          <div className="pl-4">Evaluation Copy — Registered</div>
          <div className="mt-2 text-[#404040]">
            This is a fan-made, cross-platform recreation of the classic ACDSee interface. It browses real folders on macOS, Windows and Linux. It is not affiliated with or endorsed by ACD Systems.
          </div>
        </div>
      </div>
      <div className="etched-h mx-1 my-1.5" />
      <div className="flex justify-between items-center px-2 text-[#404040]">
        <span>ACDSee Classic — native desktop edition</span>
      </div>
      <DialogButtons>
        <Button onClick={() => app.msg("System Info", "Display: 1024 x 768, 16-bit color\nOS: Microsoft Windows 98 4.10.1998\nFree system resources: 87%", "info")}>System Info...</Button>
        <Button def onClick={close} autoFocus>
          OK
        </Button>
      </DialogButtons>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
export function PropertiesDialog({ ids }: { ids: string[] }) {
  const app = useApp();
  const files = ids.map((id) => app.getFile(id)).filter(Boolean) as FileEntry[];
  const [tab, setTab] = useState(0);
  const f0 = files[0];
  const [attrs, setAttrs] = useState(f0?.attrs ?? { r: false, h: false, a: true });
  const [desc, setDesc] = useState(f0?.desc ?? "");
  const [kw, setKw] = useState(f0?.keywords ?? "");
  const multi = files.length > 1;
  if (!f0) return null;

  const apply = () => {
    files.forEach((f) => app.updateFile(f.id, multi ? { attrs } : { attrs, desc, keywords: kw }));
  };
  const ok = () => {
    apply();
    app.closeDialog();
  };
  const loc = pathOf(app.folders, app.fileMap.get(f0.id)?.folderId ?? app.folderId);
  const total = files.reduce((a, f) => a + f.size, 0);
  const cam = cameraInfo(f0);
  const tabs = multi ? ["General"] : ["jpg", "jpeg", "tif", "tiff", "heic", "heif"].includes(f0.ext) ? ["General", "Image", "Camera", "Description"] : ["General", "Image", "Description"];
  const tabName = tabs[tab];

  const row = (k: string, v: React.ReactNode) => (
    <div className="flex leading-[15px] py-[1px]">
      <div className="w-[110px] flex-none">{k}</div>
      <div className="flex-1 min-w-0 break-words">{v}</div>
    </div>
  );

  const box = fitBox(f0.w, f0.h, 150, 112, false);

  return (
    <Dialog title={multi ? "ACDSee Properties" : `${fullName(f0)} Properties`} icon="props" width={380} onClose={app.closeDialog} onEnter={ok}>
      <Tabs tabs={tabs} value={tab} onChange={setTab}>
        <div style={{ height: 300 }} className="overflow-hidden">
          {tabName === "General" && (
            <div>
              <div className="flex items-center gap-3 pb-2">
                <Icon name={multi ? "thumbs" : `img:${f0.ext}`} size={32} />
                {multi ? <div>{files.length} files</div> : <div className="field flex-1 !h-[21px]">{fullName(f0)}</div>}
              </div>
              <div className="etched-h my-1" />
              {row("Type:", multi ? "Multiple types" : typeName(f0))}
              {row("Location:", loc)}
              {row("Size:", `${formatBytes(total)} (${formatNumber(total)} bytes)`)}
              {!multi && row("MS-DOS name:", dosName(f0.name, f0.ext))}
              <div className="etched-h my-1.5" />
              {!multi && row("Created:", formatLongDate(f0.created))}
              {!multi && row("Modified:", formatLongDate(f0.modified))}
              {!multi && row("Accessed:", formatDate(f0.accessed, false))}
              <div className="etched-h my-1.5" />
              <div className="flex gap-2 items-start">
                <div className="w-[110px] flex-none">Attributes:</div>
                <div className="flex flex-col gap-1">
                  <Check label="&Read-only" checked={attrs.r} onChange={(v) => setAttrs({ ...attrs, r: v })} />
                  <Check label="Hi&dden" checked={attrs.h} onChange={(v) => setAttrs({ ...attrs, h: v })} />
                </div>
                <div className="flex flex-col gap-1 pl-4">
                  <Check label="&Archive" checked={attrs.a} onChange={(v) => setAttrs({ ...attrs, a: v })} />
                </div>
              </div>
            </div>
          )}
          {tabName === "Image" && (
            <div className="flex gap-3">
              <div className="flex-1 min-w-0">
                {row("Format:", FORMATS[f0.ext]?.type)}
                {row("Dimensions:", `${f0.w} x ${f0.h} pixels`)}
                {row("Color depth:", f0.bpp === 8 ? "8 bits (256 colors)" : "24 bits (True Color)")}
                {row("Compression:", f0.ext === "jpg" || f0.ext === "jpeg" ? "JPEG (Baseline, 4:2:0)" : f0.ext === "gif" ? "LZW" : f0.ext === "bmp" ? "None (RGB)" : f0.ext === "png" ? "Deflate" : f0.ext === "tif" || f0.ext === "tiff" ? "LZW" : "RLE")}
                {row("Resolution:", "72 x 72 dpi")}
                {row("Aspect ratio:", (f0.w / f0.h).toFixed(3) + " : 1")}
                {row("Megapixels:", ((f0.w * f0.h) / 1e6).toFixed(2))}
                {row("File size:", formatBytes(f0.size))}
                {row("Edits:", f0.edit.rot || f0.edit.flipH || f0.edit.flipV ? `Rotated ${f0.edit.rot}°${f0.edit.flipH ? ", flipped H" : ""}${f0.edit.flipV ? ", flipped V" : ""}` : "None")}
              </div>
              <div className="flex-none">
                <div className="sunken-thin bg-[#808080] p-1" style={{ width: 160, height: 122 }}>
                  <div className="w-full h-full flex items-center justify-center">
                    <EditedImage file={f0} w={box.w} h={box.h} thumb />
                  </div>
                </div>
              </div>
            </div>
          )}
          {tabName === "Camera" && (
            <div>
              <div className="pb-1 text-[#404040]">Exchangeable image file format (EXIF) data</div>
              {row("Camera make:", cam.make)}
              {row("Camera model:", cam.model)}
              {row("Date taken:", formatLongDate(f0.modified - 1000 * 61))}
              {row("Exposure time:", /sec/i.test(cam.exp) ? cam.exp : `${cam.exp} sec`)}
              {row("F-number:", `f/${cam.fn}`)}
              {row("ISO speed:", `ISO-${cam.iso}`)}
              {row("Focal length:", `${cam.focal} mm`)}
              {row("Metering mode:", cam.meter)}
              {row("Flash:", cam.flash)}
              {row("Software:", cam.software)}
              {row("Orientation:", "Top-left")}
            </div>
          )}
          {tabName === "Description" && (
            <div className="flex flex-col gap-2 h-full">
              <label>
                <Mn text="&Description:" />
              </label>
              <textarea className="field flex-1 !p-1" value={desc} onChange={(e) => setDesc(e.target.value)} style={{ minHeight: 100 }} />
              <label>
                <Mn text="&Keywords:" />
              </label>
              <input className="field" value={kw} onChange={(e) => setKw(e.target.value)} placeholder="e.g. vacation, family" />
            </div>
          )}
        </div>
      </Tabs>
      <DialogButtons>
        <Button def onClick={ok}>
          OK
        </Button>
        <Button onClick={app.closeDialog}>Cancel</Button>
        <Button onClick={apply}>Apply</Button>
      </DialogButtons>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
function SlideOptions({ draft, set }: { draft: Settings; set: (p: Partial<Settings>) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <GroupBox title="Timing">
        <div className="flex items-center gap-2">
          <span>Display each image for</span>
          <input type="number" min={1} max={60} className="field !w-[52px]" value={draft.slideDelay} onChange={(e) => set({ slideDelay: Math.max(1, Math.min(60, Number(e.target.value) || 1)) })} />
          <span>seconds</span>
        </div>
        <input type="range" className="w98 mt-1" min={1} max={20} value={Math.min(20, draft.slideDelay)} onChange={(e) => set({ slideDelay: Number(e.target.value) })} />
      </GroupBox>
      <GroupBox title="Transition effect">
        <div className="flex gap-4 flex-wrap">
          {(
            [
              ["none", "&None"],
              ["fade", "&Fade"],
              ["slide", "S&lide"],
              ["wipe", "&Wipe"],
            ] as const
          ).map(([v, l]) => (
            <Radio key={v} name="trans" label={l} checked={draft.slideTransition === v} onChange={() => set({ slideTransition: v })} />
          ))}
        </div>
      </GroupBox>
      <div className="flex flex-col gap-1.5 pl-1">
        <Check label="&Loop continuously" checked={draft.slideLoop} onChange={(v) => set({ slideLoop: v })} />
        <Check label="&Random order" checked={draft.slideRandom} onChange={(v) => set({ slideRandom: v })} />
        <Check label="Show file &name caption" checked={draft.slideCaption} onChange={(v) => set({ slideCaption: v })} />
      </div>
    </div>
  );
}

export function SlideShowDialog() {
  const app = useApp();
  const [draft, setDraft] = useState(app.settings);
  const set = (p: Partial<Settings>) => setDraft((d) => ({ ...d, ...p }));
  const apply = () =>
    app.setSettings({
      slideDelay: draft.slideDelay,
      slideTransition: draft.slideTransition,
      slideLoop: draft.slideLoop,
      slideRandom: draft.slideRandom,
      slideCaption: draft.slideCaption,
    });
  const start = () => {
    apply();
    app.closeDialog();
    setTimeout(() => app.startSlideshow(), 30);
  };
  return (
    <Dialog title="Slide Show Options" icon="slideshow" width={360} onClose={app.closeDialog} onEnter={start}>
      <SlideOptions draft={draft} set={set} />
      <DialogButtons>
        <Button def onClick={start}>
          &Start
        </Button>
        <Button
          onClick={() => {
            apply();
            app.closeDialog();
          }}
        >
          OK
        </Button>
        <Button onClick={app.closeDialog}>Cancel</Button>
      </DialogButtons>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
export function OptionsDialog({ tab: initialTab = 0 }: { tab?: number }) {
  const app = useApp();
  const [tab, setTab] = useState(initialTab);
  const [draft, setDraft] = useState<Settings>({ ...app.settings, formats: { ...app.settings.formats } });
  const set = (p: Partial<Settings>) => setDraft((d) => ({ ...d, ...p }));
  const apply = () => app.setSettings(draft);
  const ok = () => {
    apply();
    app.closeDialog();
  };
  const reset = () => setDraft({ ...defaultSettings, formats: { ...defaultSettings.formats } });

  return (
    <Dialog title="Options" icon="settings" width={400} onClose={app.closeDialog} onEnter={ok}>
      <Tabs tabs={["&Browser", "&Viewer", "&Slide Show", "File &Formats"]} value={tab} onChange={setTab}>
        <div style={{ height: 306 }} className="overflow-hidden">
          {tab === 0 && (
            <div className="flex flex-col gap-1.5">
              <GroupBox title="Thumbnails">
                <div className="flex items-center gap-2">
                  <span>Size:</span>
                  <input type="range" className="w98 flex-1" min={48} max={160} step={8} value={draft.thumbSize} onChange={(e) => set({ thumbSize: Number(e.target.value) })} />
                  <span className="w-[42px] text-right">{draft.thumbSize} px</span>
                </div>
                <div className="flex gap-4 mt-1.5">
                  <Check label="Show file &names" checked={draft.showNames} onChange={(v) => set({ showNames: v })} />
                  <Check label="Show file &info" checked={draft.showInfo} onChange={(v) => set({ showInfo: v })} />
                </div>
              </GroupBox>
              <GroupBox title="Appearance">
                <div className="flex items-center gap-2">
                  <span>Background color:</span>
                  <select className="field" value={draft.thumbBg} onChange={(e) => set({ thumbBg: e.target.value as Settings["thumbBg"] })} style={{ width: 120 }}>
                    <option value="white">White</option>
                    <option value="gray">Gray (3D face)</option>
                    <option value="black">Black</option>
                    <option value="teal">Teal</option>
                  </select>
                </div>
              </GroupBox>
              <GroupBox title="Files and folders">
                <div className="flex flex-col gap-1.5">
                  <Check label="Show &folders in the file list" checked={draft.showFolders} onChange={(v) => set({ showFolders: v })} />
                  <Check label="Show &hidden files" checked={draft.showHidden} onChange={(v) => set({ showHidden: v })} />
                  <Check label="&Confirm file deletions" checked={draft.confirmDelete} onChange={(v) => set({ confirmDelete: v })} />
                  <Check label="Move deleted files to the &Recycle Bin" checked={draft.useRecycle} onChange={(v) => set({ useRecycle: v })} />
                  {app.desktopMode && (
                    <div className="text-[#404040] leading-[13px]">
                      Desktop builds send deleted files to the system Trash / Recycle Bin.
                    </div>
                  )}
                </div>
              </GroupBox>
            </div>
          )}
          {tab === 1 && (
            <div className="flex flex-col gap-1.5">
              <GroupBox title="Display">
                <div className="flex items-center gap-2 mb-2">
                  <span>Background color:</span>
                  <select className="field" value={draft.viewerBg} onChange={(e) => set({ viewerBg: e.target.value as Settings["viewerBg"] })} style={{ width: 120 }}>
                    <option value="black">Black</option>
                    <option value="gray">Gray</option>
                    <option value="teal">Teal</option>
                    <option value="white">White</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Check label="&Fit image to window" checked={draft.fitToWindow} onChange={(v) => set({ fitToWindow: v })} />
                  <Check label="&Do not enlarge images smaller than the window" checked={draft.noEnlarge} onChange={(v) => set({ noEnlarge: v })} disabled={!draft.fitToWindow} />
                </div>
              </GroupBox>
              <GroupBox title="Mouse wheel">
                <div className="flex flex-col gap-1.5">
                  <Radio name="wheel" label="&Navigate to next / previous image" checked={draft.wheelMode === "navigate"} onChange={() => set({ wheelMode: "navigate" })} />
                  <Radio name="wheel" label="&Zoom in / out" checked={draft.wheelMode === "zoom"} onChange={() => set({ wheelMode: "zoom" })} />
                </div>
                <div className="mt-1 text-[#404040]">Hold Ctrl to always zoom with the wheel.</div>
              </GroupBox>
            </div>
          )}
          {tab === 2 && <SlideOptions draft={draft} set={set} />}
          {tab === 3 && (
            <div>
              <div className="pb-1">Show these image formats in the Browser:</div>
              <div className="sunken bg-white overflow-auto" style={{ height: 200 }}>
                {FORMAT_LIST.map((f) => (
                  <label key={f.ext} className="flex items-center gap-2 px-1.5 h-[20px] hover:bg-[#000080] hover:text-white">
                    <span className="chk">
                      <input type="checkbox" checked={draft.formats[f.ext] !== false} onChange={(e) => set({ formats: { ...draft.formats, [f.ext]: e.target.checked } })} />
                    </span>
                    <Icon name={`img:${f.ext}`} />
                    <span className="w-[60px]">{f.short}</span>
                    <span>(*.{f.ext}) — {f.type}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <Button small onClick={() => set({ formats: Object.fromEntries(FORMAT_LIST.map((f) => [f.ext, true])) })}>Select All</Button>
                <Button small onClick={() => set({ formats: Object.fromEntries(FORMAT_LIST.map((f) => [f.ext, false])) })}>Clear All</Button>
              </div>
            </div>
          )}
        </div>
      </Tabs>
      <DialogButtons>
        <Button onClick={reset} className="mr-auto">Defaults</Button>
        <Button def onClick={ok}>
          OK
        </Button>
        <Button onClick={app.closeDialog}>Cancel</Button>
        <Button onClick={apply}>Apply</Button>
      </DialogButtons>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
const TIPS = [
  "Double-click any thumbnail to open it in the ACDSee Viewer. Press Esc to return to the Browser.",
  "Hold Ctrl and click to select several images, or Shift and click to select a range. You can also drag a rubber band around thumbnails.",
  "Drag thumbnails onto a folder in the tree to move them. Hold Ctrl while dropping to copy instead.",
  "Press F2 to rename the selected file, or select several files and press F2 for the Batch Rename dialog.",
  "In the Viewer, press the Enter key to switch to full-screen mode. Left-click advances, right-click goes back.",
  "Use Ctrl+L and Ctrl+R to rotate the selected images. The thumbnails update immediately.",
  "Use Tools ▸ Find Files (F3) to search every folder by name, type, date or file size.",
  "Choose View ▸ Filmstrip to see a large preview of the current image above a strip of thumbnails.",
  "Right-click the desktop wallpaper menu entries to Center, Tile or Stretch an image. Minimize ACDSee to see the result.",
  "Press Space in a slide show to pause. Press Esc to stop.",
];

export function TipDialog() {
  const app = useApp();
  const [i, setI] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [show, setShow] = useState(true);
  return (
    <Dialog title="Tip of the Day" icon="info" width={400} onClose={app.closeDialog} onEnter={app.closeDialog}>
      <div className="flex">
        <div className="flex-none w-[76px] bg-[#808080] flex flex-col items-center justify-start pt-3 text-white gap-1" style={{ boxShadow: "inset 1px 1px #404040" }}>
          <Icon name="wizard" size={32} style={{ filter: "drop-shadow(1px 1px 0 #000)" }} />
          <div className="font-bold text-center leading-[13px]">Did you know...</div>
        </div>
        <div className="flex-1 bg-white sunken-thin p-3 min-h-[120px] leading-[15px]" style={{ fontSize: 11 }}>
          <div className="font-bold text-[12px] mb-2">Did you know...</div>
          {TIPS[i]}
        </div>
      </div>
      <div className="flex items-center justify-between pt-3">
        <Check label="&Show tips at startup" checked={show} onChange={setShow} />
        <div className="flex gap-2">
          <Button onClick={() => setI((i + 1) % TIPS.length)}>&Next Tip</Button>
          <Button def onClick={app.closeDialog}>
            &Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
export function RenameDialog({ id }: { id: string }) {
  const app = useApp();
  const f = app.getFile(id);
  const [v, setV] = useState(f ? fullName(f) : "");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const dot = v.lastIndexOf(".");
    el.setSelectionRange(0, dot > 0 ? dot : v.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!f) return null;
  const ok = () => {
    if (app.renameFile(id, v)) app.closeDialog();
  };
  return (
    <Dialog title="Rename" icon="rename" width={320} onClose={app.closeDialog} onEnter={ok}>
      <div className="p-1 flex flex-col gap-2">
        <label>
          <Mn text="Rename '" />
          {fullName(f)}
          <Mn text="' to:" />
        </label>
        <input ref={ref} className="field" value={v} onChange={(e) => setV(e.target.value)} spellCheck={false} />
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

export function NewFolderDialog({ parent }: { parent: string }) {
  const app = useApp();
  const [v, setV] = useState("New Folder");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const ok = () => {
    void app.createFolder(parent, v).then((id) => {
      if (id) {
        app.closeDialog();
        if (parent === app.folderId) app.setSelection([id], id);
      }
    });
  };
  return (
    <Dialog title="New Folder" icon="newFolder" width={320} onClose={app.closeDialog} onEnter={ok}>
      <div className="p-1 flex flex-col gap-2">
        <div>
          Create a new folder in <b>{pathOf(app.folders, parent)}</b>
        </div>
        <label>
          <Mn text="Folder &name:" />
        </label>
        <input ref={ref} className="field" value={v} onChange={(e) => setV(e.target.value)} spellCheck={false} />
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
export function RunDialog() {
  const app = useApp();
  const shell = useShell();
  const [v, setV] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const ok = () => {
    app.closeDialog();
    const err = shell.runCommand(v);
    if (err) setTimeout(() => app.msg(v, err, "error"), 50);
  };
  return (
    <Dialog title="Run" icon="run" width={380} onClose={app.closeDialog} onEnter={ok}>
      <div className="flex gap-3 p-1">
        <Icon name="run" size={32} />
        <div className="leading-[14px]">Type the name of a program, folder, document, or Internet resource, and Windows will open it for you.</div>
      </div>
      <div className="flex items-center gap-2 px-1 pt-3">
        <label className="w-[40px]">
          <Mn text="&Open:" />
        </label>
        <input ref={ref} className="field flex-1" value={v} onChange={(e) => setV(e.target.value)} spellCheck={false} placeholder="acdsee, C:\My Documents\My Pictures\Pets" />
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
export function PrintDialog({ ids }: { ids: string[] }) {
  const app = useApp();
  const files = ids.map((i) => app.getFile(i)).filter(Boolean) as FileEntry[];
  const [printer, setPrinter] = useState("HP LaserJet 4L");
  const [copies, setCopies] = useState(1);
  const [layout, setLayout] = useState<"full" | "two" | "sheet">("full");
  const [names, setNames] = useState(true);
  const [prog, setProg] = useState<number | null>(null);

  useEffect(() => {
    if (prog === null) return;
    if (prog >= 100) {
      const t = setTimeout(() => {
        void app.printFiles(ids).then(() => {
          app.closeDialog();
          app.msg("ACDSee", `${files.length} image${files.length > 1 ? "s were" : " was"} sent to ${printer}.`, "info");
        });
      }, 300);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setProg(prog + 8), 90);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prog]);

  const cols = layout === "full" ? 1 : layout === "two" ? 1 : 4;
  const rows = layout === "full" ? 1 : layout === "two" ? 2 : 5;
  const cells = Array.from({ length: cols * rows });

  if (prog !== null) {
    return (
      <Dialog title="Printing" icon="print" width={320} onClose={() => {}} noClose>
        <div className="p-2 flex flex-col gap-2">
          <div>Printing {files.length} image(s) on {printer}...</div>
          <Progress value={prog} />
          <div className="flex justify-center pt-1">
            <Button onClick={app.closeDialog}>Cancel</Button>
          </div>
        </div>
      </Dialog>
    );
  }
  return (
    <Dialog title="Print" icon="print" width={430} onClose={app.closeDialog} onEnter={() => setProg(0)}>
      <div className="flex gap-3">
        <div className="flex-1 flex flex-col gap-2">
          <GroupBox title="Printer">
            <div className="flex items-center gap-2">
              <label className="w-[40px]">Name:</label>
              <select className="field flex-1" value={printer} onChange={(e) => setPrinter(e.target.value)}>
                <option>HP LaserJet 4L</option>
                <option>Epson Stylus Color 600</option>
                <option>Canon BJC-4300</option>
                <option>Microsoft Fax</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-[#404040]">
              <label className="w-[40px]">Status:</label> Ready — on LPT1:
            </div>
          </GroupBox>
          <GroupBox title="Layout">
            <div className="flex flex-col gap-1.5">
              <Radio name="lay" label="&Full page" checked={layout === "full"} onChange={() => setLayout("full")} />
              <Radio name="lay" label="&Two per page" checked={layout === "two"} onChange={() => setLayout("two")} />
              <Radio name="lay" label="&Contact sheet (4 x 5)" checked={layout === "sheet"} onChange={() => setLayout("sheet")} />
            </div>
          </GroupBox>
          <div className="flex items-center gap-2 pl-1">
            <label>
              <Mn text="Number of &copies:" />
            </label>
            <input type="number" min={1} max={99} className="field !w-[52px]" value={copies} onChange={(e) => setCopies(Math.max(1, Number(e.target.value) || 1))} />
          </div>
          <Check className="pl-1" label="Print file &names" checked={names} onChange={setNames} />
        </div>
        <div className="flex-none w-[120px] flex flex-col items-center pt-1">
          <div className="bg-white p-1.5 grid gap-1" style={{ width: 96, height: 124, gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, boxShadow: "1px 1px 0 1px #404040, 0 0 0 1px #808080" }}>
            {cells.map((_, i) => {
              const f = files[i % files.length];
              return (
                <div key={i} className="overflow-hidden flex items-center justify-center bg-[#e8e8e8]">
                  {f && <img src={f.src || f.fullSrc} alt="" className="max-w-full max-h-full object-contain" />}
                </div>
              );
            })}
          </div>
          <div className="pt-1 text-[#404040]">{files.length} image(s)</div>
        </div>
      </div>
      <DialogButtons>
        <Button def onClick={() => setProg(0)}>
          OK
        </Button>
        <Button onClick={app.closeDialog}>Cancel</Button>
      </DialogButtons>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
export function AcquireDialog() {
  const app = useApp();
  const [src, setSrc] = useState(0);
  const [prog, setProg] = useState<number | null>(null);
  const sources = ["Kodak DC210 Zoom Digital Camera (TWAIN)", "HP ScanJet 4c / 5p (TWAIN)", "Microsoft WIA-Compatible Scanner", "UMAX Astra 1220S (TWAIN)"];

  useEffect(() => {
    if (prog === null) return;
    if (prog >= 100) {
      void app.acquireImage().then((ok) => {
        app.closeDialog();
        if (ok) {
          window.setTimeout(
            () =>
              app.msg(
                "ACDSee",
                `Acquired 1 image from ${sources[src]}.\n\nSaved to ${pathOf(app.folders, app.folderId)}.`,
                "info"
              ),
            40
          );
        }
      });
      return;
    }
    const t = setTimeout(() => setProg(prog + 5), 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prog]);

  if (prog !== null) {
    return (
      <Dialog title="Acquiring" icon="acquire" width={320} onClose={() => {}} noClose>
        <div className="p-2 flex flex-col gap-2">
          <div>Scanning from {sources[src]}...</div>
          <Progress value={prog} />
          <div className="flex justify-center pt-1">
            <Button onClick={app.closeDialog}>Cancel</Button>
          </div>
        </div>
      </Dialog>
    );
  }
  const writable = app.canWriteTo(app.folderId) && app.folder.kind !== "recycle";
  return (
    <Dialog title="Select Source" icon="acquire" width={360} onClose={app.closeDialog} onEnter={() => writable && setProg(0)}>
      <div className="p-1 flex flex-col gap-2">
        <label>
          <Mn text="&Select the source to acquire images from:" />
        </label>
        <div className="sunken bg-white" style={{ height: 110 }}>
          {sources.map((s, i) => (
            <div key={s} className={`px-1.5 h-[18px] flex items-center gap-1.5 ${i === src ? "bg-[#000080] text-white" : ""}`} onClick={() => setSrc(i)} onDoubleClick={() => writable && setProg(0)}>
              <Icon name="acquire" />
              {s}
            </div>
          ))}
        </div>
        <div className="text-[#404040] leading-[14px]">
          {writable ? <>Images will be saved to <b>{pathOf(app.folders, app.folderId)}</b>.</> : "Choose a writable folder in the Browser first."}
        </div>
      </div>
      <DialogButtons>
        <Button def disabled={!writable} onClick={() => setProg(0)}>
          &Select
        </Button>
        <Button onClick={app.closeDialog}>Cancel</Button>
      </DialogButtons>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
export function FileListDialog({ text }: { text: string }) {
  const app = useApp();
  const [value, setValue] = useState(text);
  return (
    <Dialog title="Generate File List" icon="docs" width={520} onClose={app.closeDialog} onEnter={app.closeDialog}>
      <div className="p-1 flex flex-col gap-2">
        <div className="text-[#404040]">One row per image — name, dimensions, bytes and folder, tab separated.</div>
        <textarea
          className="field"
          style={{ height: 300, whiteSpace: "pre", fontFamily: "Consolas, monospace" }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          spellCheck={false}
        />
      </div>
      <DialogButtons>
        <Button
          className="mr-auto"
          onClick={() => {
            void navigator.clipboard?.writeText(value);
            app.msg("File List", "The file list was copied to the clipboard.", "info");
          }}
        >
          Copy to Clipboard
        </Button>
        <Button def onClick={app.closeDialog}>
          Close
        </Button>
      </DialogButtons>
    </Dialog>
  );
}
