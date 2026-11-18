import { useEffect, useRef, useState } from "react";
import { useNow } from "../utils/hooks";
import { cn } from "../utils/cn";
import { Icon } from "./Icons";
import { Mn, MenuPopup } from "./ui";
import type { MenuItem } from "../types";

export interface TaskItem {
  id: string;
  title: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}

interface Props {
  tasks: TaskItem[];
  startItems: MenuItem[];
}

export function Taskbar({ tasks, startItems }: Props) {
  const now = useNow(5000);
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);

  let h = now.getHours();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const time = `${h}:${String(now.getMinutes()).padStart(2, "0")} ${ap}`;

  return (
    <div className="taskbar select-none">
      <button
        ref={btn}
        data-start
        className="flex items-center gap-1 px-2 h-[22px] font-bold raised"
        style={
          open
            ? { boxShadow: "inset -1px -1px #fff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px #808080", paddingTop: 1, paddingLeft: 9 }
            : undefined
        }
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
      >
        <Icon name="start" size={16} />
        Start
      </button>
      <div className="etched-v h-[20px] mx-0.5" />
      <div className="flex-1 min-w-0 flex gap-[3px]">
        {tasks.map((t) => (
          <button key={t.id} className={cn("task-btn", t.active && "on")} onClick={t.onClick}>
            <Icon name={t.icon} size={14} />
            <span className="truncate">{t.title}</span>
          </button>
        ))}
      </div>
      <div className="sunken-thin flex items-center gap-2 px-2 h-[22px]" data-tip={now.toDateString()}>
        <Icon name="speaker" size={14} />
        <span>{time}</span>
      </div>

      {open && btn.current && <StartMenu items={startItems} bottom={btn.current.getBoundingClientRect().top} onClose={() => setOpen(false)} />}
    </div>
  );
}

function StartMenu({ items, bottom, onClose }: { items: MenuItem[]; bottom: number; onClose: () => void }) {
  const [hl, setHl] = useState(-1);
  const [sub, setSub] = useState<{ i: number; rect: DOMRect } | null>(null);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest(".menu-popup") || t.closest("[data-start]")) return;
      onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", down, true);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down, true);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  return (
    <>
      <div className="menu-popup flex" style={{ left: 2, top: "auto", bottom: window.innerHeight - bottom + 1, padding: 3, minWidth: 0 }}>
        <div
          className="flex-none flex items-end justify-center"
          style={{ width: 22, background: "linear-gradient(0deg,#000080,#1084d0)", color: "#fff", marginRight: 2 }}
        >
          <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontFamily: "Arial, sans-serif", padding: "8px 0 6px", whiteSpace: "nowrap" }}>
            <b style={{ fontSize: 18 }}>Windows</b>
            <span style={{ fontSize: 18, marginLeft: 2, fontWeight: 400 }}>98</span>
          </span>
        </div>
        <div style={{ minWidth: 178 }}>
          {items.map((it, i) =>
            it.separator ? (
              <div key={i} className="menu-sep" />
            ) : (
              <div
                key={i}
                className={cn("menu-item", (hl === i || sub?.i === i) && "hl")}
                style={{ height: 32, padding: "0 22px 0 6px", gap: 10, fontSize: 11 }}
                onMouseEnter={(e) => {
                  setHl(i);
                  if (it.submenu) setSub({ i, rect: e.currentTarget.getBoundingClientRect() });
                  else setSub(null);
                }}
                onClick={() => {
                  if (it.submenu) return;
                  onClose();
                  setTimeout(() => it.onClick?.(), 0);
                }}
              >
                <Icon name={it.icon ?? "docs"} size={32} />
                <span className="flex-1" style={{ fontSize: 12 }}>
                  <Mn text={it.label ?? ""} />
                </span>
                {it.submenu && (
                  <span className="absolute right-1.5">
                    <svg width="4" height="7" viewBox="0 0 4 7" shapeRendering="crispEdges">
                      <path d="M0 0h1v7H0zM1 1h1v5H1zM2 2h1v3H2zM3 3h1v1H3z" fill="currentColor" />
                    </svg>
                  </span>
                )}
              </div>
            ),
          )}
        </div>
      </div>
      {sub && items[sub.i].submenu && (
        <MenuPopup items={items[sub.i].submenu!} x={sub.rect.right - 2} y={sub.rect.top - 3} parentRect={sub.rect} onClose={onClose} onLeft={() => setSub(null)} />
      )}
    </>
  );
}
