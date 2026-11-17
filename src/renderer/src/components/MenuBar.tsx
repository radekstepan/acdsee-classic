import { useEffect, useRef, useState } from "react";

export type MenuItem = {
  label?: string;
  shortcut?: string;
  action?: string;
  separator?: boolean;
  checked?: boolean;
  disabled?: boolean;
  submenu?: MenuItem[];
};

export type MenuDef = {
  label: string;
  items: MenuItem[];
  width?: number;
};

type Props = {
  menus: MenuDef[];
  onCommand: (action: string) => void;
};

export default function MenuBar({ menus, onCommand }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openIndex === null) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenIndex(null);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenIndex(null);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", key);
    };
  }, [openIndex]);

  const choose = (item: MenuItem) => {
    if (item.disabled || item.separator || item.submenu) return;
    if (item.action) {
      onCommand(item.action);
      setOpenIndex(null);
    }
  };

  return (
    <div className="menubar" ref={rootRef} role="menubar">
      {menus.map((menu, index) => (
        <div className="menu-root" key={menu.label}>
          <button
            type="button"
            className={`menu-title ${openIndex === index ? "active" : ""}`}
            onMouseDown={(event) => {
              event.preventDefault();
              setOpenIndex(openIndex === index ? null : index);
            }}
            onMouseEnter={() => {
              if (openIndex !== null) setOpenIndex(index);
            }}
            aria-haspopup="menu"
            aria-expanded={openIndex === index}
          >
            {menu.label}
          </button>
          {openIndex === index && (
            <div className="menu-dropdown" style={{ minWidth: menu.width ?? 214 }} role="menu">
              {menu.items.map((item, itemIndex) =>
                item.separator ? (
                  <div className="menu-separator" key={`sep-${itemIndex}`} />
                ) : item.submenu ? (
                  <div className="menu-item has-submenu" key={`${item.label}-${itemIndex}`}>
                    <span className="menu-check" />
                    <span className="menu-label">{item.label}</span>
                    <span className="menu-arrow">▶</span>
                    <div className="menu-dropdown submenu" role="menu">
                      {item.submenu.map((sub, subIndex) =>
                        sub.separator ? (
                          <div className="menu-separator" key={`subsep-${subIndex}`} />
                        ) : (
                          <button
                            type="button"
                            key={`${sub.label}-${subIndex}`}
                            className={`menu-item ${sub.disabled ? "disabled" : ""} ${sub.checked ? "checked" : ""}`}
                            onClick={() => choose(sub)}
                            disabled={sub.disabled}
                          >
                            <span className="menu-check">{sub.checked ? "✓" : ""}</span>
                            <span className="menu-label">{sub.label}</span>
                            <span className="menu-shortcut">{sub.shortcut ?? ""}</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    key={`${item.label}-${itemIndex}`}
                    className={`menu-item ${item.disabled ? "disabled" : ""} ${item.checked ? "checked" : ""}`}
                    onClick={() => choose(item)}
                    disabled={item.disabled}
                    role="menuitem"
                  >
                    <span className="menu-check">{item.checked ? "✓" : ""}</span>
                    <span className="menu-label">{item.label}</span>
                    <span className="menu-shortcut">{item.shortcut ?? ""}</span>
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
