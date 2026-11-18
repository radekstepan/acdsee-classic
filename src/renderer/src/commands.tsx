import { useApp } from "./store";
import { useShell } from "./shell";
import type { MenuItem, SortKey, ViewMode } from "./types";
import { FORMAT_LIST } from "./data/catalog";

export const THUMB_SIZES: [string, number][] = [
  ["Tiny (48 x 48)", 48],
  ["Small (64 x 64)", 64],
  ["Medium (96 x 96)", 96],
  ["Large (128 x 128)", 128],
  ["Huge (160 x 160)", 160],
];

export const VIEW_MODES: [ViewMode, string, string, string][] = [
  ["thumbs", "&Thumbnails", "thumbs", "Thumbnails"],
  ["filmstrip", "&Filmstrip", "filmstrip", "Filmstrip"],
  ["icons", "&Icons", "iconsView", "Icons"],
  ["list", "&List", "list", "List"],
  ["details", "&Details", "details", "Details"],
];

export const SORT_KEYS: [SortKey, string][] = [
  ["name", "&Name"],
  ["size", "&Size"],
  ["type", "&Type"],
  ["date", "&Date Modified"],
  ["dims", "Image &Dimensions"],
];

export function useCommands() {
  const app = useApp();
  const shell = useShell();

  const selFileIds = () => app.selection.filter((id) => app.fileMap.has(id));
  const primaryFileId = () => {
    if (app.focusId && app.fileMap.has(app.focusId) && app.selection.includes(app.focusId)) return app.focusId;
    return selFileIds()[0];
  };

  const c = {
    selFileIds,
    primaryFileId,
    hasFiles: () => selFileIds().length > 0,
    open: () => {
      const id = primaryFileId() ?? app.selection[0];
      if (!id) return;
      if (id in app.folders) {
        app.goTo(id);
        return;
      }
      const ids = selFileIds();
      app.openViewer(id, ids.length > 1 ? app.visibleFiles.filter((f) => ids.includes(f.id)).map((f) => f.id) : null);
    },
    openId: (id: string) => {
      if (id in app.folders) app.goTo(id);
      else {
        const ids = selFileIds();
        app.openViewer(id, ids.length > 1 && ids.includes(id) ? app.visibleFiles.filter((f) => ids.includes(f.id)).map((f) => f.id) : null);
      }
    },
    copyTo: () => selFileIds().length && app.openDialog({ type: "folderPicker", mode: "copy", ids: selFileIds() }),
    moveTo: () => selFileIds().length && app.openDialog({ type: "folderPicker", mode: "move", ids: selFileIds() }),
    del: () => app.requestDelete(selFileIds()),
    rename: () => {
      const ids = selFileIds();
      if (ids.length === 1) app.setRenamingId(ids[0]);
      else if (ids.length > 1) app.openDialog({ type: "batchRename", ids: app.visibleFiles.filter((f) => ids.includes(f.id)).map((f) => f.id) });
    },
    batchRename: () => {
      const ids = selFileIds().length ? selFileIds() : app.visibleFiles.map((f) => f.id);
      if (!ids.length) return;
      app.openDialog({ type: "batchRename", ids: app.visibleFiles.filter((f) => ids.includes(f.id)).map((f) => f.id) });
    },
    props: () => selFileIds().length && app.openDialog({ type: "props", ids: selFileIds() }),
    selectAll: () => app.setSelection([...app.items], app.items[0] ?? null),
    invert: () => app.setSelection(app.items.filter((id) => !app.selection.includes(id))),
    deselect: () => app.setSelection([], null),
    rotate: (dir: 1 | -1) => selFileIds().forEach((id) => app.rotateFile(id, dir)),
    rotate180: () => selFileIds().forEach((id) => { app.rotateFile(id, 1); app.rotateFile(id, 1); }),
    flip: (axis: "h" | "v") => selFileIds().forEach((id) => app.flipFile(id, axis)),
    adjust: () => {
      const id = primaryFileId();
      if (id) app.openDialog({ type: "adjust", id });
    },
    resize: () => {
      const id = primaryFileId();
      if (id) app.openDialog({ type: "resize", id });
    },
    slideshow: () => app.startSlideshow(),
    slideshowOptions: () => app.openDialog({ type: "slideshow" }),
    find: () => app.openDialog({ type: "find" }),
    convert: () => {
      const ids = selFileIds().length ? selFileIds() : app.visibleFiles.map((f) => f.id);
      if (!ids.length) {
        app.msg("ACDSee", "There are no images to convert.", "info");
        return;
      }
      app.openDialog({ type: "convert", ids });
    },
    acquire: () => app.openDialog({ type: "acquire" }),
    options: (tab = 0) => app.openDialog({ type: "options", tab }),
    about: () => app.openDialog({ type: "about" }),
    tip: () => app.openDialog({ type: "tip" }),
    print: () => {
      const ids = selFileIds();
      if (ids.length) app.openDialog({ type: "print", ids });
    },
    wallpaper: (mode: "center" | "tile" | "stretch") => {
      const id = primaryFileId();
      if (id) app.applyWallpaper(id, mode);
    },
    openWith: () => {
      const id = primaryFileId();
      if (id) app.openWith(id);
    },
    showInFolder: () => {
      const id = primaryFileId();
      if (id) app.showInFolder(id);
    },
    recycle: () => app.openRecycleBin(),
    newFolder: () => {
      if (!app.canWriteTo(app.folderId)) {
        app.msg("New Folder", "Cannot create a folder here.", "info");
        return;
      }
      app.openDialog({ type: "newFolder", parent: app.folderId });
    },
    cut: () => app.copyToClip(selFileIds(), "cut"),
    copy: () => app.copyToClip(selFileIds(), "copy"),
    paste: () => app.paste(),
    refresh: () => app.refresh(),
    help: () =>
      app.msg(
        "ACDSee Help",
        "The ACDSee help file (ACDSEE.HLP) could not be found.\n\nTry double-clicking an image, right-clicking things, or dragging thumbnails onto folders in the tree.\n\nShortcuts: F5 Refresh, F2 Rename, F3 Find, F6 Move To, F7 Copy To, Ctrl+L/R Rotate, Ctrl+S Slide Show.",
        "info",
      ),
    exit: () => shell.closeApp(),
  };

  /* ---------------- menu builders ---------------- */
  const viewModeItems = (): MenuItem[] =>
    VIEW_MODES.map(([m, label]) => ({ label, checked: app.viewMode === m, radio: true, onClick: () => app.setViewMode(m) }));

  const thumbSizeItems = (): MenuItem[] =>
    THUMB_SIZES.map(([label, px]) => ({ label, checked: app.settings.thumbSize === px, radio: true, onClick: () => app.setSettings({ thumbSize: px }) }));

  const sortItems = (): MenuItem[] => [
    ...SORT_KEYS.map(([k, label]) => ({
      label,
      checked: app.sort.key === k,
      radio: true,
      onClick: () => app.setSort({ ...app.sort, key: k }),
    })),
    { separator: true },
    { label: "&Ascending", checked: app.sort.dir === "asc", radio: true, onClick: () => app.setSort({ ...app.sort, dir: "asc" }) },
    { label: "D&escending", checked: app.sort.dir === "desc", radio: true, onClick: () => app.setSort({ ...app.sort, dir: "desc" }) },
  ];

  const filterItems = (): MenuItem[] => [
    { label: "&All Images", checked: app.filter === "all", radio: true, onClick: () => app.setFilter("all") },
    { separator: true },
    ...FORMAT_LIST.map((f) => ({
      label: `${f.short} (*.${f.ext})`,
      checked: app.filter === f.ext,
      radio: true,
      onClick: () => app.setFilter(f.ext),
    })),
  ];

  const rotateItems = (): MenuItem[] => [
    { label: "Rotate &Left", icon: "rotateL", shortcut: "Ctrl+L", disabled: !c.hasFiles(), onClick: () => c.rotate(-1) },
    { label: "Rotate &Right", icon: "rotateR", shortcut: "Ctrl+R", disabled: !c.hasFiles(), onClick: () => c.rotate(1) },
    { label: "Rotate 180°", disabled: !c.hasFiles(), onClick: c.rotate180 },
    { separator: true },
    { label: "Flip &Horizontal", icon: "flipH", disabled: !c.hasFiles(), onClick: () => c.flip("h") },
    { label: "Flip &Vertical", icon: "flipV", disabled: !c.hasFiles(), onClick: () => c.flip("v") },
  ];

  const wallpaperItems = (): MenuItem[] => [
    { label: "&Center", disabled: !c.hasFiles(), onClick: () => c.wallpaper("center") },
    { label: "&Tile", disabled: !c.hasFiles(), onClick: () => c.wallpaper("tile") },
    { label: "&Stretch", disabled: !c.hasFiles(), onClick: () => c.wallpaper("stretch") },
    { separator: true },
    { label: "&None (remove wallpaper)", disabled: !app.wallpaper, onClick: () => app.setWallpaper(null) },
  ];

  const inRecycle = app.folderId === "recycle";

  const fileMenu = (): MenuItem[] => [
    { label: "&Open", shortcut: "Enter", bold: true, icon: "open", disabled: !app.selection.length, onClick: c.open },
    ...(app.desktopMode ? [{ label: "Open &With...", icon: "open", disabled: !c.hasFiles(), onClick: c.openWith } as MenuItem] : []),
    { label: "New &Folder...", icon: "newFolder", shortcut: "Ctrl+N", onClick: c.newFolder },
    { separator: true },
    { label: "&Copy To Folder...", icon: "copyTo", shortcut: "F7", disabled: !c.hasFiles(), onClick: c.copyTo },
    { label: "&Move To Folder...", icon: "moveTo", shortcut: "F6", disabled: !c.hasFiles(), onClick: c.moveTo },
    { label: "&Delete", icon: "delete", shortcut: "Del", disabled: !c.hasFiles(), onClick: c.del },
    { label: "Rena&me", icon: "rename", shortcut: "F2", disabled: !c.hasFiles(), onClick: c.rename },
    { separator: true },
    ...(inRecycle
      ? [
          ...(app.desktopMode
            ? [{ label: "Open System &Trash", onClick: c.recycle } as MenuItem]
            : [{ label: "&Restore", disabled: !c.hasFiles(), onClick: () => app.restoreFiles(c.selFileIds()) } as MenuItem]),
          { label: "Empty Recycle &Bin", disabled: !app.folder.files.length, onClick: app.emptyRecycle },
          { separator: true } as MenuItem,
        ]
      : []),
    { label: "&Print...", icon: "print", shortcut: "Ctrl+P", disabled: !c.hasFiles(), onClick: c.print },
    { label: "Set &Wallpaper", icon: "wallpaper", submenu: wallpaperItems() },
    { separator: true },
    { label: "P&roperties", icon: "props", shortcut: "Alt+Enter", disabled: !c.hasFiles(), onClick: c.props },
    ...(app.desktopMode ? [{ label: "S&how in Folder", icon: "open", disabled: !c.hasFiles(), onClick: c.showInFolder } as MenuItem] : []),
    { separator: true },
    { label: "E&xit", icon: "exit", shortcut: "Alt+F4", onClick: c.exit },
  ];

  const editMenu = (): MenuItem[] => [
    { label: "Cu&t", icon: "cut", shortcut: "Ctrl+X", disabled: !c.hasFiles(), onClick: c.cut },
    { label: "&Copy", icon: "copy", shortcut: "Ctrl+C", disabled: !c.hasFiles(), onClick: c.copy },
    { label: "&Paste", icon: "paste", shortcut: "Ctrl+V", disabled: !app.clip, onClick: c.paste },
    { separator: true },
    { label: "Select &All", icon: "selectAll", shortcut: "Ctrl+A", disabled: !app.items.length, onClick: c.selectAll },
    { label: "&Invert Selection", shortcut: "Ctrl+I", disabled: !app.items.length, onClick: c.invert },
    { label: "&Deselect All", shortcut: "Ctrl+D", disabled: !app.selection.length, onClick: c.deselect },
    { separator: true },
    { label: "Ro&tate / Flip", icon: "rotateR", submenu: rotateItems() },
    { label: "&Adjust Brightness / Contrast...", icon: "adjust", disabled: !c.hasFiles(), onClick: c.adjust },
    { label: "Re&size...", icon: "resize", disabled: !c.hasFiles(), onClick: c.resize },
  ];

  const viewMenu = (): MenuItem[] => [
    ...viewModeItems(),
    { separator: true },
    { label: "Thumbnail &Size", submenu: thumbSizeItems() },
    { label: "Sort &By", icon: "sort", submenu: sortItems() },
    { label: "Fi&lter", submenu: filterItems() },
    { separator: true },
    { label: "&Toolbar", checked: app.settings.showToolbar, onClick: () => app.setSettings({ showToolbar: !app.settings.showToolbar }) },
    { label: "&Address Bar", checked: app.settings.showAddress, onClick: () => app.setSettings({ showAddress: !app.settings.showAddress }) },
    { label: "&Status Bar", checked: app.settings.showStatus, onClick: () => app.setSettings({ showStatus: !app.settings.showStatus }) },
    { label: "Folder T&ree", checked: app.settings.showTree, onClick: () => app.setSettings({ showTree: !app.settings.showTree }) },
    { label: "Pre&view Pane", icon: "preview", checked: app.settings.showPreview, onClick: () => app.setSettings({ showPreview: !app.settings.showPreview }) },
    { separator: true },
    { label: "File Na&mes", checked: app.settings.showNames, onClick: () => app.setSettings({ showNames: !app.settings.showNames }) },
    { label: "File I&nfo", checked: app.settings.showInfo, onClick: () => app.setSettings({ showInfo: !app.settings.showInfo }) },
    { label: "Show Fol&ders", checked: app.settings.showFolders, onClick: () => app.setSettings({ showFolders: !app.settings.showFolders }) },
    { label: "Show &Hidden Files", checked: app.settings.showHidden, onClick: () => app.setSettings({ showHidden: !app.settings.showHidden }) },
    { separator: true },
    { label: "&Refresh", icon: "refresh", shortcut: "F5", onClick: c.refresh },
  ];

  const toolsMenu = (): MenuItem[] => [
    { label: "&Slide Show", icon: "slideshow", shortcut: "Ctrl+S", onClick: c.slideshow },
    { label: "Slide Show &Options...", onClick: c.slideshowOptions },
    { separator: true },
    { label: "&Find Files...", icon: "find", shortcut: "F3", onClick: c.find },
    { label: "&Convert Images...", icon: "convert", shortcut: "Ctrl+Shift+C", onClick: c.convert },
    { label: "&Batch Rename...", icon: "rename", shortcut: "Ctrl+Shift+R", onClick: c.batchRename },
    { label: "A&cquire from Scanner / Camera...", icon: "acquire", onClick: c.acquire },
    { separator: true },
    { label: "Generate File &List...", icon: "docs", disabled: !app.visibleFiles.length, onClick: () => app.generateFileList(c.selFileIds()) },
    { separator: true },
    { label: "&Options...", icon: "settings", shortcut: "Alt+O", onClick: () => c.options(0) },
  ];

  const helpMenu = (): MenuItem[] => [
    { label: "ACDSee &Help Topics", icon: "help", shortcut: "F1", onClick: c.help },
    { label: "&Tip of the Day...", icon: "info", onClick: c.tip },
    { separator: true },
    { label: "&Register ACDSee...", onClick: () => app.msg("Register ACDSee", "Thank you for evaluating ACDSee 3.1!\n\nThis demo copy is fully registered to:\n\n   Windows 98 User\n\nThere are 0 days remaining. Just kidding — there is no limit.", "info") },
    { separator: true },
    { label: "&About ACDSee...", icon: "appIcon", onClick: c.about },
  ];

  const itemContextMenu = (): MenuItem[] => {
    const multi = c.selFileIds().length > 1;
    const folderOnly = !c.hasFiles();
    if (folderOnly) {
      return [
        { label: "&Open", bold: true, icon: "open", onClick: c.open },
        { separator: true },
        { label: "&Refresh", icon: "refresh", onClick: c.refresh },
      ];
    }
    return [
      { label: multi ? "&Open Selected" : "&Open", bold: true, icon: "open", onClick: c.open },
      ...(inRecycle ? [{ label: "&Restore", onClick: () => app.restoreFiles(c.selFileIds()) } as MenuItem] : []),
      { separator: true },
      { label: "Cu&t", icon: "cut", onClick: c.cut },
      { label: "&Copy", icon: "copy", onClick: c.copy },
      { separator: true },
      { label: "Copy To Folder...", icon: "copyTo", onClick: c.copyTo },
      { label: "Move To Folder...", icon: "moveTo", onClick: c.moveTo },
      { separator: true },
      { label: "Ro&tate / Flip", icon: "rotateR", submenu: rotateItems() },
      { label: "Set &Wallpaper", icon: "wallpaper", submenu: wallpaperItems() },
      { label: "&Convert...", icon: "convert", onClick: c.convert },
      { label: "Pr&int...", icon: "print", onClick: c.print },
      { separator: true },
      { label: "&Delete", icon: "delete", onClick: c.del },
      { label: "Rena&me", icon: "rename", onClick: c.rename },
      ...(app.desktopMode ? [{ label: "S&how in Folder", icon: "open", onClick: c.showInFolder } as MenuItem] : []),
      { separator: true },
      { label: "P&roperties", icon: "props", onClick: c.props },
    ];
  };

  const backgroundContextMenu = (): MenuItem[] => [
    { label: "&View", submenu: viewModeItems() },
    { label: "Sort &By", icon: "sort", submenu: sortItems() },
    { label: "Thumbnail &Size", submenu: thumbSizeItems() },
    { separator: true },
    { label: "&Paste", icon: "paste", disabled: !app.clip, onClick: c.paste },
    { label: "Select &All", icon: "selectAll", disabled: !app.items.length, onClick: c.selectAll },
    { separator: true },
    { label: "&Refresh", icon: "refresh", onClick: c.refresh },
    { label: "New &Folder...", icon: "newFolder", onClick: c.newFolder },
    ...(inRecycle
      ? [
          { separator: true } as MenuItem,
          ...(app.desktopMode
            ? [{ label: "Open System &Trash", onClick: c.recycle } as MenuItem]
            : [{ label: "Empty Recycle &Bin", disabled: !app.folder.files.length, onClick: app.emptyRecycle } as MenuItem]),
        ]
      : []),
    { separator: true },
    { label: "Slide Sho&w", icon: "slideshow", onClick: c.slideshow },
  ];

  const treeContextMenu = (id: string): MenuItem[] => {
    const f = app.folders[id];
    const expanded = app.expanded.has(id);
    return [
      { label: "&Open", bold: true, icon: "open", onClick: () => app.goTo(id) },
      ...(f.children.length
        ? [{ label: expanded ? "Colla&pse" : "E&xpand", onClick: () => app.toggleExpand(id) } as MenuItem]
        : []),
      { separator: true },
      ...(f.kind === "recycle"
        ? [
            ...(app.desktopMode
              ? [{ label: "Open System &Trash", onClick: c.recycle } as MenuItem]
              : [{ label: "Empty Recycle &Bin", disabled: !f.files.length, onClick: app.emptyRecycle } as MenuItem]),
            { separator: true } as MenuItem,
          ]
        : []),
      { label: "New &Folder...", icon: "newFolder", disabled: !app.canWriteTo(id), onClick: () => app.openDialog({ type: "newFolder", parent: id }) },
      { label: "&Refresh", icon: "refresh", onClick: c.refresh },
    ];
  };

  return { ...c, fileMenu, editMenu, viewMenu, toolsMenu, helpMenu, itemContextMenu, backgroundContextMenu, treeContextMenu, rotateItems, wallpaperItems, sortItems, filterItems, viewModeItems, thumbSizeItems };
}
