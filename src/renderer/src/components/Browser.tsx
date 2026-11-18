import { useEffect, useState, type MouseEvent as RMouseEvent } from "react";
import { useApp } from "../store";
import { useCommands, VIEW_MODES } from "../commands";
import { FORMAT_LIST, FORMATS } from "../data/catalog";
import { findFolderByPath, formatBytes, formatDate, fullName, pathOf } from "../utils/util";
import { ContextMenu, MenuBar, useSplitter, type MenuDef } from "./ui";
import type { MenuItem } from "../types";
import { Icon, folderIconName } from "./Icons";
import { FolderTree } from "./FolderTree";
import { FileView } from "./FileView";
import { PreviewPane } from "./PreviewPane";
import { ToolBtn, ToolSep, ToolbarRow } from "./Toolbar";

export function Browser() {
  const app = useApp();
  const cmd = useCommands();
  const { settings } = app;
  const [ctx, setCtx] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const left = useSplitter(app.layout.treeWidth, 120, 520, "x", false, (treeWidth) =>
    app.setLayout({ treeWidth })
  );
  const prev = useSplitter(app.layout.previewHeight, 80, 500, "y", true, (previewHeight) =>
    app.setLayout({ previewHeight })
  );
  const [address, setAddress] = useState(app.pathText);

  useEffect(() => setAddress(app.pathText), [app.pathText]);

  const menus: MenuDef[] = [
    { label: "&File", items: cmd.fileMenu() },
    { label: "&Edit", items: cmd.editMenu() },
    { label: "&View", items: cmd.viewMenu() },
    { label: "&Tools", items: cmd.toolsMenu() },
    { label: "&Help", items: cmd.helpMenu() },
  ];

  const onItemContext = (e: RMouseEvent, id: string | null) => {
    setCtx({ x: e.clientX, y: e.clientY, items: id ? cmd.itemContextMenu() : cmd.backgroundContextMenu() });
  };

  const go = () => {
    const id = findFolderByPath(app.folders, address);
    if (id) app.goTo(id);
    else {
      app.msg("ACDSee", `Cannot find '${address}'.\n\nCheck the spelling of the folder name and try again.`, "warn");
      setAddress(app.pathText);
    }
  };

  const [dropdown, setDropdown] = useState<{ x: number; y: number } | null>(null);
  const dropItems = (): MenuItem[] => {
    const drives = Object.values(app.folders).filter((f) => ["floppy", "hdd", "cdrom"].includes(f.kind));
    const hist = [...app.nav.hist].reverse().filter((v, i, a) => a.indexOf(v) === i).slice(0, 8);
    return [
      ...hist.map((id) => ({ label: pathOf(app.folders, id), icon: folderIconName(app.folders[id].kind), onClick: () => app.goTo(id) })),
      { separator: true },
      ...drives.map((d) => ({ label: d.name, icon: folderIconName(d.kind), onClick: () => app.goTo(d.id) })),
      { separator: true },
      { label: "Desktop", icon: "desktop", onClick: () => app.goTo("desktop") },
      { label: "Recycle Bin", icon: "recycle", onClick: () => app.goTo("recycle") },
    ];
  };

  const showLeft = settings.showTree || settings.showPreview;

  /* status bar texts */
  const files = app.visibleFiles;
  const total = files.reduce((a, f) => a + f.size, 0);
  const sel = app.selectedFiles;
  const selTotal = sel.reduce((a, f) => a + f.size, 0);
  const focusFile = app.focusId ? app.getFile(app.focusId) : undefined;
  const info = app.busy
    ? "Reading folder..."
    : focusFile && app.selection.includes(focusFile.id)
      ? `${fullName(focusFile)}, ${focusFile.w}x${focusFile.h}x${focusFile.bpp} ${FORMATS[focusFile.ext]?.short ?? focusFile.ext.toUpperCase()}, ${formatBytes(focusFile.size)}, ${formatDate(focusFile.modified)}`
      : app.selection.length === 1 && app.selection[0] in app.folders
        ? `${app.folders[app.selection[0]].name} - ${app.folders[app.selection[0]].kind === "folder" ? "File Folder" : "System Folder"}`
        : app.pathText;

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ cursor: app.busy ? "progress" : undefined }}>
      <div style={{ boxShadow: "inset 0 -1px 0 #808080, inset 0 -2px 0 #fff" }}>
        <MenuBar menus={menus} />
      </div>

      {settings.showToolbar && (
        <ToolbarRow>
          <ToolBtn icon="up" tip="Parent Folder" disabled={!app.folder.parent} onClick={app.goUp} />
          <ToolBtn icon="back" tip="Back" disabled={!app.canBack} onClick={app.goBack} />
          <ToolBtn icon="forward" tip="Forward" disabled={!app.canForward} onClick={app.goForward} />
          <ToolBtn icon="refresh" tip="Refresh (F5)" onClick={app.refresh} />
          <ToolBtn
            icon="home"
            tip="My Pictures"
            disabled={!app.quick.picturesId}
            onClick={() => app.quick.picturesId && app.goTo(app.quick.picturesId)}
          />
          <ToolSep />
          {VIEW_MODES.map(([m, , icon, tip]) => (
            <ToolBtn key={m} icon={icon} tip={tip} on={app.viewMode === m} onClick={() => app.setViewMode(m)} />
          ))}
          <ToolSep />
          <ToolBtn icon="selectAll" tip="Select All (Ctrl+A)" onClick={cmd.selectAll} disabled={!app.items.length} />
          <ToolBtn icon="copyTo" tip="Copy To Folder (F7)" onClick={cmd.copyTo} disabled={!cmd.hasFiles()} />
          <ToolBtn icon="moveTo" tip="Move To Folder (F6)" onClick={cmd.moveTo} disabled={!cmd.hasFiles()} />
          <ToolBtn icon="delete" tip="Delete (Del)" onClick={cmd.del} disabled={!cmd.hasFiles()} />
          <ToolBtn icon="rename" tip="Rename (F2)" onClick={cmd.rename} disabled={!cmd.hasFiles()} />
          <ToolSep />
          <ToolBtn icon="rotateL" tip="Rotate Left (Ctrl+L)" onClick={() => cmd.rotate(-1)} disabled={!cmd.hasFiles()} />
          <ToolBtn icon="rotateR" tip="Rotate Right (Ctrl+R)" onClick={() => cmd.rotate(1)} disabled={!cmd.hasFiles()} />
          <ToolBtn icon="adjust" tip="Adjust Brightness / Contrast" onClick={cmd.adjust} disabled={!cmd.hasFiles()} />
          <ToolSep />
          <ToolBtn icon="slideshow" tip="Slide Show (Ctrl+S)" onClick={cmd.slideshow} />
          <ToolBtn icon="convert" tip="Convert Images" onClick={cmd.convert} />
          <ToolSep />
          <ToolBtn icon="props" tip="Properties (Alt+Enter)" onClick={cmd.props} disabled={!cmd.hasFiles()} />
          <ToolBtn icon="settings" tip="Options" onClick={() => cmd.options(0)} />
          <ToolBtn icon="help" tip="Help (F1)" onClick={cmd.help} />
        </ToolbarRow>
      )}

      {settings.showAddress && (
        <div className="flex items-center gap-1.5 px-1.5 py-[3px]" style={{ boxShadow: "inset 0 1px 0 #fff, inset 0 -1px 0 #808080" }}>
          <div className="tb-grip" />
          <span>Address</span>
          <div className="field flex items-center flex-1 min-w-[120px] !p-0 !px-[3px] gap-1" style={{ height: 22 }}>
            <Icon name={folderIconName(app.folder.kind, true, app.folders.recycle.files.length > 0)} />
            <input
              className="flex-1 min-w-0 bg-transparent outline-none h-full"
              value={address}
              spellCheck={false}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") go();
                if (e.key === "Escape") setAddress(app.pathText);
              }}
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              className="flex-none h-[18px] w-[16px] raised flex items-center justify-center active:!shadow-none"
              style={{ marginRight: -1 }}
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault();
                const r = e.currentTarget.parentElement!.getBoundingClientRect();
                setDropdown(dropdown ? null : { x: r.left, y: r.bottom });
              }}
            >
              <svg width="7" height="4" viewBox="0 0 7 4" shapeRendering="crispEdges">
                <path d="M0 0h7v1H0zM1 1h5v1H1zM2 2h3v1H2zM3 3h1v1H3z" fill="#000" />
              </svg>
            </button>
          </div>
          <span className="pl-1">Filter</span>
          <select className="field !h-[22px]" style={{ width: 120 }} value={app.filter} onChange={(e) => app.setFilter(e.target.value)}>
            <option value="all">All Images</option>
            {FORMAT_LIST.map((f) => (
              <option key={f.ext} value={f.ext}>
                {f.short} (*.{f.ext})
              </option>
            ))}
          </select>
          <span className="pl-1">Size</span>
          <input
            type="range"
            className="w98"
            style={{ width: 80 }}
            min={48}
            max={160}
            step={8}
            value={settings.thumbSize}
            onChange={(e) => app.setSettings({ thumbSize: Number(e.target.value) })}
            data-tip={`Thumbnail size: ${settings.thumbSize}px`}
          />
        </div>
      )}
      {dropdown && <ContextMenu items={dropItems()} x={dropdown.x} y={dropdown.y} onClose={() => setDropdown(null)} />}

      {/* body */}
      <div className="flex flex-1 min-h-0 p-[2px] pt-[3px]">
        {showLeft && (
          <>
            <div className="flex flex-col min-h-0 flex-none" style={{ width: left.size }}>
              {settings.showTree && (
                <div className="flex-1 min-h-0 sunken p-[2px] flex flex-col">
                  <FolderTree
                    folders={app.folders}
                    selectedId={app.folderId}
                    onSelect={(id) => app.goTo(id)}
                    expanded={app.expanded}
                    onToggle={app.toggleExpand}
                    onContext={(id, e) => setCtx({ x: e.clientX, y: e.clientY, items: cmd.treeContextMenu(id) })}
                    onDropFiles={(ids, target, copy) => app.transferFiles(ids, target, copy)}
                    canDrop={(id) => app.canWriteTo(id) || id === "recycle"}
                    className="flex-1 min-h-0"
                  />
                </div>
              )}
              {settings.showTree && settings.showPreview && <div className="splitter-h" onMouseDown={prev.onMouseDown} />}
              {settings.showPreview && (
                <div className={settings.showTree ? "flex-none" : "flex-1 min-h-0"} style={settings.showTree ? { height: prev.size } : undefined}>
                  <PreviewPane onOpen={cmd.openId} />
                </div>
              )}
            </div>
            <div className="splitter-v" onMouseDown={left.onMouseDown} />
          </>
        )}
        <div className="flex-1 min-w-0 min-h-0">
          <FileView onContext={onItemContext} onOpen={cmd.openId} />
        </div>
      </div>

      {settings.showStatus && (
        <div className="flex gap-[2px] px-[2px] pb-[2px] pt-[1px] flex-none" style={{ boxShadow: "inset 0 1px 0 #dfdfdf" }}>
          <div className="status-panel" style={{ width: 170 }}>
            {files.length} file{files.length === 1 ? "" : "s"} ({formatBytes(total)})
          </div>
          <div className="status-panel" style={{ width: 170 }}>
            {sel.length ? `${sel.length} selected (${formatBytes(selTotal)})` : "No files selected"}
          </div>
          <div className="status-panel flex-1 min-w-0">{info}</div>
          <div className="status-panel flex items-center gap-1" style={{ width: 90 }}>
            <Icon name="hdd" size={14} /> {app.desktopMode ? app.platform : "1.12 GB"}
          </div>
        </div>
      )}

      {ctx && <ContextMenu items={ctx.items} x={ctx.x} y={ctx.y} onClose={() => setCtx(null)} />}
    </div>
  );
}
