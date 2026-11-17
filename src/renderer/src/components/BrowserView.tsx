import type { MouseEvent } from "react";
import {
  formatBytes,
  formatDate,
  imageTransform,
  type Folder,
  type Photo,
} from "../data";
import { BrandIcon, FileTypeIcon, FolderGlyph, ToolIcon } from "../icons";

export type ViewMode = "thumbnails" | "list" | "details";
export type ThumbSize = "small" | "medium" | "large";

type BrowserViewProps = {
  folder: Folder;
  folderChildren: Folder[];
  photos: Photo[];
  allPhotoCount: number;
  selected: Set<string>;
  viewMode: ViewMode;
  thumbSize: ThumbSize;
  sortKey: string;
  sortDir: "asc" | "desc";
  query: string;
  onClearQuery: () => void;
  onSelect: (id: string, event: MouseEvent) => void;
  onOpenPhoto: (id: string) => void;
  onOpenFolder: (id: string) => void;
  onContextMenu: (event: MouseEvent, id: string) => void;
  onSorted: (key: string) => void;
  showThumbs: boolean;
  showExtensions: boolean;
};

const typeLabel = (photo: Photo) => (photo.format === "JPEG" ? "JPG File" : `${photo.format} File`);
const displayName = (name: string, showExtensions: boolean) =>
  showExtensions ? name : name.replace(/\.(jpg|jpeg|png|bmp|tif|tiff|gif|webp|avif|svg|heic|heif)$/i, "");

