import { createContext, useContext } from "react";

export interface Shell {
  closeApp: () => void;
}

export const ShellCtx = createContext<Shell>({
  closeApp: () => {},
});

export const useShell = () => useContext(ShellCtx);
