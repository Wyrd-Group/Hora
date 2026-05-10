/**
 * Skeleton — shimmer block used while panels fetch/derive their first render.
 *
 * Respects prefers-reduced-motion: falls back to a static muted block.
 */

import React from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  rounded?: string;
  className?: string;
};

export default function Skeleton({
  width = '100%',
  height = 12,
  rounded = 'rounded',
  className = '',
}: SkeletonProps) {
  const reduce = useReducedMotion();
  const style: React.CSSProperties = {
    width,
    height,
  };
  const anim = reduce ? '' : 'animate-pulse';
  return (
    <div
      aria-hidden="true"
      style={style}
      className={`${anim} bg-white/[0.06] ${rounded} ${className}`}
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          height={10}
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
}
