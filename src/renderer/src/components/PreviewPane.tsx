import { useApp } from "../store";
import { FORMATS } from "../data/catalog";
import { fitBox, formatBytes, fullName } from "../utils/util";
import { useElementSize } from "../utils/hooks";
import { EditedImage } from "./EditedImage";
import { Icon } from "./Icons";

export function PreviewPane({ onOpen }: { onOpen: (id: string) => void }) {
  const app = useApp();
  const [ref, size] = useElementSize<HTMLDivElement>();
  const files = app.selection.filter((id) => app.fileMap.has(id));
  const id = app.focusId && files.includes(app.focusId) ? app.focusId : files[0];
  const f = id ? app.getFile(id) : undefined;

  let body;
  if (files.length > 1) {
    const total = files.reduce((a, id2) => a + (app.getFile(id2)?.size ?? 0), 0);
    body = (
      <div className="text-center px-2 text-[#000]">
        <Icon name="thumbs" size={32} className="mx-auto mb-2" />
        {files.length} files selected
        <br />({formatBytes(total)})
      </div>
    );
  } else if (f) {
    const box = fitBox(f.w, f.h, Math.max(20, size.w - 14), Math.max(20, size.h - 14), false);
    body = (
      <div onDoubleClick={() => onOpen(f.id)} style={{ boxShadow: "0 0 0 1px #000, 2px 2px 0 1px #808080" }}>
        <EditedImage file={f} w={box.w} h={box.h} />
      </div>
    );
  } else {
    body = <div className="text-[#808080] text-center px-2">Select an image to preview</div>;
  }

  return (
    <div className="flex flex-col h-full min-h-0 sunken" style={{ padding: 2 }}>
      <div ref={ref} className="flex-1 min-h-0 flex items-center justify-center overflow-hidden" style={{ background: "#c0c0c0" }}>
        {body}
      </div>
      {f && files.length === 1 && (
        <div className="flex-none bg-[#c0c0c0] px-1 py-0.5 leading-[13px] border-t border-[#808080] truncate" style={{ boxShadow: "inset 0 1px 0 #fff" }}>
          <div className="truncate font-bold">{fullName(f)}</div>
          <div className="truncate">
            {f.w}x{f.h}x{f.bpp} {FORMATS[f.ext]?.short ?? f.ext.toUpperCase()}, {formatBytes(f.size)}
          </div>
        </div>
      )}
    </div>
  );
}
