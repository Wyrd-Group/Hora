/**
 * AgentCard — Premium NFT-style collectible card component.
 *
 * Features:
 * - Holographic shimmer effect on hover (CSS conic-gradient)
 * - 3D tilt on mouse move (perspective transform)
 * - Rarity-based border glow and particle effects
 * - Class-themed color gradients
 * - Stat radar chart rendered in SVG
 * - Edition number and mint ID display
 * - Ability & passive buff readout
 * - Level / XP progress bar
 */

import { useState, useRef, useCallback, useMemo } from 'react';
import { getAgentById, AGENT_RARITY_CONFIG, AGENT_CLASS_CONFIG } from '../../data/agentCards';

// ── Stat Radar (SVG) ────────────────────────────────────────────

function StatRadar({ stats, color, size = 100 }) {
  const keys = ['intelligence', 'speed', 'stealth', 'loyalty', 'adaptability', 'influence'];
  const labels = ['INT', 'SPD', 'STL', 'LOY', 'ADP', 'INF'];
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;

  const points = keys.map((key, i) => {
    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    const val = (stats[key] ?? 0) / 100;
    return {
      x: cx + r * val * Math.cos(angle),
      y: cy + r * val * Math.sin(angle),
      lx: cx + (r + 12) * Math.cos(angle),
      ly: cy + (r + 12) * Math.sin(angle),
      label: labels[i],
      gx: cx + r * Math.cos(angle),
      gy: cy + r * Math.sin(angle),
    };
  });

  const polygon = points.map(p => `${p.x},${p.y}`).join(' ');
  const gridPolygon = points.map(p => `${p.gx},${p.gy}`).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid rings */}
      {[0.25, 0.5, 0.75, 1.0].map(scale => {
        const ring = keys.map((_, i) => {
          const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
          return `${cx + r * scale * Math.cos(angle)},${cy + r * scale * Math.sin(angle)}`;
        }).join(' ');
        return <polygon key={scale} points={ring} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />;
      })}
      {/* Grid lines */}
      <polygon points={gridPolygon} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      {/* Stat fill */}
      <polygon points={polygon} fill={`${color}22`} stroke={color} strokeWidth="1.5" />
      {/* Stat dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill={color} />
      ))}
      {/* Labels */}
      {points.map((p, i) => (
        <text key={`l${i}`} x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="central"
          fill="rgba(255,255,255,0.45)" fontSize="6" fontFamily="monospace">
          {p.label}
        </text>
      ))}
    </svg>
  );
}

// ── Main Card Component ─────────────────────────────────────────

