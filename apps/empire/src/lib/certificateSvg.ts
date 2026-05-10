/**
 * certificateSvg — renders an ECFL certificate as a self-contained SVG string.
 *
 * Self-contained means: no external fonts, no images, no CSS link tags. Anyone
 * can open the file in a browser, a preview pane, or paste it into a PDF. The
 * layout is fixed at 1200×850 (≈ US Letter landscape at 120 dpi).
 */

export interface CertificateData {
  courseName: string;
  band?: string;
  bandLabel?: string;
  score?: number;
  grade?: string;
  distinction?: string;
  correctAnswers?: number;
  totalQuestions?: number;
  verificationCode: string;
  earnedAt: number;
  holderName?: string;
}

const BAND_COLORS: Record<string, string> = {
  F0: '#00e5ff',
  F1: '#10b981',
  F2: '#f59e0b',
  F3: '#ef4444',
  F4: '#8b5cf6',
  F5: '#3b82f6',
  F6: '#ec4899',
};

function escape(s: string | number | undefined): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderCertificateSvg(data: CertificateData): string {
  const color = BAND_COLORS[data.band ?? ''] ?? '#00e5ff';
  const date = new Date(data.earnedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const holder = data.holderName ?? 'ACADEMY MEMBER';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 850" width="1200" height="850">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#050810"/>
      <stop offset="1" stop-color="#0a0f1a"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${color}" stop-opacity="0.9"/>
      <stop offset="1" stop-color="${color}" stop-opacity="0.3"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="850" fill="url(#bg)"/>
  <rect x="30" y="30" width="1140" height="790" fill="none" stroke="${color}" stroke-opacity="0.4" stroke-width="2"/>
  <rect x="50" y="50" width="1100" height="750" fill="none" stroke="${color}" stroke-opacity="0.15" stroke-width="1"/>

  <!-- Corner flourishes -->
  <path d="M30 110 L30 30 L110 30" stroke="${color}" stroke-width="3" fill="none"/>
  <path d="M1170 30 L1170 110 M1170 30 L1090 30" stroke="${color}" stroke-width="3" fill="none"/>
  <path d="M30 740 L30 820 L110 820" stroke="${color}" stroke-width="3" fill="none"/>
  <path d="M1170 820 L1170 740 M1170 820 L1090 820" stroke="${color}" stroke-width="3" fill="none"/>

  <!-- Header -->
  <text x="600" y="140" text-anchor="middle"
    font-family="monospace" font-size="14" letter-spacing="8" fill="${color}" opacity="0.9">
    EMPIRE · CERTIFIED FINANCIAL LITERACY
  </text>

  <line x1="400" y1="170" x2="800" y2="170" stroke="url(#accent)" stroke-width="1"/>

  <text x="600" y="240" text-anchor="middle"
    font-family="serif" font-style="italic" font-size="36" fill="#e8e0d0">
    Certificate of Achievement
  </text>

  <text x="600" y="295" text-anchor="middle"
    font-family="monospace" font-size="16" fill="#9c8e7e" letter-spacing="4">
    AWARDED TO
  </text>

  <text x="600" y="360" text-anchor="middle"
    font-family="serif" font-size="48" font-weight="bold" fill="#e8e0d0" filter="url(#glow)">
    ${escape(holder)}
  </text>

  <text x="600" y="420" text-anchor="middle"
    font-family="monospace" font-size="14" fill="#9c8e7e" letter-spacing="3">
    FOR SUCCESSFUL COMPLETION OF
  </text>

  <text x="600" y="470" text-anchor="middle"
    font-family="serif" font-size="32" fill="${color}" font-weight="bold">
    ${escape(data.courseName)}
  </text>

  ${data.band ? `<text x="600" y="505" text-anchor="middle"
    font-family="monospace" font-size="14" fill="#9c8e7e" letter-spacing="4">
    ${escape(data.band)}${data.bandLabel ? ' · ' + escape(data.bandLabel).toUpperCase() : ''}
  </text>` : ''}

  <!-- Stats block -->
  <g transform="translate(300 580)">
    <!-- Score -->
    <rect x="0" y="0" width="180" height="90" fill="${color}" fill-opacity="0.08" stroke="${color}" stroke-opacity="0.3"/>
    <text x="90" y="30" text-anchor="middle" font-family="monospace" font-size="11" fill="#9c8e7e" letter-spacing="3">SCORE</text>
    <text x="90" y="65" text-anchor="middle" font-family="monospace" font-size="32" font-weight="bold" fill="${color}">${escape(data.score)}%</text>

    <!-- Grade -->
    <rect x="210" y="0" width="180" height="90" fill="${color}" fill-opacity="0.08" stroke="${color}" stroke-opacity="0.3"/>
    <text x="300" y="30" text-anchor="middle" font-family="monospace" font-size="11" fill="#9c8e7e" letter-spacing="3">GRADE</text>
    <text x="300" y="65" text-anchor="middle" font-family="monospace" font-size="32" font-weight="bold" fill="${color}">${escape(data.grade ?? '—')}</text>

    <!-- Distinction -->
    <rect x="420" y="0" width="180" height="90" fill="${color}" fill-opacity="0.08" stroke="${color}" stroke-opacity="0.3"/>
    <text x="510" y="30" text-anchor="middle" font-family="monospace" font-size="11" fill="#9c8e7e" letter-spacing="3">HONORS</text>
    <text x="510" y="65" text-anchor="middle" font-family="monospace" font-size="16" font-weight="bold" fill="${color}">${escape((data.distinction ?? 'PASS').toUpperCase())}</text>
  </g>

  <!-- Footer: signature + verification -->
  <line x1="100" y1="740" x2="400" y2="740" stroke="#9c8e7e" stroke-opacity="0.4"/>
  <text x="250" y="760" text-anchor="middle" font-family="monospace" font-size="11" fill="#9c8e7e" letter-spacing="3">DATE ISSUED</text>
  <text x="250" y="780" text-anchor="middle" font-family="serif" font-style="italic" font-size="16" fill="#e8e0d0">${escape(date)}</text>

  <line x1="800" y1="740" x2="1100" y2="740" stroke="#9c8e7e" stroke-opacity="0.4"/>
  <text x="950" y="760" text-anchor="middle" font-family="monospace" font-size="11" fill="#9c8e7e" letter-spacing="3">VERIFICATION CODE</text>
  <text x="950" y="780" text-anchor="middle" font-family="monospace" font-size="14" fill="${color}" letter-spacing="2">${escape(data.verificationCode)}</text>

  <!-- Seal -->
  <circle cx="600" cy="740" r="35" fill="none" stroke="${color}" stroke-width="2" opacity="0.8"/>
  <circle cx="600" cy="740" r="28" fill="none" stroke="${color}" stroke-width="1" opacity="0.5"/>
  <text x="600" y="735" text-anchor="middle" font-family="monospace" font-size="9" fill="${color}" letter-spacing="2">ECFL</text>
  <text x="600" y="750" text-anchor="middle" font-family="monospace" font-size="9" fill="${color}" letter-spacing="2">CERTIFIED</text>
</svg>`;
}

export function downloadCertificateSvg(data: CertificateData): void {
  const svg = renderCertificateSvg(data);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ECFL-${data.band ?? 'F0'}-${data.verificationCode}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Rasterise the SVG on an offscreen canvas and trigger a PNG download.
 * Uses XMLSerializer → data URL → Image → canvas to sidestep cross-origin issues.
 */
export function downloadCertificatePng(data: CertificateData): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const svg = renderCertificateSvg(data);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 850;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('canvas 2d context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(b => {
        if (!b) { reject(new Error('png export failed')); return; }
        const pngUrl = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `ECFL-${data.band ?? 'F0'}-${data.verificationCode}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
        resolve();
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('svg image load failed'));
    };
    img.src = url;
  });
}

export function copyVerificationUrl(code: string): void {
  const url = `${window.location.origin}${window.location.pathname}?verify=${encodeURIComponent(code)}`;
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(url);
  }
}
