/** Typed access to the Electron desktop bridge (`window.acdsee`). */
import type { AcdseeApi } from "../../../shared/api";

export function isDesktop(): boolean {
  return typeof window !== "undefined" && !!window.acdsee;
}

export function desktop(): AcdseeApi {
  const api = window.acdsee;
  if (!api) throw new Error("Desktop API is unavailable (demo mode).");
  return api;
}

export function trashLabel(): string {
  try {
    return desktop().platform === "win32" ? "Recycle Bin" : "Trash";
  } catch {
    return "Recycle Bin";
  }
}

export function platformName(): string {
  try {
    const platform = desktop().platform;
    if (platform === "darwin") return "macOS";
    if (platform === "win32") return "Windows";
    return "Linux";
  } catch {
    return "Web demo";
  }
}
