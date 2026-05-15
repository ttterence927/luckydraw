/**
 * tauri-prepare.mjs
 *
 * Prepares everything that `tauri build` needs before the Rust compilation:
 *   1. Runs `next build` (standalone mode).
 *   2. Copies .next/static/ and public/ into .next/standalone/ so the
 *      server can find them at runtime.
 *   3. Mirrors .next/standalone/ → src-tauri/resources/server/.
 *   4. Copies the current node.exe → src-tauri/resources/node.exe so it
 *      can be bundled as a Tauri resource and launched at runtime.
 *   5. Generates placeholder icons into src-tauri/icons/ (32x32, 128x128,
 *      128x128@2x, icon.ico) if they do not already exist.
 *
 * Run manually:  node scripts/tauri-prepare.mjs
 * Called by Tauri: via "beforeBuildCommand" in tauri.conf.json
 */

import { execSync } from 'child_process';
import { cp, copyFile, mkdir, rm, writeFile, access } from 'fs/promises';
import { existsSync } from 'fs';
import { deflateSync } from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const STANDALONE_DIR = path.join(ROOT, '.next', 'standalone');
const RESOURCES_DIR = path.join(ROOT, 'src-tauri', 'resources');
const RESOURCES_SERVER_DIR = path.join(RESOURCES_DIR, 'server');
const NODE_EXE_DEST = path.join(RESOURCES_DIR, 'node.exe');
const ICONS_DIR = path.join(ROOT, 'src-tauri', 'icons');

// ── Helpers ────────────────────────────────────────────────────────────────

async function copyDir(src, dest, label) {
  if (!existsSync(src)) {
    console.warn(`[tauri-prepare] skipping ${label} – not found: ${src}`);
    return;
  }
  console.log(`[tauri-prepare] copying ${label} …`);
  await cp(src, dest, { recursive: true });
}

async function fileExists(fp) {
  try {
    await access(fp);
    return true;
  } catch {
    return false;
  }
}

// ── Minimal PNG generator (pure Node.js, no extra deps) ───────────────────

