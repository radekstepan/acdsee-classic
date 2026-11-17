import type { CSSProperties, ReactNode } from "react";

type IconProps = { size?: number; className?: string; style?: CSSProperties };

const Svg = ({
  size = 16,
  className,
  style,
  children,
}: IconProps & { children: ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    className={className}
    style={{ imageRendering: "pixelated", flex: "none", ...style }}
    shapeRendering="crispEdges"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export function BrandIcon({ size = 24, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <rect x="1" y="1" width="30" height="30" fill="#00214f" />
      <rect x="1" y="1" width="30" height="2" fill="#3f7fc4" />
      <rect x="1" y="29" width="30" height="2" fill="#000b1e" />
      <circle cx="15" cy="16" r="11" fill="#0d5aa7" />
      <circle cx="15" cy="16" r="10" fill="#1380c9" />
      <circle cx="15" cy="16" r="7" fill="#39b5e4" />
      <circle cx="15" cy="16" r="4.5" fill="#0b2d55" />
      <circle cx="13.5" cy="14.5" r="2" fill="#d9f3ff" />
      <path d="M5 18 C9 9 21 7 27 13 C21 14 12 17 5 18Z" fill="#ffb21a" opacity=".9" />
      <path d="M7 22 C13 26 22 26 27 19 C24 27 12 29 7 22Z" fill="#f24a3c" opacity=".8" />
      <rect x="22" y="22" width="6" height="6" fill="#7bd22a" />
    </Svg>
  );
}

export function FolderGlyph({
  icon = "folder",
  size = 16,
  className,
}: IconProps & { icon?: string }) {
  const folderBase = (
    <>
      <path d="M2 7h11l3 4h14v17H2z" fill="#8d6e00" />
      <path d="M3 9h10l3 4h13v13H3z" fill="#e9b400" />
      <path d="M4 12h15l-1-2H4z" fill="#ffe27a" />
      <path d="M3 26h23v1H3z" fill="#b78900" />
      <path d="M4 13h6v1H4z" fill="#fff2a8" />
    </>
  );

  let content: ReactNode = folderBase;

  switch (icon) {
    case "computer":
      content = (
        <>
          <path d="M4 5h24v17H4z" fill="#5b5b50" />
          <path d="M5 6h22v15H5z" fill="#d4d0c8" />
          <path d="M7 8h18v11H7z" fill="#0c6f9c" />
          <path d="M8 9h16v8H8z" fill="#3ba4cf" />
          <path d="M10 10h10v1H10z" fill="#b8ecff" />
          <path d="M12 22h8v3h4v3H8v-3h4z" fill="#9a9a90" />
          <path d="M7 26h18v2H7z" fill="#efefea" />
          <rect x="20" y="24" width="2" height="1" fill="#2f9e44" />
        </>
      );
      break;
    case "drive":
      content = (
        <>
          <path d="M4 11h24v14H4z" fill="#4b4b46" />
          <path d="M5 6h22v16H5z" fill="#c9c7bd" />
          <path d="M5 6h22v3H5z" fill="#efeee7" />
          <path d="M7 10h5v2H7z" fill="#8f8d84" />
          <rect x="22" y="10" width="2" height="2" fill="#20a13a" />
          <path d="M6 20h20v2H6z" fill="#96948c" />
          <path d="M7 17h18v1H7z" fill="#e5e3da" />
          <path d="M8 23h7v1H8z" fill="#6f6d65" />
        </>
      );
      break;
    case "floppy":
      content = (
        <>
          <path d="M5 4h20l3 3v21H5z" fill="#2c2c2c" />
          <path d="M7 5h15v10H7z" fill="#3a5f8a" />
          <path d="M17 5h5v10h-5z" fill="#b9c2cb" />
          <rect x="19" y="7" width="2" height="6" fill="#6e7a86" />
          <path d="M8 18h17v9H8z" fill="#e8e8e0" />
          <path d="M10 19h5v7h-5z" fill="#b5b4aa" />
          <path d="M18 19h5v7h-5z" fill="#b5b4aa" />
          <path d="M18 20h4v1h-4z" fill="#f8f8f0" />
        </>
      );
      break;
    case "cd":
      content = (
        <>
          <path d="M3 5h26v23H3z" fill="#b9b7ad" />
          <path d="M4 6h24v2H4z" fill="#efeee8" />
          <circle cx="16" cy="17" r="9" fill="#6b6b64" />
          <circle cx="16" cy="17" r="8" fill="#d7e7ef" />
          <path d="M10 12a8 8 0 0 1 10-2" stroke="#79bcd9" strokeWidth="2" fill="none" />
          <circle cx="16" cy="17" r="2.5" fill="#3b3b36" />
          <circle cx="16" cy="17" r="1" fill="#d9d9d0" />
          <path d="M20 23h5v2h-5z" fill="#85837a" />
        </>
      );
      break;
    case "mydocs":
    case "pictures":
    case "music":
    case "programs":
      content = (
        <>
          {folderBase}
          <path d="M9 15h13v10H9z" fill="#f7f4e8" />
          <path d="M10 16h11v8H10z" fill="#fff" />
          {icon === "pictures" && (
            <>
              <path d="M11 22l3-4 2 2 2-3 3 5z" fill="#3f8e4e" />
              <circle cx="19" cy="18.5" r="1.2" fill="#f0b429" />
            </>
          )}
          {icon === "mydocs" &&
            [18, 20, 22].map((y) => <path key={y} d={`M12 ${y}h7v1h-7z`} fill="#6d7f92" />)}
          {icon === "music" && (
            <>
              <path d="M17 17v5" stroke="#333" strokeWidth="1" />
              <path d="M17 17l4-1v4" stroke="#333" strokeWidth="1" fill="none" />
              <ellipse cx="16" cy="22" rx="1.5" ry="1" fill="#333" />
              <ellipse cx="20" cy="20.5" rx="1.5" ry="1" fill="#333" />
            </>
          )}
          {icon === "programs" && (
            <>
              <path d="M11 17h9v5h-9z" fill="#ccd7e3" />
              <path d="M12 18h7v1h-7z" fill="#2e5b85" />
            </>
          )}
        </>
      );
      break;
    case "network":
      content = (
        <>
          <path d="M4 5h17v13H4z" fill="#5b5b50" />
          <path d="M5 6h15v11H5z" fill="#d4d0c8" />
          <path d="M7 8h11v7H7z" fill="#0c6f9c" />
          <path d="M10 18h5v3h2v2h-9v-2h2z" fill="#9a9a90" />
          <path d="M18 12h7v8h-7z" fill="#4b4b46" />
          <path d="M19 13h5v6h-5z" fill="#75a4c2" />
          <path d="M17 15h2v2h-2z" fill="#00a000" />
          <circle cx="21" cy="9" r="2.5" fill="#ffd34d" />
        </>
      );
      break;
    case "recycle":
      content = (
        <>
          <path d="M9 8h14l-2 21H11z" fill="#c6d3d8" />
          <path d="M10 9h12l-1 19H11z" fill="#dfe8ea" />
          <path d="M7 7h18v3H7z" fill="#67787e" />
          <path d="M13 5h6v2h-6z" fill="#67787e" />
          <path d="M14 12h2v13h-2z" fill="#7d8f95" />
          <path d="M18 12h2v13h-2z" fill="#7d8f95" />
          <path d="M12 20l2-2 2 2 2-3 2 4z" fill="#29973a" />
          <path d="M12 22h8v1h-8z" fill="#29973a" />
        </>
      );
      break;
    case "control":
      content = (
        <>
          <path d="M4 4h24v24H4z" fill="#8a877d" />
          <path d="M5 5h22v21H5z" fill="#d4d0c8" />
          <path d="M5 5h22v4H5z" fill="#1f4d80" />
          <path d="M7 12h18v2H7z" fill="#777" />
          <rect x="12" y="10" width="4" height="6" fill="#d4d0c8" stroke="#444" />
          <path d="M7 19h18v2H7z" fill="#777" />
          <rect x="20" y="17" width="4" height="6" fill="#d4d0c8" stroke="#444" />
        </>
      );
      break;
    default:
      content = folderBase;
  }

  return (
    <Svg size={size} className={className}>
      {content}
    </Svg>
  );
}

export function ToolIcon({ name, size = 24, className }: IconProps & { name: string }) {
  const i: ReactNode = (() => {
    switch (name) {
      case "open":
        return (
          <>
            <path d="M3 9h11l2 3h13v16H3z" fill="#8d6e00" />
            <path d="M4 11h10l2 3h12v12H4z" fill="#ffcf3d" />
            <path d="M4 15h21l-3 11H2z" fill="#ffe79a" />
            <path d="M5 16h18l-2 9H4z" fill="#ffdf72" />
            <path d="M8 18h8v1H8z" fill="#fff5c4" />
          </>
        );
      case "back":
      case "forward":
        return (
          <>
            <path d="M16 5L4 16l12 11v-6h13V11H16z" fill="#1b5c1b" />
            <path d="M16 7L6 16l10 8v-4h12V12H16z" fill="#38a52c" />
            <path d="M16 9L8 16l8 6v-3h10V12H16z" fill="#7cd45f" />
            <path d="M16 6L7 16l9 8v-4h12V12H16z" fill={name === "forward" ? "none" : "none"} />
            {name === "forward" && (
              <g transform="translate(32 0) scale(-1 1)">
                <path d="M16 6L6 16l10 9v-5h12V12H16z" fill="#38a52c" />
                <path d="M16 9L9 16l7 6v-3h10V12H16z" fill="#7cd45f" />
              </g>
            )}
          </>
        );
      case "up":
        return (
          <>
            <path d="M16 4L3 16h7v12h12V16h7z" fill="#b07d00" />
            <path d="M16 6L6 17h6v10h8V17h6z" fill="#ffd34a" />
            <path d="M16 10l-6 6h3v7h6v-7h3z" fill="#fff1a8" />
          </>
        );
      case "refresh":
        return (
          <>
            <path d="M25 8V3l-4 3A12 12 0 0 0 4 16h4a8 8 0 0 1 11-7z" fill="#157a15" />
            <path d="M7 24v5l4-3a12 12 0 0 0 17-10h-4a8 8 0 0 1-11 7z" fill="#2fa72f" />
            <path d="M8 12h6l-3-3z" fill="#74d05d" />
            <path d="M24 20h-6l3 3z" fill="#74d05d" />
          </>
        );
      case "home":
        return (
          <>
            <path d="M16 4L3 16h5v13h16V16h5z" fill="#6e4c25" />
            <path d="M16 6L5 17h5v10h12V17h5z" fill="#d38e45" />
            <path d="M6 16h20v2H6z" fill="#f5d38d" />
            <path d="M13 20h6v7h-6z" fill="#5a3a17" />
            <path d="M14 21h4v1h-4z" fill="#d5a466" />
          </>
        );
      case "browse":
      case "view":
        return (
          <>
            <path d="M4 5h24v22H4z" fill="#5c5a52" />
            <path d="M5 6h22v20H5z" fill="#efeee7" />
            <path d="M7 8h18v15H7z" fill="#78b6d8" />
            <path d="M7 23l5-7 4 4 3-4 6 7z" fill="#286f3b" />
            <circle cx="20" cy="12" r="2.5" fill="#ffe36e" />
            {name === "browse" && <path d="M8 3h11v3H8z" fill="#d8d6cc" />}
          </>
        );
      case "slideshow":
        return (
          <>
            <path d="M3 5h26v20H3z" fill="#4f4e47" />
            <path d="M4 6h24v17H4z" fill="#0d1018" />
            <path d="M7 9h18v11H7z" fill="#1e8cae" />
            <path d="M7 20l5-6 4 4 3-3 6 5z" fill="#2b6232" />
            <circle cx="20" cy="12" r="2" fill="#ffd66e" />
            <path d="M24 26h5v2h-5z" fill="#4f4e47" />
            <path d="M10 26h12v2H10z" fill="#4f4e47" />
          </>
        );
      case "rotate-left":
      case "rotate-right":
        return (
          <>
            <path d="M7 6h18v20H7z" fill="#55534c" />
            <path d="M8 7h16v15H8z" fill="#ffe9b0" />
            <path d="M9 20l4-6 3 3 3-4 4 7z" fill="#4a8f4a" />
            <circle cx="19" cy="11" r="1.5" fill="#e9a53c" />
            <path d="M8 23h16v2H8z" fill="#c6c3b9" />
            <g transform={name === "rotate-right" ? "translate(32 0) scale(-1 1)" : undefined}>
              <path d="M5 24a12 12 0 0 1 18-10" stroke="#004080" strokeWidth="3" fill="none" />
              <path d="M4 15v10h10z" fill="#004080" />
            </g>
          </>
        );
      case "copy":
        return (
          <>
            <path d="M8 4h14v18H8z" fill="#6b6a62" />
            <path d="M9 5h11v16H9z" fill="#fffef4" />
            <path d="M11 8h7v1h-7zM11 11h7v1h-7zM11 14h5v1h-5z" fill="#8a9bb1" />
            <path d="M13 10h14v19H13z" fill="#d6cfae" />
            <path d="M14 11h12v16H14z" fill="#fffef4" />
            <path d="M16 14h8v1h-8zM16 17h8v1h-8zM16 20h5v1h-5z" fill="#a0a8b0" />
          </>
        );
      case "move":
        return (
          <>
            <path d="M2 10h11l2 3h14v15H2z" fill="#9d7a00" />
            <path d="M3 12h10l2 3h13v12H3z" fill="#ffd34a" />
            <path d="M17 14l4 4h-3v6h-2v-6h-3z" fill="#127a1e" />
          </>
        );
      case "delete":
        return (
          <>
            <path d="M4 5h24v24H4z" fill="#d8d5cc" />
            <path d="M10 8h12l-1 18H11z" fill="#8b8d8c" />
            <path d="M11 9h10l-1 16H12z" fill="#c6ccce" />
            <path d="M8 7h16v3H8z" fill="#6c7476" />
            <path d="M13 5h6v2h-6z" fill="#6c7476" />
            <path d="M6 5l22 23M28 5L6 28" stroke="#c81717" strokeWidth="4" />
            <path d="M8 6l19 20M26 6L8 26" stroke="#f44" strokeWidth="2" />
          </>
        );
      case "rename":
        return (
          <>
            <path d="M5 25l3-9L22 4l6 6-14 13z" fill="#e7b33c" />
            <path d="M7 24l2-6L23 5l4 4L13 22z" fill="#ffe28b" />
            <path d="M23 5l4 4-3 3-4-4z" fill="#9b9b8e" />
            <path d="M5 25l4-1-3-3z" fill="#f7f2d8" />
            <path d="M11 28h16v2H11z" fill="#444" />
          </>
        );
      case "convert":
        return (
          <>
            <path d="M5 4h14v18H5z" fill="#807d73" />
            <path d="M6 5h12v16H6z" fill="#fffef7" />
            <path d="M8 19l3-4 2 2 2-3 3 5z" fill="#579357" />
            <path d="M17 11h13v17H17z" fill="#7b5b00" />
            <path d="M18 12h11v15H18z" fill="#ffe574" />
            <path d="M20 15h7v1h-7zM20 18h7v1h-7z" fill="#7e6200" />
            <path d="M20 21l2-2 2 2 2-2" stroke="#078b21" strokeWidth="2" fill="none" />
          </>
        );
      case "print":
        return (
          <>
            <path d="M8 4h16v9H8z" fill="#e3e1d7" />
            <path d="M9 5h14v7H9z" fill="#fff" />
            <path d="M8 9h11v1H8zM8 11h8v1H8z" fill="#93a0ad" />
            <path d="M4 12h24v13H4z" fill="#9c9a90" />
            <path d="M5 13h22v9H5z" fill="#d5d3c9" />
            <rect x="21" y="15" width="2" height="2" fill="#1ba33a" />
            <path d="M9 20h14v9H9z" fill="#efeee5" />
            <path d="M11 22h10v6H11z" fill="#fff" />
            <path d="M12 23h8v1h-8zM12 25h5v1h-5z" fill="#8a99a8" />
          </>
        );
      case "find":
        return (
          <>
            <circle cx="13" cy="13" r="9" fill="#b9e4f2" stroke="#2d4e66" strokeWidth="3" />
            <circle cx="13" cy="13" r="6" fill="#e5f7ff" />
            <path d="M18 20l9 9" stroke="#3f3f3f" strokeWidth="5" />
            <path d="M19 20l7 7" stroke="#9e9e94" strokeWidth="2" />
            <path d="M9 10a5 5 0 0 1 4-2" stroke="#fff" strokeWidth="2" fill="none" />
          </>
        );
      case "options":
        return (
          <>
            <circle cx="16" cy="16" r="12" fill="#8d8b83" />
            <circle cx="16" cy="16" r="10" fill="#d9d7ce" />
            <circle cx="16" cy="16" r="4" fill="#73736b" />
            <circle cx="16" cy="16" r="2" fill="#e9e7de" />
            <path d="M14 2h4v6h-4zM14 24h4v6h-4zM2 14h6v4H2zM24 14h6v4h-6z" fill="#68675f" />
            <path d="M8 4l3 4-2 2-3-4zM21 22l3 4-2 2-3-4zM4 21l4 3-2 2-4-3zM24 4l4 3-2 2-4-3z" fill="#68675f" />
          </>
        );
      case "help":
        return (
          <>
            <path d="M4 4h19l5 5v21H4z" fill="#997515" />
            <path d="M5 5h17l5 5v19H5z" fill="#ffe488" />
            <path d="M22 5v5h5z" fill="#e0b638" />
            <path d="M11 11c0-5 11-5 11 1 0 4-5 3-5 7" stroke="#24477d" strokeWidth="3" fill="none" />
            <circle cx="17" cy="24" r="2" fill="#24477d" />
          </>
        );
      case "wallpaper":
        return (
          <>
            <path d="M3 4h26v19H3z" fill="#5b5a51" />
            <path d="M4 5h24v16H4z" fill="#7ab7d7" />
            <path d="M4 21l7-9 5 5 4-4 8 8v1H4z" fill="#33753b" />
            <circle cx="21" cy="10" r="2.5" fill="#ffe574" />
            <path d="M12 25h8v3H12zM7 28h18v2H7z" fill="#696860" />
          </>
        );
      case "paste":
        return (
          <>
            <path d="M7 4h18v24H7z" fill="#9b7a38" />
            <path d="M8 5h16v22H8z" fill="#e8ddb9" />
            <path d="M12 3h8v4h-8z" fill="#77736a" />
            <path d="M11 11h10v1H11zM11 14h10v1H11zM11 17h7v1h-7z" fill="#7f765b" />
            <path d="M16 21l5-4v3h4v3h-4v3z" fill="#2a7b32" />
          </>
        );
      case "thumbnails":
        return (
          <>
            <path d="M3 4h12v12H3zM17 4h12v12H17zM3 18h12v11H3zM17 18h12v11H17z" fill="#f0eee3" stroke="#59584f" strokeWidth="1" />
            <path d="M4 13l4-5 3 3 3-3v6z" fill="#5b9c58" />
            <circle cx="24" cy="9" r="2" fill="#f5c84a" />
            <path d="M18 26l4-5 3 3 3-4v7z" fill="#477fb0" />
          </>
        );
      case "list":
        return (
          <>
            {[5, 11, 17, 23, 29].map((y) => (
              <g key={y}>
                <path d={`M4 ${y}h7v4H4z`} fill="#6a9ac4" />
                <path d={`M14 ${y + 1}h14v2H14z`} fill="#666" />
              </g>
            ))}
          </>
        );
      case "details":
        return (
          <>
            <path d="M3 5h26v21H3z" fill="#fff" stroke="#555" />
            <path d="M4 6h24v4H4z" fill="#8b97a4" />
            <path d="M4 13h24v1H4zM4 18h24v1H4zM4 23h24v1H4z" fill="#aaa" />
            <path d="M10 6v20M20 6v20" stroke="#999" strokeWidth="1" />
          </>
        );
      case "zoom-in":
      case "zoom-out":
      case "fit":
      case "actual":
      case "next":
      case "prev":
      case "close":
      case "play":
      case "pause":
      case "film":
      case "star":
      case "folder":
      case "info":
      case "flip":
      case "save":
        return <FallbackTool name={name} />;
      default:
        return <circle cx="16" cy="16" r="10" fill="#8a8a82" />;
    }
  })();

  return (
    <Svg size={size} className={className}>
      {i}
    </Svg>
  );
}

function FallbackTool({ name }: { name: string }) {
  switch (name) {
    case "zoom-in":
    case "zoom-out":
      return (
        <>
          <circle cx="13" cy="13" r="9" fill="#d8e8f0" stroke="#3a3a3a" strokeWidth="3" />
          <circle cx="13" cy="13" r="6" fill="#fff" />
          <path d="M10 12h6v2h-6z" fill="#1d4f87" />
          {name === "zoom-in" && <path d="M12 9h2v6h-2z" fill="#1d4f87" />}
          <path d="M19 20l8 8" stroke="#3a3a3a" strokeWidth="5" />
        </>
      );
    case "fit":
      return (
        <>
          <path d="M4 4h9v3H7v6H4zM19 4h9v9h-3V7h-6zM4 19h3v6h6v3H4zM25 19h3v9h-9v-3h6z" fill="#3e596c" />
          <path d="M9 9h14v14H9z" fill="#aed4e4" />
          <path d="M9 21l4-5 3 3 2-2 5 5z" fill="#5f9560" />
          <circle cx="19" cy="13" r="1.6" fill="#ffe480" />
        </>
      );
    case "actual":
      return (
        <>
          <path d="M5 7h22v18H5z" fill="#fff" stroke="#333" />
          <path d="M8 11h4v3H8zM14 11h4v3h-4zM20 11h4v3h-4zM8 16h4v3H8zM14 16h4v3h-4zM20 16h4v3h-4z" fill="#8799a6" />
          <path d="M9 24h14v1H9z" fill="#555" />
        </>
      );
    case "next":
      return (
        <>
          <path d="M7 4l15 12L7 28z" fill="#2f8f2f" />
          <path d="M9 8l10 8-10 8z" fill="#8ae56e" />
          <path d="M24 4h3v24h-3z" fill="#246a24" />
        </>
      );
    case "prev":
      return (
        <g transform="translate(32 0) scale(-1 1)">
          <path d="M7 4l15 12L7 28z" fill="#2f8f2f" />
          <path d="M9 8l10 8-10 8z" fill="#8ae56e" />
          <path d="M24 4h3v24h-3z" fill="#246a24" />
        </g>
      );
    case "close":
      return (
        <>
          <path d="M7 7L25 25M25 7L7 25" stroke="#6b0000" strokeWidth="5" />
          <path d="M8 8l16 16M24 8L8 24" stroke="#e53935" strokeWidth="3" />
        </>
      );
    case "play":
      return <path d="M8 4l19 12L8 28z" fill="#22922c" stroke="#0c5712" strokeWidth="1" />;
    case "pause":
      return (
        <>
          <path d="M7 5h7v22H7zM19 5h7v22h-7z" fill="#2f8f2f" />
          <path d="M8 6h5v20H8zM20 6h5v20h-5z" fill="#7ed166" />
        </>
      );
    case "film":
      return (
        <>
          <path d="M3 6h26v21H3z" fill="#333" />
          <path d="M4 7h24v19H4z" fill="#777" />
          <path d="M4 8h3v17H4zM25 8h3v17h-3z" fill="#2d2d2d" />
          {[10, 14, 18, 22].map((y) => (
            <path key={y} d={`M5 ${y}h1v2H5zM26 ${y}h1v2h-1z`} fill="#e8e8e0" />
          ))}
          <path d="M10 10h12v13H10z" fill="#72b6d3" />
          <path d="M10 21l3-4 2 2 2-3 5 5z" fill="#2f7139" />
        </>
      );
    case "star":
      return <path d="M16 3l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z" fill="#ffcf33" stroke="#9a6c00" strokeWidth="1" />;
    case "folder":
      return (
        <>
          <path d="M3 9h11l2 3h13v16H3z" fill="#8d6e00" />
          <path d="M4 11h10l2 3h12v12H4z" fill="#ffd34a" />
          <path d="M4 15h21l1 11H4z" fill="#ffe79a" />
        </>
      );
    case "info":
      return (
        <>
          <circle cx="16" cy="16" r="13" fill="#1663a8" />
          <circle cx="16" cy="16" r="11" fill="#3a9de2" />
          <path d="M14 14h4v10h-4z" fill="#fff" />
          <circle cx="16" cy="9.5" r="2.2" fill="#fff" />
        </>
      );
    case "flip":
      return (
        <>
          <path d="M4 16h11V5zM17 5h11v11H17zM4 18h11v9H4zM17 18h11v9H17z" fill="#7e9cb2" />
          <path d="M15 3v26" stroke="#333" strokeWidth="2" strokeDasharray="2 2" />
        </>
      );
    case "save":
      return (
        <>
          <path d="M4 4h23l1 1v23H4z" fill="#38628b" />
          <path d="M7 5h15v9H7z" fill="#fff" />
          <path d="M9 19h14v8H9z" fill="#d5e2ec" />
          <path d="M10 21h12v1H10zM10 23h8v1h-8z" fill="#4f6f8a" />
        </>
      );
    default:
      return <circle cx="16" cy="16" r="10" fill="#8a8a82" />;
  }
}

export function FileTypeIcon({ type = "JPEG", size = 14 }: { type?: string; size?: number }) {
  return (
    <Svg size={size}>
      <path d="M5 2h16l6 6v22H5z" fill="#f5f3e8" stroke="#6b6a61" />
      <path d="M21 2l6 6h-6z" fill="#c9c6b8" stroke="#6b6a61" />
      <path d="M8 13h16v12H8z" fill="#7cb7d2" />
      <path d="M8 23l5-6 3 3 2-2 6 5z" fill="#3b7d42" />
      <circle cx="20" cy="16" r="1.6" fill="#ffe37a" />
      {type === "JPEG" && <path d="M6 28h11v2H6z" fill="#d5a600" />}
    </Svg>
  );
}

export function StartFlag({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M1 3l5-1v7H1z" fill="#f44336" />
      <path d="M7 1.7L12 1v8H7z" fill="#4caf50" />
      <path d="M1 10h5v7l-5-1z" fill="#2196f3" />
      <path d="M7 10h5v8l-5-.7z" fill="#ffc107" />
    </svg>
  );
}
