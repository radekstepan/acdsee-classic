import type { CSSProperties, ReactNode } from "react";
import { FORMATS } from "../data/catalog";
import appIconUrl from "../assets/app-icon.png?inline";

const OUT = "#000";
const YEL = "#ffe56a";
const YELD = "#806800";
const GRN = "#20b020";
const GRND = "#004800";
const BLU = "#0040c0";
const SKY = "#8cc4ff";
const GRY = "#c0c0c0";
const DGR = "#808080";

const ImgPage = ({ color }: { color: string }) => (
  <>
    <path d="M2.5 .5h8l3 3v12h-11z" fill="#fff" stroke={OUT} strokeWidth=".8" />
    <path d="M10.5 .5v3h3" fill={GRY} stroke={OUT} strokeWidth=".8" />
    <rect x="3.5" y="4.5" width="9" height="7" fill={SKY} stroke="#404040" strokeWidth=".4" />
    <rect x="3.5" y="4.5" width="9" height="1.6" fill="#bfe2ff" />
    <circle cx="10.6" cy="6.6" r="1.1" fill="#fff59a" stroke="#d0a000" strokeWidth=".4" />
    <path d="M3.5 11.5l2.8-4 2 2.4 1.4-1.6 1.8 3.2z" fill="#2f8030" />
    <path d="M3.5 11.5l2.8-4 .9 1.1-1.7 2.9z" fill="#4aa04a" />
    <rect x="3.5" y="12.5" width="9" height="2" fill={color} stroke="#303030" strokeWidth=".4" />
  </>
);

const Monitor = ({ screen = "#008080" }: { screen?: string }) => (
  <>
    <rect x=".5" y="1.5" width="15" height="10" fill={GRY} stroke={OUT} />
    <rect x="2" y="3" width="12" height="7" fill={screen} />
    <rect x="1" y="2" width="14" height="1" fill="#fff" opacity=".0" />
    <rect x="5.5" y="11.5" width="5" height="2" fill={GRY} stroke={OUT} />
    <rect x="3.5" y="13.5" width="9" height="1.5" fill={GRY} stroke={OUT} />
  </>
);

const Magnifier = ({ extra }: { extra?: ReactNode }) => (
  <>
    <circle cx="6.5" cy="6.5" r="4.5" fill="#cfe6ff" stroke={OUT} />
    <path d="M3.5 5a3.5 3.5 0 0 1 3-2" stroke="#fff" fill="none" />
    <path d="M10 10l5 5" stroke="#804000" strokeWidth="2.4" />
    <path d="M10 10l2 2" stroke={OUT} strokeWidth="1" />
    {extra}
  </>
);

const Arrow = ({ d, fill = GRN, stroke = GRND }: { d: string; fill?: string; stroke?: string }) => (
  <path d={d} fill={fill} stroke={stroke} strokeLinejoin="miter" />
);

