import { Fragment, useState } from "react";
import {
  childFolders,
  descendantPhotoCount,
  folderPath,
  folderPathString,
  formatBytes,
  formatDate,
  imageTransform,
  type Folder,
  type Photo,
} from "../data";
import { BrandIcon, FileTypeIcon, FolderGlyph, ToolIcon } from "../icons";

type TreeProps = {
  folders: Folder[];
  photos: Photo[];
  currentId: string;
  expanded: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onExpandAll: () => void;
  onCollapse: () => void;
  onClose: () => void;
};

export function TreePane({
  folders,
  photos,
  currentId,
  expanded,
  onSelect,
  onToggle,
  onExpandAll,
  onCollapse,
  onClose,
}: TreeProps) {
  const roots = folders.filter((f) => f.parent === null);
  const row = (folder: Folder, depth: number) => {
    const children = childFolders(folder.id).filter((f) => folders.some((x) => x.id === f.id));
    const open = expanded.has(folder.id);
    const active = currentId === folder.id;
    const count = descendantPhotoCount(folder.id, photos);
    return (
      <Fragment key={folder.id}>
        <div
          className={`tree-row ${active ? "selected" : ""}`}
          style={{ paddingLeft: 3 + depth * 14 }}
          onClick={() => onSelect(folder.id)}
          role="treeitem"
          aria-selected={active}
          aria-expanded={children.length ? open : undefined}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") onSelect(folder.id);
          }}
        >
          <button
            type="button"
            className={`expander ${children.length ? "" : "empty"}`}
            onClick={(event) => {
              event.stopPropagation();
              if (children.length) onToggle(folder.id);
            }}
            tabIndex={-1}
            aria-label={open ? "Collapse" : "Expand"}
          >
            {children.length ? (open ? "−" : "+") : ""}
          </button>
          <FolderGlyph icon={folder.icon} size={17} />
          <span className="tree-label">{folder.name}</span>
          {count > 0 && <span className="tree-count">{count}</span>}
        </div>
        {children.length > 0 && open && (
          <div role="group">{children.map((child) => row(child, depth + 1))}</div>
        )}
      </Fragment>
    );
  };

  return (
    <section className="pane tree-pane">
      <div className="pane-title">
        <div className="pane-title-label">
          <ToolIcon name="folder" size={14} />
          <span>Folders</span>
        </div>
        <div className="pane-title-buttons">
          <button type="button" title="Expand all" onClick={onExpandAll} className="tiny-button">
            ⊞
          </button>
          <button type="button" title="Collapse all" onClick={onCollapse} className="tiny-button">
            ⊟
          </button>
          <button type="button" title="Close folders pane" onClick={onClose} className="tiny-button x">
            ×
          </button>
        </div>
      </div>
      <div className="tree-scroll" role="tree" aria-label="Folder tree">
        {roots.map((folder) => row(folder, 0))}
      </div>
    </section>
  );
}

type InspectorProps = {
  photo: Photo | null;
  selectedCount: number;
  onOpen: () => void;
  onWallpaper: () => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onRate: (value: number) => void;
};

