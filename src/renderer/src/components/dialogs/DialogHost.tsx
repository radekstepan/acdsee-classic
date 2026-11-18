import { useApp } from "../../store";
import { MsgBox } from "../ui";
import {
  AboutDialog,
  AcquireDialog,
  FileListDialog,
  NewFolderDialog,
  OptionsDialog,
  PrintDialog,
  PropertiesDialog,
  RenameDialog,
  SlideShowDialog,
  TipDialog,
} from "./Basic";
import { AdjustDialog, BatchRenameDialog, ConvertDialog, FindDialog, FolderPickerDialog, ResizeDialog } from "./Tools";

export function DialogHost() {
  const app = useApp();
  return (
    <>
      {app.dialogs.map((d, i) => {
        const key = `${i}-${d.type}`;
        switch (d.type) {
          case "about":
            return <AboutDialog key={key} />;
          case "props":
            return <PropertiesDialog key={key} ids={d.ids} />;
          case "options":
            return <OptionsDialog key={key} tab={d.tab} />;
          case "slideshow":
            return <SlideShowDialog key={key} />;
          case "find":
            return <FindDialog key={key} />;
          case "convert":
            return <ConvertDialog key={key} ids={d.ids} />;
          case "rename":
            return <RenameDialog key={key} id={d.id} />;
          case "batchRename":
            return <BatchRenameDialog key={key} ids={d.ids} />;
          case "folderPicker":
            return <FolderPickerDialog key={key} mode={d.mode} ids={d.ids} />;
          case "newFolder":
            return <NewFolderDialog key={key} parent={d.parent} />;
          case "adjust":
            return <AdjustDialog key={key} id={d.id} />;
          case "resize":
            return <ResizeDialog key={key} id={d.id} />;
          case "acquire":
            return <AcquireDialog key={key} />;
          case "print":
            return <PrintDialog key={key} ids={d.ids} />;
          case "tip":
            return <TipDialog key={key} />;
          case "filelist":
            return <FileListDialog key={key} text={d.text} />;
          case "msg":
            return (
              <MsgBox
                key={key}
                title={d.title}
                text={d.text}
                icon={d.icon}
                buttons={d.buttons}
                defaultBtn={d.defaultBtn}
                onResult={d.onResult}
                onClose={app.closeDialog}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
}