const ICONS: Record<string, ReactNode> = {
  /* ---- tree / file system ---- */
  desktop: <Monitor />,
  computer: (
    <>
      <rect x="1.5" y=".5" width="10" height="8" fill={GRY} stroke={OUT} />
      <rect x="3" y="2" width="7" height="5" fill="#008080" />
      <rect x="0.5" y="9.5" width="15" height="5" fill={GRY} stroke={OUT} />
      <rect x="2" y="11" width="6" height="1" fill={DGR} />
      <rect x="12" y="11" width="2" height="1" fill="#00c000" />
    </>
  ),
  hdd: (
    <>
      <path d="M1.5 6.5l2-3h9l2 3v5h-13z" fill={GRY} stroke={OUT} />
      <path d="M2 7.5h12" stroke="#fff" />
      <rect x="3" y="9" width="6" height="1" fill={DGR} />
      <rect x="11" y="8.5" width="2" height="2" fill="#00c000" stroke="#004000" strokeWidth=".5" />
    </>
  ),
  floppy: (
    <>
      <path d="M1.5 1.5h11l2 2v11h-13z" fill="#303090" stroke={OUT} />
      <rect x="4" y="2" width="7" height="5" fill={GRY} />
      <rect x="8.5" y="3" width="1.5" height="3" fill="#303090" />
      <rect x="3" y="9" width="10" height="5" fill="#fff" />
      <path d="M4 11h8M4 13h6" stroke="#c03030" />
    </>
  ),
  cdrom: (
    <>
      <circle cx="8" cy="8" r="6.5" fill="#d8e0e8" stroke="#404040" />
      <path d="M8 2a6 6 0 0 1 6 6" stroke="#60a8ff" fill="none" />
      <path d="M2 9a6 6 0 0 0 4 4.5" stroke="#ff80c0" fill="none" />
      <circle cx="8" cy="8" r="2" fill="#fff" stroke="#404040" />
    </>
  ),
  network: (
    <>
      <rect x="1.5" y="1.5" width="7" height="5" fill={GRY} stroke={OUT} />
      <rect x="3" y="3" width="4" height="2" fill="#008080" />
      <rect x="8.5" y="8.5" width="6" height="5" fill={GRY} stroke={OUT} />
      <rect x="10" y="10" width="3" height="2" fill="#008080" />
      <path d="M5 7v3.5h3.5M12 8v-2h-3" stroke="#000" fill="none" />
      <path d="M0 14.5h16" stroke="#008000" />
    </>
  ),
  netpc: <Monitor screen="#2080c0" />,
  recycle: (
    <>
      <path d="M3.5 5.5h9l-1 9h-7z" fill="#b8d0e8" stroke="#305070" />
      <rect x="2.5" y="3.5" width="11" height="2" fill="#b8d0e8" stroke="#305070" />
      <path d="M6 2.5h4" stroke="#305070" />
      <path d="M8 7.5l2 3h-4z" fill="#00a000" />
      <path d="M6 12h4" stroke="#00a000" />
    </>
  ),
  recycleFull: (
    <>
      <path d="M5 4L6.5 .5l3 1 .5 2" fill="#fff" stroke="#808080" />
      <path d="M8 3.5l3-2 1.5 2.5" fill="#f0f0a0" stroke="#808080" />
      <path d="M3.5 5.5h9l-1 9h-7z" fill="#b8d0e8" stroke="#305070" />
      <rect x="2.5" y="3.5" width="11" height="2" fill="#b8d0e8" stroke="#305070" />
      <path d="M8 7.5l2 3h-4z" fill="#00a000" />
    </>
  ),
  folder: (
    <>
      <path d="M1.5 2.5h4.4l1 1.1h7.6v9.8h-13z" fill={YEL} stroke={YELD} />
      <path d="M2.2 4.2h3.8l1 1.1h6.8" stroke="#fff8b8" fill="none" />
      <path d="M2.2 12.2h11.6" stroke="#d8b020" strokeWidth=".7" />
    </>
  ),
  folderLarge: (
    <>
      <path d="M1.5 2.5h4.4l1 1.1h7.6v9.8h-13z" fill={YEL} stroke={YELD} strokeWidth=".55" strokeLinejoin="miter" />
      <path d="M2.2 4.2h3.8l1 1.1h6.8" stroke="#fff8b8" strokeWidth=".6" fill="none" />
      <path d="M2.2 12.2h11.6" stroke="#d8b020" strokeWidth=".55" />
    </>
  ),
  folderOpen: (
    <>
      <path d="M1.5 3h4l1 1h6v2" fill="#d8b020" stroke={YELD} />
      <path d="M3.5 6h12l-2 7h-12z" fill={YEL} stroke={YELD} />
      <path d="M4.3 6.9h10.2" stroke="#fff8b8" />
    </>
  ),
  start: (
    <>
      <path d="M1 2.5c2-1 3-1 5 0v4.5c-2-1-3-1-5 0z" fill="#ff3020" />
      <path d="M7 3c2 1 3 1 5.5 0v4.5c-2.500 1-3.500 1-5.500 0z" fill="#30c030" />
      <path d="M1 8c2-1 3-1 5 0v4.500c-2-1-3-1-5 0z" fill="#2060ff" />
      <path d="M7 8.500c2 1 3 1 5.500 0v4.500c-2.500 1-3.500 1-5.500 0z" fill="#ffd800" />
    </>
  ),

  /* ---- toolbar ---- */
  up: (
    <>
      <path d="M1.5 7.5h4l1 1h7.500v6h-12.500z" fill={YEL} stroke={YELD} />
      <Arrow d="M8 .5l4.500 4.500h-2.500v3h-4v-3h-2.500z" />
    </>
  ),
  back: <Arrow d="M.5 8L7 1.500v3.500h8v6h-8v3.500z" />,
  forward: <Arrow d="M15.500 8L9 1.500v3.500h-8v6h8v3.500z" />,
  refresh: (
    <>
      <path d="M13 8a5 5 0 1 1-1.800-3.800" fill="none" stroke={BLU} strokeWidth="2" />
      <path d="M15 1v6h-6z" fill={BLU} />
    </>
  ),
  home: (
    <>
      <path d="M8 1l7 6h-2v7h-3.5v-4h-3v4H3v-7H1z" fill="#e05040" stroke="#600000" />
    </>
  ),
  thumbs: (
    <>
      <rect x=".5" y=".5" width="6.500" height="6.500" fill={SKY} stroke={OUT} />
      <rect x="9" y=".5" width="6.500" height="6.500" fill="#ffe080" stroke={OUT} />
      <rect x=".5" y="9" width="6.500" height="6.500" fill="#a0e0a0" stroke={OUT} />
      <rect x="9" y="9" width="6.500" height="6.500" fill="#f0a0a0" stroke={OUT} />
      <path d="M1 7l2-3 2 2 2 1z" fill="#208020" />
    </>
  ),
  filmstrip: (
    <>
      <rect x="1.500" y=".5" width="13" height="8.500" fill={SKY} stroke={OUT} />
      <path d="M2 9l3-4 3 3 2-2 4 3z" fill="#208020" />
      <rect x=".5" y="10.500" width="4" height="5" fill="#ffe080" stroke={OUT} />
      <rect x="6" y="10.500" width="4" height="5" fill="#a0e0a0" stroke={OUT} />
      <rect x="11.500" y="10.500" width="4" height="5" fill="#f0a0a0" stroke={OUT} />
    </>
  ),
  iconsView: (
    <>
      <path d="M.5 .5h5l1.500 1.500v5.500h-6.500z" fill="#fff" stroke={OUT} />
      <rect x="1.500" y="3" width="4" height="3" fill={SKY} />
      <path d="M9.500 .5h5l1 1.500v5.500h-6z" fill="#fff" stroke={OUT} />
      <rect x="10.500" y="3" width="4" height="3" fill="#ffe080" />
      <path d="M.5 9.500h5l1.500 1.500v4.500h-6.500z" fill="#fff" stroke={OUT} />
      <rect x="1.500" y="12" width="4" height="3" fill="#a0e0a0" />
      <path d="M9.500 9.500h5l1 1.500v4.500h-6z" fill="#fff" stroke={OUT} />
      <rect x="10.500" y="12" width="4" height="3" fill="#f0a0a0" />
    </>
  ),
  list: (
    <>
      <rect x="1" y="2" width="3" height="3" fill={YEL} stroke={YELD} strokeWidth=".6" />
      <rect x="1" y="7" width="3" height="3" fill={SKY} stroke={BLU} strokeWidth=".6" />
      <rect x="1" y="12" width="3" height="3" fill="#a0e0a0" stroke={GRND} strokeWidth=".6" />
      <path d="M5.500 3.500h4M5.500 8.500h4M5.500 13.500h4M11 3.500h4M11 8.500h4M11 13.500h4" stroke={OUT} />
    </>
  ),
  details: (
    <>
      <rect x=".5" y=".5" width="15" height="3.500" fill={GRY} stroke={OUT} />
      <path d="M5.500 .5v3.500M10.500 .5v3.500" stroke={OUT} />
      <path d="M1.500 6.500h3M6.500 6.500h3M11.500 6.500h3M1.500 9.500h3M6.500 9.500h3M11.500 9.500h3M1.500 12.500h3M6.500 12.500h3M11.500 12.500h3" stroke={OUT} />
    </>
  ),
  selectAll: (
    <>
      <rect x="1.500" y="1.500" width="13" height="13" fill="#d8e8ff" stroke={BLU} strokeDasharray="2 1" />
      <path d="M4 8l3 3 5-6" stroke={OUT} strokeWidth="1.600" fill="none" />
    </>
  ),
  copy: (
    <>
      <path d="M1.500 .5h6l2 2v8h-8z" fill="#fff" stroke={OUT} />
      <path d="M6.500 5.500h6l2 2v8h-8z" fill="#fff" stroke={OUT} />
      <path d="M8 9.500h5M8 11.500h5M8 13.500h4" stroke={DGR} />
    </>
  ),
  cut: (
    <>
      <path d="M4 1l7 9M12 1L5 10" stroke={OUT} strokeWidth="1.200" />
      <circle cx="4" cy="12.500" r="2.200" fill="none" stroke="#c00000" strokeWidth="1.400" />
      <circle cx="12" cy="12.500" r="2.200" fill="none" stroke="#c00000" strokeWidth="1.400" />
    </>
  ),
  paste: (
    <>
      <rect x="1.500" y="2.500" width="9" height="12" fill="#e0b060" stroke="#604010" />
      <rect x="4" y="1" width="4" height="3" fill={GRY} stroke={OUT} />
      <path d="M8.500 6.500h5l2 2v7h-7z" fill="#fff" stroke={OUT} />
    </>
  ),
  moveTo: (
    <>
      <path d="M.5 5.500h4l1 1h5.500v8h-10.500z" fill={YEL} stroke={YELD} />
      <Arrow d="M7 1.500h4.500v-1l4 3.500-4 3.500v-1h-4.500z" fill="#ff9020" stroke="#803000" />
    </>
  ),
  copyTo: (
    <>
      <path d="M.5 5.500h4l1 1h5.500v8h-10.500z" fill={YEL} stroke={YELD} />
      <rect x="8.500" y=".5" width="6" height="7" fill="#fff" stroke={OUT} />
      <path d="M10 3h3M10 5h3" stroke={DGR} />
    </>
  ),
  delete: <path d="M3 3l10 10M13 3L3 13" stroke="#d00000" strokeWidth="2.800" />,
  rename: (
    <>
      <rect x=".5" y="3.500" width="15" height="9" fill="#fff" stroke={OUT} />
      <path d="M3 6v4M2 6h2M2 10h2" stroke={OUT} />
      <path d="M6 7.500h6M6 9.500h4" stroke={DGR} />
      <path d="M7 1.500l1 1-1 1" fill="none" stroke="none" />
    </>
  ),
  slideshow: (
    <>
      <rect x="1.500" y="1.500" width="13" height="9" fill="#fff" stroke={OUT} />
      <rect x="3" y="3" width="10" height="6" fill={SKY} />
      <path d="M3 9l3-3 2 2 2-2 3 3z" fill="#208020" />
      <path d="M8 10.500v3M5 15.500l3-2 3 2" stroke={OUT} fill="none" />
    </>
  ),
  rotateR: (
    <>
      <path d="M13 8.5A5 5 0 1 1 10.6 3.7" fill="none" stroke={BLU} strokeWidth="1.6" />
      <path d="M14.7 1.3l-.3 5-4.4-2.4z" fill={BLU} />
      <rect x="4.5" y="5" width="7" height="6.5" fill="#fff" stroke={OUT} strokeWidth=".8" />
      <rect x="5.4" y="5.8" width="5.2" height="3.6" fill={SKY} />
      <circle cx="9.4" cy="6.9" r=".7" fill="#fff59a" />
      <path d="M5.4 9.4l1.7-2.2 1.2 1.2.9-.9 1.4 1.9z" fill="#308030" />
      <rect x="5.4" y="9.9" width="5.2" height=".8" fill="#ffd84a" />
    </>
  ),
  rotateL: (
    <g transform="translate(16 0) scale(-1 1)">
      <path d="M13 8.5A5 5 0 1 1 10.6 3.7" fill="none" stroke={BLU} strokeWidth="1.6" />
      <path d="M14.7 1.3l-.3 5-4.4-2.4z" fill={BLU} />
      <rect x="4.5" y="5" width="7" height="6.5" fill="#fff" stroke={OUT} strokeWidth=".8" />
      <rect x="5.4" y="5.8" width="5.2" height="3.6" fill={SKY} />
      <circle cx="9.4" cy="6.9" r=".7" fill="#fff59a" />
      <path d="M5.4 9.4l1.7-2.2 1.2 1.2.9-.9 1.4 1.9z" fill="#308030" />
      <rect x="5.4" y="9.9" width="5.2" height=".8" fill="#ffd84a" />
    </g>
  ),
  flipH: (
    <>
      <path d="M1 3v10l5.500-5z" fill="#6aa0ff" stroke={OUT} />
      <path d="M15 3v10l-5.500-5z" fill="#fff" stroke={OUT} />
      <path d="M8 1v14" stroke={OUT} strokeDasharray="1.500 1" />
    </>
  ),
  flipV: (
    <>
      <path d="M3 1h10l-5 5.500z" fill="#6aa0ff" stroke={OUT} />
      <path d="M3 15h10l-5-5.500z" fill="#fff" stroke={OUT} />
      <path d="M1 8h14" stroke={OUT} strokeDasharray="1.500 1" />
    </>
  ),
  zoomIn: (
    <Magnifier extra={<path d="M4 6.500h5M6.500 4v5" stroke={OUT} strokeWidth="1.400" />} />
  ),
  zoomOut: <Magnifier extra={<path d="M4 6.500h5" stroke={OUT} strokeWidth="1.400" />} />,
  fit: (
    <>
      <rect x="1.500" y="3.500" width="13" height="9" fill="#fff" stroke={OUT} />
      <rect x="4" y="5.500" width="8" height="5" fill={SKY} />
      <path d="M0 1h4M0 1v4M16 1h-4M16 1v4M0 15h4M0 15v-4M16 15h-4M16 15v-4" stroke={BLU} strokeWidth="1.400" fill="none" />
    </>
  ),
  actual: (
    <>
      <rect x=".5" y="2.500" width="15" height="11" fill="#fff" stroke={OUT} />
      <text x="8" y="11.500" fontSize="9" fontWeight="700" textAnchor="middle" fill={BLU} fontFamily="W98, Arial">
        1:1
      </text>
    </>
  ),
  fullscreen: (
    <>
      <rect x="1.500" y="2.500" width="13" height="11" fill="#202040" stroke={OUT} />
      <path d="M0.500 6.500v-6h6M15.500 6.500v-6h-6M.5 9.500v6h6M15.500 9.500v6h-6" fill="none" stroke={BLU} strokeWidth="1.200" />
    </>
  ),
  props: (
    <>
      <path d="M1.500 .5h8l3 3v12h-11z" fill="#fff" stroke={OUT} />
      <path d="M9.500 .5v3h3" fill={GRY} stroke={OUT} />
      <circle cx="8" cy="9.500" r="3.500" fill="#2060d0" stroke="#002060" />
      <path d="M8 8.500v3M8 7v.5" stroke="#fff" strokeWidth="1.200" />
    </>
  ),
  wallpaper: (
    <>
      <Monitor screen="#3a78d8" />
      <path d="M2 10l3-3 2.500 2.500 2-2 4 3.500V10z" fill="#30a030" />
    </>
  ),
  convert: (
    <>
      <path d="M.5 .5h6l2 2v6h-8z" fill="#fff" stroke={OUT} />
      <path d="M2 4h4M2 6h4" stroke="#c03030" />
      <path d="M7.500 7.500h6l2 2v6h-8z" fill="#fff" stroke={OUT} />
      <path d="M9 11h4M9 13h4" stroke="#2060c0" />
      <path d="M10 3.500h4V1.500l2 2.500-2 2.500V4.500h-4z" fill="#ff9020" stroke="#803000" strokeWidth=".6" />
    </>
  ),
  info: (
    <>
      <circle cx="8" cy="8" r="6.500" fill="#2060d0" stroke="#002060" />
      <path d="M8 7v5M8 4v1.200" stroke="#fff" strokeWidth="1.800" />
    </>
  ),
  help: (
    <>
      <path d="M2.500 1.500h11v9h-5l-3 3v-3h-3z" fill="#fff" stroke={OUT} />
      <text x="8" y="9.500" fontSize="9" fontWeight="700" textAnchor="middle" fill={BLU} fontFamily="W98, Arial">
        ?
      </text>
    </>
  ),
  sort: (
    <>
      <text x="1" y="7" fontSize="7.500" fontWeight="700" fill={OUT} fontFamily="W98, Arial">
        A
      </text>
      <text x="1" y="15" fontSize="7.500" fontWeight="700" fill={OUT} fontFamily="W98, Arial">
        Z
      </text>
      <path d="M11 1v12M8.500 10.500L11 14l2.500-3.500z" fill={BLU} stroke={BLU} />
    </>
  ),
  preview: (
    <>
      <rect x=".5" y="1.500" width="15" height="12" fill="#fff" stroke={OUT} />
      <rect x=".5" y="1.500" width="15" height="2.500" fill="#000080" />
      <rect x="2" y="5.500" width="5" height="6" fill={SKY} />
      <path d="M9 6.500h5M9 8.500h5M9 10.500h3" stroke={DGR} />
    </>
  ),
  open: (
    <>
      <path d="M1.500 3.500h4l1 1h6v2" fill="#d8b020" stroke={YELD} />
      <path d="M3.500 6.500h12l-2 7h-12z" fill={YEL} stroke={YELD} />
    </>
  ),
  newFolder: (
    <>
      <path d="M1.500 4.500h4.500l1 1h7.500v8h-13z" fill={YEL} stroke={YELD} />
      <path d="M12 .5v4M10 2.500h4M10.800 1.300l2.400 2.400M13.200 1.300l-2.400 2.400" stroke="#ff8000" />
    </>
  ),
  adjust: (
    <>
      <circle cx="8" cy="8" r="4.2" fill="#fff" stroke={OUT} strokeWidth=".8" />
      <path d="M8 3.8a4.2 4.2 0 0 1 0 8.4z" fill={OUT} />
      <path d="M8 .8v1.8M8 13.4v1.8M.8 8h1.8M13.4 8h1.8M2.9 2.9l1.3 1.3M11.8 11.8l1.3 1.3M13.1 2.9l-1.3 1.3M2.9 13.1l1.3-1.3" stroke={OUT} strokeWidth=".9" />
    </>
  ),
  resize: (
    <>
      <rect x=".5" y="6.500" width="9" height="9" fill="#fff" stroke={OUT} />
      <rect x="2" y="8" width="6" height="6" fill={SKY} />
      <rect x="6.500" y=".5" width="9" height="9" fill="none" stroke={BLU} strokeDasharray="2 1" />
      <path d="M8 8l6-6M10 2h4v4" stroke={BLU} fill="none" />
    </>
  ),
  schedule: (
    <>
      <circle cx="8" cy="8" r="6.500" fill="#fff" stroke={OUT} />
      <path d="M8 4v4h3" stroke={OUT} fill="none" />
    </>
  ),
  wizard: (
    <>
      <path d="M3 13L11 5" stroke="#604020" strokeWidth="2" />
      <path d="M12 1v4M10 3h4M2 4v2M1 5h2M13 10v3M11.500 11.500h3" stroke="#ffb000" />
    </>
  ),
  speaker: (
    <>
      <path d="M1 6h3l4-3v10l-4-3H1z" fill={GRY} stroke={OUT} />
      <path d="M10 5.500a3.500 3.500 0 0 1 0 5M12 3.500a6 6 0 0 1 0 9" stroke={OUT} fill="none" />
    </>
  ),
  check: <path d="M3 8l3 3 7-7" stroke={OUT} strokeWidth="2" fill="none" />,
  globe: (
    <>
      <circle cx="8" cy="8" r="6.500" fill="#4a90e0" stroke="#002060" />
      <path d="M4 5c2-1 3 0 3 1.500S5 8 5.500 10 4 11 3.500 9M9 3c1 1 3 1 3.500 2.500S11 8 11 9.500s-1.500 2-1.500 3.500" fill="#30a030" stroke="#106010" />
    </>
  ),
  exit: (
    <>
      <rect x="1.500" y="1.500" width="7" height="13" fill="#e8d8b0" stroke={OUT} />
      <Arrow d="M7 6.500h4v-2.500l4 4-4 4v-2.500h-4z" fill="#ff9020" stroke="#803000" />
    </>
  ),
  run: (
    <>
      <rect x=".5" y="2.500" width="15" height="11" fill="#fff" stroke={OUT} />
      <rect x=".5" y="2.500" width="15" height="2.500" fill="#000080" />
      <path d="M3 8l2 1.500L3 11M7 11h4" stroke={OUT} fill="none" />
    </>
  ),
  programs: (
    <>
      <rect x=".5" y="1.500" width="15" height="12" fill="#fff" stroke={OUT} />
      <rect x=".5" y="1.500" width="15" height="2.500" fill="#000080" />
      <rect x="2" y="5.500" width="4" height="3" fill="#ffe56a" stroke={YELD} strokeWidth=".6" />
      <rect x="8" y="5.500" width="4" height="3" fill={SKY} stroke={BLU} strokeWidth=".6" />
      <rect x="2" y="9.500" width="4" height="3" fill="#a0e0a0" stroke={GRND} strokeWidth=".6" />
    </>
  ),
  docs: (
    <>
      <path d="M2.500 .5h8l3 3v12h-11z" fill="#fff" stroke={OUT} />
      <path d="M4.500 5h6M4.500 7.500h6M4.500 10h6M4.500 12.500h4" stroke={DGR} />
    </>
  ),
  settings: (
    <>
      <path
        d="M6.70 1.32L9.30 1.32L9.51 3.34L10.22 3.63L11.80 2.36L13.64 4.20L12.37 5.78L12.66 6.49L14.68 6.70L14.68 9.30L12.66 9.51L12.37 10.22L13.64 11.80L11.80 13.64L10.22 12.37L9.51 12.66L9.30 14.68L6.70 14.68L6.49 12.66L5.78 12.37L4.20 13.64L2.36 11.80L3.63 10.22L3.34 9.51L1.32 9.30L1.32 6.70L3.34 6.49L3.63 5.78L2.36 4.20L4.20 2.36L5.78 3.63L6.49 3.34Z"
        fill={GRY}
        stroke={OUT}
        strokeWidth=".7"
        strokeLinejoin="miter"
      />
      <circle cx="8" cy="8" r="2.2" fill="#fff" stroke={OUT} strokeWidth=".8" />
    </>
  ),
  shutdown: (
    <>
      <Monitor screen="#000" />
      <circle cx="8" cy="6.500" r="2.200" fill="none" stroke="#ff4040" />
      <path d="M8 3.500v3" stroke="#ff4040" />
    </>
  ),
};

