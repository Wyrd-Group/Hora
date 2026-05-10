/**
 * JuicyButton — Hora's chunky, satisfying primary button.
 * Per docs/VISUAL_DIRECTION.md.
 */
import type { ButtonHTMLAttributes } from 'react';

export type JuicyButtonVariant = 'primary' | 'secondary' | 'danger';
export type JuicyButtonSize = 'sm' | 'md' | 'lg';

export interface JuicyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: JuicyButtonVariant;
  size?: JuicyButtonSize;
  fullWidth?: boolean;
}

const VARIANT_BG: Record<JuicyButtonVariant, string> = {
  primary: 'linear-gradient(135deg, #FFB820 0%, #FF5C6E 100%)',
  secondary: 'linear-gradient(135deg, #7C5CFF 0%, #4FB8FF 100%)',
  danger: 'linear-gradient(135deg, #FF5C6E 0%, #FF8A4A 100%)',
};

const SIZE_PADDING: Record<JuicyButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export default function JuicyButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  style,
  ...rest
}: JuicyButtonProps) {
  return (
    <button
      {...rest}
      className={`relative font-bold rounded-2xl text-white tracking-wide ${SIZE_PADDING[size]} ${fullWidth ? 'w-full' : ''} select-none transition-all duration-150 ease-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{
        background: VARIANT_BG[variant],
        boxShadow:
          '0 6px 14px rgba(0, 0, 0, 0.18), inset 0 2px 0 rgba(255, 255, 255, 0.35), inset 0 -2px 0 rgba(0, 0, 0, 0.15)',
        fontFamily: 'Fredoka, system-ui, sans-serif',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
