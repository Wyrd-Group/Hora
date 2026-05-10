import sharp from 'sharp';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const files = [
  { src: 'icon-only.svg',       out: 'icon-only.png',       size: 1024 },
  { src: 'icon-foreground.svg',  out: 'icon-foreground.png',  size: 1024 },
  { src: 'icon-background.svg',  out: 'icon-background.png',  size: 1024 },
  { src: 'splash.svg',          out: 'splash.png',          size: 2732 },
  { src: 'splash.svg',          out: 'splash-dark.png',     size: 2732 },
];

for (const f of files) {
  const svg = readFileSync(join(__dirname, f.src));
  await sharp(svg, { density: 300 })
    .resize(f.size, f.size)
    .png()
    .toFile(join(__dirname, f.out));
  console.log(`Created ${f.out} (${f.size}x${f.size})`);
}

console.log('All PNGs generated.');
