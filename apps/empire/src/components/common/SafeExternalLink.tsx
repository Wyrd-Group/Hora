/**
 * SafeExternalLink — <a> that always sets rel="noopener noreferrer" and
 * target="_blank" for cross-origin navigation. Prevents the target page
 * from accessing window.opener (reverse-tabnabbing).
 */

import React from 'react';

type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'rel' | 'target'> & {
  href: string;
};

export default function SafeExternalLink({ href, children, ...rest }: Props) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  );
}

/**
 * safeOpen — drop-in replacement for window.open that always applies
 * 'noopener,noreferrer' features. Returns the opened WindowProxy or null.
 */
export function safeOpen(url: string, target = '_blank'): Window | null {
  return typeof window !== 'undefined'
    ? window.open(url, target, 'noopener,noreferrer')
    : null;
}
