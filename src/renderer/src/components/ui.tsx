import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
  type MouseEvent as RMouseEvent,
} from "react";
import { cn } from "../utils/cn";
import type { MenuItem, MsgIcon } from "../types";
import { Icon, MsgIconSvg } from "./Icons";

/* ------------------------------------------------------------------ */
/* Mnemonic label:  "&File" -> <u>F</u>ile                              */
/* ------------------------------------------------------------------ */
export function Mn({ text }: { text: string }) {
  const i = text.indexOf("&");
  if (i < 0 || i === text.length - 1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <u style={{ textDecoration: "underline", textUnderlineOffset: 1 }}>{text[i + 1]}</u>
      {text.slice(i + 2)}
    </>
  );
}

export function mnemonicOf(text: string): string | null {
  const i = text.indexOf("&");
  return i >= 0 && i < text.length - 1 ? text[i + 1].toLowerCase() : null;
}

/* ------------------------------------------------------------------ */
/* Basic controls                                                       */
/* ------------------------------------------------------------------ */
export function Button({
  def,
  small,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { def?: boolean; small?: boolean }) {
  return (
    <button type="button" className={cn("btn", def && "default", small && "small", className)} {...rest}>
      {typeof children === "string" ? <Mn text={children} /> : children}
    </button>
  );
}

export function Check({
  checked,
  onChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("chk", disabled && "dis", className)}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <Mn text={label} />
      </span>
    </label>
  );
}

export function Radio({
  checked,
  onChange,
  label,
  name,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  name?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("rad", disabled && "dis", className)}>
      <input type="radio" name={name} checked={checked} disabled={disabled} onChange={onChange} />
      <span>
        <Mn text={label} />
      </span>
    </label>
  );
}

export function GroupBox({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("group", className)}>
      <span className="group-title">
        <Mn text={title} />
      </span>
      {children}
    </div>
  );
}