/** CRC-32 lookup table */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u32be(n) {
  return Buffer.from([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  return Buffer.concat([u32be(data.length), t, data, u32be(crc32(Buffer.concat([t, data])))]);
}

/**
 * Create a solid-colour PNG of the given dimensions.
 * @param {number} w  Width in pixels
 * @param {number} h  Height in pixels
 * @param {number[]} rgb  [r, g, b] bytes (0-255)
 */
function solidPNG(w, h, [r, g, b]) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.concat([u32be(w), u32be(h), Buffer.from([8, 2, 0, 0, 0])]);
  const ihdr = pngChunk('IHDR', ihdrData);

  // Build raw scanlines: filter-byte 0 (None) + RGB pixels
  const row = Buffer.alloc(1 + w * 3);
  row[0] = 0;
  for (let x = 0; x < w; x++) {
    row[1 + x * 3] = r;
    row[1 + x * 3 + 1] = g;
    row[1 + x * 3 + 2] = b;
  }
  const rawData = Buffer.concat(Array.from({ length: h }, () => row));
  const idat = pngChunk('IDAT', deflateSync(rawData, { level: 6 }));
  const iend = pngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

/**
 * Wrap a PNG buffer inside a minimal ICO container (single image entry).
 */
function pngToICO(pngBuf, w, h) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = ICO
  header.writeUInt16LE(1, 4); // count = 1

  const entry = Buffer.alloc(16);
  entry.writeUInt8(w >= 256 ? 0 : w, 0);  // width  (0 means 256)
  entry.writeUInt8(h >= 256 ? 0 : h, 1);  // height (0 means 256)
  entry.writeUInt8(0, 2);                  // colour count
  entry.writeUInt8(0, 3);                  // reserved
  entry.writeUInt16LE(1, 4);               // planes
  entry.writeUInt16LE(32, 6);              // bit count
  entry.writeUInt32LE(pngBuf.length, 8);  // data size
  entry.writeUInt32LE(22, 12);            // offset (6 header + 16 entry)

  return Buffer.concat([header, entry, pngBuf]);
}

// ── Hitachi Rail blue ──────────────────────────────────────────────────────
const BRAND_COLOR = [0, 94, 173]; // #005EAD

async function generateIcons() {
  await mkdir(ICONS_DIR, { recursive: true });

  const specs = [
    { file: '32x32.png',      w: 32,  h: 32  },
    { file: '128x128.png',    w: 128, h: 128 },
    { file: '128x128@2x.png', w: 256, h: 256 },
  ];

  for (const { file, w, h } of specs) {
    const dest = path.join(ICONS_DIR, file);
    if (await fileExists(dest)) continue;
    console.log(`[tauri-prepare] generating placeholder icon ${file}`);
    await writeFile(dest, solidPNG(w, h, BRAND_COLOR));
  }

  const icoPath = path.join(ICONS_DIR, 'icon.ico');
  if (!(await fileExists(icoPath))) {
    console.log('[tauri-prepare] generating placeholder icon icon.ico');
    const png32 = solidPNG(32, 32, BRAND_COLOR);
    await writeFile(icoPath, pngToICO(png32, 32, 32));
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  // 1. Build Next.js
  console.log('\n[tauri-prepare] ── Step 1: next build ──────────────────────');
  execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });

  if (!existsSync(STANDALONE_DIR)) {
    console.error(
      '[tauri-prepare] .next/standalone not found.\n' +
      '  Make sure next.config.ts contains: output: "standalone"'
    );
    process.exit(1);
  }

  // 2. Copy static assets into standalone
  console.log('\n[tauri-prepare] ── Step 2: copy assets into standalone ─────');
  await copyDir(
    path.join(ROOT, '.next', 'static'),
    path.join(STANDALONE_DIR, '.next', 'static'),
    '.next/static',
  );
  await copyDir(
    path.join(ROOT, 'public'),
    path.join(STANDALONE_DIR, 'public'),
    'public',
  );

  // Ensure the writable storage directory exists inside standalone
  await mkdir(path.join(STANDALONE_DIR, 'storage', 'birthday'), { recursive: true });

  // 3. Mirror standalone → src-tauri/resources/server/
  console.log('\n[tauri-prepare] ── Step 3: copy standalone → resources/server ──');
  if (existsSync(RESOURCES_SERVER_DIR)) {
    await rm(RESOURCES_SERVER_DIR, { recursive: true });
  }
  await mkdir(RESOURCES_SERVER_DIR, { recursive: true });
  await cp(STANDALONE_DIR, RESOURCES_SERVER_DIR, { recursive: true });

  // 4. Copy current node.exe into resources
  console.log('\n[tauri-prepare] ── Step 4: copy node.exe ───────────────────');
  const nodeSrc = process.execPath;
  if (!nodeSrc.toLowerCase().endsWith('.exe')) {
    console.error('[tauri-prepare] Expected process.execPath to end with .exe on Windows.');
    process.exit(1);
  }
  await mkdir(RESOURCES_DIR, { recursive: true });
  await copyFile(nodeSrc, NODE_EXE_DEST);
  console.log(`[tauri-prepare] node.exe copied from ${nodeSrc} (${process.version})`);

  // 5. Generate placeholder icons if missing
  console.log('\n[tauri-prepare] ── Step 5: icons ───────────────────────────');
  await generateIcons();

  console.log('\n[tauri-prepare] ✓ Done – src-tauri/resources/ is ready.\n');
  console.log('  Next step: npx tauri build');
  console.log(
    '  Tip: replace src-tauri/icons/ with your own artwork and re-run\n' +
    '       `npx tauri icon <512x512-source.png>` for polished icons.\n',
  );
}

main().catch((err) => {
  console.error('[tauri-prepare]', err);
  process.exit(1);
});
