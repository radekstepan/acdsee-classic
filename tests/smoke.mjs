/** Renderer smoke test: inlines the built bundle into HTML and boots it in jsdom (demo mode). */
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import pkg from "jsdom";

const { JSDOM, VirtualConsole } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rendererDir = path.resolve(__dirname, "..", "out", "renderer");

// Inline the module script and stylesheet so jsdom runs them without fetching.
const source = await buildInlineHtml();
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => errors.push(`jsdom: ${error.message}`));
virtualConsole.on("error", (...args) => errors.push(`console.error: ${args.join(" ")}`));

const dom = new JSDOM(source, {
  url: pathToFileURL(path.join(rendererDir, "index.html")).href,
  resources: "usable",
  runScripts: "dangerously",
  pretendToBeVisual: true,
  virtualConsole
});

async function buildInlineHtml() {
  const { readFile } = await import("fs/promises");
  let page = await readFile(path.join(rendererDir, "index.html"), "utf8");
  const scriptMatch = page.match(/src="(\.\/assets\/[^"]+\.js)"/);
  const cssMatch = page.match(/href="(\.\/assets\/[^"]+\.css)"/);
  if (!scriptMatch || !cssMatch) throw new Error("built assets not found in index.html");
  const [js, css] = await Promise.all([
    readFile(path.join(rendererDir, scriptMatch[1]), "utf8"),
    readFile(path.join(rendererDir, cssMatch[1]), "utf8")
  ]);
  page = page.replace(/<script type="module"[^>]*><\/script>/, "");
  page = page.replace(/<link rel="stylesheet"[^>]*>/, () => `<style>${css.replace(/<\/style>/g, "<\\/style>")}</style>`);
  page = page.replace("</body>", () => `<script>${js.replace(/<\/script>/g, "<\\/script>")}</script></body>`);
  return page;
}

const { window } = dom;
const { document } = window;
const failures = [];

const deadline = Date.now() + 15000;
let booted = false;
while (Date.now() < deadline) {
  await new Promise((resolve) => setTimeout(resolve, 200));
  if (document.querySelector(".menubar")) {
    booted = true;
    break;
  }
}
if (!booted) failures.push("app did not render .menubar within 15s");

const assert = (condition, message) => {
  if (!condition) failures.push(message);
  else console.log(`ok - ${message}`);
};

assert(document.querySelector(".main-titlebar"), "classic title bar renders");
assert(
  document.querySelector(".titlebar-text")?.textContent?.includes("ACDSee Classic"),
  `title bar caption is classic ("${document.querySelector(".titlebar-text")?.textContent}")`
);
const menuLabels = [...document.querySelectorAll(".menu-title")].map((el) => el.textContent);
for (const label of ["File", "Edit", "View", "Tools", "Browser", "Image", "Help"]) {
  assert(menuLabels.includes(label), `menu "${label}" present`);
}
assert(document.querySelectorAll(".tb-button").length >= 20, `toolbar buttons render (${document.querySelectorAll(".tb-button").length})`);
assert(document.querySelector(".tree-pane"), "folder tree pane renders");
assert(document.querySelector(".inspector-pane"), "preview pane renders");
assert(document.querySelector(".statusbar"), "status bar renders");
assert(document.querySelectorAll(".thumb").length > 5, `thumbnails render (${document.querySelectorAll(".thumb").length})`);
assert(document.querySelector(".location-path"), "location path bar renders");

const fatal = errors.filter((message) => !/Could not load img|Could not load link/i.test(message));
if (fatal.length) failures.push(`page errors:\n  - ${fatal.slice(0, 8).join("\n  - ")}`);

window.close();
if (failures.length) {
  console.error(`\nSMOKE FAIL (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nSMOKE PASS: classic browser UI renders in demo mode.");
