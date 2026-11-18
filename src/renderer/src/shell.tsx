import { createContext, useContext } from "react";

export interface Shell {
  closeApp: () => void;
  minimizeApp: () => void;
  shutdown: () => void;
  runCommand: (cmd: string) => string | null;
}

export const ShellCtx = createContext<Shell>({
  closeApp: () => {},
  minimizeApp: () => {},
  shutdown: () => {},
  runCommand: () => null,
});

export const useShell = () => useContext(ShellCtx);