export function Tabs({
  tabs,
  value,
  onChange,
  children,
  className,
}: {
  tabs: string[];
  value: number;
  onChange: (i: number) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="tabs" role="tablist">
        {tabs.map((t, i) => (
          <button key={t} role="tab" aria-selected={i === value} className={cn("tab", i === value && "sel")} onClick={() => onChange(i)}>
            <Mn text={t} />
          </button>
        ))}
      </div>
      <div className="tab-panel">{children}</div>
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="progress">
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Window controls                                                      */
/* ------------------------------------------------------------------ */
export function TitleButtons({
  onMin,
  onMax,
  onClose,
  maximized,
  help,
}: {
  onMin?: () => void;
  onMax?: () => void;
  onClose?: () => void;
  maximized?: boolean;
  help?: boolean;
}) {
  const stop = (e: RMouseEvent) => e.stopPropagation();
  return (
    <div className="flex" onMouseDown={stop} onDoubleClick={stop}>
      {help && (
        <button className="title-btn" aria-label="Help" tabIndex={-1}>
          <span style={{ fontWeight: 700, color: "#000", lineHeight: "10px", fontSize: 10 }}>?</span>
        </button>
      )}
      {onMin && (
        <button className="title-btn" aria-label="Minimize" onClick={onMin} tabIndex={-1}>
          <svg width="8" height="8" viewBox="0 0 8 8" shapeRendering="crispEdges">
            <rect x="0" y="6" width="6" height="2" fill="#000" />
          </svg>
        </button>
      )}
      {onMax && (
        <button className="title-btn" aria-label={maximized ? "Restore" : "Maximize"} onClick={onMax} tabIndex={-1}>
          {maximized ? (
            <svg width="8" height="9" viewBox="0 0 8 9" shapeRendering="crispEdges">
              <path d="M2 0h6v6H7V1H2z M0 2h6v6H0z M1 3v4h4V3z" fill="#000" fillRule="evenodd" />
            </svg>
          ) : (
            <svg width="9" height="9" viewBox="0 0 9 9" shapeRendering="crispEdges">
              <path d="M0 0h9v9H0z M1 2v6h7V2z" fill="#000" fillRule="evenodd" />
              <rect x="0" y="0" width="9" height="2" fill="#000" />
            </svg>
          )}
        </button>
      )}
      {onClose && (
        <button className={cn("title-btn", (onMin || onMax) && "gap")} aria-label="Close" onClick={onClose} tabIndex={-1}>
          <svg width="8" height="7" viewBox="0 0 8 7" shapeRendering="crispEdges">
            <path d="M0 0h2v1h1v1h2V1h1V0h2v1H7v1H6v1H5v1h1v1h1v1h1v1H6V6H5V5H3v1H2v1H0V6h1V5h1V4h1V3H2V2H1V1H0z" fill="#000" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dialog                                                               */
/* ------------------------------------------------------------------ */
const dialogStack: string[] = [];

export function Dialog({
  title,
  icon,
  width,
  onClose,
  onEnter,
  children,
  help,
  noClose,
  className,
}: {
  title: string;
  icon?: string;
  width?: number | string;
  onClose: () => void;
  onEnter?: () => void;
  children: ReactNode;
  help?: boolean;
  noClose?: boolean;
  className?: string;
}) {
  const id = useId();
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [flash, setFlash] = useState(0);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogStack.push(id);
    const el = ref.current;
    // don't steal focus from an autoFocus'd control inside the dialog
    if (el && !el.contains(document.activeElement)) el.focus();
    return () => {
      const i = dialogStack.indexOf(id);
      if (i >= 0) dialogStack.splice(i, 1);
    };
  }, [id]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (dialogStack[dialogStack.length - 1] !== id) return;
      if (e.key === "Escape" && !noClose) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === "Enter" && onEnter) {
        const t = e.target as HTMLElement;
        if (t.tagName === "TEXTAREA" || t.tagName === "BUTTON" || t.tagName === "SELECT") return;
        e.preventDefault();
        onEnter();
      }
    };
    document.addEventListener("keydown", h, true);
    return () => document.removeEventListener("keydown", h, true);
  }, [id, onClose, onEnter, noClose]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash((f) => (f > 0 ? f - 1 : 0)), 90);
    return () => clearTimeout(t);
  }, [flash]);

  const onDown = (e: RMouseEvent) => {
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
    const move = (ev: MouseEvent) => {
      const d = drag.current;
      if (!d) return;
      setPos({ x: d.ox + ev.clientX - d.sx, y: d.oy + ev.clientY - d.sy });
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 10000 + dialogStack.length }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setFlash(6);
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        className={cn("window98 outline-none", className)}
        style={{ width, transform: `translate(${pos.x}px, ${pos.y}px)`, boxShadow: undefined, maxWidth: "98vw" }}
        role="dialog"
        aria-label={title}
      >
        <div className={cn("title-bar", flash % 2 === 1 && "inactive")} onMouseDown={onDown}>
          <div className="title-bar-text">
            {icon && <Icon name={icon} size={14} />}
            <span className="truncate">{title}</span>
          </div>
          <TitleButtons help={help} onClose={noClose ? undefined : onClose} />
        </div>
        <div className="p-2 pt-2.5">{children}</div>
      </div>
    </div>
  );
}

