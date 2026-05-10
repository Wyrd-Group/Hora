/**
 * Certificate SVG rendering tests.
 *
 * Ensures the exported SVG is valid XML, embeds the player's data correctly,
 * and escapes untrusted user content. The SVG is shared externally (downloads,
 * screenshots, social), so XSS via unescaped fields is a real concern.
 */

import { describe, it, expect } from 'vitest';
import { renderCertificateSvg } from '../lib/certificateSvg';

describe('renderCertificateSvg', () => {
  const baseCert = {
    courseName: 'Money & Earning',
    band: 'F0',
    bandLabel: 'Financial Literacy',
    score: 92,
    grade: 'A-',
    distinction: 'Distinction',
    correctAnswers: 23,
    totalQuestions: 25,
    verificationCode: 'ECFL-F0-ABC123',
    earnedAt: new Date('2026-04-20T12:00:00Z').getTime(),
    holderName: 'Alec',
  };

  it('returns a non-empty string starting with XML declaration', () => {
    const svg = renderCertificateSvg(baseCert);
    expect(svg).toMatch(/^<\?xml version="1\.0"/);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('embeds course name and score', () => {
    const svg = renderCertificateSvg(baseCert);
    expect(svg).toContain('Money &amp; Earning'); // escaped ampersand
    expect(svg).toContain('92%');
    expect(svg).toContain('A-');
  });

  it('embeds verification code and formatted date', () => {
    const svg = renderCertificateSvg(baseCert);
    expect(svg).toContain('ECFL-F0-ABC123');
    expect(svg).toMatch(/20 April 2026/);
  });

  it('escapes XSS attempts in user fields', () => {
    const svg = renderCertificateSvg({
      ...baseCert,
      courseName: '<script>alert(1)</script>',
      holderName: '"><img src=x onerror=alert(1)>',
    });
    // Critical: dangerous tags and quote-break must be neutralised so the SVG
    // parser never sees them as markup.
    expect(svg).not.toContain('<script>alert');
    expect(svg).not.toContain('<img src=x');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('&quot;&gt;&lt;img');
  });

  it('picks the right band color (F3 = red)', () => {
    const svg = renderCertificateSvg({ ...baseCert, band: 'F3' });
    expect(svg).toContain('#ef4444');
  });

  it('handles missing band gracefully — falls back to default color', () => {
    const svg = renderCertificateSvg({ ...baseCert, band: undefined, bandLabel: undefined });
    expect(svg).toContain('#00e5ff'); // default
    expect(svg).not.toContain('undefined');
  });

  it('holder name defaults when omitted', () => {
    const svg = renderCertificateSvg({ ...baseCert, holderName: undefined });
    expect(svg).toContain('ACADEMY MEMBER');
  });
});
