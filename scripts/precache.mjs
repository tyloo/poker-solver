// Runs after `next build`: writes every static asset of the export into out/sw.js so the app,
// including Web Worker chunks, works offline after the first visit. Run: node scripts/precache.mjs
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const OUT = "out";
const SW = join(OUT, "sw.js");

const entries = await readdir(OUT, { recursive: true, withFileTypes: true });
const files = entries.filter((entry) => entry.isFile()).map((entry) => relative(OUT, join(entry.parentPath, entry.name)).split(sep).join("/"));

const wanted = (file) => {
  if (file.startsWith("_next/static/")) return !file.endsWith(".map") && !file.endsWith(".ts"); // Turbopack also copies worker sources as unused .ts files.
  if (file.startsWith("_not-found")) return false;
  return file.endsWith(".txt") || file === "manifest.webmanifest" || /^(apple-)?icon[\w-]*\.png$/.test(file);
};
const urls = files
  .filter(wanted)
  .map((file) => `/${file}`)
  .sort();

const version = createHash("sha256").update(urls.join("\n")).digest("hex").slice(0, 12);
const source = await readFile(SW, "utf8");
const injected = source.replace(/const CACHE = "[^"]*";/, `const CACHE = "poker-solver-${version}";`).replace("const PRECACHE = [];", `const PRECACHE = ${JSON.stringify(urls)};`);
if (!injected.includes(version) || injected.includes("const PRECACHE = [];")) throw new Error(`${SW}: CACHE or PRECACHE placeholder not found`);
await writeFile(SW, injected);
console.log(`Precache: ${urls.length} files written into ${SW} (cache poker-solver-${version}).`);