export function DialogButtons({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex justify-end gap-2 pt-3", className)}>{children}</div>;
}

export function MsgBox({
  title,
  text,
  icon,
  buttons,
  defaultBtn = 0,
  onResult,
  onClose,
}: {
  title: string;
  text: string;
  icon: MsgIcon;
  buttons: string[];
  defaultBtn?: number;
  onResult?: (b: string) => void;
  onClose: () => void;
}) {
  const finish = (b: string) => {
    onClose();
    onResult?.(b);
  };
  const cancelLabel = buttons.includes("Cancel") ? "Cancel" : buttons.includes("No") ? "No" : buttons[buttons.length - 1];
  return (
    <Dialog title={title} width={Math.max(260, Math.min(420, 120 + text.length * 3))} onClose={() => finish(buttons.length === 1 ? buttons[0] : cancelLabel)} onEnter={() => finish(buttons[defaultBtn])}>
      <div className="flex gap-4 px-2 pt-2 pb-1 items-start">
        <MsgIconSvg kind={icon} />
        <div className="pt-1 whitespace-pre-line leading-[14px] pr-2">{text}</div>
      </div>
      <div className="flex justify-center gap-2 pt-4 pb-1">
        {buttons.map((b, i) => (
          <Button key={b} def={i === defaultBtn} onClick={() => finish(b)} autoFocus={i === defaultBtn} className="min-w-[75px]">
            {b}
          </Button>
        ))}
      </div>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Menus                                                                */
/* ------------------------------------------------------------------ */
interface PopupProps {
  items: MenuItem[];
  x: number;
  y: number;
  /** if set, the popup's bottom edge is aligned to this y coordinate */
  above?: number;
  onClose: () => void;
  /** when opened as a submenu: the parent item's rect, used for flipping */
  parentRect?: DOMRect;
  active?: boolean;
  onLeft?: () => void;
}

export function MenuPopup({ items, x, y, above, onClose, parentRect, active = true, onLeft }: PopupProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const [hl, setHl] = useState(-1);
  const [sub, setSub] = useState<{ index: number; rect: DOMRect } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let nx = x;
    let ny = y;
    if (nx + w > window.innerWidth - 2) {
      nx = parentRect ? parentRect.left - w + 3 : Math.max(0, window.innerWidth - w - 2);
    }
    if (above !== undefined) ny = above - h;
    else if (ny + h > window.innerHeight - 2) ny = Math.max(0, window.innerHeight - h - 2);
    setPos({ x: nx, y: ny });
  }, [x, y, above, parentRect]);

  const selectable = items.map((it, i) => (!it.separator && !it.disabled ? i : -1)).filter((i) => i >= 0);

  const openSub = (i: number, el: HTMLElement) => {
    setSub({ index: i, rect: el.getBoundingClientRect() });
  };

  const activate = (it: MenuItem) => {
    if (it.disabled || it.separator) return;
    if (it.submenu) return;
    onClose();
    // let the menu unmount before running the action
    setTimeout(() => it.onClick?.(), 0);
  };

  useEffect(() => {
    if (!active) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        const dir = e.key === "ArrowDown" ? 1 : -1;
        const cur = selectable.indexOf(hl);
        const next = selectable[(cur + dir + selectable.length) % selectable.length];
        setHl(next ?? -1);
      } else if (e.key === "Enter" || e.key === " ") {
        if (hl >= 0) {
          e.preventDefault();
          e.stopPropagation();
          const it = items[hl];
          if (it.submenu) {
            const el = ref.current?.querySelectorAll<HTMLElement>("[data-mi]")[hl];
            if (el) openSub(hl, el);
          } else activate(it);
        }
      } else if (e.key === "ArrowRight") {
        const it = items[hl];
        if (it?.submenu) {
          e.preventDefault();
          e.stopPropagation();
          const el = ref.current?.querySelectorAll<HTMLElement>("[data-mi]")[hl];
          if (el) openSub(hl, el);
        }
      } else if (e.key === "ArrowLeft") {
        if (onLeft) {
          e.preventDefault();
          e.stopPropagation();
          onLeft();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (onLeft) onLeft();
        else onClose();
      }
    };
    document.addEventListener("keydown", h, true);
    return () => document.removeEventListener("keydown", h, true);
  });

  return (
    <>
      <div ref={ref} className="menu-popup" style={{ left: pos.x, top: pos.y }} onContextMenu={(e) => e.preventDefault()}>
        {items.map((it, i) =>
          it.separator ? (
            <div key={i} className="menu-sep" />
          ) : (
            <div
              key={i}
              data-mi
              className={cn("menu-item", it.disabled && "dis", (hl === i || sub?.index === i) && "hl")}
              onMouseEnter={(e) => {
                setHl(i);
                if (it.submenu && !it.disabled) openSub(i, e.currentTarget);
                else setSub(null);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => activate(it)}
              style={it.bold ? { fontWeight: 700 } : undefined}
            >
              <span className="absolute left-1.5 top-0 bottom-0 flex items-center justify-center w-[16px]">
                {it.checked && !it.radio && (
                  <svg width="8" height="8" viewBox="0 0 8 8" shapeRendering="crispEdges">
                    <path d="M7 0H6v1H5v1H4v1H3v1H2V3H1V2H0v3h1v1h1v1h1V6h1V5h1V4h1V3h1V0z" fill="currentColor" transform="translate(0 .5)" />
                  </svg>
                )}
                {it.checked && it.radio && <span style={{ width: 5, height: 5, borderRadius: 3, background: "currentColor" }} />}
                {!it.checked && it.icon && <Icon name={it.icon} size={16} style={it.disabled ? { opacity: 0.4, filter: "grayscale(1)" } : undefined} />}
              </span>
              <span className="flex-1">
                <Mn text={it.label ?? ""} />
              </span>
              {it.shortcut && <span className="pl-8">{it.shortcut}</span>}
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
      {sub && items[sub.index]?.submenu && (
        <MenuPopup
          items={items[sub.index].submenu!}
          x={sub.rect.right - 4}
          y={sub.rect.top - 4}
          parentRect={sub.rect}
          onClose={onClose}
          onLeft={() => setSub(null)}
        />
      )}
    </>
  );
}

export interface MenuDef {
  label: string;
  items: MenuItem[];
}

export function MenuBar({ menus, className }: { menus: MenuDef[]; className?: string }) {
  const [open, setOpen] = useState<{ index: number; x: number; y: number } | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest(".menu-popup") || t.closest("[data-menubar-item]")) return;
      setOpen(null);
    };
    document.addEventListener("mousedown", h, true);
    return () => document.removeEventListener("mousedown", h, true);
  }, [open]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const k = e.key.toLowerCase();
      const idx = menus.findIndex((m) => mnemonicOf(m.label) === k);
      if (idx >= 0) {
        const el = barRef.current?.querySelectorAll<HTMLElement>("[data-menubar-item]")[idx];
        if (el) {
          e.preventDefault();
          const r = el.getBoundingClientRect();
          setOpen({ index: idx, x: r.left, y: r.bottom - 1 });
        }
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [menus]);

  const openAt = (i: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setOpen({ index: i, x: r.left, y: r.bottom - 1 });
  };

  return (
    <div ref={barRef} className={cn("flex items-center px-0.5 py-px", className)}>
      {menus.map((m, i) => (
        <button
          key={m.label}
          data-menubar-item
          tabIndex={-1}
          className={cn("menubar-item", open?.index === i && "open")}
          onMouseDown={(e) => {
            e.preventDefault();
            if (open?.index === i) setOpen(null);
            else openAt(i, e.currentTarget);
          }}
          onMouseEnter={(e) => {
            if (open && open.index !== i) openAt(i, e.currentTarget);
          }}
        >
          <Mn text={m.label} />
        </button>
      ))}
      {open && <MenuPopup key={open.index} items={menus[open.index].items} x={open.x} y={open.y} onClose={close} />}
    </div>
  );
}

export function ContextMenu({ items, x, y, onClose }: { items: MenuItem[]; x: number; y: number; onClose: () => void }) {
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest(".menu-popup")) return;
      onClose();
    };
    const blur = () => onClose();
    document.addEventListener("mousedown", h, true);
    window.addEventListener("blur", blur);
    window.addEventListener("resize", blur);
    return () => {
      document.removeEventListener("mousedown", h, true);
      window.removeEventListener("blur", blur);
      window.removeEventListener("resize", blur);
    };
  }, [onClose]);
  return <MenuPopup items={items} x={x} y={y} onClose={onClose} />;
}

