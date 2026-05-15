/**
 * prepare-electron.mjs
 *
 * Run after `next build` to copy the required assets into
 * .next/standalone so electron-builder can bundle everything.
 *
 * Usage:  node scripts/prepare-electron.mjs
 */

import { cp, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function copyDir(src, dst, label) {
  if (!existsSync(src)) {
    console.warn(`[prepare-electron] skipping ${label} – source not found: ${src}`);
    return;
  }
  console.log(`[prepare-electron] copying ${label} …`);
  await cp(src, dst, { recursive: true });
}

async function main() {
  const standaloneDir = path.join(root, '.next', 'standalone');

  if (!existsSync(standaloneDir)) {
    console.error('[prepare-electron] .next/standalone not found. Run `next build` first.');
    process.exit(1);
  }

  // 1. Static assets – required for the browser bundle to load.
  await copyDir(
    path.join(root, '.next', 'static'),
    path.join(standaloneDir, '.next', 'static'),
    '.next/static',
  );

  // 2. Public folder – backgrounds, CSVs, prizes, etc.
  await copyDir(
    path.join(root, 'public'),
    path.join(standaloneDir, 'public'),
    'public',
  );

  // 3. Ensure the writable storage directory exists so the server can
  //    create selected-workbook.json without an ENOENT on first run.
  const storageBirthdayDir = path.join(standaloneDir, 'storage', 'birthday');
  if (!existsSync(storageBirthdayDir)) {
    console.log('[prepare-electron] creating storage/birthday/ …');
    await mkdir(storageBirthdayDir, { recursive: true });
  }

  console.log('[prepare-electron] done – standalone directory is ready for packaging.');
}

main().catch((err) => {
  console.error('[prepare-electron]', err);
  process.exit(1);
});
