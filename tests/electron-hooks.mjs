/** Node module hooks: resolve `electron` to the local stub. */
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

register(new URL("./electron-hooks-inner.mjs", pathToFileURL(`${__dirname}/`)));