export default function BrowserView({
  folder,
  folderChildren,
  photos,
  allPhotoCount,
  selected,
  viewMode,
  thumbSize,
  sortKey,
  sortDir,
  query,
  onClearQuery,
  onSelect,
  onOpenPhoto,
  onOpenFolder,
  onContextMenu,
  onSorted,
  showThumbs,
  showExtensions,
}: BrowserViewProps) {
  const folderCount = folderChildren.length;
  const count = folderCount + photos.length;

  const folderTile = (child: Folder, small = false) => {
    return (
      <div
        key={child.id}
        className={`thumb folder-tile ${small ? "small" : ""}`}
        onDoubleClick={() => onOpenFolder(child.id)}
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter") onOpenFolder(child.id);
        }}
        title={`${child.name} — double-click to open`}
      >
        <div className="thumb-image-wrap folder-image">
          <div className="folder-glyph-large">
            <FolderGlyph icon={child.icon} size={small ? 25 : 56} />
            <span className="folder-glyph-count">
              {child.id === "a-floppy" || child.id === "d-drive" ? "" : "Folder"}
            </span>
          </div>
        </div>
        <div className="thumb-label">
          <span className="thumb-filename">{child.name}</span>
          <span className="thumb-type">File Folder</span>
        </div>
      </div>
    );
  };

  const header = (key: string, label: string, className?: string) => (
    <button
      type="button"
      className={`detail-head ${className ?? ""}`}
      onClick={() => onSorted(key)}
      title={`Sort by ${label}`}
    >
      {label}
      {sortKey === key && <span className="sort-arrow">{sortDir === "asc" ? "▲" : "▼"}</span>}
    </button>
  );

  const selectionBar = query ? (
    <div className="find-chip-row">
      <span className="find-chip">
        Find: <strong>{query}</strong>
        <button type="button" onClick={onClearQuery} title="Clear search">
          ×
        </button>
      </span>
      <span className="find-result-count">
        {photos.length} of {allPhotoCount} objects match
      </span>
    </div>
  ) : null;

  return (
    <div className="browser-view">
      {selectionBar}
      <div className={`file-stage view-${viewMode} thumbs-${thumbSize}`}>
        {count === 0 ? (
          <div className="empty-folder">
            <div className="empty-folder-art">
              <FolderGlyph icon={folder.icon} size={78} />
              <div className="empty-sparkle">✦</div>
            </div>
            <strong>{query ? "No matching images" : "There are no items in this folder."}</strong>
            <span>
              {query
                ? "Try a different file name or clear the search."
                : folder.id === "my-network"
                  ? "This computer is not connected to a network."
                  : folder.id === "a-floppy"
                    ? "Insert a disk into drive A:."
                    : "Drag files here, or choose another folder."}
            </span>
            {query && (
              <button type="button" className="classic-button" onClick={onClearQuery}>
                Clear Find
              </button>
            )}
          </div>
        ) : viewMode === "thumbnails" ? (
          <div className="thumb-grid">
            {folderChildren.map((child) => folderTile(child))}
            {photos.map((photo) => (
              <div
                key={photo.id}
                className={`thumb ${selected.has(photo.id) ? "selected" : ""}`}
                onClick={(event) => onSelect(photo.id, event)}
                onDoubleClick={() => onOpenPhoto(photo.id)}
                onContextMenu={(event) => onContextMenu(event, photo.id)}
                tabIndex={0}
                role="option"
                aria-selected={selected.has(photo.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onOpenPhoto(photo.id);
                  if (event.key === " ") {
                    event.preventDefault();
                    onSelect(photo.id, event as unknown as MouseEvent);
                  }
                }}
              >
                <div className="thumb-image-wrap">
                  {showThumbs && photo.src ? (
                    <img
                      src={photo.src}
                      alt={photo.name}
                      loading="lazy"
                      draggable={false}
                      style={{ transform: imageTransform(photo) }}
                    />
                  ) : (
                    <span className="no-thumb" aria-hidden="true">
                      <FileTypeIcon type={photo.format} size={thumbSize === "large" ? 46 : thumbSize === "small" ? 22 : 32} />
                    </span>
                  )}
                  {photo.rating >= 4 && <span className="thumb-star" title="Highly rated">★</span>}
                </div>
                <div className="thumb-label">
                  <span className="thumb-filename">
                    <FileTypeIcon type={photo.format} size={11} />
                    {displayName(photo.name, showExtensions)}
                  </span>
                  <span className="thumb-type">
                    {photo.width > 0 ? `${photo.width}×${photo.height} · ` : ""}
                    {formatBytes(photo.size)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === "list" ? (
          <div className="file-list">
            <div className="list-head">
              <span className="list-icon-head" />
              <span>Name</span>
              <span>Size</span>
              <span>Type</span>
              <span>Modified</span>
            </div>
            {folderChildren.map((child) => (
              <div className="list-row folder-row" key={child.id} onDoubleClick={() => onOpenFolder(child.id)}>
                <span className="list-icon">
                  <FolderGlyph icon={child.icon} size={18} />
                </span>
                <span className="list-name">{child.name}</span>
                <span>&lt;DIR&gt;</span>
                <span>File Folder</span>
                <span />
              </div>
            ))}
            {photos.map((photo) => (
              <div
                key={photo.id}
                className={`list-row ${selected.has(photo.id) ? "selected" : ""}`}
                onClick={(event) => onSelect(photo.id, event)}
                onDoubleClick={() => onOpenPhoto(photo.id)}
                onContextMenu={(event) => onContextMenu(event, photo.id)}
              >
                <span className="list-icon">
                  <FileTypeIcon type={photo.format} size={17} />
                </span>
                <span className="list-name">{photo.name}</span>
                <span>{Math.max(1, Math.round(photo.size / 1024)).toLocaleString()} KB</span>
                <span>{typeLabel(photo)}</span>
                <span>{formatDate(photo.date)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="details-table">
            <div className="details-head">
              <span className="details-icon-head" />
              {header("name", "Name", "col-name")}
              {header("size", "Size", "col-size")}
              {header("type", "Type", "col-type")}
              {header("date", "Date Modified", "col-date")}
              {header("dimensions", "Dimensions", "col-dim")}
            </div>
            {folderChildren.map((child) => (
              <div className="details-row folder-row" key={child.id} onDoubleClick={() => onOpenFolder(child.id)}>
                <span className="list-icon">
                  <FolderGlyph icon={child.icon} size={17} />
                </span>
                <span>{child.name}</span>
                <span />
                <span>File Folder</span>
                <span />
                <span />
              </div>
            ))}
            {photos.map((photo) => (
              <div
                key={photo.id}
                className={`details-row ${selected.has(photo.id) ? "selected" : ""}`}
                onClick={(event) => onSelect(photo.id, event)}
                onDoubleClick={() => onOpenPhoto(photo.id)}
                onContextMenu={(event) => onContextMenu(event, photo.id)}
              >
                <span className="list-icon">
                  <FileTypeIcon type={photo.format} size={17} />
                </span>
                <span className="details-name">{photo.name}</span>
                <span>{Math.round(photo.size / 1024)} KB</span>
                <span>{typeLabel(photo)}</span>
                <span>{formatDate(photo.date)}</span>
                <span>{photo.width > 0 ? `${photo.width} × ${photo.height}` : "…"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type StatusProps = {
  count: number;
  folders: number;
  totalBytes: number;
  selectedPhotos: Photo[];
  folderName: string;
  filterActive: boolean;
  wallpaperActive: boolean;
};

export function StatusBar({
  count,
  folders,
  totalBytes,
  selectedPhotos,
  folderName,
  filterActive,
  wallpaperActive,
}: StatusProps) {
  const one = selectedPhotos.length === 1 ? selectedPhotos[0] : null;
  const objectWord = count + folders === 1 ? "object" : "objects";
  return (
    <div className="statusbar">
      <div className="status-pane status-objects">
        <ToolIcon name="folder" size={12} />
        <span>
          {count} {objectWord}
          {folders > 0 ? ` (${folders} folder${folders === 1 ? "" : "s"})` : ""}
        </span>
      </div>
      <div className="status-pane status-size">{formatBytes(totalBytes)}</div>
      <div className="status-pane status-selection">
        {selectedPhotos.length > 1 ? (
          <span>
            <strong>{selectedPhotos.length} images selected</strong> · {formatBytes(selectedPhotos.reduce((a, p) => a + p.size, 0))}
          </span>
        ) : one ? (
          <span className="status-file">
            <FileTypeIcon type={one.format} size={12} />
            <strong>{one.name}</strong>
            <span className="status-muted">
              {one.width} × {one.height} px
            </span>
          </span>
        ) : (
          <span className="status-muted">Select an image to view its file details</span>
        )}
      </div>
      <div className="status-pane status-space">
        {filterActive ? "Filtered view" : wallpaperActive ? "Wallpaper active" : "4.00 GB free"}
      </div>
      <div className="status-pane status-brand">
        <BrandIcon size={12} />
        <span>ACDSee</span>
      </div>
      <div className="status-resize" title={folderName}>
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
