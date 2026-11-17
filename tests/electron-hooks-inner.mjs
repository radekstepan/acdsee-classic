import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stubUrl = pathToFileURL(path.join(__dirname, "electron-stub.mjs")).href;

export async function resolve(specifier, context, next) {
  if (specifier === "electron") return { url: stubUrl, shortCircuit: true };
  return next(specifier, context);
}