export function Inspector({
  photo,
  selectedCount,
  onOpen,
  onWallpaper,
  onNext,
  onPrev,
  onClose,
  onRate,
}: InspectorProps) {
  const [tab, setTab] = useState<"preview" | "info">("preview");

  return (
    <section className="pane inspector-pane">
      <div className="pane-title inspector-title">
        <div className="tab-strip">
          <button type="button" className={`pane-tab ${tab === "preview" ? "active" : ""}`} onClick={() => setTab("preview")}>
            <ToolIcon name="view" size={13} /> Preview
          </button>
          <button type="button" className={`pane-tab ${tab === "info" ? "active" : ""}`} onClick={() => setTab("info")}>
            <ToolIcon name="info" size={13} /> Properties
          </button>
        </div>
        <button type="button" title="Close preview pane" onClick={onClose} className="tiny-button x">
          ×
        </button>
      </div>

      {tab === "preview" ? (
        <>
          <div className="preview-toolbar">
            <button type="button" className="mini-nav" onClick={onPrev} title="Previous image" disabled={!photo}>
              ◀
            </button>
            <button type="button" className="mini-nav" onClick={onNext} title="Next image" disabled={!photo}>
              ▶
            </button>
            <span className="preview-caption">
              {photo ? "Preview — fit to window" : selectedCount > 1 ? `${selectedCount} items selected` : "No item selected"}
            </span>
            <button type="button" className="mini-nav" title="Open in viewer" onClick={onOpen} disabled={!photo}>
              ⤢
            </button>
          </div>
          <div className="preview-stage">
            {photo ? (
              <img
                src={photo.fullSrc || photo.src}
                alt={photo.name}
                style={{ transform: imageTransform(photo) }}
                draggable={false}
              />
            ) : selectedCount > 1 ? (
              <div className="preview-multi">
                <div className="multi-stack">
                  <div className="multi-card c" />
                  <div className="multi-card b" />
                  <div className="multi-card a">
                    <BrandIcon size={40} />
                  </div>
                </div>
                <strong>{selectedCount} images selected</strong>
                <span>Double-click to open the viewer</span>
              </div>
            ) : (
              <div className="preview-empty">
                <BrandIcon size={54} />
                <span>Select an image to preview</span>
              </div>
            )}
          </div>
          {photo ? (
            <div className="preview-details">
              <div className="preview-name" title={photo.name}>
                <FileTypeIcon type={photo.format} size={14} />
                <strong>{photo.name}</strong>
              </div>
              <div className="preview-sub">
                {photo.width} × {photo.height} pixels · {formatBytes(photo.size)} · {photo.format}
              </div>
              <div className="preview-actions">
                <button type="button" className="classic-button" onClick={onOpen}>
                  Open
                </button>
                <button type="button" className="classic-button" onClick={onWallpaper}>
                  Set as Wallpaper
                </button>
              </div>
            </div>
          ) : (
            <div className="inspector-blank">
              <span>ACDSee Browser</span>
              <p>Click a thumbnail to see a larger preview and image information.</p>
            </div>
          )}
        </>
      ) : (
        <div className="inspector-info">
          {photo ? (
            <>
              <div className="info-head">
                <div className="info-thumb">
                  <img src={photo.fullSrc || photo.src} alt="" style={{ transform: imageTransform(photo) }} />
                </div>
                <div>
                  <strong>{photo.name}</strong>
                  <div className="info-stars" aria-label="Rating">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button type="button" key={n} onClick={() => onRate(n)} title={`Rate ${n} of 5`}>
                        <ToolIcon name="star" size={12} style={{ opacity: n <= photo.rating ? 1 : 0.25 }} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <dl className="property-list">
                <dt>File name</dt>
                <dd>{photo.name}</dd>
                <dt>Folder</dt>
                <dd>{folderPathString(photo.folderId)}</dd>
                <dt>Type</dt>
                <dd>{photo.format} Image</dd>
                <dt>Dimensions</dt>
                <dd>
                  {photo.width} × {photo.height}
                </dd>
                <dt>Size</dt>
                <dd>{formatBytes(photo.size)}</dd>
                <dt>Modified</dt>
                <dd>{formatDate(photo.date)}</dd>
                <dt>Camera</dt>
                <dd>{photo.camera}</dd>
                <dt>Exposure</dt>
                <dd>
                  {photo.exposure} · {photo.aperture}
                </dd>
                <dt>ISO / Flash</dt>
                <dd>
                  ISO {photo.iso} · {photo.flash}
                </dd>
                <dt>Tags</dt>
                <dd className="tag-list">
                  {photo.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </dd>
              </dl>
            </>
          ) : (
            <div className="inspector-blank">
              <BrandIcon size={46} />
              <span>No file selected</span>
              <p>Image properties will appear here.</p>
            </div>
          )}
        </div>
      )}

      <div className="inspector-status">
        <span>{photo ? `${photo.format} · ${photo.width} × ${photo.height}` : "ACDSee 3.1"}</span>
        <span>{photo ? `${folderPath(photo.folderId).at(-1)?.name}` : "Browser"}</span>
      </div>
    </section>
  );
}
