/**
 * safeOpen — drop-in replacement for `window.open` that always disables
 * window.opener access on the target page. Prevents reverse-tabnabbing.
 *
 * Use this instead of raw window.open() for any cross-origin link.
 */

export function safeOpen(url: string, target = '_blank'): Window | null {
  if (typeof window === 'undefined') return null;
  const w = window.open(url, target, 'noopener,noreferrer');
  // Some browsers still return a WindowProxy — belt-and-braces null the opener.
  if (w) {
    try {
      (w as unknown as { opener: Window | null }).opener = null;
    } catch {
      /* cross-origin read-only — already safe via noopener feature */
    }
  }
  return w;
}
