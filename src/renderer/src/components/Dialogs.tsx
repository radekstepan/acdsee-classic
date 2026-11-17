import { useEffect, useState, type ReactNode } from "react";
import { folderPathString, formatBytes, formatDate, folderById, imageTransform, type Photo } from "../data";
import { platformName } from "../lib/bridge";
import { CONVERT_FORMATS } from "../lib/imaging";

function shortLocation(folderId: string): string {
  const chain: string[] = [];
  let current = folderById(folderId);
  let guard = 0;
  while (current && guard++ < 20) {
    chain.unshift(current.name);
    current = current.parent ? folderById(current.parent) : undefined;
  }
  return chain.slice(-2).join(" \\ ");
}
import { BrandIcon, FileTypeIcon, FolderGlyph } from "../icons";

export type DialogState =
  | { kind: "rename"; ids: string[]; current: string }
  | { kind: "delete"; ids: string[]; names: string[]; trash: string; fromRecycle: boolean }
  | { kind: "transfer"; mode: "copy" | "move"; ids: string[] }
  | { kind: "convert"; ids: string[] }
  | { kind: "properties"; id: string }
  | { kind: "find"; initial: string }
  | { kind: "about" }
  | { kind: "options" }
  | { kind: "resize"; id: string; width: number; height: number }
  | { kind: "series"; ids: string[]; firstName: string }
  | { kind: "print"; ids: string[] }
  | { kind: "filelist"; text: string }
  | { kind: "feedback"; title: string; message: string };

type Props = {
  dialog: DialogState;
  photos: Photo[];
  folders: { id: string; name: string; parent: string | null }[];
  picturesId: string;
  onClose: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onTransfer: (target: string, mode: "copy" | "move") => void;
  onConvert: (format: string, quality: number, folder: string) => void;
  onFind: (query: string) => void;
  onResize: (width: number, height: number) => void;
  onSeries: (prefix: string, start: number, digits: number) => void;
  onPrint: (printer: string, copies: number) => void;
  onNotify: (message: string, title?: string) => void;
  onOpenViewer: (id: string) => void;
  onSetWallpaper: (photo: Photo) => void;
};

function DialogShell({
  title,
  width = 400,
  children,
  footer,
  onClose,
}: {
  title: string;
  icon?: string;
  width?: number;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop">
      <div className="dialog-window" style={{ width }} role="dialog" aria-modal="true" aria-label={title}>
        <div className="titlebar dialog-titlebar">
          <div className="titlebar-left">
            <BrandIcon size={15} />
            <span className="titlebar-text">{title}</span>
          </div>
          <div className="window-controls">
            <button type="button" className="wc-button close" onClick={onClose} title="Close">
              <span className="wc-x">×</span>
            </button>
          </div>
        </div>
        <div className="dialog-content">{children}</div>
        <div className="dialog-footer">{footer}</div>
      </div>
    </div>
  );
}

const OkCancel = ({
  okLabel = "OK",
  cancelLabel = "Cancel",
  onOk,
  onClose,
  okDisabled,
}: {
  okLabel?: string;
  cancelLabel?: string;
  onOk: () => void;
  onClose: () => void;
  okDisabled?: boolean;
}) => (
  <>
    <button type="button" className="classic-button default" onClick={onOk} disabled={okDisabled}>
      {okLabel}
    </button>
    <button type="button" className="classic-button" onClick={onClose}>
      {cancelLabel}
    </button>
  </>
);

