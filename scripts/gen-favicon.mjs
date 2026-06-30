// Pre-generate /favicon.ico at build time (public/favicon.ico), in `prebuild`.
//
// Evergreen browsers use the scalable /icon.svg declared in the layout metadata, so
// the tab favicon is already crisp there. But /favicon.ico is the single most-probed
// conventional path on the web: feed readers, link-unfurlers, and assorted crawler
// bots request it directly, ignoring any declared <link> icons. Without this file they
// get the 404 page instead of a mark. This renders the brand SVG to the classic raster
// sizes and wraps them in one PNG-in-ICO container (Vista+ ICO — supported by every
// current browser and those bare /favicon.ico probers).
//
// Like the OG card, it's generated rather than committed so it always tracks the source
// SVG. sharp ships as next's image dependency and is pinned in devDependencies so the
// prebuild step has it explicitly.
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(here, "..", "public", "icon.svg");
const outPath = resolve(here, "..", "public", "favicon.ico");

// 16 (tab strip), 32 (retina tab / Windows taskbar), 48 (bookmarks bar / address bar).
const SIZES = [16, 32, 48];

const svg = await readFile(svgPath);
const pngs = [];
for (const size of SIZES) {
  // density well above the target so the vector rasterizes cleanly before the downscale.
  const buf = await sharp(svg, { density: 384 }).resize(size, size, { fit: "contain" }).png().toBuffer();
  pngs.push({ size, buf });
}

// ICONDIR (6 bytes) + one ICONDIRENTRY (16 bytes) per image, then the PNG payloads.
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved, always 0
header.writeUInt16LE(1, 2); // image type: 1 = icon
header.writeUInt16LE(pngs.length, 4); // number of images

const entries = [];
let offset = 6 + pngs.length * 16;
for (const { size, buf } of pngs) {
  const e = Buffer.alloc(16);
  e.writeUInt8(size >= 256 ? 0 : size, 0); // width  (0 means 256)
  e.writeUInt8(size >= 256 ? 0 : size, 1); // height (0 means 256)
  e.writeUInt8(0, 2); // palette size (0 for true color)
  e.writeUInt8(0, 3); // reserved
  e.writeUInt16LE(1, 4); // color planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(buf.length, 8); // payload byte length
  e.writeUInt32LE(offset, 12); // payload byte offset
  entries.push(e);
  offset += buf.length;
}

const ico = Buffer.concat([header, ...entries, ...pngs.map((p) => p.buf)]);
await writeFile(outPath, ico);
console.log(`gen-favicon: wrote public/favicon.ico (${SIZES.join("/")} px, ${ico.length} bytes)`);
