import type { CSSProperties } from "react";
import type { Edit, FileEntry } from "../types";
import { editFilter, editTransform } from "../utils/util";

interface Props {
  file: FileEntry;
  /** display size in CSS pixels (after rotation) */
  w: number;
  h: number;
  thumb?: boolean;
  /** override edit (live preview in dialogs) */
  edit?: Edit;
  style?: CSSProperties;
  className?: string;
  draggable?: boolean;
}

/** Renders a photo with rotation / flip / colour adjustments applied, inside a w x h box. */
export function EditedImage({ file, w, h, thumb, edit, style, className }: Props) {
  const e = edit ?? file.edit;
  const swap = e.rot % 180 !== 0;
  const iw = swap ? h : w;
  const ih = swap ? w : h;
  const src = thumb ? file.src || file.fullSrc : file.fullSrc || file.src;

  if (!src) {
    return (
      <div
        className={className}
        style={{
          width: w,
          height: h,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px dotted #808080",
          color: "#808080",
          background: "#f4f4f4",
          ...style
        }}
      >
        <svg width="12" height="16" viewBox="0 0 12 16" shapeRendering="crispEdges" opacity=".55">
          <path d="M1 0h10v2H9v2L7 7v2l2 3v2h2v2H1v-2h2v-2l2-3V7L3 4V2H1z" fill="#000" />
        </svg>
      </div>
    );
  }

  return (
    <div className={className} style={{ width: w, height: h, position: "relative", overflow: "hidden", flex: "none", ...style }}>
      <img
        src={src}
        alt=""
        draggable={false}
        decoding="async"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: iw,
          height: ih,
          maxWidth: "none",
          maxHeight: "none",
          marginLeft: -iw / 2,
          marginTop: -ih / 2,
          transform: editTransform(e),
          filter: editFilter(e),
          display: "block",
          // Contain, not fill: the box already matches the photo's aspect, so
          // this renders identically — but a dimension mismatch can never skew.
          objectFit: "contain"
        }}
      />
    </div>
  );
}
