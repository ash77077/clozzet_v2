/**
 * Generates a 1200×630 Open Graph share image.
 * Run: node scripts/generate-og-image.mjs
 *
 * Uses the logo-white optimised PNG over a dark navy background with an
 * orange accent bar — no external dependencies beyond sharp.
 */

import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const outDir = join(root, 'public/images');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const W = 1200;
const H = 630;
const NAVY = { r: 11, g: 19, b: 43 };        // #0B132B
const NAVY_MID = { r: 17, g: 29, b: 60 };    // #111d3c
const ORANGE = { r: 255, g: 122, b: 0 };     // #FF7A00

// Build SVG overlay: background gradient + orange bar + text
const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B132B"/>
      <stop offset="100%" stop-color="#111d3c"/>
    </linearGradient>
    <linearGradient id="glow" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FF7A00" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#FF7A00" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- Subtle radial glow top-right -->
  <ellipse cx="${W}" cy="0" rx="500" ry="400" fill="#FF7A00" fill-opacity="0.06"/>

  <!-- Orange left accent bar -->
  <rect x="80" y="200" width="5" height="230" rx="3" fill="#FF7A00"/>

  <!-- Orange glow strip -->
  <rect x="0" y="0" width="${W}" height="6" fill="url(#glow)"/>
  <rect x="0" y="0" width="${W}" height="6" fill="#FF7A00"/>

  <!-- Tagline pill -->
  <rect x="95" y="200" width="220" height="32" rx="16"
        fill="#FF7A00" fill-opacity="0.12"
        stroke="#FF7A00" stroke-opacity="0.3" stroke-width="1"/>
  <text x="205" y="222" font-family="Arial,Helvetica,sans-serif"
        font-size="13" font-weight="700" letter-spacing="2"
        fill="#FF7A00" text-anchor="middle" text-rendering="optimizeLegibility">
    BRANDED APPAREL · ARMENIA
  </text>

  <!-- Main headline -->
  <text x="95" y="300" font-family="Arial Black,Arial,Helvetica,sans-serif"
        font-size="62" font-weight="900" fill="#FFFFFF"
        text-rendering="optimizeLegibility">
    Your Team Deserves
  </text>
  <text x="95" y="375" font-family="Arial Black,Arial,Helvetica,sans-serif"
        font-size="62" font-weight="900" fill="#FF7A00"
        text-rendering="optimizeLegibility">
    The Best.
  </text>

  <!-- Sub-line -->
  <text x="95" y="430" font-family="Arial,Helvetica,sans-serif"
        font-size="22" fill="#A0AABF"
        text-rendering="optimizeLegibility">
    Corporate clothing · Private label · White label manufacturing
  </text>

  <!-- Domain watermark -->
  <text x="1120" y="610" font-family="Arial,Helvetica,sans-serif"
        font-size="16" fill="#A0AABF" fill-opacity="0.6"
        text-anchor="end" text-rendering="optimizeLegibility">
    clozzet.am
  </text>
</svg>`;

// Compose: SVG layer, then composite the white logo on top
const logoPath = join(root, 'public/images/logo-white.png');

async function main() {
  let base = sharp(Buffer.from(svg));

  if (existsSync(logoPath)) {
    const logoBuffer = await sharp(logoPath)
      .resize(280, null, { fit: 'inside' })
      .toBuffer();

    base = sharp(Buffer.from(svg)).composite([
      { input: logoBuffer, left: 95, top: 76, blend: 'over' }
    ]);
  }

  const outPath = join(outDir, 'share.jpg');
  await base.jpeg({ quality: 90 }).toFile(outPath);
  console.log(`✓ share.jpg written to ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