function FolderSelect({
  value,
  onChange,
  folders,
  disabledIds,
}: {
  value: string;
  onChange: (id: string) => void;
  folders: { id: string; name: string; parent: string | null }[];
  disabledIds?: string[];
}) {
  return (
    <div className="folder-select-box">
      <div className="folder-select-head">Look in:</div>
      <div className="folder-select-list">
        {folders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            className={`folder-select-row ${value === folder.id ? "selected" : ""}`}
            onClick={() => onChange(folder.id)}
            disabled={disabledIds?.includes(folder.id)}
          >
            <FolderGlyph icon={folder.id === "recycle-bin" ? "recycle" : folder.id.includes("drive") ? "drive" : "folder"} size={15} />
            <span>{folder.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RenameDialog({ ids, current, onConfirm, onClose }: { ids: string[]; current: string; onConfirm: (name: string) => void; onClose: () => void }) {
  const [value, setValue] = useState(current);
  const ext = current.includes(".") ? current.slice(current.lastIndexOf(".")) : "";
  const base = ext ? current.slice(0, -ext.length) : current;
  return (
    <DialogShell
      title="Rename File"
      width={394}
      onClose={onClose}
      footer={<OkCancel onOk={() => value.trim() && onConfirm(value.trim())} onClose={onClose} okDisabled={!value.trim()} />}
    >
      <div className="dialog-row">
        <div className="dialog-icon-large">
          <FileTypeIcon size={40} />
        </div>
        <div className="dialog-copy">
          <p className="dialog-lead">Rename {ids.length > 1 ? `${ids.length} selected files` : "this file"}:</p>
          <div className="field-row">
            <label htmlFor="new-name">New name:</label>
            <div className="input-with-ext">
              <input
                id="new-name"
                className="classic-input"
                value={ext && value.endsWith(ext) ? value.slice(0, value.length - ext.length) : value}
                autoFocus
                onChange={(event) => setValue(event.target.value + ext)}
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onConfirm(value.trim());
                }}
              />
              <span className="file-ext">{base ? ext : ""}</span>
            </div>
          </div>
          <p className="dialog-hint">The file name can contain letters, numbers, and spaces.</p>
        </div>
      </div>
    </DialogShell>
  );
}

function DeleteDialog({ names, trash, fromRecycle, onConfirm, onClose }: { names: string[]; trash: string; fromRecycle: boolean; onConfirm: () => void; onClose: () => void }) {
  const [confirm, setConfirm] = useState(true);
  const count = names.length;
  return (
    <DialogShell
      title="Confirm File Delete"
      width={408}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="classic-button default" onClick={() => confirm && onConfirm()} disabled={!confirm}>
            {fromRecycle ? "Delete" : "Yes"}
          </button>
          <button type="button" className="classic-button" onClick={onClose}>
            No
          </button>
        </>
      }
    >
      <div className="confirm-layout">
        <div className="warning-icon">!</div>
        <div>
          <p className="dialog-lead">
            {fromRecycle
              ? `Are you sure you want to permanently delete ${count === 1 ? "this file" : `these ${count} files`}?`
              : `Are you sure you want to send ${count === 1 ? "this file" : `these ${count} files`} to the ${trash}?`}
          </p>
          <ul className="delete-file-list">
            {names.slice(0, 4).map((name, i) => (
              <li key={`${name}-${i}`}>
                <FileTypeIcon size={13} /> {i === 3 && count > 4 ? `...and ${count - 3} more` : name}
              </li>
            ))}
          </ul>
          {!fromRecycle && (
            <label className="checkbox-row">
              <input type="checkbox" checked={confirm} onChange={(event) => setConfirm(event.target.checked)} /> Use the {trash}
            </label>
          )}
          {fromRecycle && <p className="dialog-hint small">This action cannot be undone.</p>}
        </div>
      </div>
    </DialogShell>
  );
}

function TransferDialog({
  mode,
  count,
  folders,
  onConfirm,
  onClose,
}: {
  mode: "copy" | "move";
  count: number;
  folders: { id: string; name: string; parent: string | null }[];
  onConfirm: (target: string, mode: "copy" | "move") => void;
  onClose: () => void;
}) {
  const [target, setTarget] = useState(folders[0]?.id ?? "");
  const verb = mode === "copy" ? "Copy" : "Move";
  return (
    <DialogShell
      title={`${verb} ${count === 1 ? "File" : `${count} Files`} to Folder`}
      width={416}
      onClose={onClose}
      footer={<OkCancel okLabel={verb} onOk={() => target && onConfirm(target, mode)} onClose={onClose} okDisabled={!target} />}
    >
      <p className="dialog-lead">{verb} the selected image{count === 1 ? "" : "s"} to the folder selected below:</p>
      <FolderSelect value={target} onChange={setTarget} folders={folders} />
      <p className="dialog-hint">Name clashes are renamed automatically with a (2) suffix.</p>
    </DialogShell>
  );
}

function ConvertDialog({ count, picturesId, onConfirm, onClose }: { count: number; picturesId: string; onConfirm: (format: string, quality: number, folder: string) => void; onClose: () => void }) {
  const [format, setFormat] = useState("JPEG");
  const [quality, setQuality] = useState(85);
  const [folder, setFolder] = useState("same-folder");
  return (
    <DialogShell
      title="Convert Image Files"
      width={452}
      onClose={onClose}
      footer={<OkCancel okLabel="Start" onOk={() => onConfirm(format, quality, folder)} onClose={onClose} />}
    >
      <div className="group-box">
        <div className="group-title">Output format</div>
        <div className="format-grid">
          {CONVERT_FORMATS.map((f) => (
            <label className={`format-option ${format === f.id ? "active" : ""}`} key={f.id}>
              <input type="radio" name="format" checked={format === f.id} onChange={() => setFormat(f.id)} />
              <FileTypeIcon type={f.id} size={18} />
              <span>{f.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="dialog-columns">
        <div className="group-box">
          <div className="group-title">JPEG options</div>
          <label className="slider-label" htmlFor="quality">
            Quality: <strong>{quality}%</strong>
          </label>
          <input id="quality" type="range" min="10" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} className="classic-slider" />
          <div className="range-labels">
            <span>Low</span>
            <span>High</span>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" defaultChecked /> Preserve EXIF data
          </label>
        </div>
        <div className="group-box">
          <div className="group-title">Output</div>
          <label className="radio-row">
            <input type="radio" name="output" checked={folder === "same-folder"} onChange={() => setFolder("same-folder")} /> Current folder
          </label>
          <label className="radio-row">
            <input type="radio" name="output" checked={folder === picturesId} onChange={() => setFolder(picturesId)} /> My Pictures
          </label>
          <label className="checkbox-row">
            <input type="checkbox" /> Replace originals
          </label>
          <p className="dialog-hint">{count} file{count === 1 ? "" : "s"} in this batch.</p>
        </div>
      </div>
    </DialogShell>
  );
}

function FindDialog({ initial, onFind, onClose }: { initial: string; onFind: (query: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState(initial);
  const [where, setWhere] = useState("current");
  return (
    <DialogShell
      title="Find Files"
      width={416}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="classic-button default" onClick={() => onFind(query)}>
            Find Now
          </button>
          <button type="button" className="classic-button" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <div className="dialog-row">
        <div className="dialog-icon-large find-large">🔍</div>
        <div className="dialog-copy">
          <label className="field-label" htmlFor="find-name">
            Named:
          </label>
          <input
            id="find-name"
            className="classic-input wide"
            value={query}
            placeholder="*.jpg"
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onFind(query);
            }}
          />
          <label className="field-label">Look in:</label>
          <select className="classic-select" value={where} onChange={(event) => setWhere(event.target.value)}>
            <option value="current">Current folder</option>
            <option value="all">My Pictures (including subfolders)</option>
            <option value="computer">My Computer</option>
          </select>
          <fieldset className="find-fieldset">
            <legend>Options</legend>
            <label className="checkbox-row">
              <input type="checkbox" /> Include subfolders
            </label>
            <label className="checkbox-row">
              <input type="checkbox" /> Search hidden files
            </label>
            <label className="checkbox-row">
              <input type="checkbox" /> Match case
            </label>
          </fieldset>
        </div>
      </div>
    </DialogShell>
  );
}

function PropertiesDialog({ photo, onClose, onOpen, onWallpaper }: { photo: Photo; onClose: () => void; onOpen: () => void; onWallpaper: () => void }) {
  const [tab, setTab] = useState<"general" | "image" | "metadata">("general");
  return (
    <DialogShell
      title={`${photo.name} Properties`}
      width={448}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="classic-button default" onClick={onClose}>
            OK
          </button>
          <button type="button" className="classic-button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="classic-button" onClick={onOpen} style={{ marginLeft: 8 }}>
            Open
          </button>
        </>
      }
    >
      <div className="prop-tabs">
        {(["general", "image", "metadata"] as const).map((key) => (
          <button type="button" key={key} className={`prop-tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
            {key[0].toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>
      {tab === "general" && (
        <div className="prop-general">
          <div className="prop-preview">
            <img src={photo.fullSrc || photo.src} alt={photo.name} style={{ transform: imageTransform(photo) }} />
          </div>
          <div className="prop-fields">
            <div className="prop-file-name">
              <FileTypeIcon type={photo.format} size={20} />
              <strong>{photo.name}</strong>
            </div>
            <dl className="property-list compact">
              <dt>Type of file</dt>
              <dd>{photo.format} Image</dd>
              <dt>Location</dt>
              <dd title={folderPathString(photo.folderId)}>{shortLocation(photo.folderId)}</dd>
              <dt>Size</dt>
              <dd>{photo.size.toLocaleString()} bytes ({formatBytes(photo.size)})</dd>
              <dt>Modified</dt>
              <dd>{formatDate(photo.date)}</dd>
              <dt>Attributes</dt>
              <dd>Read-only · Archive</dd>
            </dl>
          </div>
        </div>
      )}
      {tab === "image" && (
        <div className="prop-general">
          <div className="prop-preview">
            <img src={photo.fullSrc || photo.src} alt={photo.name} style={{ transform: imageTransform(photo) }} />
          </div>
          <dl className="property-list compact">
            <dt>Dimensions</dt>
            <dd>
              {photo.width} × {photo.height} pixels
            </dd>
            <dt>Width</dt>
            <dd>{photo.width} pixels</dd>
            <dt>Height</dt>
            <dd>{photo.height} pixels</dd>
            <dt>Resolution</dt>
            <dd>72 × 72 dpi</dd>
            <dt>Color depth</dt>
            <dd>24-bit color</dd>
            <dt>Compression</dt>
            <dd>JPEG ({photo.format === "JPEG" ? "lossy" : "none"})</dd>
          </dl>
        </div>
      )}
      {tab === "metadata" && (
        <div>
          <dl className="property-list compact wide">
            <dt>Camera make</dt>
            <dd>{photo.make}</dd>
            <dt>Camera model</dt>
            <dd>{photo.camera}</dd>
            <dt>Exposure time</dt>
            <dd>{photo.exposure}</dd>
            <dt>Aperture</dt>
            <dd>{photo.aperture}</dd>
            <dt>ISO speed</dt>
            <dd>{photo.iso}</dd>
            <dt>Focal length</dt>
            <dd>{photo.focal}</dd>
            <dt>Flash</dt>
            <dd>{photo.flash}</dd>
            <dt>Date taken</dt>
            <dd>{formatDate(photo.date)}</dd>
            <dt>Description</dt>
            <dd title={photo.path || undefined}>{photo.path || "Demo image from the sample library."}</dd>
          </dl>
          <div className="prop-footer-actions">
            <button type="button" className="classic-button" onClick={onWallpaper}>
              Set as Wallpaper
            </button>
          </div>
        </div>
      )}
    </DialogShell>
  );
}

function ResizeDialog({ photo, width, height, onConfirm, onClose }: { photo: Photo; width: number; height: number; onConfirm: (w: number, h: number) => void; onClose: () => void }) {
  const [w, setW] = useState(width);
  const [h, setH] = useState(height);
  const [keepAspect, setKeepAspect] = useState(true);
  const ratio = photo.width / photo.height;
  const updateW = (value: number) => {
    setW(value);
    if (keepAspect) setH(Math.max(1, Math.round(value / ratio)));
  };
  const updateH = (value: number) => {
    setH(value);
    if (keepAspect) setW(Math.max(1, Math.round(value * ratio)));
  };
  const pct = Math.round((w / photo.width) * 100);
  return (
    <DialogShell
      title="Resize Image"
      width={390}
      onClose={onClose}
      footer={<OkCancel okLabel="Resize" onOk={() => onConfirm(w, h)} onClose={onClose} />}
    >
      <div className="dialog-row">
        <div className="dialog-icon-large">
          <img src={photo.src} alt="" className="dialog-thumb" />
        </div>
        <div className="dialog-copy">
          <p className="dialog-lead">Original size: {photo.width} × {photo.height} pixels</p>
          <div className="resize-grid">
            <label htmlFor="resize-w">Width:</label>
            <input id="resize-w" type="number" className="classic-input number" value={w} onChange={(event) => updateW(Number(event.target.value))} />
            <span>pixels</span>
            <label htmlFor="resize-h">Height:</label>
            <input id="resize-h" type="number" className="classic-input number" value={h} onChange={(event) => updateH(Number(event.target.value))} />
            <span>pixels</span>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={keepAspect} onChange={(event) => setKeepAspect(event.target.checked)} /> Preserve aspect ratio
          </label>
          <p className="dialog-hint">New size is {isFinite(pct) ? pct : 0}% of the original.</p>
        </div>
      </div>
    </DialogShell>
  );
}

function SeriesDialog({ firstName, onConfirm, onClose }: { firstName: string; onConfirm: (prefix: string, start: number, digits: number) => void; onClose: () => void }) {
  const base = firstName.replace(/\.[^.]+$/, "").replace(/[0-9]+$/, "").replace(/[\s_-]+$/, "");
  const [prefix, setPrefix] = useState(base || "Vacation");
  const [start, setStart] = useState(1);
  const [digits, setDigits] = useState(3);
  const next = `${prefix} ${String(start).padStart(digits, "0")}.jpg`;
  return (
    <DialogShell
      title="Rename Series"
      width={380}
      onClose={onClose}
      footer={<OkCancel okLabel="Rename" onOk={() => onConfirm(prefix, start, digits)} onClose={onClose} />}
    >
      <p className="dialog-lead">Create a numbered sequence for the selected files.</p>
      <div className="form-grid">
        <label htmlFor="series-prefix">Template:</label>
        <input id="series-prefix" className="classic-input" value={prefix} onChange={(event) => setPrefix(event.target.value)} />
        <label htmlFor="series-start">Start at:</label>
        <input id="series-start" type="number" min="1" className="classic-input number" value={start} onChange={(event) => setStart(Math.max(1, Number(event.target.value)))} />
        <label htmlFor="series-digits">Digits:</label>
        <select id="series-digits" className="classic-select small" value={digits} onChange={(event) => setDigits(Number(event.target.value))}>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>
      </div>
      <div className="group-box preview-box">
        <div className="group-title">Example</div>
        <div className="series-example">
          <FileTypeIcon size={14} /> {next}
        </div>
      </div>
    </DialogShell>
  );
}

function PrintDialog({ count, onConfirm, onClose }: { count: number; onConfirm: (printer: string, copies: number) => void; onClose: () => void }) {
  const [printer, setPrinter] = useState("HP DeskJet 970Cse");
  const [copies, setCopies] = useState(1);
  return (
    <DialogShell
      title="Print"
      width={420}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="classic-button default" onClick={() => onConfirm(printer, copies)}>
            Print
          </button>
          <button type="button" className="classic-button" onClick={onClose}>
            Cancel
          </button>
        </>
      }
    >
      <div className="printer-banner">
        <div className="printer-graphic">🖨</div>
        <select className="classic-select grow" value={printer} onChange={(event) => setPrinter(event.target.value)}>
          <option>HP DeskJet 970Cse</option>
          <option>Epson Stylus Photo 890</option>
          <option>Canon Bubble Jet BJC-8200</option>
          <option>Acrobat Distiller</option>
        </select>
        <button type="button" className="classic-button">
          Properties
        </button>
      </div>
      <div className="print-options">
        <fieldset className="find-fieldset">
          <legend>Print range</legend>
          <label className="radio-row">
            <input type="radio" name="range" defaultChecked /> All images in selection ({count})
          </label>
          <label className="radio-row">
            <input type="radio" name="range" /> Current image only
          </label>
          <label className="radio-row">
            <input type="radio" name="range" /> Pages 1–2
          </label>
        </fieldset>
        <fieldset className="find-fieldset">
          <legend>Copies</legend>
          <div className="copies-row">
            <label htmlFor="copies">Number of copies:</label>
            <input id="copies" type="number" min={1} max={99} className="classic-input number" value={copies} onChange={(event) => setCopies(Number(event.target.value))} />
          </div>
          <label className="checkbox-row">
            <input type="checkbox" /> Collate
          </label>
          <label className="checkbox-row">
            <input type="checkbox" /> Print to file
          </label>
        </fieldset>
      </div>
      <div className="print-preview">
        <div className="paper-sheet">
          <BrandIcon size={28} />
          <span>ACDSee print preview</span>
        </div>
        <p className="dialog-hint">1 image per page · Portrait · 8.5 × 11 in</p>
      </div>
    </DialogShell>
  );
}

function OptionsDialog({ onClose, onNotify }: { onClose: () => void; onNotify: (message: string) => void }) {
  const [tab, setTab] = useState<"general" | "browser" | "viewer" | "types">("browser");
  const [thumbs, setThumbs] = useState(true);
  const [preview, setPreview] = useState(true);
  const [remember, setRemember] = useState(true);
  const [singleClick, setSingleClick] = useState(false);
  const [fit, setFit] = useState(true);
  const [loop, setLoop] = useState(true);
  const [delay, setDelay] = useState(3);
  const tabs = [
    { id: "general", label: "General" },
    { id: "browser", label: "Browser" },
    { id: "viewer", label: "Viewer" },
    { id: "types", label: "File Types" },
  ] as const;
  return (
    <DialogShell
      title="ACDSee Options"
      width={478}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="classic-button default" onClick={() => { onNotify("Preferences saved."); onClose(); }}>
            OK
          </button>
          <button type="button" className="classic-button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="classic-button" onClick={() => onNotify("Default preferences restored.")} style={{ marginLeft: 8 }}>
            Restore Defaults
          </button>
        </>
      }
    >
      <div className="prop-tabs">
        {tabs.map((item) => (
          <button type="button" key={item.id} className={`prop-tab ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {tab === "general" && (
        <div className="options-pane">
          <h4>Startup</h4>
          <label className="checkbox-row">
            <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Remember last folder
          </label>
          <label className="checkbox-row">
            <input type="checkbox" defaultChecked /> Show splash screen
          </label>
          <label className="checkbox-row">
            <input type="checkbox" defaultChecked /> Check for updates on startup
          </label>
          <h4>File associations</h4>
          <p className="dialog-hint">ACDSee is the default viewer for JPEG, BMP, GIF, TIFF, and PNG images.</p>
          <div className="fake-table">
            {["JPEG", "BMP", "GIF", "TIFF", "PNG"].map((type) => (
              <div key={type} className="fake-table-row">
                <FileTypeIcon type={type} size={13} /> <span>{type} Image</span> <span className="assoc-ok">ACDSee 3.1</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === "browser" && (
        <div className="options-pane two-col">
          <div>
            <h4>Thumbnails</h4>
            <label className="checkbox-row">
              <input type="checkbox" checked={thumbs} onChange={(event) => setThumbs(event.target.checked)} /> Show image thumbnails
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={preview} onChange={(event) => setPreview(event.target.checked)} /> Show preview pane
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={singleClick} onChange={(event) => setSingleClick(event.target.checked)} /> Single-click to open
            </label>
            <label className="checkbox-row">
              <input type="checkbox" defaultChecked /> Show file extensions
            </label>
          </div>
          <div>
            <h4>Folder tree</h4>
            <label className="checkbox-row">
              <input type="checkbox" defaultChecked /> Show shared folders
            </label>
            <label className="checkbox-row">
              <input type="checkbox" defaultChecked /> Display item counts
            </label>
            <label className="checkbox-row">
              <input type="checkbox" /> Show hidden folders
            </label>
            <h4>Cache</h4>
            <p className="dialog-hint">The thumbnail cache is managed automatically.</p>
            <button type="button" className="classic-button" onClick={() => onNotify("Thumbnail cache cleared.")}>
              Clear Cache
            </button>
          </div>
        </div>
      )}
      {tab === "viewer" && (
        <div className="options-pane">
          <h4>Slide show</h4>
          <div className="field-row">
            <label htmlFor="delay">Delay between images:</label>
            <input id="delay" type="number" className="classic-input number" min={1} max={30} value={delay} onChange={(event) => setDelay(Number(event.target.value))} />
            <span>seconds</span>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={loop} onChange={(event) => setLoop(event.target.checked)} /> Repeat slide show continuously
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={fit} onChange={(event) => setFit(event.target.checked)} /> Fit images to window
          </label>
          <h4>Performance</h4>
          <label className="checkbox-row">
            <input type="checkbox" defaultChecked /> Preload next image
          </label>
          <label className="checkbox-row">
            <input type="checkbox" /> Use hardware acceleration
          </label>
          <p className="dialog-hint">The slide show advances every 3 seconds and loops.</p>
        </div>
      )}
      {tab === "types" && (
        <div className="options-pane">
          <h4>Supported image formats</h4>
          <div className="fake-table">
            {["JPEG", "TIFF", "PNG", "BMP", "GIF", "PCX", "TGA", "ICO", "WMF"].map((type) => (
              <div key={type} className="fake-table-row">
                <FileTypeIcon type={type} size={13} /> <span>{type}</span> <span className="assoc-ok">Enabled</span>
              </div>
            ))}
          </div>
          <label className="checkbox-row" style={{ marginTop: 8 }}>
            <input type="checkbox" defaultChecked /> Associate with all supported formats
          </label>
        </div>
      )}
    </DialogShell>
  );
}

function FileListDialog({ text, onClose, onNotify }: { text: string; onClose: () => void; onNotify: (message: string) => void }) {
  const [value, setValue] = useState(text);
  return (
    <DialogShell
      title="Generate File List"
      width={448}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="classic-button default" onClick={() => { navigator.clipboard?.writeText(value).catch(() => undefined); onNotify("File list copied to the clipboard."); }}>
            Copy to Clipboard
          </button>
          <button type="button" className="classic-button" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <p className="dialog-lead">A plain-text list of the selected images:</p>
      <textarea className="classic-textarea" value={value} onChange={(event) => setValue(event.target.value)} spellCheck={false} />
      <p className="dialog-hint">
        Tip: use this list with Print, Copy, or a batch file. {value.split("\n").length} lines · {value.length} characters
      </p>
    </DialogShell>
  );
}

function AboutDialog({ onClose, onNotify }: { onClose: () => void; onNotify: (message: string) => void }) {
  return (
    <DialogShell
      title="About ACDSee"
      width={428}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="classic-button default" onClick={onClose}>
            OK
          </button>
          <button type="button" className="classic-button" onClick={() => onNotify("Thanks for visiting the ACDSee museum!")}>
            Visit ACD Systems
          </button>
        </>
      }
    >
      <div className="about-layout">
        <BrandIcon size={74} />
        <div>
          <div className="about-title">ACDSee Classic</div>
          <div className="about-sub">Image Browser &amp; Viewer</div>
          <div className="about-meta">
            Version 0.1.0<br />
            A fan-made, open-source classic clone.<br />
            All rights reserved.
          </div>
        </div>
      </div>
      <div className="about-box">
        <div>
          <span>Licensed to:</span>
          <strong>Open source (MIT)</strong>
        </div>
        <div>
          <span>Operating system:</span>
          <strong>{platformName()}</strong>
        </div>
        <div>
          <span>Build:</span>
          <strong>Desktop app</strong>
        </div>
      </div>
      <p className="dialog-hint disclaimer">
        This is a fan-made, open-source recreation for demonstration purposes. ACDSee and ACD Systems are trademarks of their respective owners.
      </p>
    </DialogShell>
  );
}

function FeedbackDialog({ title, message, onClose }: { title: string; message: string; onClose: () => void }) {
  return (
    <DialogShell
      title={title}
      width={376}
      onClose={onClose}
      footer={
        <button type="button" className="classic-button default" onClick={onClose}>
          OK
        </button>
      }
    >
      <div className="confirm-layout">
        <BrandIcon size={34} />
        <p className="dialog-lead">{message}</p>
      </div>
    </DialogShell>
  );
}

export default function DialogHost(props: Props) {
  const { dialog, photos, folders, picturesId, onClose, onRename, onDelete, onTransfer, onConvert, onFind, onResize, onSeries, onPrint, onNotify, onOpenViewer, onSetWallpaper } = props;
  const selectedPhoto = dialog.kind === "properties" || dialog.kind === "resize" ? photos.find((p) => p.id === dialog.id) : undefined;

  switch (dialog.kind) {
    case "rename":
      return <RenameDialog ids={dialog.ids} current={dialog.current} onConfirm={onRename} onClose={onClose} />;
    case "delete":
      return <DeleteDialog names={dialog.names} trash={dialog.trash} fromRecycle={dialog.fromRecycle} onConfirm={onDelete} onClose={onClose} />;
    case "transfer":
      return <TransferDialog mode={dialog.mode} count={dialog.ids.length} folders={folders} onConfirm={onTransfer} onClose={onClose} />;
    case "convert":
      return <ConvertDialog count={dialog.ids.length} picturesId={picturesId} onConfirm={onConvert} onClose={onClose} />;
    case "properties":
      return selectedPhoto ? (
        <PropertiesDialog
          photo={selectedPhoto}
          onClose={onClose}
          onOpen={() => onOpenViewer(selectedPhoto.id)}
          onWallpaper={() => onSetWallpaper(selectedPhoto)}
        />
      ) : null;
    case "find":
      return <FindDialog initial={dialog.initial} onFind={onFind} onClose={onClose} />;
    case "about":
      return <AboutDialog onClose={onClose} onNotify={onNotify} />;
    case "options":
      return <OptionsDialog onClose={onClose} onNotify={onNotify} />;
    case "resize":
      return selectedPhoto ? (
        <ResizeDialog photo={selectedPhoto} width={dialog.width} height={dialog.height} onConfirm={onResize} onClose={onClose} />
      ) : null;
    case "series":
      return <SeriesDialog firstName={dialog.firstName} onConfirm={onSeries} onClose={onClose} />;
    case "print":
      return <PrintDialog count={dialog.ids.length} onConfirm={onPrint} onClose={onClose} />;
    case "filelist":
      return <FileListDialog text={dialog.text} onClose={onClose} onNotify={onNotify} />;
    case "feedback":
      return <FeedbackDialog title={dialog.title} message={dialog.message} onClose={onClose} />;
    default:
      return null;
  }
}
