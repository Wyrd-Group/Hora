/**
 * AgentCardNFT -- Full-detail NFT collectible card component.
 *
 * A premium, scrollable card that displays every detail of an agent:
 * portrait, biography, stats (horizontal bars), abilities, and NFT metadata.
 * Designed to feel like a holographic trading card meets cyberpunk HUD.
 *
 * Props:
 *   card        - AgentCardDef from agentCards.ts
 *   minted      - MintedAgent from agentCardStore.ts (optional, for owned cards)
 *   edition     - Edition number override (e.g. 42)
 *   compact     - Smaller version for grid views
 *   onDeploy    - Callback when Deploy is clicked
 *   onSell      - Callback when Sell is clicked
 */

import { useState, useRef, useCallback } from 'react';
import {
  AGENT_RARITY_CONFIG,
  AGENT_CLASS_CONFIG,
} from '../../data/agentCards';

// ── Helpers ─────────────────────────────────────────────────────

const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];

function statBarColor(value) {
  if (value > 70) return '#34D399';   // green
  if (value > 40) return '#FBBF24';   // yellow
  return '#EF4444';                    // red
}

function padEdition(n, max) {
  const digits = String(max).length;
  return `#${String(n).padStart(digits, '0')} / ${max}`;
}

// ── Stat Bar ────────────────────────────────────────────────────

