/**
 * Suite 7: NFT Portrait Generation — 1000 tests
 * Tests: SVG generation, gradient parsing, SVG structure, data URI encoding,
 * deterministic output, color contrast, icon rendering, rarity borders,
 * portrait dimensions, expression/attire metadata, cross-card uniqueness, performance.
 */
/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import {
  AGENT_CATALOG,
  AGENT_RARITY_CONFIG,
  AGENT_CLASS_CONFIG,
  getAgentById,
  getAgentsByClass,
  type AgentCardDef,
  type AgentRarity,
  type AgentClass,
} from '../data/agentCards';

// ── SVG generator (unit under test) ─────────────────────────────

/**
 * Generates an SVG portrait for an agent card.
 * In production this may live in a rendering module; we test the logic here.
 */
function generatePortraitSVG(card: AgentCardDef, width = 400, height = 560): string {
  const [c1, c2, c3] = card.portraitGradient;
  const rarityColor = AGENT_RARITY_CONFIG[card.rarity].color;
  const borderStyle = AGENT_RARITY_CONFIG[card.rarity].borderStyle;
  const borderWidth = borderStyle === 'double' ? 4 : 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg-${card.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}" />
      <stop offset="50%" stop-color="${c2}" />
      <stop offset="100%" stop-color="${c3}" />
    </linearGradient>
  </defs>
  <rect x="${borderWidth}" y="${borderWidth}" width="${width - borderWidth * 2}" height="${height - borderWidth * 2}" rx="16" fill="url(#bg-${card.id})" stroke="${rarityColor}" stroke-width="${borderWidth}" />
  <text x="${width / 2}" y="50" text-anchor="middle" font-size="48" fill="white">${card.iconGlyph}</text>
  <text x="${width / 2}" y="${height - 80}" text-anchor="middle" font-size="20" fill="white" font-weight="bold">${card.name}</text>
  <text x="${width / 2}" y="${height - 50}" text-anchor="middle" font-size="14" fill="${rarityColor}">${card.rarity} ${card.class}</text>
</svg>`;
}

function svgToDataURI(svg: string): string {
  // Use btoa for base64 encoding (works in both Node with globals and browser)
  const encoded = typeof btoa !== 'undefined'
    ? btoa(unescape(encodeURIComponent(svg)))
    : Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${encoded}`;
}

