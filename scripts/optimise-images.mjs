/**
 * One-off image optimisation script.
 * Run: node scripts/optimise-images.mjs
 *
 * Produces:
 *   assets/landing-pics/ → WebP + JPG at 1x (520×560) and 2x (1040×1120)
 *   public/images/       → WebP + PNG at logo-black / logo-white (412×80)
 *
 * Originals are moved to assets/originals/ and public/originals/ so they
 * are excluded from the Angular build (see angular.json).
 */

import sharp from 'sharp';
import { existsSync, mkdirSync, copyFileSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

async function optimiseLandingPic(srcFile, baseName) {
  const src = join(root, 'src/assets/originals', srcFile);
  const outDir = join(root, 'src/assets/landing-pics');
  ensureDir(outDir);

  // 1x — WebP
  await sharp(src)
    .resize(520, 560, { fit: 'cover', position: 'top' })
    .webp({ quality: 80 })
    .toFile(join(outDir, `${baseName}.webp`));
  console.log(`  ✓ ${baseName}.webp (520×560)`);

  // 2x — WebP
  await sharp(src)
    .resize(1040, 1120, { fit: 'cover', position: 'top' })
    .webp({ quality: 80 })
    .toFile(join(outDir, `${baseName}@2x.webp`));
  console.log(`  ✓ ${baseName}@2x.webp (1040×1120)`);

  // 1x — JPG fallback
  await sharp(src)
    .resize(520, 560, { fit: 'cover', position: 'top' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(join(outDir, `${baseName}.jpg`));
  console.log(`  ✓ ${baseName}.jpg (520×560)`);

  // 2x — JPG fallback
  await sharp(src)
    .resize(1040, 1120, { fit: 'cover', position: 'top' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(join(outDir, `${baseName}@2x.jpg`));
  console.log(`  ✓ ${baseName}@2x.jpg (1040×1120)`);
}

async function optimiseLogo(srcFile, baseName) {
  const src = join(root, 'public/originals', srcFile);
  const outDir = join(root, 'public/images');
  ensureDir(outDir);

  await sharp(src)
    .resize(412, 80, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90, lossless: false })
    .toFile(join(outDir, `${baseName}.webp`));
  console.log(`  ✓ ${baseName}.webp (412×80)`);

  await sharp(src)
    .resize(412, 80, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(join(outDir, `${baseName}.png`));
  console.log(`  ✓ ${baseName}.png (412×80)`);
}

async function main() {
  // ── Move landing pics originals ───────────────────────────────────────────
  const landingOrigDir = join(root, 'src/assets/originals');
  ensureDir(landingOrigDir);

  const landingFiles = [
    ['IMG_4406.JPG', 'img-4406'],
    ['IMG_4403.JPG', 'img-4403'],
    ['IMG_4410.JPG', 'img-4410'],
    ['IMG_4427.JPG', 'img-4427'],
  ];

  console.log('\n── Landing pics ────────────────────────────────────────────');
  for (const [srcFile, baseName] of landingFiles) {
    const from = join(root, 'src/assets/landing-pics', srcFile);
    const to   = join(landingOrigDir, srcFile);
    if (existsSync(from) && !existsSync(to)) {
      renameSync(from, to);
      console.log(`  → Moved ${srcFile} to originals/`);
    }
    if (existsSync(to)) {
      await optimiseLandingPic(srcFile, baseName);
    } else {
      console.warn(`  ⚠ Original not found: ${to}`);
    }
  }

  // ── Move logo originals ───────────────────────────────────────────────────
  const logoOrigDir = join(root, 'public/originals');
  ensureDir(logoOrigDir);

  const logoFiles = [
    ['logo-black.png', 'logo-black'],
    ['logo-white.png', 'logo-white'],
  ];

  console.log('\n── Logos ────────────────────────────────────────────────────');
  for (const [srcFile, baseName] of logoFiles) {
    const from = join(root, 'public/images', srcFile);
    const to   = join(logoOrigDir, srcFile);
    if (existsSync(from) && !existsSync(to)) {
      copyFileSync(from, to); // copy, not move — keep PNG for legacy
      console.log(`  → Copied ${srcFile} to originals/`);
    }
    if (existsSync(to)) {
      await optimiseLogo(srcFile, baseName);
    } else {
      console.warn(`  ⚠ Original not found: ${to}`);
    }
  }

  console.log('\nDone.\n');
}

main().catch(err => { console.error(err); process.exit(1); });
