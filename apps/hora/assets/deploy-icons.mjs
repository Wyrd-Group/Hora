import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ── iOS App Icons (AppIcon.appiconset) ───────────────────────────────────────
const iosIconDir = join(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset');

const iosIcons = [
  { size: 20,  scale: 2, name: 'AppIcon-20x20@2x.png' },
  { size: 20,  scale: 3, name: 'AppIcon-20x20@3x.png' },
  { size: 29,  scale: 2, name: 'AppIcon-29x29@2x.png' },
  { size: 29,  scale: 3, name: 'AppIcon-29x29@3x.png' },
  { size: 40,  scale: 2, name: 'AppIcon-40x40@2x.png' },
  { size: 40,  scale: 3, name: 'AppIcon-40x40@3x.png' },
  { size: 60,  scale: 2, name: 'AppIcon-60x60@2x.png' },
  { size: 60,  scale: 3, name: 'AppIcon-60x60@3x.png' },
  { size: 76,  scale: 2, name: 'AppIcon-76x76@2x.png' },
  { size: 83.5, scale: 2, name: 'AppIcon-83.5x83.5@2x.png' },
  { size: 1024, scale: 1, name: 'AppIcon-512@2x.png' },
];

// ── Android Icons ────────────────────────────────────────────────────────────
const androidResDir = join(root, 'android/app/src/main/res');

const androidIcons = [
  { size: 48,  dir: 'mipmap-mdpi' },
  { size: 72,  dir: 'mipmap-hdpi' },
  { size: 96,  dir: 'mipmap-xhdpi' },
  { size: 144, dir: 'mipmap-xxhdpi' },
  { size: 192, dir: 'mipmap-xxxhdpi' },
];

const androidForeground = [
  { size: 108, dir: 'mipmap-mdpi' },
  { size: 162, dir: 'mipmap-hdpi' },
  { size: 216, dir: 'mipmap-xhdpi' },
  { size: 324, dir: 'mipmap-xxhdpi' },
  { size: 432, dir: 'mipmap-xxxhdpi' },
];

// ── iOS Splash (LaunchScreen storyboard uses a single image) ─────────────────
const iosSplashDir = join(root, 'ios/App/App/Assets.xcassets/Splash.imageset');

const splashSizes = [
  { size: 2732, name: 'splash-2732x2732.png' },
  { size: 1242, name: 'splash-1242x1242.png' },
];

// ── Generate ─────────────────────────────────────────────────────────────────
const iconSrc = join(__dirname, 'icon-only.png');
const fgSrc = join(__dirname, 'icon-foreground.png');
const bgSrc = join(__dirname, 'icon-background.png');
const splashSrc = join(__dirname, 'splash.png');

console.log('=== iOS Icons ===');
for (const icon of iosIcons) {
  const px = Math.round(icon.size * icon.scale);
  const out = join(iosIconDir, icon.name);
  await sharp(iconSrc).resize(px, px).png().toFile(out);
  console.log(`  ${icon.name} (${px}x${px})`);
}

console.log('\n=== Android Icons ===');
for (const icon of androidIcons) {
  const dir = join(androidResDir, icon.dir);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  await sharp(iconSrc).resize(icon.size, icon.size).png().toFile(join(dir, 'ic_launcher.png'));
  console.log(`  ${icon.dir}/ic_launcher.png (${icon.size}x${icon.size})`);
}

console.log('\n=== Android Adaptive Icons ===');
for (const icon of androidForeground) {
  const dir = join(androidResDir, icon.dir);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  await sharp(fgSrc).resize(icon.size, icon.size).png().toFile(join(dir, 'ic_launcher_foreground.png'));
  await sharp(bgSrc).resize(icon.size, icon.size).png().toFile(join(dir, 'ic_launcher_background.png'));
  console.log(`  ${icon.dir}/ic_launcher_foreground.png + background (${icon.size}x${icon.size})`);
}

console.log('\n=== iOS Splash ===');
if (!existsSync(iosSplashDir)) mkdirSync(iosSplashDir, { recursive: true });
for (const s of splashSizes) {
  await sharp(splashSrc).resize(s.size, s.size).png().toFile(join(iosSplashDir, s.name));
  console.log(`  ${s.name} (${s.size}x${s.size})`);
}

// Android splash (drawable)
console.log('\n=== Android Splash ===');
const drawableDir = join(androidResDir, 'drawable');
if (!existsSync(drawableDir)) mkdirSync(drawableDir, { recursive: true });
await sharp(splashSrc).resize(480, 480).png().toFile(join(drawableDir, 'splash.png'));
console.log('  drawable/splash.png (480x480)');

const drawableV24 = join(androidResDir, 'drawable-land-hdpi');
if (!existsSync(drawableV24)) mkdirSync(drawableV24, { recursive: true });
await sharp(splashSrc).resize(800, 480).png().toFile(join(drawableV24, 'splash.png'));
console.log('  drawable-land-hdpi/splash.png (800x480)');

console.log('\nAll platform assets deployed!');