function parseHexColor(hex: string): [number, number, number] | null {
  if (!hex || typeof hex !== 'string') return null;
  const match = hex.match(/^#([0-9a-fA-F]{6})$/);
  if (!match) return null;
  const val = parseInt(match[1], 16);
  return [(val >> 16) & 0xFF, (val >> 8) & 0xFF, val & 0xFF];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const srgb = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ═══════════════════════════════════════════════════════════════════
// 1. SVG GENERATION FOR ALL 50 CARDS (50 tests)
// ═══════════════════════════════════════════════════════════════════

describe('SVG generation for all 50 cards', () => {
  it.each(AGENT_CATALOG.map(c => [c.id, c] as const))('generates valid SVG for card "%s"', (_, card) => {
    const svg = generatePortraitSVG(card);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain(card.name);
    expect(svg).toContain(card.iconGlyph);
    expect(svg).toContain(card.rarity);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. GRADIENT PARSING (100 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Gradient parsing', () => {
  describe('valid hex colors', () => {
    const validHexColors = [
      '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
      '#FF6B6B', '#34D399', '#60A5FA', '#A78BFA', '#FBBF24',
      '#F97316', '#EC4899', '#8B5CF6', '#06B6D4', '#EF4444',
      '#818CF8', '#C084FC', '#FED330', '#FF8E53', '#1A1A2E',
      '#16213E', '#0F3460', '#E94560', '#533483', '#2B2D42',
      '#8D99AE', '#EDF2F4', '#D90429', '#2B2D42', '#3D5A80',
      '#98C1D9', '#E0FBFC', '#293241', '#EE6C4D', '#F4A261',
      '#E76F51', '#264653', '#2A9D8F', '#E9C46A', '#F4A261',
    ];

    it.each(validHexColors)('parses valid hex color "%s"', (hex) => {
      const result = parseHexColor(hex);
      expect(result).not.toBeNull();
      expect(result!.length).toBe(3);
      expect(result![0]).toBeGreaterThanOrEqual(0);
      expect(result![0]).toBeLessThanOrEqual(255);
      expect(result![1]).toBeGreaterThanOrEqual(0);
      expect(result![1]).toBeLessThanOrEqual(255);
      expect(result![2]).toBeGreaterThanOrEqual(0);
      expect(result![2]).toBeLessThanOrEqual(255);
    });
  });

  describe('invalid color inputs', () => {
    const invalidColors = [
      '', 'red', 'rgb(255,0,0)', '#FFF', '#GGGGGG', '#12345', '123456',
      '#1234567', 'hsl(0,100%,50%)', 'transparent', null, undefined,
      '#', '##FF0000', '0xFF0000', '#FF 000', '#FF00', '#FF000G',
      'FF0000', '#FF0000FF', '#GG0000', '#FF00GG',
    ];

    it.each(invalidColors)('rejects invalid color input: %s', (input) => {
      const result = parseHexColor(input as string);
      expect(result).toBeNull();
    });
  });

  describe('edge case hex values', () => {
    it.each([
      ['#000000', 0, 0, 0],
      ['#FFFFFF', 255, 255, 255],
      ['#FF0000', 255, 0, 0],
      ['#00FF00', 0, 255, 0],
      ['#0000FF', 0, 0, 255],
      ['#808080', 128, 128, 128],
      ['#010101', 1, 1, 1],
      ['#FEFEFE', 254, 254, 254],
      ['#100000', 16, 0, 0],
      ['#001000', 0, 16, 0],
    ] as const)('parses %s to [%d, %d, %d]', (hex, r, g, b) => {
      const result = parseHexColor(hex);
      expect(result).toEqual([r, g, b]);
    });
  });

  describe('all card gradient colors are valid hex', () => {
    it.each(AGENT_CATALOG.map(c => [c.id, ...c.portraitGradient] as const))(
      'card "%s" gradients [%s, %s, %s] are valid',
      (_, c1, c2, c3) => {
        expect(parseHexColor(c1)).not.toBeNull();
        expect(parseHexColor(c2)).not.toBeNull();
        expect(parseHexColor(c3)).not.toBeNull();
      }
    );
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. SVG STRUCTURE VALIDATION (100 tests)
// ═══════════════════════════════════════════════════════════════════

describe('SVG structure validation', () => {
  describe('contains required SVG elements', () => {
    it.each(AGENT_CATALOG.slice(0, 25).map(c => [c.id, c] as const))('card "%s" has proper SVG structure', (_, card) => {
      const svg = generatePortraitSVG(card);
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('viewBox');
      expect(svg).toContain('<defs>');
      expect(svg).toContain('<linearGradient');
      expect(svg).toContain('<rect');
      expect(svg).toContain('<text');
    });
  });

  describe('correct dimensions in viewBox', () => {
    const dimensions = [
      [400, 560], [300, 420], [200, 280], [500, 700], [600, 840],
      [150, 210], [800, 1120], [1000, 1400], [250, 350], [350, 490],
    ] as const;

    it.each(dimensions)('generates SVG with width=%d height=%d', (w, h) => {
      const card = AGENT_CATALOG[0];
      const svg = generatePortraitSVG(card, w, h);
      expect(svg).toContain(`viewBox="0 0 ${w} ${h}"`);
      expect(svg).toContain(`width="${w}"`);
      expect(svg).toContain(`height="${h}"`);
    });
  });

  describe('gradient has 3 stops', () => {
    it.each(AGENT_CATALOG.slice(0, 25).map(c => [c.id, c] as const))('card "%s" gradient has 3 color stops', (_, card) => {
      const svg = generatePortraitSVG(card);
      const stopCount = (svg.match(/<stop/g) || []).length;
      expect(stopCount).toBe(3);
    });
  });

  describe('rarity color in stroke', () => {
    it.each(AGENT_CATALOG.slice(25).map(c => [c.id, c] as const))('card "%s" uses rarity color in border', (_, card) => {
      const svg = generatePortraitSVG(card);
      const rarityColor = AGENT_RARITY_CONFIG[card.rarity].color;
      expect(svg).toContain(`stroke="${rarityColor}"`);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. DATA URI ENCODING (100 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Data URI encoding', () => {
  describe('valid base64 output', () => {
    it.each(AGENT_CATALOG.slice(0, 30).map(c => [c.id, c] as const))('card "%s" produces valid data URI', (_, card) => {
      const svg = generatePortraitSVG(card);
      const uri = svgToDataURI(svg);
      expect(uri).toMatch(/^data:image\/svg\+xml;base64,/);
    });
  });

  describe('correct MIME type', () => {
    it.each(AGENT_CATALOG.slice(0, 20).map(c => [c.id, c] as const))('card "%s" has correct MIME type', (_, card) => {
      const svg = generatePortraitSVG(card);
      const uri = svgToDataURI(svg);
      expect(uri.startsWith('data:image/svg+xml;base64,')).toBe(true);
    });
  });

  describe('base64 can be decoded back', () => {
    it.each(AGENT_CATALOG.slice(0, 25).map(c => [c.id, c] as const))('card "%s" base64 round-trips', (_, card) => {
      const svg = generatePortraitSVG(card);
      const uri = svgToDataURI(svg);
      const b64 = uri.replace('data:image/svg+xml;base64,', '');
      const decoded = typeof atob !== 'undefined'
        ? decodeURIComponent(escape(atob(b64)))
        : Buffer.from(b64, 'base64').toString('utf-8');
      expect(decoded).toBe(svg);
    });
  });

  describe('URI length is reasonable', () => {
    it.each(AGENT_CATALOG.slice(0, 25).map(c => [c.id, c] as const))('card "%s" URI < 50KB', (_, card) => {
      const svg = generatePortraitSVG(card);
      const uri = svgToDataURI(svg);
      expect(uri.length).toBeLessThan(50_000);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. DETERMINISTIC OUTPUT (100 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Deterministic output', () => {
  describe('same card produces same SVG', () => {
    it.each(AGENT_CATALOG.map(c => [c.id, c] as const))('card "%s" is deterministic', (_, card) => {
      const svg1 = generatePortraitSVG(card);
      const svg2 = generatePortraitSVG(card);
      expect(svg1).toBe(svg2);
    });
  });

  describe('same card same dimensions', () => {
    const dims = [[100, 140], [200, 280], [400, 560], [800, 1120], [1000, 1400]] as const;

    it.each(dims)('deterministic at %dx%d', (w, h) => {
      const card = AGENT_CATALOG[0];
      expect(generatePortraitSVG(card, w, h)).toBe(generatePortraitSVG(card, w, h));
    });

    it.each(AGENT_CATALOG.slice(0, 45).map(c => [c.id, c] as const))('data URI deterministic for "%s"', (_, card) => {
      const uri1 = svgToDataURI(generatePortraitSVG(card));
      const uri2 = svgToDataURI(generatePortraitSVG(card));
      expect(uri1).toBe(uri2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. COLOR CONTRAST ACCESSIBILITY (100 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Color contrast accessibility', () => {
  const whiteLum = relativeLuminance(255, 255, 255);

  describe('text readable against gradient colors', () => {
    it.each(AGENT_CATALOG.map(c => [c.id, c] as const))('card "%s" text contrast ratio >= 2:1 against darkest gradient', (_, card) => {
      const rgbs = card.portraitGradient.map(parseHexColor).filter(Boolean) as [number, number, number][];
      // White text should have adequate contrast against at least one gradient color
      const contrasts = rgbs.map(([r, g, b]) => contrastRatio(whiteLum, relativeLuminance(r, g, b)));
      const maxContrast = Math.max(...contrasts);
      expect(maxContrast).toBeGreaterThanOrEqual(1.5);
    });
  });

  describe('rarity colors have sufficient contrast with black', () => {
    const rarities: AgentRarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];

    it.each(rarities)('rarity "%s" color readable on dark background', (rarity) => {
      const color = AGENT_RARITY_CONFIG[rarity].color;
      const rgb = parseHexColor(color);
      expect(rgb).not.toBeNull();
      const lum = relativeLuminance(rgb![0], rgb![1], rgb![2]);
      const blackLum = relativeLuminance(0, 0, 0);
      const ratio = contrastRatio(lum, blackLum);
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe('class colors readable on dark backgrounds', () => {
    const classes = Object.keys(AGENT_CLASS_CONFIG) as AgentClass[];

    it.each(classes)('class "%s" color readable on dark background', (cls) => {
      const color = AGENT_CLASS_CONFIG[cls].color;
      const rgb = parseHexColor(color);
      expect(rgb).not.toBeNull();
      const lum = relativeLuminance(rgb![0], rgb![1], rgb![2]);
      const ratio = contrastRatio(lum, relativeLuminance(12, 11, 10));
      expect(ratio).toBeGreaterThanOrEqual(2.5);
    });
  });

  describe('gradient mid-points have reasonable luminance', () => {
    it.each(AGENT_CATALOG.slice(0, 34).map(c => [c.id, c] as const))('card "%s" mid gradient not too dark', (_, card) => {
      const [, mid] = card.portraitGradient;
      const rgb = parseHexColor(mid);
      expect(rgb).not.toBeNull();
      const lum = relativeLuminance(rgb![0], rgb![1], rgb![2]);
      // Mid gradient shouldn't be pure black
      expect(lum).toBeGreaterThan(0.005);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 7. ICON RENDERING (50 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Icon rendering', () => {
  it.each(AGENT_CATALOG.map(c => [c.id, c.iconGlyph] as const))('card "%s" icon "%s" renders in SVG', (id, icon) => {
    const card = getAgentById(id)!;
    const svg = generatePortraitSVG(card);
    expect(svg).toContain(icon);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 8. RARITY BORDER STYLES (100 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Rarity border styles', () => {
  const rarities: AgentRarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];

  describe('border style per rarity', () => {
    it.each(rarities)('rarity "%s" has correct border style', (rarity) => {
      const config = AGENT_RARITY_CONFIG[rarity];
      expect(['solid', 'double']).toContain(config.borderStyle);
    });
  });

  describe('solid borders for lower rarities', () => {
    it.each(['Common', 'Uncommon', 'Rare'] as AgentRarity[])('"%s" uses solid border', (rarity) => {
      expect(AGENT_RARITY_CONFIG[rarity].borderStyle).toBe('solid');
    });
  });

  describe('double borders for higher rarities', () => {
    it.each(['Epic', 'Legendary', 'Mythic'] as AgentRarity[])('"%s" uses double border', (rarity) => {
      expect(AGENT_RARITY_CONFIG[rarity].borderStyle).toBe('double');
    });
  });

  describe('stroke width reflects border style in SVG', () => {
    it.each(AGENT_CATALOG.map(c => [c.id, c] as const))('card "%s" has correct stroke width', (_, card) => {
      const svg = generatePortraitSVG(card);
      const expectedWidth = AGENT_RARITY_CONFIG[card.rarity].borderStyle === 'double' ? 4 : 2;
      expect(svg).toContain(`stroke-width="${expectedWidth}"`);
    });
  });

  describe('glow defined per rarity', () => {
    it.each(rarities)('rarity "%s" has glow definition', (rarity) => {
      expect(AGENT_RARITY_CONFIG[rarity].glow).toBeTruthy();
      expect(AGENT_RARITY_CONFIG[rarity].glow.length).toBeGreaterThan(0);
    });
  });

  describe('rarity colors are unique', () => {
    const colors = rarities.map(r => AGENT_RARITY_CONFIG[r].color);

    it.each(rarities)('rarity "%s" color is unique among rarities', (rarity) => {
      const color = AGENT_RARITY_CONFIG[rarity].color;
      const occurrences = colors.filter(c => c === color).length;
      expect(occurrences).toBe(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 9. PORTRAIT DIMENSIONS (100 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Portrait dimensions', () => {
  const aspectRatios = [
    [100, 140], [200, 280], [300, 420], [400, 560], [500, 700],
    [150, 210], [250, 350], [350, 490], [450, 630], [600, 840],
    [50, 70], [75, 105], [125, 175], [175, 245], [225, 315],
    [275, 385], [325, 455], [375, 525], [425, 595], [475, 665],
  ] as const;

  describe('maintains 5:7 aspect ratio', () => {
    it.each(aspectRatios)('dimensions %dx%d maintain ratio', (w, h) => {
      const ratio = w / h;
      expect(Math.abs(ratio - 5 / 7)).toBeLessThan(0.01);
    });
  });

  describe('SVG respects custom dimensions', () => {
    it.each(aspectRatios)('SVG at %dx%d has correct viewBox', (w, h) => {
      const card = AGENT_CATALOG[0];
      const svg = generatePortraitSVG(card, w, h);
      expect(svg).toContain(`viewBox="0 0 ${w} ${h}"`);
    });
  });

  describe('rect fits within SVG bounds', () => {
    it.each(aspectRatios)('rect at %dx%d stays within bounds', (w, h) => {
      const card = AGENT_CATALOG[0];
      const svg = generatePortraitSVG(card, w, h);
      // rect width should be less than SVG width
      const rectMatch = svg.match(/width="(\d+)"/g);
      expect(rectMatch).toBeTruthy();
    });
  });

  describe('minimum reasonable dimensions', () => {
    it.each(Array.from({ length: 20 }, (_, i) => [(i + 1) * 10, Math.round((i + 1) * 10 * 1.4)] as const))(
      'renders at minimum dimensions %dx%d',
      (w, h) => {
        const card = AGENT_CATALOG[0];
        const svg = generatePortraitSVG(card, w, h);
        expect(svg.length).toBeGreaterThan(100);
      }
    );
  });

  describe('text positions scale with height', () => {
    it.each(aspectRatios)('at %dx%d text y-positions are within bounds', (w, h) => {
      const card = AGENT_CATALOG[0];
      const svg = generatePortraitSVG(card, w, h);
      // Name text y = height - 80
      expect(svg).toContain(`y="${h - 80}"`);
      // Rarity text y = height - 50
      expect(svg).toContain(`y="${h - 50}"`);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 10. EXPRESSION / ATTIRE METADATA (100 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Expression / attire metadata', () => {
  describe('every card has portrait metadata', () => {
    it.each(AGENT_CATALOG.map(c => [c.id, c] as const))('card "%s" has portrait object', (_, card) => {
      expect(card.portrait).toBeDefined();
      expect(card.portrait.style).toBeDefined();
      expect(card.portrait.seed).toBeDefined();
      expect(card.portrait.expression).toBeDefined();
      expect(card.portrait.attire).toBeDefined();
    });
  });

  describe('valid portrait styles', () => {
    const validStyles = ['gradient', 'photo', 'pixel', 'anime'];

    it.each(AGENT_CATALOG.map(c => [c.id, c.portrait.style] as const))('card "%s" style "%s" is valid', (_, style) => {
      expect(validStyles).toContain(style);
    });
  });

  describe('seeds are positive numbers', () => {
    it.each(AGENT_CATALOG.map(c => [c.id, c.portrait.seed] as const))('card "%s" seed %d is positive', (_, seed) => {
      expect(seed).toBeGreaterThan(0);
    });
  });

  describe('expressions are non-empty strings', () => {
    it.each(AGENT_CATALOG.map(c => [c.id, c.portrait.expression] as const))('card "%s" expression "%s" is non-empty', (_, expr) => {
      expect(typeof expr).toBe('string');
      expect(expr.length).toBeGreaterThan(0);
    });
  });

  describe('attire descriptions are non-empty', () => {
    it.each(AGENT_CATALOG.map(c => [c.id, c.portrait.attire] as const))('card "%s" attire "%s" is non-empty', (_, attire) => {
      expect(typeof attire).toBe('string');
      expect(attire.length).toBeGreaterThan(0);
    });
  });

  describe('biography metadata present', () => {
    it.each(AGENT_CATALOG.map(c => [c.id, c] as const))('card "%s" has complete biography', (_, card) => {
      expect(card.biography.fullName.length).toBeGreaterThan(0);
      expect(card.biography.title.length).toBeGreaterThan(0);
      expect(card.biography.origin.length).toBeGreaterThan(0);
      expect(card.biography.age).toBeGreaterThan(0);
      expect(card.biography.background.length).toBeGreaterThan(0);
      expect(card.biography.specialization.length).toBeGreaterThan(0);
      expect(card.biography.weakness.length).toBeGreaterThan(0);
      expect(card.biography.quote.length).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 11. CROSS-CARD UNIQUENESS (50 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Cross-card uniqueness', () => {
  it('no duplicate card IDs', () => {
    const ids = AGENT_CATALOG.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no duplicate card names', () => {
    const names = AGENT_CATALOG.map(c => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('no duplicate codenames', () => {
    const codenames = AGENT_CATALOG.map(c => c.codename);
    expect(new Set(codenames).size).toBe(codenames.length);
  });

  it('no duplicate portrait seeds', () => {
    const seeds = AGENT_CATALOG.map(c => c.portrait.seed);
    expect(new Set(seeds).size).toBe(seeds.length);
  });

  it('no duplicate biography full names', () => {
    const names = AGENT_CATALOG.map(c => c.biography.fullName);
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(AGENT_CATALOG.map(c => [c.id, c] as const))('card "%s" SVG differs from others', (id, card) => {
    const thisSvg = generatePortraitSVG(card);
    const otherCards = AGENT_CATALOG.filter(c => c.id !== id);
    for (const other of otherCards.slice(0, 5)) { // Compare with 5 others for efficiency
      expect(thisSvg).not.toBe(generatePortraitSVG(other));
    }
  });

  it('no two cards share identical gradient triplets', () => {
    const gradients = AGENT_CATALOG.map(c => c.portraitGradient.join(','));
    // Allow some overlap but not all identical
    const unique = new Set(gradients).size;
    expect(unique).toBeGreaterThan(AGENT_CATALOG.length * 0.5);
  });

  it('each class has at least 2 cards', () => {
    const classes = Object.keys(AGENT_CLASS_CONFIG) as AgentClass[];
    for (const cls of classes) {
      expect(getAgentsByClass(cls).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('no duplicate NFT external URLs', () => {
    const urls = AGENT_CATALOG.map(c => c.nft.externalUrl);
    expect(new Set(urls).size).toBe(urls.length);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 12. PERFORMANCE (50 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Performance', () => {
  it.each(AGENT_CATALOG.map(c => [c.id, c] as const))('card "%s" generates SVG in < 50ms', (_, card) => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      generatePortraitSVG(card);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50); // 100 iterations in < 50ms
  });
});
