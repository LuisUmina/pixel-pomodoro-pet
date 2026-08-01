/**
 * Renders the mascot straight from the sprite data into `assets/icon.png`,
 * which `tauri icon` then fans out into every platform size.
 *
 * The point is that the app icon and the duck on screen can never drift apart:
 * both read the same `src/sprites/characters/duck.json`. Nothing here needs a dependency —
 * a PNG is a handful of CRC'd chunks around a zlib stream.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = join(ROOT, "assets", "icon.png");

/** `tauri icon` wants at least 1024x1024. */
const CANVAS = 1024;
/** Leaves a little breathing room so the duck is not flush to the edge. */
const SCALE = 30;
const THEME = "tokyo-night";
const TRANSPARENT = ".";

// Declared before the render call below, which reaches it through crc32().
const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

const duck = readJson("src/sprites/characters/duck.json");
const palette = readJson("src/sprites/themes.json")[THEME].sprite;

const pixels = renderSprite(duck.base, palette);
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, encodePng(CANVAS, CANVAS, pixels));

console.log(`wrote ${OUTPUT} (${CANVAS}x${CANVAS})`);

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(ROOT, relativePath), "utf8"));
}

/** Paints the grid, centred, into an RGBA buffer. */
function renderSprite(grid, colors) {
  const rgba = Buffer.alloc(CANVAS * CANVAS * 4);
  const origin = Math.round((CANVAS - grid.length * SCALE) / 2);

  grid.forEach((line, row) => {
    for (let col = 0; col < line.length; col += 1) {
      const key = line[col];
      if (key === TRANSPARENT || !colors[key]) {
        continue;
      }

      fillRect(
        rgba,
        origin + col * SCALE,
        origin + row * SCALE,
        parseHexColor(colors[key]),
      );
    }
  });

  return rgba;
}

function fillRect(rgba, left, top, [r, g, b]) {
  for (let y = top; y < top + SCALE; y += 1) {
    if (y < 0 || y >= CANVAS) {
      continue;
    }

    for (let x = left; x < left + SCALE; x += 1) {
      if (x < 0 || x >= CANVAS) {
        continue;
      }

      const offset = (y * CANVAS + x) * 4;
      rgba[offset] = r;
      rgba[offset + 1] = g;
      rgba[offset + 2] = b;
      rgba[offset + 3] = 255;
    }
  }
}

function parseHexColor(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // per-scanline filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const payload = Buffer.concat([Buffer.from(type, "latin1"), data]);

  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(payload));

  return Buffer.concat([length, payload, checksum]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
