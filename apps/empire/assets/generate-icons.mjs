/**
 * Generate app icon and splash screen PNGs for Capacitor
 *
 * Uses Node.js canvas to create:
 * - icon-only.png (1024x1024) — app icon with AEGIS branding
 * - icon-foreground.png (1024x1024) — adaptive icon foreground (Android)
 * - icon-background.png (1024x1024) — adaptive icon background (Android)
 * - splash.png (2732x2732) — universal splash screen
 * - splash-dark.png (2732x2732) — dark mode splash
 */

import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Brand Colors ─────────────────────────────────────────────────────────────
const BG_DARK   = '#060a12';
const BG_MID    = '#0a1020';
const CYAN      = '#00e5ff';
const CYAN_DIM  = '#005f6b';
const TEXT_IVORY = '#E8E0D0';

// ── App Icon (1024x1024) ─────────────────────────────────────────────────────
function generateIcon() {
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size * 0.7);
  grad.addColorStop(0, '#0d1525');
  grad.addColorStop(1, BG_DARK);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle grid pattern
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i < size; i += 64) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }

  // Outer ring
  ctx.strokeStyle = CYAN_DIM;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(size/2, size/2, 380, 0, Math.PI * 2);
  ctx.stroke();

  // Inner glow ring
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 3;
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 30;
  ctx.beginPath();
  ctx.arc(size/2, size/2, 340, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Hexagon shape (shield motif)
  const hexR = 220;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = size/2 + hexR * Math.cos(angle);
    const y = size/2 + hexR * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 4;
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 20;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Fill hexagon with subtle gradient
  const hexGrad = ctx.createLinearGradient(size/2, size/2 - hexR, size/2, size/2 + hexR);
  hexGrad.addColorStop(0, 'rgba(0, 229, 255, 0.08)');
  hexGrad.addColorStop(1, 'rgba(0, 229, 255, 0.02)');
  ctx.fillStyle = hexGrad;
  ctx.fill();

  // "A" letterform (AEGIS)
  ctx.fillStyle = CYAN;
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 25;
  ctx.font = 'bold 280px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A', size/2, size/2 - 10);
  ctx.shadowBlur = 0;

  // "AEGIS" text below
  ctx.fillStyle = TEXT_IVORY;
  ctx.font = 'bold 72px "Helvetica Neue", Arial, sans-serif';
  ctx.letterSpacing = '16px';
  ctx.fillText('AEGIS', size/2, size/2 + 180);

  return canvas.toBuffer('image/png');
}

// ── Adaptive Icon Foreground (1024x1024, transparent bg) ─────────────────────
function generateForeground() {
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Transparent background (adaptive icon system adds its own bg)

  // Hexagon
  const hexR = 180;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = size/2 + hexR * Math.cos(angle);
    const y = size/2 + hexR * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 4;
  ctx.stroke();

  // "A"
  ctx.fillStyle = CYAN;
  ctx.font = 'bold 240px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A', size/2, size/2 - 10);

  // "AEGIS"
  ctx.fillStyle = TEXT_IVORY;
  ctx.font = 'bold 60px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('AEGIS', size/2, size/2 + 150);

  return canvas.toBuffer('image/png');
}

// ── Adaptive Icon Background (1024x1024) ─────────────────────────────────────
function generateBackground() {
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size * 0.7);
  grad.addColorStop(0, '#0d1525');
  grad.addColorStop(1, BG_DARK);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Grid
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i < size; i += 64) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }

  return canvas.toBuffer('image/png');
}

// ── Splash Screen (2732x2732) ────────────────────────────────────────────────
function generateSplash() {
  const size = 2732;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size * 0.6);
  grad.addColorStop(0, '#0d1525');
  grad.addColorStop(1, BG_DARK);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle grid
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let i = 0; i < size; i += 80) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }

  // Outer ring
  ctx.strokeStyle = CYAN_DIM;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(size/2, size/2, 500, 0, Math.PI * 2);
  ctx.stroke();

  // Inner glow ring
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 2;
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 40;
  ctx.beginPath();
  ctx.arc(size/2, size/2, 450, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Hexagon
  const hexR = 300;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = size/2 + hexR * Math.cos(angle);
    const y = size/2 + hexR * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 4;
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 25;
  ctx.stroke();
  ctx.shadowBlur = 0;

  const hexGrad = ctx.createLinearGradient(size/2, size/2 - hexR, size/2, size/2 + hexR);
  hexGrad.addColorStop(0, 'rgba(0, 229, 255, 0.06)');
  hexGrad.addColorStop(1, 'rgba(0, 229, 255, 0.01)');
  ctx.fillStyle = hexGrad;
  ctx.fill();

  // "A"
  ctx.fillStyle = CYAN;
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 35;
  ctx.font = 'bold 380px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A', size/2, size/2 - 30);
  ctx.shadowBlur = 0;

  // "AEGIS"
  ctx.fillStyle = TEXT_IVORY;
  ctx.font = 'bold 96px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('AEGIS', size/2, size/2 + 240);

  // "EMPIRE" subtitle
  ctx.fillStyle = 'rgba(232, 224, 208, 0.4)';
  ctx.font = '300 48px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('E M P I R E', size/2, size/2 + 320);

  // Loading indicator dots
  const dotY = size/2 + 450;
  ctx.fillStyle = CYAN;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(size/2 + i * 24, dotY, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toBuffer('image/png');
}

// ── Generate all ─────────────────────────────────────────────────────────────
const outDir = __dirname;

console.log('Generating app icon...');
writeFileSync(join(outDir, 'icon-only.png'), generateIcon());

console.log('Generating adaptive foreground...');
writeFileSync(join(outDir, 'icon-foreground.png'), generateForeground());

console.log('Generating adaptive background...');
writeFileSync(join(outDir, 'icon-background.png'), generateBackground());

console.log('Generating splash screen...');
writeFileSync(join(outDir, 'splash.png'), generateSplash());

// Dark splash is the same (already dark theme)
console.log('Generating dark splash screen...');
writeFileSync(join(outDir, 'splash-dark.png'), generateSplash());

console.log('All assets generated in:', outDir);