/* ------------------------------------------------------------------ */
/* Tooltips via data-tip                                                */
/* ------------------------------------------------------------------ */
export function TooltipLayer() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  useEffect(() => {
    let timer: number | undefined;
    let current: HTMLElement | null = null;
    const hide = () => {
      window.clearTimeout(timer);
      current = null;
      setTip(null);
    };
    const over = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest?.("[data-tip]") as HTMLElement | null;
      if (el === current) return;
      hide();
      if (!el) return;
      current = el;
      const x = e.clientX;
      const y = e.clientY;
      timer = window.setTimeout(() => {
        setTip({ text: el.dataset.tip || "", x, y });
        timer = window.setTimeout(hide, 5000);
      }, 550);
    };
    document.addEventListener("mouseover", over);
    document.addEventListener("mousedown", hide, true);
    document.addEventListener("keydown", hide, true);
    return () => {
      document.removeEventListener("mouseover", over);
      document.removeEventListener("mousedown", hide, true);
      document.removeEventListener("keydown", hide, true);
      window.clearTimeout(timer);
    };
  }, []);
  if (!tip) return null;
  const left = Math.min(tip.x + 8, window.innerWidth - tip.text.length * 6 - 16);
  return (
    <div className="w98-tip" style={{ left: Math.max(2, left), top: tip.y + 20 }}>
      {tip.text}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Draggable splitter hook                                              */
/* ------------------------------------------------------------------ */
export function useSplitter(initial: number, min: number, max: number, axis: "x" | "y", invert = false) {
  const [size, setSize] = useState(initial);
  const onMouseDown = (e: RMouseEvent) => {
    e.preventDefault();
    const start = axis === "x" ? e.clientX : e.clientY;
    const startSize = size;
    const prevCursor = document.body.style.cursor;
    document.body.style.cursor = axis === "x" ? "col-resize" : "row-resize";
    const move = (ev: MouseEvent) => {
      const cur = axis === "x" ? ev.clientX : ev.clientY;
      const d = (cur - start) * (invert ? -1 : 1);
      setSize(Math.max(min, Math.min(max, startSize + d)));
    };
    const up = () => {
      document.body.style.cursor = prevCursor;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  return { size, setSize, onMouseDown };
}
