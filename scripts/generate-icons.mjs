/* ============================================
   Generates PWA icons into public/
   - icons/icon-192.png, icons/icon-512.png (manifest)
   - apple-touch-icon.png (180×180, iOS home screen)
   Flat design: charcoal rounded square + lime dumbbell.
   Run: node scripts/generate-icons.mjs
   ============================================ */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

/* ---------- minimal PNG encoder (RGBA, no deps) ---------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------- drawing helpers ---------- */

const BG = [9, 9, 10, 255]; // #09090A
const LIME = [200, 255, 61, 255]; // #C8FF3D

function roundedRect(px, py, pw, ph, r, w, h, color) {
  // Fills pixels of the canvas `setPixel` bounds check
  const x0 = Math.round(px);
  const y0 = Math.round(py);
  const x1 = Math.round(px + pw);
  const y1 = Math.round(py + ph);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      // rounded corners
      const cx = Math.min(Math.max(x + 0.5, x0 + r), x1 - r);
      const cy = Math.min(Math.max(y + 0.5, y0 + r), y1 - r);
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r * r) setPixel(w, h, x, y, color);
    }
  }
}

let canvasRef = null;

function setPixel(w, h, x, y, color) {
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  const i = (y * w + x) * 4;
  canvasRef[i] = color[0];
  canvasRef[i + 1] = color[1];
  canvasRef[i + 2] = color[2];
  canvasRef[i + 3] = color[3];
}

function generateIcon(size, file) {
  const rgba = Buffer.alloc(size * size * 4);
  canvasRef = rgba;

  // Full-bleed background (maskable-safe)
  for (let i = 0; i < size * size; i++) {
    rgba[i * 4] = BG[0];
    rgba[i * 4 + 1] = BG[1];
    rgba[i * 4 + 2] = BG[2];
    rgba[i * 4 + 3] = 255;
  }

  const s = size;
  const cx = s / 2;
  const cy = s / 2;

  // Dumbbell geometry (proportional to icon size)
  const barH = s * 0.075;
  const barW = s * 0.46;
  const plateInnerH = s * 0.22;
  const plateInnerW = s * 0.055;
  const plateOuterH = s * 0.32;
  const plateOuterW = s * 0.07;
  const r = s * 0.02;

  // Bar
  roundedRect(cx - barW / 2, cy - barH / 2, barW, barH, barH / 2, s, s, LIME);
  // Inner plates
  const innerOff = s * 0.135;
  roundedRect(cx - innerOff - plateInnerW / 2, cy - plateInnerH / 2, plateInnerW, plateInnerH, r, s, s, LIME);
  roundedRect(cx + innerOff - plateInnerW / 2, cy - plateInnerH / 2, plateInnerW, plateInnerH, r, s, s, LIME);
  // Outer plates
  const outerOff = s * 0.215;
  roundedRect(cx - outerOff - plateOuterW / 2, cy - plateOuterH / 2, plateOuterW, plateOuterH, r, s, s, LIME);
  roundedRect(cx + outerOff - plateOuterW / 2, cy - plateOuterH / 2, plateOuterW, plateOuterH, r, s, s, LIME);

  const png = encodePng(size, size, rgba);
  writeFileSync(file, png);
  console.log(`✓ ${file} (${size}×${size})`);
}

mkdirSync(join(publicDir, 'icons'), { recursive: true });
generateIcon(192, join(publicDir, 'icons', 'icon-192.png'));
generateIcon(512, join(publicDir, 'icons', 'icon-512.png'));
generateIcon(180, join(publicDir, 'apple-touch-icon.png'));
