import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import { Icon } from "./Icons";

export function ToolBtn({
  icon,
  tip,
  onClick,
  disabled,
  on,
  label,
  className,
}: {
  icon: string;
  tip: string;
  onClick?: () => void;
  disabled?: boolean;
  on?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <button type="button" tabIndex={-1} className={cn("tb-btn", on && "on", className)} data-tip={tip} disabled={disabled} onClick={onClick} onMouseDown={(e) => e.preventDefault()}>
      <Icon name={icon} />
      {label && <span className="pr-0.5">{label}</span>}
    </button>
  );
}

export const ToolSep = () => <div className="tb-sep" />;

export function ToolbarRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center flex-wrap px-1 py-[2px]", className)} style={{ boxShadow: "inset 0 1px 0 #fff, inset 0 -1px 0 #808080" }}>
      <div className="tb-grip" />
      {children}
    </div>
  );
}