export type IconKey = keyof typeof ICONS | string;

interface IconProps {
  name: IconKey;
  size?: number;
  style?: CSSProperties;
  className?: string;
}

export function Icon({ name, size = 16, style, className }: IconProps) {
  if (name === "appIcon") {
    return (
      <img
        src={appIconUrl}
        width={size}
        height={size}
        alt=""
        draggable={false}
        style={{ flex: "none", display: "block", ...style }}
        className={className}
      />
    );
  }
  let content: ReactNode;
  if (name.startsWith("img:")) {
    const ext = name.slice(4);
    content = <ImgPage color={FORMATS[ext]?.color ?? "#808080"} />;
  } else {
    content = ICONS[name] ?? ICONS.docs;
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      style={{ flex: "none", display: "block", ...style }}
      className={className}
    >
      {content}
    </svg>
  );
}

export function MsgIconSvg({ kind, size = 32 }: { kind: "info" | "warn" | "error" | "question"; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ flex: "none" }}>
      {kind === "info" && (
        <>
          <circle cx="16" cy="16" r="13.500" fill="#fff" stroke="#000" />
          <circle cx="16" cy="16" r="12" fill="#2050d0" />
          <circle cx="12" cy="11" r="6" fill="#6090ff" opacity=".6" />
          <path d="M16 14v9" stroke="#fff" strokeWidth="3.500" />
          <rect x="14.500" y="8" width="3" height="3" fill="#fff" />
        </>
      )}
      {kind === "question" && (
        <>
          <circle cx="16" cy="16" r="13.500" fill="#fff" stroke="#000" />
          <circle cx="16" cy="16" r="12" fill="#2050d0" />
          <circle cx="12" cy="11" r="6" fill="#6090ff" opacity=".6" />
          <text x="16" y="23" fontSize="20" fontWeight="700" textAnchor="middle" fill="#fff" fontFamily="Arial, sans-serif">
            ?
          </text>
        </>
      )}
      {kind === "warn" && (
        <>
          <path d="M16 2.500L30 28H2z" fill="#ffee00" stroke="#000" strokeLinejoin="round" />
          <path d="M16 11v9" stroke="#000" strokeWidth="3.200" />
          <rect x="14.500" y="22" width="3" height="3" fill="#000" />
        </>
      )}
      {kind === "error" && (
        <>
          <circle cx="16" cy="16" r="13.500" fill="#fff" stroke="#000" />
          <circle cx="16" cy="16" r="12" fill="#e01010" />
          <circle cx="12" cy="11" r="6" fill="#ff7070" opacity=".6" />
          <path d="M10.500 10.500l11 11M21.500 10.500l-11 11" stroke="#fff" strokeWidth="3.500" />
        </>
      )}
    </svg>
  );
}

export function fileIconName(ext: string): string {
  return `img:${ext}`;
}

export function folderIconName(kind: string, open = false, full = false, large = false): string {
  switch (kind) {
    case "desktop":
      return "desktop";
    case "computer":
      return "computer";
    case "floppy":
      return "floppy";
    case "hdd":
      return "hdd";
    case "cdrom":
      return "cdrom";
    case "network":
      return "network";
    case "netpc":
      return "netpc";
    case "recycle":
      return full ? "recycleFull" : "recycle";
    default:
      return large ? "folderLarge" : open ? "folderOpen" : "folder";
  }
}