export default function AgentCard({
  cardId,
  minted = null,        // MintedAgent instance (null for catalog preview)
  size = 'normal',      // 'small' | 'normal' | 'large'
  interactive = true,   // Enable 3D tilt + hover effects
  onDeploy,
  onRecall,
  onAbility,
  onClick,
  showActions = false,
}) {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [shimmerPos, setShimmerPos] = useState({ x: 50, y: 50 });
  const [flipped, setFlipped] = useState(false);

  const def = useMemo(() => getAgentById(cardId), [cardId]);
  const rarityConfig = def ? AGENT_RARITY_CONFIG[def.rarity] : null;
  const classConfig = def ? AGENT_CLASS_CONFIG[def.class] : null;

  const handleMouseMove = useCallback((e) => {
    if (!interactive || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({ x: (y - 0.5) * -15, y: (x - 0.5) * 15 });
    setShimmerPos({ x: x * 100, y: y * 100 });
  }, [interactive]);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  }, []);

  if (!def || !rarityConfig || !classConfig) return null;

  const dimensions = {
    small: { w: 180, h: 260 },
    normal: { w: 260, h: 380 },
    large: { w: 340, h: 500 },
  }[size];

  const level = minted?.level ?? 1;
  const xp = minted?.xp ?? 0;
  const xpNeeded = Math.floor(100 * Math.pow(1.5, level - 1));
  const xpPct = Math.min((xp / xpNeeded) * 100, 100);
  const isDeployed = !!minted?.deployedTo;

  // ── Card Styles ─────────────────────────────────────────────

  const cardStyle = {
    width: dimensions.w,
    height: dimensions.h,
    perspective: '1000px',
    cursor: interactive ? 'pointer' : 'default',
  };

  const innerStyle = {
    width: '100%',
    height: '100%',
    position: 'relative',
    borderRadius: '12px',
    transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)${flipped ? ' rotateY(180deg)' : ''}`,
    transition: isHovered ? 'transform 0.05s ease-out' : 'transform 0.4s ease-out',
    transformStyle: 'preserve-3d',
  };

  const faceStyle = {
    position: 'absolute',
    inset: 0,
    borderRadius: '12px',
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
    border: `2px ${rarityConfig.borderStyle} ${rarityConfig.color}`,
    boxShadow: isHovered
      ? `${rarityConfig.glow}, inset 0 0 30px rgba(0,0,0,0.5)`
      : `0 4px 20px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.4)`,
    background: `linear-gradient(145deg, #0A0C10 0%, #111318 50%, #0A0C10 100%)`,
  };

  // Holographic shimmer overlay
  const shimmerStyle = {
    position: 'absolute',
    inset: 0,
    borderRadius: '12px',
    background: isHovered
      ? `radial-gradient(circle at ${shimmerPos.x}% ${shimmerPos.y}%, ${rarityConfig.color}15 0%, transparent 50%)`
      : 'none',
    pointerEvents: 'none',
    zIndex: 10,
    transition: 'opacity 0.3s',
  };

  // Holographic foil for Legendary+
  const holoStyle = (def.rarity === 'Legendary' || def.rarity === 'Mythic') ? {
    position: 'absolute',
    inset: 0,
    borderRadius: '12px',
    background: isHovered
      ? `conic-gradient(from ${shimmerPos.x * 3.6}deg at ${shimmerPos.x}% ${shimmerPos.y}%,
          rgba(255,0,0,0.08), rgba(255,165,0,0.08), rgba(255,255,0,0.08),
          rgba(0,255,0,0.08), rgba(0,0,255,0.08), rgba(128,0,255,0.08), rgba(255,0,0,0.08))`
      : 'none',
    pointerEvents: 'none',
    zIndex: 11,
    mixBlendMode: 'screen',
  } : null;

  const isSmall = size === 'small';
  const fs = isSmall ? 0.7 : size === 'large' ? 1.2 : 1;

  return (
    <div
      ref={cardRef}
      style={cardStyle}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={() => {
        if (onClick) onClick();
        else if (interactive) setFlipped(f => !f);
      }}
    >
      <div style={innerStyle}>
        {/* ── FRONT FACE ──────────────────────────────────── */}
        <div style={faceStyle}>
          {/* Shimmer + Holo */}
          <div style={shimmerStyle} />
          {holoStyle && <div style={holoStyle} />}

          {/* Top bar: Class icon + Name + Rarity */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: `${6 * fs}px ${10 * fs}px`,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
            position: 'relative', zIndex: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: `${4 * fs}px` }}>
              <span style={{ fontSize: `${14 * fs}px` }}>{classConfig.icon}</span>
              <span style={{
                fontFamily: 'monospace', fontSize: `${9 * fs}px`, color: classConfig.color,
                textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>
                {def.class}
              </span>
            </div>
            <span style={{
              fontFamily: 'monospace', fontSize: `${8 * fs}px`, color: rarityConfig.color,
              textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 'bold',
            }}>
              {def.rarity}
            </span>
          </div>

          {/* Portrait area */}
          <div style={{
            height: `${dimensions.h * 0.35}px`,
            background: `linear-gradient(135deg, ${def.portraitGradient[0]}, ${def.portraitGradient[1]}, ${def.portraitGradient[2]})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            {/* Large glyph */}
            <span style={{
              fontSize: `${50 * fs}px`,
              filter: `drop-shadow(0 0 ${12 * fs}px ${def.portraitGradient[1]}88)`,
              userSelect: 'none',
            }}>
              {def.iconGlyph}
            </span>

            {/* Level badge */}
            <div style={{
              position: 'absolute', bottom: `${6 * fs}px`, right: `${8 * fs}px`,
              background: 'rgba(0,0,0,0.7)', borderRadius: `${4 * fs}px`,
              padding: `${2 * fs}px ${6 * fs}px`,
              border: `1px solid ${rarityConfig.color}44`,
            }}>
              <span style={{
                fontFamily: 'monospace', fontSize: `${9 * fs}px`, color: rarityConfig.color,
              }}>
                LV.{level}
              </span>
            </div>

            {/* Edition badge */}
            {minted && (
              <div style={{
                position: 'absolute', bottom: `${6 * fs}px`, left: `${8 * fs}px`,
                background: 'rgba(0,0,0,0.7)', borderRadius: `${4 * fs}px`,
                padding: `${2 * fs}px ${6 * fs}px`,
                border: '1px solid rgba(255,255,255,0.15)',
              }}>
                <span style={{
                  fontFamily: 'monospace', fontSize: `${7 * fs}px`, color: 'rgba(255,255,255,0.5)',
                }}>
                  #{minted.editionNumber}/{def.maxSupply}
                </span>
              </div>
            )}

            {/* Deployed indicator */}
            {isDeployed && (
              <div style={{
                position: 'absolute', top: `${6 * fs}px`, right: `${8 * fs}px`,
                background: 'rgba(16, 185, 129, 0.2)', borderRadius: `${4 * fs}px`,
                padding: `${2 * fs}px ${6 * fs}px`,
                border: '1px solid rgba(16, 185, 129, 0.5)',
              }}>
                <span style={{
                  fontFamily: 'monospace', fontSize: `${7 * fs}px`, color: '#10B981',
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                }}>
                  DEPLOYED
                </span>
              </div>
            )}
          </div>

          {/* Name plate */}
          <div style={{
            padding: `${6 * fs}px ${10 * fs}px ${4 * fs}px`,
            borderBottom: `1px solid ${rarityConfig.color}22`,
            background: 'rgba(0,0,0,0.3)',
            position: 'relative', zIndex: 12,
          }}>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: `${13 * fs}px`,
              fontWeight: 'bold',
              color: '#E2E8F0',
              letterSpacing: '0.05em',
              lineHeight: 1.2,
            }}>
              {def.name}
            </div>
            <div style={{
              fontFamily: 'monospace', fontSize: `${7 * fs}px`,
              color: 'rgba(255,255,255,0.35)', marginTop: `${1 * fs}px`,
            }}>
              {def.codename} • {def.edition} Edition
            </div>
          </div>

          {/* Stats + Passive area */}
          <div style={{
            display: 'flex', gap: `${6 * fs}px`,
            padding: `${6 * fs}px ${8 * fs}px`,
            flex: 1,
            position: 'relative', zIndex: 12,
          }}>
            {/* Radar chart */}
            {!isSmall && (
              <div style={{ flexShrink: 0 }}>
                <StatRadar stats={def.stats} color={classConfig.color} size={Math.floor(85 * fs)} />
              </div>
            )}

            {/* Passive + Ability */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: `${4 * fs}px`, minWidth: 0 }}>
              {/* Passive */}
              <div style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: `${4 * fs}px`,
                padding: `${3 * fs}px ${5 * fs}px`,
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{
                  fontFamily: 'monospace', fontSize: `${6 * fs}px`,
                  color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase',
                  letterSpacing: '0.1em', marginBottom: `${1 * fs}px`,
                }}>
                  PASSIVE
                </div>
                <div style={{
                  fontFamily: 'monospace', fontSize: `${7.5 * fs}px`,
                  color: classConfig.color, lineHeight: 1.3,
                }}>
                  {def.passive.description}
                </div>
              </div>

              {/* Ability */}
              <div style={{
                background: `${classConfig.color}08`, borderRadius: `${4 * fs}px`,
                padding: `${3 * fs}px ${5 * fs}px`,
                border: `1px solid ${classConfig.color}15`,
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: `${1 * fs}px`,
                }}>
                  <span style={{
                    fontFamily: 'monospace', fontSize: `${6 * fs}px`,
                    color: classConfig.color, textTransform: 'uppercase',
                    letterSpacing: '0.1em', fontWeight: 'bold',
                  }}>
                    {def.ability.name}
                  </span>
                  <span style={{
                    fontFamily: 'monospace', fontSize: `${6 * fs}px`,
                    color: 'rgba(255,255,255,0.3)',
                  }}>
                    CD:{def.ability.cooldownTicks}t
                  </span>
                </div>
                {!isSmall && (
                  <div style={{
                    fontFamily: 'monospace', fontSize: `${6.5 * fs}px`,
                    color: 'rgba(255,255,255,0.5)', lineHeight: 1.3,
                  }}>
                    {def.ability.description}
                  </div>
                )}
              </div>

              {/* Ultimate (if level 5+) */}
              {def.ultimate && level >= 5 && !isSmall && (
                <div style={{
                  background: `${rarityConfig.color}10`, borderRadius: `${4 * fs}px`,
                  padding: `${3 * fs}px ${5 * fs}px`,
                  border: `1px solid ${rarityConfig.color}25`,
                }}>
                  <div style={{
                    fontFamily: 'monospace', fontSize: `${6 * fs}px`,
                    color: rarityConfig.color, textTransform: 'uppercase',
                    letterSpacing: '0.1em', fontWeight: 'bold',
                  }}>
                    ULTIMATE: {def.ultimate.name}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* XP bar */}
          {minted && (
            <div style={{
              padding: `${3 * fs}px ${10 * fs}px ${6 * fs}px`,
              position: 'relative', zIndex: 12,
            }}>
              <div style={{
                height: `${3 * fs}px`, borderRadius: 2,
                background: 'rgba(255,255,255,0.06)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${xpPct}%`,
                  background: `linear-gradient(90deg, ${classConfig.color}, ${rarityConfig.color})`,
                  borderRadius: 2,
                  transition: 'width 0.3s',
                }} />
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', marginTop: `${2 * fs}px`,
              }}>
                <span style={{ fontFamily: 'monospace', fontSize: `${6 * fs}px`, color: 'rgba(255,255,255,0.3)' }}>
                  XP: {xp}/{xpNeeded}
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: `${6 * fs}px`, color: 'rgba(255,255,255,0.25)' }}>
                  {minted.totalMissions} missions
                </span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {showActions && minted && (
            <div style={{
              display: 'flex', gap: `${4 * fs}px`,
              padding: `0 ${10 * fs}px ${6 * fs}px`,
              position: 'relative', zIndex: 15,
            }}>
              {!isDeployed && onDeploy && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeploy(minted.mintId); }}
                  style={{
                    flex: 1, padding: `${4 * fs}px`, borderRadius: `${4 * fs}px`,
                    fontFamily: 'monospace', fontSize: `${7 * fs}px`,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    background: 'rgba(16, 185, 129, 0.15)', color: '#10B981',
                    border: '1px solid rgba(16, 185, 129, 0.3)', cursor: 'pointer',
                  }}
                >
                  Deploy
                </button>
              )}
              {isDeployed && onRecall && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRecall(minted.mintId); }}
                  style={{
                    flex: 1, padding: `${4 * fs}px`, borderRadius: `${4 * fs}px`,
                    fontFamily: 'monospace', fontSize: `${7 * fs}px`,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer',
                  }}
                >
                  Recall
                </button>
              )}
              {isDeployed && onAbility && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAbility(minted.mintId); }}
                  style={{
                    flex: 1, padding: `${4 * fs}px`, borderRadius: `${4 * fs}px`,
                    fontFamily: 'monospace', fontSize: `${7 * fs}px`,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    background: `${classConfig.color}15`, color: classConfig.color,
                    border: `1px solid ${classConfig.color}30`, cursor: 'pointer',
                  }}
                >
                  Ability
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── BACK FACE ───────────────────────────────────── */}
        <div style={{
          ...faceStyle,
          transform: 'rotateY(180deg)',
          display: 'flex', flexDirection: 'column',
          padding: `${10 * fs}px`,
        }}>
          <div style={shimmerStyle} />

          {/* Back header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: `${6 * fs}px`,
            marginBottom: `${8 * fs}px`,
          }}>
            <span style={{ fontSize: `${20 * fs}px` }}>{def.iconGlyph}</span>
            <div>
              <div style={{
                fontFamily: '"JetBrains Mono", monospace', fontSize: `${11 * fs}px`,
                fontWeight: 'bold', color: '#E2E8F0',
              }}>
                {def.name}
              </div>
              <div style={{
                fontFamily: 'monospace', fontSize: `${7 * fs}px`,
                color: classConfig.color,
              }}>
                {def.codename}
              </div>
            </div>
          </div>

          {/* Lore */}
          <div style={{
            fontFamily: 'monospace', fontSize: `${7.5 * fs}px`,
            color: 'rgba(255,255,255,0.6)', lineHeight: 1.5,
            fontStyle: 'italic',
            padding: `${6 * fs}px`,
            background: 'rgba(255,255,255,0.03)',
            borderRadius: `${4 * fs}px`,
            borderLeft: `2px solid ${rarityConfig.color}44`,
            marginBottom: `${8 * fs}px`,
            flex: 1,
          }}>
            "{def.lore}"
          </div>

          {/* Stat numbers */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: `${4 * fs}px`, marginBottom: `${6 * fs}px`,
          }}>
            {Object.entries(def.stats).map(([key, val]) => (
              <div key={key} style={{
                textAlign: 'center', padding: `${3 * fs}px`,
                background: 'rgba(255,255,255,0.03)', borderRadius: `${3 * fs}px`,
              }}>
                <div style={{
                  fontFamily: 'monospace', fontSize: `${12 * fs}px`,
                  fontWeight: 'bold', color: classConfig.color,
                }}>
                  {val}
                </div>
                <div style={{
                  fontFamily: 'monospace', fontSize: `${5.5 * fs}px`,
                  color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase',
                }}>
                  {key.slice(0, 3)}
                </div>
              </div>
            ))}
          </div>

          {/* Synergy tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: `${3 * fs}px` }}>
            {def.synergyTags.map(tag => (
              <span key={tag} style={{
                fontFamily: 'monospace', fontSize: `${6 * fs}px`,
                color: 'rgba(255,255,255,0.4)', padding: `${1 * fs}px ${4 * fs}px`,
                background: 'rgba(255,255,255,0.05)', borderRadius: `${3 * fs}px`,
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                #{tag}
              </span>
            ))}
          </div>

          {/* Mint info */}
          {minted && (
            <div style={{
              marginTop: `${6 * fs}px`, paddingTop: `${4 * fs}px`,
              borderTop: '1px solid rgba(255,255,255,0.06)',
              fontFamily: 'monospace', fontSize: `${6 * fs}px`,
              color: 'rgba(255,255,255,0.25)',
            }}>
              MINT: {minted.mintId.slice(0, 24)}...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Mini Card (for lists/grids) ─────────────────────────────────

export function AgentCardMini({ cardId, minted, onClick }) {
  const def = getAgentById(cardId);
  if (!def) return null;

  const rarityConfig = AGENT_RARITY_CONFIG[def.rarity];
  const classConfig = AGENT_CLASS_CONFIG[def.class];
  const level = minted?.level ?? 1;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px', borderRadius: 6,
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${rarityConfig.color}30`,
        cursor: 'pointer', width: '100%', textAlign: 'left',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = `${rarityConfig.color}10`;
        e.currentTarget.style.borderColor = `${rarityConfig.color}50`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
        e.currentTarget.style.borderColor = `${rarityConfig.color}30`;
      }}
    >
      <span style={{ fontSize: 18 }}>{def.iconGlyph}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
          fontWeight: 'bold', color: '#E2E8F0',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {def.name}
        </div>
        <div style={{
          fontFamily: 'monospace', fontSize: 8,
          color: classConfig.color,
        }}>
          {def.class} • LV.{level}
        </div>
      </div>
      <span style={{
        fontFamily: 'monospace', fontSize: 7,
        color: rarityConfig.color, fontWeight: 'bold',
      }}>
        {def.rarity.slice(0, 1)}
      </span>
    </button>
  );
}
