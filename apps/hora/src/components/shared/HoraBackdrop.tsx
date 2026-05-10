/**
 * HoraBackdrop — warm gold-coral gradient ambient background.
 * Replaces AEGIS's RitualBackdrop entirely. Different vibe.
 * Per docs/VISUAL_DIRECTION.md.
 */
export interface HoraBackdropProps {
  density?: 'subtle' | 'full';
  className?: string;
}

export default function HoraBackdrop({ density = 'full', className = '' }: HoraBackdropProps) {
  return (
    <div aria-hidden className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, #FFE9A8 0%, #FFAA5C 50%, #FF6B96 100%)' }}
      />
      {density === 'full' && (
        <>
          <div className="absolute -top-20 -right-10 w-72 h-72 rounded-full opacity-60"
               style={{ background: 'radial-gradient(circle, rgba(255,184,32,0.5), transparent 70%)' }} />
          <div className="absolute top-1/3 -left-20 w-80 h-80 rounded-full opacity-50"
               style={{ background: 'radial-gradient(circle, rgba(124,92,255,0.4), transparent 70%)' }} />
          <div className="absolute bottom-10 right-1/4 w-56 h-56 rounded-full opacity-50"
               style={{ background: 'radial-gradient(circle, rgba(31,205,184,0.5), transparent 70%)' }} />
          <div className="absolute inset-x-0 top-0 h-32"
               style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 100%)' }} />
        </>
      )}
    </div>
  );
}
