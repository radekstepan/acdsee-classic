import os from "os";
import path from "path";

/**
 * Hidden per-user config folder. Holds the remembered UI state and window
 * geometry so the app picks up where it left off.
 */
export function stateDir(): string {
  return path.join(os.homedir(), ".acdsee");
}

export function stateFile(name: string): string {
  return path.join(stateDir(), name);
}
