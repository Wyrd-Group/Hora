/**
 * EmptyState — shared empty-state card used anywhere a list has no items.
 *
 * Keeps empty panels from being raw text blobs. Callers pass an icon
 * (emoji or Lucide node), a title, an optional description, and an optional
 * primary-action button.
 */

import React from 'react';

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  /** Extra classes for spacing tweaks. */
  className?: string;
};

export default function EmptyState({
  icon = '∅',
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-xl border border-white/[0.06] bg-white/[0.02] ${className}`}
    >
      <div className="text-4xl mb-3 opacity-70" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-sm font-mono font-bold text-tactical-text">{title}</h3>
      {description && (
        <p className="text-[12px] font-mono text-tactical-text/60 mt-2 max-w-md">
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-[11px] font-mono uppercase tracking-wider hover:bg-cyan-500/20 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
