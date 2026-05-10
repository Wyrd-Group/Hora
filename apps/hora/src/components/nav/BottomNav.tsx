/**
 * BottomNav — Hora's persistent 5-tab thumb-zone navigation.
 * Per docs/VISUAL_DIRECTION.md §7.
 */
export type HoraTab = 'base' | 'raid' | 'funds' | 'league' | 'profile';

interface NavItem {
  id: HoraTab;
  label: string;
  icon: string;
}

const ITEMS: NavItem[] = [
  { id: 'base', label: 'Base', icon: '🏰' },
  { id: 'raid', label: 'Raid', icon: '⚔️' },
  { id: 'funds', label: 'Funds', icon: '👥' },
  { id: 'league', label: 'League', icon: '🏆' },
  { id: 'profile', label: 'You', icon: '👤' },
];

export interface BottomNavProps {
  active: HoraTab;
  onChange: (tab: HoraTab) => void;
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav
      aria-label="Hora primary navigation"
      className="absolute bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid rgba(0, 0, 0, 0.06)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <ul className="flex items-stretch justify-around px-2 py-1">
        {ITEMS.map((item) => {
          const isActive = active === item.id;
          return (
            <li key={item.id} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(item.id)}
                className={`w-full flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl transition-all duration-200 ${isActive ? 'scale-105' : 'opacity-70 hover:opacity-100'}`}
                style={{
                  background: isActive ? 'linear-gradient(135deg, #FFB820 0%, #FF5C6E 100%)' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#5C5470',
                  minHeight: 56,
                  minWidth: 56,
                  fontFamily: 'Fredoka, system-ui, sans-serif',
                }}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
              >
                <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.2 }}>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