function StatBar({ label, value, compact }) {
  const color = statBarColor(value);
  return (
    <div className={`flex items-center gap-2 ${compact ? 'mb-0.5' : 'mb-1'}`}>
      <span
        className="font-mono uppercase tracking-wider text-white/40 shrink-0"
        style={{ fontSize: compact ? 8 : 10, width: compact ? 48 : 64 }}
      >
        {label}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            boxShadow: `0 0 6px ${color}44`,
          }}
        />
      </div>
      <span
        className="font-mono font-bold shrink-0"
        style={{ fontSize: compact ? 8 : 10, color, width: 20, textAlign: 'right' }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Section Divider ─────────────────────────────────────────────

function SectionLabel({ children, color = '#06B6D4' }) {
  return (
    <div className="flex items-center gap-2 mt-4 mb-2">
      <div className="h-px flex-1" style={{ background: `${color}33` }} />
      <span
        className="font-mono uppercase tracking-widest text-[9px] font-bold"
        style={{ color }}
      >
        {children}
      </span>
      <div className="h-px flex-1" style={{ background: `${color}33` }} />
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────

export default function AgentCardNFT({
  card,
  minted = null,
  edition,
  compact = false,
  onDeploy,
  onSell,
}) {
  const cardRef = useRef(null);
  const [shimmerPos, setShimmerPos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  if (!card) return null;

  const rarityConfig = AGENT_RARITY_CONFIG[card.rarity];
  const classConfig = AGENT_CLASS_CONFIG[card.class];
  const rarityIdx = RARITY_ORDER.indexOf(card.rarity);

  const editionNum = edition ?? minted?.editionNumber ?? 1;
  const level = minted?.level ?? 1;

  const isHolo = rarityIdx >= 4; // Legendary or Mythic

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setShimmerPos({ x, y });
  }, []);

  // ── Dimensions ──────────────────────────────────────────────
  const width = compact ? 280 : 360;

  return (
    <div
      ref={cardRef}
      className="relative select-none"
      style={{ width, fontFamily: '"JetBrains Mono", "Fira Code", monospace' }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Outer glow */}
      <div
        className="absolute -inset-1 rounded-2xl opacity-60 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${rarityConfig.color}22 0%, transparent 70%)`,
          boxShadow: isHovered ? rarityConfig.glow : 'none',
          transition: 'box-shadow 0.3s, opacity 0.3s',
        }}
      />

      {/* Card body */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          border: `2px ${rarityConfig.borderStyle} ${rarityConfig.color}`,
          background: 'linear-gradient(180deg, #0A0C10 0%, #0D0F14 40%, #0A0C10 100%)',
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,0.04),
            0 8px 32px rgba(0,0,0,0.8),
            ${isHovered ? rarityConfig.glow : '0 0 0 transparent'}
          `,
          transition: 'box-shadow 0.3s',
        }}
      >
        {/* Holographic shimmer overlay */}
        {isHolo && isHovered && (
          <div
            className="absolute inset-0 pointer-events-none z-50 mix-blend-screen rounded-xl"
            style={{
              background: `conic-gradient(
                from ${shimmerPos.x * 3.6}deg at ${shimmerPos.x}% ${shimmerPos.y}%,
                rgba(255,0,0,0.06), rgba(255,165,0,0.06), rgba(255,255,0,0.06),
                rgba(0,255,0,0.06), rgba(0,0,255,0.06), rgba(128,0,255,0.06), rgba(255,0,0,0.06)
              )`,
            }}
          />
        )}

        {/* Shimmer highlight */}
        {isHovered && (
          <div
            className="absolute inset-0 pointer-events-none z-40 rounded-xl"
            style={{
              background: `radial-gradient(circle at ${shimmerPos.x}% ${shimmerPos.y}%, ${rarityConfig.color}10 0%, transparent 45%)`,
            }}
          />
        )}

        {/* ─── PORTRAIT AREA ──────────────────────────────── */}
        <div
          className="relative flex items-center justify-center"
          style={{
            height: compact ? 120 : 160,
            background: `linear-gradient(135deg, ${card.portraitGradient[0]}, ${card.portraitGradient[1]}, ${card.portraitGradient[2]})`,
          }}
        >
          {/* Scanline overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
            }}
          />

          {/* Icon glyph */}
          <span
            className="relative z-10"
            style={{
              fontSize: compact ? 56 : 72,
              filter: `drop-shadow(0 0 20px ${card.portraitGradient[1]}88)`,
            }}
          >
            {card.iconGlyph}
          </span>

          {/* Edition badge (top left) */}
          <div className="absolute top-2 left-2 z-20">
            <span
              className="font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded"
              style={{
                fontSize: 8,
                background: 'rgba(0,0,0,0.65)',
                color: '#FBBF24',
                border: '1px solid rgba(251,191,36,0.3)',
                backdropFilter: 'blur(4px)',
              }}
            >
              {card.edition} Edition
            </span>
          </div>

          {/* Rarity badge (top right) */}
          <div className="absolute top-2 right-2 z-20">
            <span
              className="font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded"
              style={{
                fontSize: 8,
                background: 'rgba(0,0,0,0.65)',
                color: rarityConfig.color,
                border: `1px solid ${rarityConfig.color}55`,
                backdropFilter: 'blur(4px)',
                textShadow: `0 0 8px ${rarityConfig.color}66`,
              }}
            >
              {card.rarity}
            </span>
          </div>

          {/* Supply count (bottom right) */}
          <div className="absolute bottom-2 right-2 z-20">
            <span
              className="font-mono px-2 py-0.5 rounded"
              style={{
                fontSize: 9,
                background: 'rgba(0,0,0,0.7)',
                color: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {padEdition(editionNum, card.maxSupply)}
            </span>
          </div>

          {/* Level badge (bottom left) */}
          <div className="absolute bottom-2 left-2 z-20">
            <span
              className="font-mono font-bold px-2 py-0.5 rounded"
              style={{
                fontSize: 9,
                background: 'rgba(0,0,0,0.7)',
                color: rarityConfig.color,
                border: `1px solid ${rarityConfig.color}33`,
              }}
            >
              LV.{level}
            </span>
          </div>
        </div>

        {/* ─── NAME PLATE ─────────────────────────────────── */}
        <div
          className="px-4 py-2"
          style={{
            borderBottom: `1px solid ${rarityConfig.color}22`,
            background: 'rgba(0,0,0,0.4)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2
                className="font-bold tracking-wide leading-tight"
                style={{ fontSize: compact ? 16 : 20, color: '#E2E8F0' }}
              >
                {card.name}
              </h2>
              <div
                className="text-white/35 mt-0.5"
                style={{ fontSize: compact ? 9 : 11 }}
              >
                {card.codename}
              </div>
            </div>
            {/* Class badge */}
            <span
              className="font-mono uppercase tracking-wider font-bold px-2 py-1 rounded-md text-center"
              style={{
                fontSize: compact ? 8 : 9,
                color: classConfig.color,
                background: `${classConfig.color}12`,
                border: `1px solid ${classConfig.color}30`,
              }}
            >
              {classConfig.icon} {card.class}
            </span>
          </div>
        </div>

        {/* ─── SCROLLABLE CONTENT ─────────────────────────── */}
        <div
          className="px-4 pb-3 overflow-y-auto"
          style={{
            maxHeight: compact ? 360 : 520,
            scrollbarWidth: 'thin',
            scrollbarColor: `${rarityConfig.color}33 transparent`,
          }}
        >
          {/* ── BIO SECTION ─────────────────────────────────── */}
          <SectionLabel color={classConfig.color}>Dossier</SectionLabel>

          <div className="space-y-1.5">
            {card.biography && (
              <>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <BioField label="Full Name" value={card.biography.fullName} compact={compact} />
                  <BioField label="Title" value={card.biography.title} compact={compact} />
                  <BioField label="Origin" value={card.biography.origin} compact={compact} />
                  <BioField label="Age" value={card.biography.age} compact={compact} />
                  <BioField label="Specialization" value={card.biography.specialization} compact={compact} />
                  <BioField label="Weakness" value={card.biography.weakness} accent="#EF4444" compact={compact} />
                </div>

                {/* Background */}
                <div
                  className="mt-2 p-2 rounded"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <span
                    className="font-mono uppercase tracking-wider text-white/30 block mb-1"
                    style={{ fontSize: compact ? 7 : 8 }}
                  >
                    Background
                  </span>
                  <p
                    className="text-white/55 leading-relaxed"
                    style={{ fontSize: compact ? 9 : 10 }}
                  >
                    {card.biography.background}
                  </p>
                </div>

                {/* Signature quote */}
                <div
                  className="mt-2 pl-3 py-1"
                  style={{
                    borderLeft: `2px solid ${rarityConfig.color}44`,
                    fontStyle: 'italic',
                  }}
                >
                  <p
                    className="text-white/45 leading-relaxed"
                    style={{ fontSize: compact ? 9 : 11 }}
                  >
                    "{card.biography.quote}"
                  </p>
                </div>
              </>
            )}

            {/* Lore fallback when no biography */}
            {!card.biography && card.lore && (
              <div
                className="mt-1 pl-3 py-1"
                style={{
                  borderLeft: `2px solid ${rarityConfig.color}44`,
                  fontStyle: 'italic',
                }}
              >
                <p className="text-white/50 leading-relaxed" style={{ fontSize: compact ? 9 : 11 }}>
                  "{card.lore}"
                </p>
              </div>
            )}
          </div>

          {/* ── STATS SECTION ───────────────────────────────── */}
          <SectionLabel color="#06B6D4">Combat Stats</SectionLabel>

          <div className="space-y-0.5">
            <StatBar label="INT" value={card.stats.intelligence} compact={compact} />
            <StatBar label="SPD" value={card.stats.speed} compact={compact} />
            <StatBar label="STL" value={card.stats.stealth} compact={compact} />
            <StatBar label="LOY" value={card.stats.loyalty} compact={compact} />
            <StatBar label="ADP" value={card.stats.adaptability} compact={compact} />
            <StatBar label="INF" value={card.stats.influence} compact={compact} />
          </div>

          {/* Total power */}
          <div className="flex justify-end mt-1">
            <span
              className="font-mono text-white/25"
              style={{ fontSize: compact ? 8 : 9 }}
            >
              PWR: {Object.values(card.stats).reduce((a, b) => a + b, 0)} / 600
            </span>
          </div>

          {/* ── ABILITIES SECTION ───────────────────────────── */}
          <SectionLabel color={classConfig.color}>Abilities</SectionLabel>

          {/* Passive */}
          <AbilityBlock
            tag="Passive"
            name={card.passive.description}
            description={`Always active when deployed. +${Math.round(card.passive.value * 100)}% ${card.passive.type.replace(/_/g, ' ')}`}
            color="#34D399"
            compact={compact}
          />

          {/* Active ability */}
          <AbilityBlock
            tag="Active"
            name={card.ability.name}
            description={card.ability.description}
            cooldown={card.ability.cooldownTicks}
            color={classConfig.color}
            compact={compact}
          />

          {/* Ultimate */}
          {card.ultimate && (
            <AbilityBlock
              tag="Ultimate"
              name={card.ultimate.name}
              description={card.ultimate.description}
              cooldown={card.ultimate.cooldownTicks}
              color={rarityConfig.color}
              locked={level < 5}
              compact={compact}
            />
          )}

          {/* ── SYNERGY TAGS ────────────────────────────────── */}
          {card.synergyTags && card.synergyTags.length > 0 && (
            <>
              <SectionLabel color="#A78BFA">Synergy</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {card.synergyTags.map((tag) => (
                  <span
                    key={tag}
                    className="font-mono px-2 py-0.5 rounded"
                    style={{
                      fontSize: compact ? 8 : 9,
                      color: 'rgba(167,139,250,0.7)',
                      background: 'rgba(167,139,250,0.08)',
                      border: '1px solid rgba(167,139,250,0.15)',
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              {card.synergyBonus && (
                <p
                  className="font-mono text-white/35 mt-1.5 leading-relaxed"
                  style={{ fontSize: compact ? 8 : 9 }}
                >
                  {card.synergyBonus}
                </p>
              )}
            </>
          )}

          {/* ── NFT FOOTER ──────────────────────────────────── */}
          {card.nft && (
            <>
              <SectionLabel color="rgba(255,255,255,0.2)">NFT Metadata</SectionLabel>
              <div
                className="rounded-lg p-2.5"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <MetaField label="Token Standard" value={card.nft.tokenStandard} compact={compact} />
                  <MetaField label="Collection" value={card.nft.collection} compact={compact} />
                  <MetaField label="Symbol" value={card.nft.contractSymbol} compact={compact} />
                  <MetaField label="Mint ID" value={minted?.mintId ? minted.mintId.slice(0, 18) + '...' : 'Not minted'} compact={compact} />
                </div>
              </div>
            </>
          )}

          {/* Minted-only info */}
          {minted && (
            <div
              className="mt-2 rounded-lg p-2.5"
              style={{
                background: 'rgba(6,182,212,0.04)',
                border: '1px solid rgba(6,182,212,0.1)',
              }}
            >
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <MetaField label="Missions" value={`${minted.successfulMissions}/${minted.totalMissions}`} compact={compact} />
                <MetaField label="Deployed" value={minted.deployedTo ?? 'Idle'} compact={compact} />
                <MetaField
                  label="Acquired"
                  value={new Date(minted.acquiredAt).toLocaleDateString()}
                  compact={compact}
                />
                <MetaField
                  label="Status"
                  value={minted.isLocked ? 'Locked' : 'Available'}
                  compact={compact}
                />
              </div>
            </div>
          )}
        </div>

        {/* ─── ACTION BUTTONS ─────────────────────────────── */}
        {(onDeploy || onSell) && (
          <div
            className="flex gap-2 px-4 py-3"
            style={{
              borderTop: `1px solid ${rarityConfig.color}15`,
              background: 'rgba(0,0,0,0.3)',
            }}
          >
            {onDeploy && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeploy(); }}
                className="flex-1 font-mono uppercase tracking-wider font-bold rounded-md py-2 transition-all duration-200 hover:brightness-125 cursor-pointer"
                style={{
                  fontSize: compact ? 9 : 11,
                  color: '#06B6D4',
                  background: 'rgba(6,182,212,0.1)',
                  border: '1px solid rgba(6,182,212,0.3)',
                }}
              >
                Deploy Agent
              </button>
            )}
            {onSell && (
              <button
                onClick={(e) => { e.stopPropagation(); onSell(); }}
                className="flex-1 font-mono uppercase tracking-wider font-bold rounded-md py-2 transition-all duration-200 hover:brightness-125 cursor-pointer"
                style={{
                  fontSize: compact ? 9 : 11,
                  color: '#EF4444',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.25)',
                }}
              >
                Sell
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function BioField({ label, value, accent, compact }) {
  if (!value && value !== 0) return null;
  return (
    <div className="overflow-hidden">
      <span
        className="font-mono uppercase tracking-wider text-white/25 block"
        style={{ fontSize: compact ? 7 : 8 }}
      >
        {label}
      </span>
      <span
        className="font-mono block truncate"
        style={{
          fontSize: compact ? 9 : 10,
          color: accent ?? 'rgba(255,255,255,0.65)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function MetaField({ label, value, compact }) {
  return (
    <div className="overflow-hidden">
      <span
        className="font-mono uppercase tracking-wider text-white/20 block"
        style={{ fontSize: compact ? 6 : 7 }}
      >
        {label}
      </span>
      <span
        className="font-mono text-white/45 block truncate"
        style={{ fontSize: compact ? 8 : 9 }}
      >
        {value}
      </span>
    </div>
  );
}

function AbilityBlock({ tag, name, description, cooldown, color, locked, compact }) {
  return (
    <div
      className={`rounded-lg p-2.5 mb-2 ${locked ? 'opacity-50' : ''}`}
      style={{
        background: `${color}06`,
        border: `1px solid ${color}18`,
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {locked && (
            <span style={{ fontSize: compact ? 10 : 12 }}>&#x1F512;</span>
          )}
          <span
            className="font-mono uppercase tracking-wider font-bold"
            style={{ fontSize: compact ? 7 : 8, color: `${color}88` }}
          >
            {tag}
          </span>
        </div>
        {cooldown !== undefined && (
          <span
            className="font-mono text-white/25"
            style={{ fontSize: compact ? 7 : 8 }}
          >
            CD: {cooldown}t
          </span>
        )}
      </div>
      <div
        className="font-mono font-bold mb-0.5"
        style={{ fontSize: compact ? 9 : 11, color }}
      >
        {name}
      </div>
      <p
        className="font-mono text-white/45 leading-relaxed"
        style={{ fontSize: compact ? 8 : 9 }}
      >
        {description}
        {locked && (
          <span className="text-amber-400/60 ml-1">(Unlocks at LV.5)</span>
        )}
      </p>
    </div>
  );
}
