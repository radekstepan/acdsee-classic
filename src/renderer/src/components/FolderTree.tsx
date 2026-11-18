import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent } from "react";
import type { Folder } from "../types";
import { cn } from "../utils/cn";
import { Icon, folderIconName } from "./Icons";

interface Props {
  folders: Record<string, Folder>;
  rootId?: string;
  selectedId: string;
  onSelect: (id: string) => void;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onContext?: (id: string, e: MouseEvent) => void;
  onDropFiles?: (ids: string[], target: string, copy: boolean) => void;
  canDrop?: (id: string) => boolean;
  className?: string;
  autoFocus?: boolean;
}

export function FolderTree({
  folders,
  rootId = "desktop",
  selectedId,
  onSelect,
  expanded,
  onToggle,
  onContext,
  onDropFiles,
  canDrop,
  className,
  autoFocus,
}: Props) {
  const [hasFocus, setHasFocus] = useState(false);
  const [dropId, setDropId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // flat list of visible nodes for keyboard navigation
  const visible = useMemo(() => {
    const out: string[] = [];
    const walk = (id: string) => {
      out.push(id);
      const f = folders[id];
      if (f.children.length && expanded.has(id)) f.children.forEach(walk);
    };
    walk(rootId);
    return out;
  }, [folders, expanded, rootId]);

  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>(`[data-tid="${selectedId}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedId]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const onKey = (e: KeyboardEvent) => {
    const i = visible.indexOf(selectedId);
    const f = folders[selectedId];
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (visible[i + 1]) onSelect(visible[i + 1]);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (visible[i - 1]) onSelect(visible[i - 1]);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (f.children.length) {
        if (!expanded.has(selectedId)) onToggle(selectedId);
        else onSelect(f.children[0]);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (f.children.length && expanded.has(selectedId)) onToggle(selectedId);
      else if (f.parent) onSelect(f.parent);
    } else if (e.key === "Home") {
      e.preventDefault();
      onSelect(visible[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      onSelect(visible[visible.length - 1]);
    } else if (e.key === "*" || e.key === "+") {
      if (f.children.length && !expanded.has(selectedId)) onToggle(selectedId);
    } else if (e.key === "-") {
      if (f.children.length && expanded.has(selectedId)) onToggle(selectedId);
    }
  };

  const dropProps = (id: string) =>
    onDropFiles
      ? {
          onDragOver: (e: DragEvent) => {
            if (!e.dataTransfer.types.includes("text/x-acdsee")) return;
            if (canDrop && !canDrop(id)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = e.ctrlKey ? "copy" : "move";
            if (dropId !== id) setDropId(id);
          },
          onDragLeave: () => setDropId((d) => (d === id ? null : d)),
          onDrop: (e: DragEvent) => {
            e.preventDefault();
            setDropId(null);
            try {
              const ids = JSON.parse(e.dataTransfer.getData("text/x-acdsee")) as string[];
              onDropFiles(ids, id, e.ctrlKey);
            } catch {
              /* ignore */
            }
          },
        }
      : {};

  const renderNode = (id: string, depth: number, last: boolean) => {
    const f = folders[id];
    const hasKids = f.children.length > 0;
    const open = hasKids && expanded.has(id);
    const sel = selectedId === id;
    return (
      <li key={id} className={cn(depth === 0 ? "root" : last && "last", !hasKids && "leaf")}>
        <div className="tv-row">
          <div
            className="tv-tog"
            onClick={(e) => {
              e.stopPropagation();
              if (hasKids) onToggle(id);
            }}
          >
            {hasKids && <div className={cn("tv-box", !open && "plus")} />}
          </div>
          <Icon name={folderIconName(f.kind, sel, folders.recycle?.files.length > 0)} />
          <span
            data-tid={id}
            className={cn("tv-label", sel && "sel", sel && !hasFocus && "unfocused", sel && hasFocus && "focus", dropId === id && "drop")}
            onClick={() => onSelect(id)}
            onDoubleClick={() => hasKids && onToggle(id)}
            onContextMenu={(e) => {
              if (onContext) {
                e.preventDefault();
                onContext(id, e);
              }
            }}
            {...dropProps(id)}
          >
            {f.name}
          </span>
        </div>
        {open && (
          <ul>
            {f.children.map((c, i) => renderNode(c, depth + 1, i === f.children.length - 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div
      ref={ref}
      tabIndex={0}
      className={cn("tv bg-white overflow-auto outline-none py-0.5 pl-0.5", className)}
      onKeyDown={onKey}
      onFocus={() => setHasFocus(true)}
      onBlur={() => setHasFocus(false)}
    >
      <ul style={{ width: "max-content", minWidth: "100%" }}>{renderNode(rootId, 0, true)}</ul>
    </div>
  );
}
