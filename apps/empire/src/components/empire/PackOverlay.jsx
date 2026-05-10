import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useEmpireStore } from '../../store/empireStore';
import { useAgentCardStore } from '../../store/agentCardStore';
import { useCardEconomyStore } from '../../store/cardEconomyStore';
import {
  AGENT_PACK_TYPES,
  AGENT_RARITY_CONFIG,
  AGENT_CLASS_CONFIG,
  AP_BUNDLES,
  getAgentById,
} from '../../data/agentCards';

// ── Constants ───────────────────────────────────────────────────

const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];

const RARITY_SFX = {
  Common: 'reveal-common',
  Uncommon: 'reveal-uncommon',
  Rare: 'reveal-rare',
  Epic: 'reveal-epic',
  Legendary: 'reveal-legendary',
  Mythic: 'reveal-mythic',
};

const PACK_DISPLAY = {
  // Standard
  BRONZE:    { gradient: 'from-amber-950 via-amber-900 to-yellow-900',   accentColor: '#CD7F32', icon: '🥉', tier: 'BRONZE' },
  SILVER:    { gradient: 'from-slate-800 via-slate-700 to-slate-600',    accentColor: '#9CA3AF', icon: '🥈', tier: 'SILVER' },
  GOLD:      { gradient: 'from-yellow-900 via-amber-700 to-yellow-600',  accentColor: '#FBBF24', icon: '🥇', tier: 'GOLD' },
  // Promo
  RECRUIT:   { gradient: 'from-slate-800 via-slate-700 to-slate-600',    accentColor: '#9CA3AF', icon: '📋', tier: 'STANDARD' },
  OPERATIVE: { gradient: 'from-blue-900 via-blue-800 to-indigo-700',     accentColor: '#60A5FA', icon: '🎯', tier: 'ALPHA' },
  // Premium
  MEGA:      { gradient: 'from-cyan-900 via-teal-800 to-emerald-700',    accentColor: '#34D399', icon: '💎', tier: 'MEGA' },
  BLACK_OPS: { gradient: 'from-purple-900 via-violet-800 to-fuchsia-700', accentColor: '#A78BFA', icon: '🕶️', tier: 'ELITE' },
  JUMBO_RARE:{ gradient: 'from-blue-900 via-cyan-800 to-sky-600',        accentColor: '#38BDF8', icon: '📦', tier: 'JUMBO' },
  RARE_MEGA: { gradient: 'from-indigo-900 via-purple-800 to-violet-600', accentColor: '#818CF8', icon: '🔮', tier: 'RARE MEGA' },
  // Limited
  GENESIS:   { gradient: 'from-amber-900 via-yellow-700 to-orange-600',  accentColor: '#FBBF24', icon: '👑', tier: 'GENESIS' },
  ULTIMATE:  { gradient: 'from-rose-900 via-pink-800 to-fuchsia-600',    accentColor: '#F472B6', icon: '⭐', tier: 'ULTIMATE' },
  ICON:      { gradient: 'from-red-950 via-rose-800 to-orange-600',      accentColor: '#FF6B6B', icon: '🏆', tier: 'ICON' },
  TOTW:      { gradient: 'from-emerald-900 via-green-800 to-lime-600',   accentColor: '#4ADE80', icon: '🌟', tier: 'TOTW' },
};

// Pack categories for the store tab layout
const PACK_CATEGORIES = {
  standard: { label: 'STANDARD', packs: ['BRONZE', 'SILVER', 'GOLD'], color: '#9CA3AF' },
  promo:    { label: 'PROMO',    packs: ['RECRUIT', 'OPERATIVE'],      color: '#60A5FA' },
  premium:  { label: 'PREMIUM',  packs: ['MEGA', 'BLACK_OPS', 'JUMBO_RARE', 'RARE_MEGA'], color: '#A78BFA' },
  limited:  { label: 'LIMITED',  packs: ['GENESIS', 'ULTIMATE', 'ICON', 'TOTW'],          color: '#FBBF24' },
};

// Featured packs shown by default
const FEATURED_PACKS = ['SILVER', 'GOLD', 'BLACK_OPS'];

// ── Manager dialog lines ────────────────────────────────────────

const MANAGER_LINES = [
  "Sir, a new shipment of agent dossiers has arrived.",
  "The recruitment office has fresh candidates for you.",
  "Intelligence reports are in. Shall we review them?",
  "A courier just delivered classified personnel files.",
  "We've intercepted new field operative profiles.",
  "HQ has cleared a batch of high-priority recruits.",
];

// ── Phase enum ──────────────────────────────────────────────────

const PHASE = {
  CUTSCENE: 'CUTSCENE',
  SELECTION: 'SELECTION',
  OPENING: 'OPENING',
  REVEAL: 'REVEAL',
  SUMMARY: 'SUMMARY',
};

// ── Particle generation ─────────────────────────────────────────

function generateParticles(count, colorBase) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 200 - 100,
    y: Math.random() * 200 - 100,
    size: Math.random() * 6 + 2,
    delay: Math.random() * 0.3,
    duration: Math.random() * 0.8 + 0.6,
    color: colorBase,
  }));
}

// ── Stat labels ─────────────────────────────────────────────────

const STAT_LABELS = [
  { key: 'intelligence', short: 'INT' },
  { key: 'speed', short: 'SPD' },
  { key: 'stealth', short: 'STL' },
  { key: 'loyalty', short: 'LOY' },
  { key: 'adaptability', short: 'ADP' },
  { key: 'influence', short: 'INF' },
];

// ── CSS Keyframes (injected once) ───────────────────────────────

const KEYFRAMES_ID = 'pack-overlay-keyframes';

function injectKeyframes() {
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes card-flip {
      0%   { transform: perspective(800px) rotateY(0deg); }
      100% { transform: perspective(800px) rotateY(180deg); }
    }
    @keyframes card-flip-reverse {
      0%   { transform: perspective(800px) rotateY(180deg); }
      100% { transform: perspective(800px) rotateY(0deg); }
    }
    @keyframes burst {
      0%   { transform: translate(0, 0) scale(1); opacity: 1; }
      100% { transform: translate(var(--bx), var(--by)) scale(0); opacity: 0; }
    }
    @keyframes glow-pulse {
      0%, 100% { box-shadow: 0 0 8px var(--glow-color); }
      50%      { box-shadow: 0 0 24px var(--glow-color), 0 0 48px var(--glow-color); }
    }
    @keyframes shake {
      0%, 100% { transform: translate(0, 0); }
      10%      { transform: translate(-4px, 2px); }
      20%      { transform: translate(4px, -2px); }
      30%      { transform: translate(-3px, -1px); }
      40%      { transform: translate(3px, 1px); }
      50%      { transform: translate(-2px, 3px); }
      60%      { transform: translate(2px, -3px); }
      70%      { transform: translate(-1px, 1px); }
      80%      { transform: translate(1px, -1px); }
      90%      { transform: translate(-1px, 0px); }
    }
    @keyframes shake-heavy {
      0%, 100% { transform: translate(0, 0) rotate(0deg); }
      10%      { transform: translate(-6px, 3px) rotate(-1deg); }
      20%      { transform: translate(6px, -3px) rotate(1deg); }
      30%      { transform: translate(-5px, -2px) rotate(-0.5deg); }
      40%      { transform: translate(5px, 2px) rotate(0.5deg); }
      50%      { transform: translate(-4px, 4px) rotate(-1deg); }
      60%      { transform: translate(4px, -4px) rotate(1deg); }
      70%      { transform: translate(-2px, 2px) rotate(0deg); }
      80%      { transform: translate(2px, -2px); }
      90%      { transform: translate(-1px, 0px); }
    }
    @keyframes fly-in {
      0%   { transform: translate(0, 0) scale(0.2) rotate(15deg); opacity: 0; }
      60%  { transform: translate(var(--fx), var(--fy)) scale(1.05) rotate(-2deg); opacity: 1; }
      100% { transform: translate(var(--fx), var(--fy)) scale(1) rotate(0deg); opacity: 1; }
    }
    @keyframes rarity-beam {
      0%   { height: 0; opacity: 0; }
      30%  { height: 200px; opacity: 1; }
      60%  { height: 300px; opacity: 0.8; }
      100% { height: 0; opacity: 0; }
    }
    @keyframes holographic {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes bounce-settle {
      0%   { transform: scale(1.15) translateY(-12px); }
      30%  { transform: scale(0.95) translateY(4px); }
      50%  { transform: scale(1.05) translateY(-4px); }
      70%  { transform: scale(0.98) translateY(2px); }
      100% { transform: scale(1) translateY(0); }
    }
    @keyframes pack-float {
      0%, 100% { transform: translateY(0) scale(1); }
      50%      { transform: translateY(-12px) scale(1.02); }
    }
    @keyframes pack-crack {
      0%   { transform: scale(1); filter: brightness(1); }
      30%  { transform: scale(1.08); filter: brightness(1.6); }
      50%  { transform: scale(1.2) rotate(2deg); filter: brightness(2.5); clip-path: polygon(0 0, 48% 0, 45% 100%, 0 100%); }
      70%  { transform: scale(1.3) rotate(-1deg); filter: brightness(3); opacity: 0.7; }
      100% { transform: scale(2); filter: brightness(5); opacity: 0; }
    }
    @keyframes light-ray {
      0%   { transform: scaleY(0) scaleX(0.3); opacity: 0; }
      40%  { transform: scaleY(1) scaleX(1); opacity: 0.8; }
      100% { transform: scaleY(1.5) scaleX(2); opacity: 0; }
    }
    @keyframes flash-screen {
      0%   { opacity: 0; }
      20%  { opacity: 0.9; }
      100% { opacity: 0; }
    }
    @keyframes card-back-shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes supernova {
      0%   { transform: scale(0); opacity: 1; }
      50%  { transform: scale(3); opacity: 0.6; }
      100% { transform: scale(6); opacity: 0; }
    }
    @keyframes rainbow-border {
      0%   { border-color: #ff0000; }
      16%  { border-color: #ff8800; }
      33%  { border-color: #ffff00; }
      50%  { border-color: #00ff00; }
      66%  { border-color: #0088ff; }
      83%  { border-color: #8800ff; }
      100% { border-color: #ff0000; }
    }
    @keyframes epic-particles {
      0%   { transform: translate(0,0) scale(1); opacity: 1; }
      50%  { opacity: 0.8; }
      100% { transform: translate(var(--bx), var(--by)) scale(0); opacity: 0; }
    }
    @keyframes walkout-glow {
      0%   { box-shadow: 0 0 0 0 transparent; }
      50%  { box-shadow: 0 0 60px 20px var(--glow-color), 0 0 120px 40px var(--glow-color); }
      100% { box-shadow: 0 0 30px 10px var(--glow-color); }
    }
    @keyframes fan-spread {
      0%   { transform: translateX(0) rotate(0deg) scale(0.8); opacity: 0; }
      100% { transform: translateX(var(--fan-x)) rotate(var(--fan-rot)) scale(1); opacity: 1; }
    }
    @keyframes coin-spin {
      0%   { transform: rotateY(0deg); }
      100% { transform: rotateY(360deg); }
    }
    @keyframes slide-up-in {
      0%   { transform: translateY(40px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    @keyframes pack-hover-glow {
      0%, 100% { box-shadow: 0 0 15px var(--pack-color), inset 0 0 15px rgba(255,255,255,0.05); }
      50%      { box-shadow: 0 0 35px var(--pack-color), 0 0 60px var(--pack-color), inset 0 0 20px rgba(255,255,255,0.08); }
    }

    /* ── Cutscene keyframes ── */
    @keyframes manager-walk-in {
      0%   { transform: translateX(-120px); opacity: 0; }
      60%  { transform: translateX(10px); opacity: 1; }
      100% { transform: translateX(0); opacity: 1; }
    }
    @keyframes dialog-fade-in {
      0%   { opacity: 0; transform: translateY(8px) scale(0.95); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes desk-fade-in {
      0%   { opacity: 0; }
      100% { opacity: 1; }
    }
    @keyframes cutscene-fade-out {
      0%   { opacity: 1; }
      100% { opacity: 0; }
    }

    /* ── Floating background particles ── */
    @keyframes float-up {
      0%   { transform: translateY(0) translateX(0); opacity: 0; }
      10%  { opacity: 0.6; }
      90%  { opacity: 0.4; }
      100% { transform: translateY(-100vh) translateX(var(--drift-x)); opacity: 0; }
    }

    /* ── Pulsing radial gradient for pack rarity ── */
    @keyframes rarity-bg-pulse {
      0%, 100% { opacity: 0.3; transform: scale(1); }
      50%      { opacity: 0.6; transform: scale(1.15); }
    }

    /* ── Spotlight follow effect ── */
    @keyframes spotlight-pulse {
      0%, 100% { opacity: 0.15; }
      50%      { opacity: 0.3; }
    }

    /* ── Envelope opening animation ── */
    @keyframes envelope-top {
      0%   { transform: scaleY(1); }
      50%  { transform: scaleY(1); }
      100% { transform: scaleY(0) rotateX(180deg); }
    }
    @keyframes envelope-split-left {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-110%) rotate(-8deg); opacity: 0; }
    }
    @keyframes envelope-split-right {
      0%   { transform: translateX(0); }
      100% { transform: translateX(110%) rotate(8deg); opacity: 0; }
    }

    /* ── Mythic full-screen flash ── */
    @keyframes mythic-flash {
      0%   { opacity: 0; }
      15%  { opacity: 1; }
      30%  { opacity: 0.6; }
      50%  { opacity: 0.9; }
      100% { opacity: 0; }
    }

    /* ── Duplicate badge bounce ── */
    @keyframes dupe-bounce {
      0%   { transform: scale(0) rotate(-12deg); }
      60%  { transform: scale(1.2) rotate(3deg); }
      100% { transform: scale(1) rotate(0deg); }
    }
  `;
  document.head.appendChild(style);
}

// ── Main Component ──────────────────────────────────────────────

const PackOverlay = () => {
  const setPackOpen = useEmpireStore(s => s.setPackOpen);
  const openAgentPack = useAgentCardStore(s => s.openAgentPack);
  const quickSellAgent = useAgentCardStore(s => s.quickSellAgent);
  const getAgentDef = useAgentCardStore(s => s.getAgentDef);
  const aegisPoints = useCardEconomyStore(s => s.aegisPoints);
  const spendAegisPoints = useCardEconomyStore(s => s.spendAegisPoints);
  const awardAegisPoints = useCardEconomyStore(s => s.awardAegisPoints);
  const buyAegisPointsBundle = useCardEconomyStore(s => s.buyAegisPointsBundle);

  const allAgents = useAgentCardStore(s => s.agents);

  const [phase, setPhase] = useState(PHASE.CUTSCENE);
  const [selectedPackId, setSelectedPackId] = useState(null);
  const [mintedCards, setMintedCards] = useState([]);
  const [revealedIndices, setRevealedIndices] = useState(new Set());
  const [cardsLanded, setCardsLanded] = useState(false);
  const [cracking, setCracking] = useState(false);
  const [burstActive, setBurstActive] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);
  const [shakeClass, setShakeClass] = useState('');
  const [activeRevealIndex, setActiveRevealIndex] = useState(null);
  const [revealParticles, setRevealParticles] = useState([]);
  const [hoveredPack, setHoveredPack] = useState(null);
  const [cutsceneFadingOut, setCutsceneFadingOut] = useState(false);
  const [managerLine] = useState(() => MANAGER_LINES[Math.floor(Math.random() * MANAGER_LINES.length)]);
  const [storeCategory, setStoreCategory] = useState('standard');
  const [payWithAP, setPayWithAP] = useState(false);
  const [showAPStore, setShowAPStore] = useState(false);
  const [envelopeIndex, setEnvelopeIndex] = useState(null);
  const [mythicFlash, setMythicFlash] = useState(false);
  const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50 });
  const containerRef = useRef(null);
  const cutsceneTimerRef = useRef(null);

  // Check if a cardId is already owned (for DUPLICATE badge)
  const ownedCardIds = useMemo(() => {
    const ids = new Set();
    Object.values(allAgents).forEach(a => ids.add(a.cardId));
    return ids;
  }, [allAgents]);

  // Background floating particles (generated once)
  const bgParticles = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 8 + 6,
      delay: Math.random() * 6,
      driftX: (Math.random() - 0.5) * 60,
      opacity: Math.random() * 0.4 + 0.1,
    }));
  }, []);

  const handleSkipCutscene = useCallback(() => {
    if (cutsceneFadingOut) return;
    clearTimeout(cutsceneTimerRef.current);
    setCutsceneFadingOut(true);
    setTimeout(() => {
      setPhase(PHASE.SELECTION);
      setCutsceneFadingOut(false);
    }, 400);
  }, [cutsceneFadingOut]);

  // Cutscene auto-advance timer
  useEffect(() => {
    if (phase === PHASE.CUTSCENE && !cutsceneFadingOut) {
      cutsceneTimerRef.current = setTimeout(() => {
        handleSkipCutscene();
      }, 2500);
      return () => clearTimeout(cutsceneTimerRef.current);
    }
  }, [phase, cutsceneFadingOut, handleSkipCutscene]);

  // Inject keyframes on mount
  useEffect(() => { injectKeyframes(); }, []);

  // Build card data from minted agents
  const cardData = useMemo(() => {
    return mintedCards.map(minted => {
      const def = getAgentById(minted.cardId);
      return { minted, def };
    });
  }, [mintedCards]);

  // Find the best pull for summary
  const bestPullIndex = useMemo(() => {
    if (cardData.length === 0) return -1;
    let bestIdx = 0;
    let bestRank = -1;
    cardData.forEach((cd, i) => {
      const rank = cd.def ? RARITY_ORDER.indexOf(cd.def.rarity) : -1;
      if (rank > bestRank) { bestRank = rank; bestIdx = i; }
    });
    return bestRank >= 2 ? bestIdx : -1; // Only highlight Rare+
  }, [cardData]);

  // ── Pack Purchase ───────────────────────────────────────────

  const handleBuyPack = useCallback((packId, useAP = false) => {
    const pack = AGENT_PACK_TYPES[packId];
    if (!pack) return;

    // Determine payment method
    if (useAP && pack.costAP > 0) {
      if (aegisPoints < pack.costAP) return;
      const spent = spendAegisPoints(pack.costAP);
      if (!spent) return;
    } else {
      if (pack.cost <= 0 || aegisPoints < pack.cost) return;
      const spent = spendAegisPoints(pack.cost);
      if (!spent) return;
    }

    // Open the pack via agent card store
    const result = openAgentPack(packId, 999999); // Pass enough to pass the internal check (currency already spent)
    if (!result || result.minted.length === 0) {
      // Refund
      if (useAP && pack.costAP > 0) {
        awardAegisPoints(pack.costAP);
      } else {
        awardAegisPoints(pack.cost, 'pack_refund');
      }
      return;
    }

    setSelectedPackId(packId);
    setMintedCards(result.minted);
    setRevealedIndices(new Set());
    setCardsLanded(false);
    setCracking(false);
    setBurstActive(false);
    setActiveRevealIndex(null);
    setPhase(PHASE.OPENING);
  }, [aegisPoints, aegisPoints, spendAegisPoints, openAgentPack, awardAegisPoints]);

  // ── Pack Crack Animation ────────────────────────────────────

  const handleCrackPack = useCallback(() => {
    if (cracking) return;
    setCracking(true);

    // Screen shake after a beat
    setTimeout(() => {
      setShakeClass('shake');
      setBurstActive(true);
      setScreenFlash(true);
    }, 400);

    // End shake, start card fly-in
    setTimeout(() => {
      setShakeClass('');
      setScreenFlash(false);
      setPhase(PHASE.REVEAL);
    }, 900);

    // Cards land
    setTimeout(() => {
      setCardsLanded(true);
    }, 1600);
  }, [cracking]);

  // ── Card Reveal ─────────────────────────────────────────────

  const handleRevealCard = useCallback((index) => {
    if (revealedIndices.has(index) || activeRevealIndex !== null) return;
    const cd = cardData[index];
    if (!cd?.def) return;

    const rarity = cd.def.rarity;
    const rarityConfig = AGENT_RARITY_CONFIG[rarity];
    const rarityIdx = RARITY_ORDER.indexOf(rarity);

    // Envelope opening animation phase
    setEnvelopeIndex(index);
    const envelopeDuration = 500;

    setTimeout(() => {
      setEnvelopeIndex(null);
      setActiveRevealIndex(index);

      // Update spotlight position to this card
      const cardEl = containerRef.current?.querySelector(`[data-card-index="${index}"]`);
      if (cardEl) {
        const rect = cardEl.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        setSpotlightPos({
          x: ((rect.left + rect.width / 2 - containerRect.left) / containerRect.width) * 100,
          y: ((rect.top + rect.height / 2 - containerRect.top) / containerRect.height) * 100,
        });
      }

      // Generate particles for Epic+
      if (rarityIdx >= 3) {
        const pCount = rarityIdx >= 5 ? 40 : rarityIdx >= 4 ? 25 : 15;
        setRevealParticles(generateParticles(pCount, rarityConfig.color));
      } else {
        setRevealParticles([]);
      }

      // Screen effects for high rarity
      if (rarityIdx >= 4) {
        setTimeout(() => {
          setScreenFlash(true);
          setShakeClass(rarityIdx >= 5 ? 'shake-heavy' : 'shake');
        }, 300);
        setTimeout(() => {
          setScreenFlash(false);
          setShakeClass('');
        }, rarityIdx >= 5 ? 1200 : 700);
      }

      // Mythic full-screen flash + slow-motion
      if (rarityIdx >= 5) {
        setTimeout(() => setMythicFlash(true), 200);
        setTimeout(() => setMythicFlash(false), 1800);
      }

      // Complete reveal after animation (Mythic = 2s slow-motion)
      const revealDelay = rarityIdx >= 5 ? 2000 : rarityIdx >= 4 ? 1000 : rarityIdx >= 3 ? 700 : 500;
      setTimeout(() => {
        setRevealedIndices(prev => new Set([...prev, index]));
        setActiveRevealIndex(null);
        setRevealParticles([]);

        // Auto-advance to summary when all revealed
        const newRevealed = new Set([...revealedIndices, index]);
        if (newRevealed.size === cardData.length) {
          setTimeout(() => setPhase(PHASE.SUMMARY), 800);
        }
      }, revealDelay);
    }, envelopeDuration);
  }, [revealedIndices, activeRevealIndex, cardData]);

  // ── Reveal All remaining ────────────────────────────────────

  const handleRevealAll = useCallback(() => {
    const unrevealed = [];
    cardData.forEach((_, i) => {
      if (!revealedIndices.has(i)) unrevealed.push(i);
    });
    if (unrevealed.length === 0) return;

    // Reveal them sequentially with short delays
    unrevealed.forEach((idx, seq) => {
      setTimeout(() => {
        setRevealedIndices(prev => {
          const next = new Set([...prev, idx]);
          if (next.size === cardData.length) {
            setTimeout(() => setPhase(PHASE.SUMMARY), 600);
          }
          return next;
        });
      }, seq * 200);
    });
  }, [cardData, revealedIndices]);

  // ── Quick Sell from Summary ─────────────────────────────────

  const handleQuickSell = useCallback((mintId) => {
    const value = quickSellAgent(mintId);
    if (value > 0) {
      awardAegisPoints(value, 'quick_sell');
      setMintedCards(prev => prev.filter(m => m.mintId !== mintId));
    }
  }, [quickSellAgent, awardAegisPoints]);

  // ── Open Another ────────────────────────────────────────────

  const handleOpenAnother = useCallback(() => {
    setPhase(PHASE.SELECTION);
    setSelectedPackId(null);
    setMintedCards([]);
    setRevealedIndices(new Set());
    setCardsLanded(false);
    setCracking(false);
    setBurstActive(false);
    setActiveRevealIndex(null);
    setEnvelopeIndex(null);
    setMythicFlash(false);
  }, []);

  // ── Close ───────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    setPackOpen(false);
  }, [setPackOpen]);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(10,10,15,0.95) 0%, rgba(0,0,0,0.98) 100%)',
        backdropFilter: 'blur(12px)',
        animation: shakeClass ? `${shakeClass} 0.5s ease-in-out` : 'none',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && (phase === PHASE.SELECTION || phase === PHASE.CUTSCENE)) handleClose();
      }}
    >
      {/* Floating background particles */}
      {(phase === PHASE.SELECTION || phase === PHASE.OPENING || phase === PHASE.REVEAL) && (
        <div className="absolute inset-0 pointer-events-none z-[1] overflow-hidden">
          {bgParticles.map(p => (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: `${p.left}%`,
                bottom: '-4px',
                width: `${p.size}px`,
                height: `${p.size}px`,
                background: 'rgba(255,255,255,0.6)',
                '--drift-x': `${p.driftX}px`,
                animation: `float-up ${p.duration}s linear ${p.delay}s infinite`,
                opacity: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* Rarity-based pulsing radial gradient (during OPENING/REVEAL) */}
      {(phase === PHASE.OPENING || phase === PHASE.REVEAL) && selectedPackId && (
        <div
          className="absolute inset-0 pointer-events-none z-[2]"
          style={{
            background: `radial-gradient(ellipse at center, ${PACK_DISPLAY[selectedPackId]?.accentColor}22 0%, transparent 60%)`,
            animation: 'rarity-bg-pulse 3s ease-in-out infinite',
          }}
        />
      )}

      {/* Spotlight effect following active card during reveal */}
      {phase === PHASE.REVEAL && activeRevealIndex !== null && (
        <div
          className="absolute inset-0 pointer-events-none z-[3]"
          style={{
            background: `radial-gradient(circle at ${spotlightPos.x}% ${spotlightPos.y}%, rgba(255,255,255,0.08) 0%, transparent 40%)`,
            animation: 'spotlight-pulse 1.5s ease-in-out infinite',
          }}
        />
      )}

      {/* Screen flash overlay */}
      {screenFlash && (
        <div
          className="absolute inset-0 z-[100] pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)',
            animation: 'flash-screen 0.6s ease-out forwards',
          }}
        />
      )}

      {/* Mythic full-screen flash overlay */}
      {mythicFlash && (
        <div
          className="absolute inset-0 z-[101] pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,215,0,0.8) 0%, rgba(255,100,0,0.4) 40%, transparent 70%)',
            animation: 'mythic-flash 1.6s ease-out forwards',
          }}
        />
      )}

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-[60] w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200 text-sm font-mono"
      >
        X
      </button>

      {/* Balance display */}
      <div
        className="absolute top-4 left-4 z-[60] flex items-center gap-2 px-4 py-2 rounded-lg bg-black/60 border border-emerald-500/20"
        style={{ animation: 'slide-up-in 0.4s ease-out' }}
      >
        <span className="text-emerald-400 font-bold text-sm">€</span>
        <span className="text-emerald-200 font-mono text-sm font-bold">
          {aegisPoints.toLocaleString()}
        </span>
      </div>

      {/* ── PHASE 0: Manager Office Visit Cutscene ────────────── */}
      {phase === PHASE.CUTSCENE && (
        <div
          className="absolute inset-0 z-[55] flex items-center justify-center"
          style={{
            background: 'radial-gradient(ellipse at 60% 70%, rgba(20,16,10,0.98) 0%, rgba(5,3,0,1) 100%)',
            animation: cutsceneFadingOut ? 'cutscene-fade-out 0.4s ease-in forwards' : 'desk-fade-in 0.6s ease-out',
          }}
          onClick={handleSkipCutscene}
        >
          {/* Desk silhouette */}
          <div className="absolute bottom-[28%] left-1/2 -translate-x-1/2" style={{ animation: 'desk-fade-in 0.8s ease-out' }}>
            <div
              style={{
                width: '340px',
                height: '6px',
                background: 'linear-gradient(90deg, transparent, rgba(120,100,60,0.4), rgba(160,130,70,0.5), rgba(120,100,60,0.4), transparent)',
                borderRadius: '3px',
              }}
            />
            {/* Desk legs */}
            <div className="flex justify-between px-8" style={{ marginTop: '2px' }}>
              <div style={{ width: '3px', height: '40px', background: 'rgba(100,80,50,0.3)' }} />
              <div style={{ width: '3px', height: '40px', background: 'rgba(100,80,50,0.3)' }} />
            </div>
          </div>

          {/* Desk lamp glow */}
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: '32%',
              left: 'calc(50% + 80px)',
              width: '120px',
              height: '120px',
              background: 'radial-gradient(circle, rgba(255,200,100,0.12) 0%, transparent 70%)',
              animation: 'desk-fade-in 1s ease-out 0.3s both',
            }}
          />

          {/* Manager figure silhouette */}
          <div
            className="absolute flex flex-col items-center"
            style={{
              bottom: '32%',
              left: 'calc(50% - 40px)',
              animation: 'manager-walk-in 0.9s ease-out both',
            }}
          >
            {/* Head */}
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: 'rgba(180,160,120,0.6)',
                boxShadow: '0 0 20px rgba(180,160,120,0.2)',
              }}
            />
            {/* Body */}
            <div
              style={{
                width: '28px',
                height: '44px',
                marginTop: '4px',
                borderRadius: '6px 6px 0 0',
                background: 'linear-gradient(180deg, rgba(60,55,45,0.8), rgba(40,35,28,0.9))',
              }}
            />
            {/* Briefcase */}
            <div
              style={{
                position: 'absolute',
                bottom: '6px',
                right: '-14px',
                width: '16px',
                height: '12px',
                borderRadius: '2px',
                background: 'rgba(100,75,40,0.6)',
                border: '1px solid rgba(140,110,60,0.3)',
              }}
            />
          </div>

          {/* Dialog bubble */}
          <div
            className="absolute flex items-center"
            style={{
              bottom: '58%',
              left: '50%',
              transform: 'translateX(-50%)',
              animation: 'dialog-fade-in 0.5s ease-out 0.8s both',
            }}
          >
            <div
              className="relative px-5 py-3 rounded-xl max-w-sm"
              style={{
                background: 'rgba(30,28,22,0.95)',
                border: '1px solid rgba(180,160,120,0.25)',
                boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
              }}
            >
              <p className="text-amber-200/80 text-sm font-light italic leading-relaxed text-center">
                "{managerLine}"
              </p>
              {/* Speech bubble tail */}
              <div
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0"
                style={{
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '8px solid rgba(30,28,22,0.95)',
                }}
              />
            </div>
          </div>

          {/* SKIP button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSkipCutscene();
            }}
            className="absolute bottom-6 right-6 px-4 py-1.5 rounded text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 hover:text-white/60 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all duration-200"
          >
            SKIP
          </button>
        </div>
      )}

      {/* ── PHASE 1: Pack Store ──────────────────────────────── */}
      {phase === PHASE.SELECTION && (
        <div className="flex flex-col items-center gap-4 px-4 w-full max-w-5xl overflow-y-auto max-h-[90vh]" style={{ animation: 'slide-up-in 0.5s ease-out' }}>
          {/* Header with currency display */}
          <div className="w-full flex justify-between items-center">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-wide uppercase">
                {showAPStore ? 'AEGIS Points' : 'Agent Store'}
              </h2>
              <p className="text-white/40 text-[9px] mt-0.5 tracking-widest uppercase">
                {showAPStore ? 'Premium currency bundles' : 'Recruit powerful AI agents for your empire'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Euro balance */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-emerald-400 text-xs font-bold">€</span>
                <span className="font-mono font-bold text-sm text-emerald-200">{aegisPoints.toLocaleString()}</span>
              </div>
              {/* AP balance */}
              <button
                onClick={() => setShowAPStore(!showAPStore)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 transition-colors"
              >
                <span className="text-pink-400 text-xs font-bold">AP</span>
                <span className="font-mono font-bold text-sm text-pink-200">{aegisPoints.toLocaleString()}</span>
                <span className="text-pink-400/50 text-[8px] ml-1">{showAPStore ? '< BACK' : '+ BUY'}</span>
              </button>
            </div>
          </div>

          {/* AP Store */}
          {showAPStore ? (
            <div className="w-full grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
              {AP_BUNDLES.map((bundle) => (
                <button
                  key={bundle.id}
                  onClick={() => buyAegisPointsBundle(bundle.id)}
                  className="relative bg-gradient-to-br from-pink-950/80 via-rose-900/60 to-purple-950/80 border border-pink-500/20 hover:border-pink-400/50 rounded-xl p-4 text-center transition-all duration-200 hover:scale-[1.03] hover:-translate-y-1"
                >
                  {bundle.bonus > 0 && (
                    <div className="absolute -top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[8px] font-bold tracking-wider">
                      +{bundle.bonus} BONUS
                    </div>
                  )}
                  <div className="text-2xl mb-1">
                    <span className="text-pink-400 font-bold">AP</span>
                  </div>
                  <div className="text-white font-black text-lg">{bundle.label}</div>
                  <div className="text-pink-300/60 text-[10px] font-mono mt-1">{bundle.price}</div>
                  <div className="mt-2 py-1 rounded bg-pink-500/15 border border-pink-500/25 text-pink-300 text-[10px] font-bold tracking-wider">
                    PURCHASE
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* Category tabs */}
              <div className="flex gap-2 w-full">
                {Object.entries(PACK_CATEGORIES).map(([key, cat]) => (
                  <button
                    key={key}
                    onClick={() => setStoreCategory(key)}
                    className={`px-4 py-1.5 rounded-full text-[9px] font-bold tracking-[0.15em] uppercase font-mono transition-all duration-200 border ${
                      storeCategory === key
                        ? 'bg-white/10 border-white/20 text-white'
                        : 'bg-transparent border-white/5 text-white/30 hover:text-white/60 hover:border-white/15'
                    }`}
                    style={storeCategory === key ? { color: cat.color, borderColor: cat.color + '44' } : {}}
                  >
                    {cat.label}
                  </button>
                ))}
                {/* Pay with toggle */}
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[8px] text-white/30 font-mono uppercase">Pay with:</span>
                  <button
                    onClick={() => setPayWithAP(false)}
                    className={`px-2 py-1 rounded text-[9px] font-bold transition-colors ${!payWithAP ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-white/25 hover:text-white/50'}`}
                  >
                    EUR €
                  </button>
                  <button
                    onClick={() => setPayWithAP(true)}
                    className={`px-2 py-1 rounded text-[9px] font-bold transition-colors ${payWithAP ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'text-white/25 hover:text-white/50'}`}
                  >
                    AP
                  </button>
                </div>
              </div>

              {/* Pack grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full mt-1">
                {(PACK_CATEGORIES[storeCategory]?.packs || []).map((packId) => {
                  const pack = AGENT_PACK_TYPES[packId];
                  const display = PACK_DISPLAY[packId];
                  if (!pack || !display) return null;

                  const useAP = payWithAP && pack.costAP > 0;
                  const price = useAP ? pack.costAP : pack.cost;
                  const currency = useAP ? 'AP' : '€';
                  const canAfford = useAP ? aegisPoints >= pack.costAP : (pack.cost > 0 && aegisPoints >= pack.cost);
                  const apOnly = pack.cost <= 0 && pack.costAP > 0;
                  const isHovered = hoveredPack === packId;

                  // If AP-only pack and not paying with AP, show but force AP
                  const effectiveUseAP = apOnly ? true : useAP;
                  const effectivePrice = apOnly ? pack.costAP : price;
                  const effectiveCurrency = apOnly ? 'AP' : currency;
                  const effectiveCanAfford = apOnly ? aegisPoints >= pack.costAP : canAfford;

                  return (
                    <button
                      key={packId}
                      onClick={() => effectiveCanAfford && handleBuyPack(packId, effectiveUseAP)}
                      onMouseEnter={() => setHoveredPack(packId)}
                      onMouseLeave={() => setHoveredPack(null)}
                      disabled={!effectiveCanAfford}
                      className={`
                        relative group flex flex-col items-center justify-between
                        w-full h-[280px] rounded-xl p-4 cursor-pointer
                        transition-all duration-300 ease-out
                        ${effectiveCanAfford ? 'hover:scale-[1.04] hover:-translate-y-1' : 'opacity-40 cursor-not-allowed'}
                        bg-gradient-to-br ${display.gradient}
                        border
                      `}
                      style={{
                        borderColor: isHovered ? display.accentColor : display.accentColor + '25',
                      }}
                    >
                      {/* Tier label */}
                      <div
                        className="absolute -top-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[8px] font-bold tracking-[0.15em] uppercase"
                        style={{
                          background: display.accentColor + '20',
                          color: display.accentColor,
                          border: `1px solid ${display.accentColor}33`,
                        }}
                      >
                        {display.tier}
                      </div>

                      {/* AP Only badge */}
                      {apOnly && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[7px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                          AP ONLY
                        </div>
                      )}

                      {/* Pack icon */}
                      <div className="flex-1 flex items-center justify-center">
                        <div
                          className="text-4xl transition-transform duration-300"
                          style={{
                            filter: `drop-shadow(0 0 16px ${display.accentColor}55)`,
                            transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                          }}
                        >
                          {display.icon}
                        </div>
                      </div>

                      {/* Pack info */}
                      <div className="text-center space-y-1.5 w-full">
                        <div className="text-white font-bold text-sm tracking-wide">{pack.name}</div>
                        <div className="text-white/45 text-[9px] leading-tight">{pack.description}</div>

                        {/* Card count */}
                        <div className="flex justify-center gap-1 mt-1.5">
                          {Array.from({ length: Math.min(pack.cardCount, 12) }, (_, i) => (
                            <div
                              key={i}
                              className="w-2 h-3 rounded-sm"
                              style={{
                                background: display.accentColor + '35',
                                border: `1px solid ${display.accentColor}55`,
                              }}
                            />
                          ))}
                        </div>

                        {/* Dual price row */}
                        <div className="flex items-center justify-center gap-2 mt-1.5">
                          {/* Active price */}
                          <div
                            className="flex items-center gap-1 px-2 py-1 rounded-md"
                            style={{
                              background: effectiveCanAfford ? (effectiveCurrency === 'AP' ? 'rgba(236,72,153,0.15)' : 'rgba(16,185,129,0.15)') : 'rgba(239,68,68,0.1)',
                              border: `1px solid ${effectiveCanAfford ? (effectiveCurrency === 'AP' ? 'rgba(236,72,153,0.3)' : 'rgba(16,185,129,0.3)') : 'rgba(239,68,68,0.2)'}`,
                            }}
                          >
                            <span className={`text-[10px] font-bold ${effectiveCurrency === 'AP' ? 'text-pink-400' : 'text-emerald-400'}`}>
                              {effectiveCurrency}
                            </span>
                            <span
                              className="font-mono font-bold text-xs"
                              style={{ color: effectiveCanAfford ? (effectiveCurrency === 'AP' ? '#F9A8D4' : '#6EE7B7') : '#FCA5A5' }}
                            >
                              {effectivePrice.toLocaleString()}
                            </span>
                          </div>
                          {/* Alt price (smaller) */}
                          {!apOnly && pack.costAP > 0 && (
                            <span className="text-[8px] text-white/20 font-mono">
                              {effectiveUseAP ? `€${pack.cost.toLocaleString()}` : `AP ${pack.costAP.toLocaleString()}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PHASE 2: Pack Opening Animation ──────────────────── */}
      {phase === PHASE.OPENING && (
        <div className="flex items-center justify-center w-full h-full">
          {/* Pack visual */}
          {!cracking && (
            <div
              onClick={handleCrackPack}
              data-sfx="pack-crack"
              className="relative cursor-pointer select-none"
              style={{ animation: 'pack-float 2s ease-in-out infinite' }}
            >
              {/* Outer glow ring */}
              <div
                className="absolute -inset-8 rounded-3xl pointer-events-none"
                style={{
                  background: `radial-gradient(circle, ${PACK_DISPLAY[selectedPackId]?.accentColor}33 0%, transparent 70%)`,
                  animation: 'glow-pulse 2s ease-in-out infinite',
                  '--glow-color': PACK_DISPLAY[selectedPackId]?.accentColor + '44',
                }}
              />

              {/* The pack */}
              <div
                className={`
                  relative w-[220px] h-[310px] rounded-2xl flex flex-col items-center justify-center
                  bg-gradient-to-br ${PACK_DISPLAY[selectedPackId]?.gradient}
                  border-2 overflow-hidden
                `}
                style={{
                  borderColor: PACK_DISPLAY[selectedPackId]?.accentColor + '66',
                  boxShadow: `0 0 40px ${PACK_DISPLAY[selectedPackId]?.accentColor}44, 0 0 80px ${PACK_DISPLAY[selectedPackId]?.accentColor}22`,
                }}
              >
                {/* Holographic shimmer overlay */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-30"
                  style={{
                    background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.1) 70%, transparent 80%)',
                    backgroundSize: '200% 100%',
                    animation: 'card-back-shimmer 3s linear infinite',
                  }}
                />

                <div className="text-6xl mb-4" style={{ filter: `drop-shadow(0 0 30px ${PACK_DISPLAY[selectedPackId]?.accentColor})` }}>
                  {PACK_DISPLAY[selectedPackId]?.icon}
                </div>
                <div className="text-white font-bold text-lg tracking-wide">
                  {AGENT_PACK_TYPES[selectedPackId]?.name}
                </div>
                <div className="text-white/40 text-xs mt-1 tracking-widest uppercase">
                  {AGENT_PACK_TYPES[selectedPackId]?.cardCount} Agents
                </div>

                {/* Tap prompt */}
                <div className="absolute bottom-6 text-white/30 text-[10px] tracking-[0.3em] uppercase animate-pulse">
                  Tap to Open
                </div>
              </div>
            </div>
          )}

          {/* Cracking animation */}
          {cracking && !burstActive && (
            <div
              className={`
                w-[220px] h-[310px] rounded-2xl flex items-center justify-center
                bg-gradient-to-br ${PACK_DISPLAY[selectedPackId]?.gradient}
                border-2
              `}
              style={{
                borderColor: PACK_DISPLAY[selectedPackId]?.accentColor,
                animation: 'pack-crack 0.8s ease-in forwards',
              }}
            >
              <div className="text-6xl">{PACK_DISPLAY[selectedPackId]?.icon}</div>
            </div>
          )}

          {/* Burst particles */}
          {burstActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[70]">
              {/* Light rays */}
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  key={`ray-${i}`}
                  className="absolute"
                  style={{
                    width: '4px',
                    height: '200px',
                    background: `linear-gradient(to top, ${PACK_DISPLAY[selectedPackId]?.accentColor}, transparent)`,
                    transformOrigin: 'bottom center',
                    transform: `rotate(${i * 45}deg)`,
                    animation: 'light-ray 0.8s ease-out forwards',
                    animationDelay: `${i * 0.05}s`,
                    opacity: 0,
                  }}
                />
              ))}

              {/* Burst particles */}
              {Array.from({ length: 24 }, (_, i) => {
                const angle = (i / 24) * Math.PI * 2;
                const dist = 80 + Math.random() * 120;
                return (
                  <div
                    key={`burst-${i}`}
                    className="absolute rounded-full"
                    style={{
                      width: `${3 + Math.random() * 5}px`,
                      height: `${3 + Math.random() * 5}px`,
                      background: PACK_DISPLAY[selectedPackId]?.accentColor,
                      '--bx': `${Math.cos(angle) * dist}px`,
                      '--by': `${Math.sin(angle) * dist}px`,
                      animation: `burst ${0.5 + Math.random() * 0.5}s ease-out forwards`,
                      animationDelay: `${Math.random() * 0.2}s`,
                      boxShadow: `0 0 6px ${PACK_DISPLAY[selectedPackId]?.accentColor}`,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PHASE 3: Card Reveal ─────────────────────────────── */}
      {phase === PHASE.REVEAL && (
        <div className="flex flex-col items-center gap-6 w-full px-4">
          {/* Reveal All button */}
          {revealedIndices.size < cardData.length && (
            <button
              onClick={handleRevealAll}
              className="text-white/30 text-[10px] tracking-[0.2em] uppercase hover:text-white/60 transition-colors"
            >
              Reveal All
            </button>
          )}

          {/* Cards row */}
          <div className="flex flex-wrap justify-center gap-3 md:gap-4 max-w-5xl">
            {cardData.map((cd, i) => {
              const isRevealed = revealedIndices.has(i);
              const isFlipping = activeRevealIndex === i;
              const def = cd.def;
              const rarityConfig = def ? AGENT_RARITY_CONFIG[def.rarity] : null;
              const classConfig = def ? AGENT_CLASS_CONFIG[def.class] : null;
              const rarityIdx = def ? RARITY_ORDER.indexOf(def.rarity) : 0;

              // Fly-in position offsets
              const totalCards = cardData.length;
              const offsetX = (i - (totalCards - 1) / 2) * 1; // subtle horizontal

              return (
                <div
                  key={cd.minted.mintId}
                  className="relative"
                  style={{
                    '--fx': `${offsetX}px`,
                    '--fy': '0px',
                    animation: cardsLanded ? 'none' : `fly-in 0.7s ease-out ${i * 0.1}s both`,
                  }}
                >
                  {/* Rarity beam (on flip for Rare+) */}
                  {isFlipping && rarityIdx >= 2 && (
                    <div
                      className="absolute left-1/2 bottom-0 -translate-x-1/2 w-1 pointer-events-none z-[80]"
                      style={{
                        background: `linear-gradient(to top, ${rarityConfig?.color}88, transparent)`,
                        animation: `rarity-beam ${rarityIdx >= 4 ? 1.2 : 0.8}s ease-out forwards`,
                        filter: `blur(${rarityIdx >= 4 ? 4 : 2}px)`,
                        width: `${rarityIdx >= 4 ? 8 : 4}px`,
                      }}
                    />
                  )}

                  {/* Reveal particles (Epic+) */}
                  {isFlipping && revealParticles.length > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[80]">
                      {revealParticles.map(p => (
                        <div
                          key={p.id}
                          className="absolute rounded-full"
                          style={{
                            width: `${p.size}px`,
                            height: `${p.size}px`,
                            background: p.color,
                            '--bx': `${p.x}px`,
                            '--by': `${p.y}px`,
                            animation: `epic-particles ${p.duration}s ease-out ${p.delay}s forwards`,
                            boxShadow: `0 0 4px ${p.color}`,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Envelope opening animation */}
                  {envelopeIndex === i && (
                    <div className="absolute inset-0 z-[90] flex items-center justify-center pointer-events-none">
                      <div className="relative w-[140px] h-[200px] md:w-[160px] md:h-[230px]">
                        {/* Left half */}
                        <div
                          className="absolute inset-0 rounded-l-xl overflow-hidden"
                          style={{
                            width: '50%',
                            background: 'linear-gradient(135deg, #1a1d2e, #0f1119)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            transformOrigin: 'left center',
                            animation: 'envelope-split-left 0.5s ease-in forwards',
                          }}
                        />
                        {/* Right half */}
                        <div
                          className="absolute top-0 right-0 bottom-0 rounded-r-xl overflow-hidden"
                          style={{
                            width: '50%',
                            background: 'linear-gradient(225deg, #1a1d2e, #0f1119)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            transformOrigin: 'right center',
                            animation: 'envelope-split-right 0.5s ease-in forwards',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Mythic supernova */}
                  {isFlipping && rarityIdx >= 5 && (
                    <div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none z-[75]"
                    >
                      <div
                        className="w-8 h-8 rounded-full"
                        style={{
                          background: `radial-gradient(circle, ${rarityConfig?.color}, ${AGENT_RARITY_CONFIG.Legendary.color}, transparent)`,
                          animation: 'supernova 1.2s ease-out forwards',
                        }}
                      />
                    </div>
                  )}

                  {/* DUPLICATE badge */}
                  {isRevealed && def && ownedCardIds.has(def.id) && (
                    (() => {
                      // Check if more than one copy exists (the one just minted + prior)
                      const countOwned = Object.values(allAgents).filter(a => a.cardId === def.id).length;
                      return countOwned > 1 ? (
                        <div
                          className="absolute -top-3 -right-2 z-[95] px-2 py-0.5 rounded text-[8px] font-black tracking-wider uppercase"
                          style={{
                            background: 'rgba(239,68,68,0.85)',
                            color: '#fff',
                            border: '1px solid rgba(255,100,100,0.5)',
                            boxShadow: '0 2px 10px rgba(239,68,68,0.4)',
                            animation: 'dupe-bounce 0.4s ease-out',
                          }}
                        >
                          DUPLICATE
                        </div>
                      ) : null;
                    })()
                  )}

                  {/* Card container (3D flip) */}
                  <div
                    data-card-index={i}
                    onClick={() => !isRevealed && !envelopeIndex && handleRevealCard(i)}
                    data-sfx={isRevealed || isFlipping ? RARITY_SFX[def?.rarity] || 'reveal-common' : 'card-tap'}
                    className={`
                      relative w-[140px] h-[200px] md:w-[160px] md:h-[230px]
                      cursor-pointer select-none
                      transition-transform duration-200
                      ${!isRevealed && !isFlipping ? 'hover:scale-105 hover:-translate-y-1' : ''}
                    `}
                    style={{
                      perspective: '800px',
                    }}
                  >
                    {/* Inner flipper */}
                    <div
                      className="relative w-full h-full transition-transform duration-500"
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: isRevealed || isFlipping
                          ? 'rotateY(180deg)'
                          : 'rotateY(0deg)',
                        transition: isFlipping
                          ? `transform ${rarityIdx >= 5 ? '2s' : '0.6s'} ease-in-out`
                          : 'transform 0.5s ease-out',
                      }}
                    >
                      {/* ── Card Back ── */}
                      <div
                        className="absolute inset-0 rounded-xl overflow-hidden border-2"
                        style={{
                          backfaceVisibility: 'hidden',
                          borderColor: 'rgba(255,255,255,0.08)',
                          background: 'linear-gradient(135deg, #0f1119, #1a1d2e, #0f1119)',
                        }}
                      >
                        {/* Holographic shimmer */}
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: 'linear-gradient(105deg, transparent 25%, rgba(120,119,198,0.15) 37%, rgba(255,255,255,0.2) 50%, rgba(120,119,198,0.15) 63%, transparent 75%)',
                            backgroundSize: '200% 100%',
                            animation: 'card-back-shimmer 2.5s linear infinite',
                          }}
                        />

                        {/* Q Logo */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="text-3xl md:text-4xl font-black text-white/10 tracking-[0.15em]">Q</div>
                          <div className="text-[7px] text-white/10 mt-1 tracking-[0.3em] uppercase">Agent Card</div>
                        </div>

                        {/* Corner decorations */}
                        <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-white/10 rounded-tl-sm" />
                        <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-white/10 rounded-tr-sm" />
                        <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-white/10 rounded-bl-sm" />
                        <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-white/10 rounded-br-sm" />
                      </div>

                      {/* ── Card Front ── */}
                      <div
                        className="absolute inset-0 rounded-xl overflow-hidden"
                        style={{
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)',
                          border: `2px solid ${rarityConfig?.color || '#444'}44`,
                          boxShadow: isRevealed
                            ? rarityConfig?.glow || 'none'
                            : 'none',
                          animation: isRevealed ? `bounce-settle 0.5s ease-out, ${rarityIdx >= 5 ? 'rainbow-border 2s linear infinite,' : ''} walkout-glow 1s ease-out` : 'none',
                          '--glow-color': rarityConfig?.color + '66',
                        }}
                      >
                        {/* Portrait gradient background */}
                        <div
                          className="absolute inset-0"
                          style={{
                            background: def
                              ? `linear-gradient(135deg, ${def.portraitGradient[0]}, ${def.portraitGradient[1]}, ${def.portraitGradient[2]})`
                              : '#1a1a2e',
                          }}
                        />

                        {/* Rarity overlay sheen */}
                        {rarityIdx >= 3 && (
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              background: `linear-gradient(135deg, transparent 20%, ${rarityConfig?.color}15 40%, ${rarityConfig?.color}25 50%, ${rarityConfig?.color}15 60%, transparent 80%)`,
                              backgroundSize: '200% 200%',
                              animation: 'holographic 4s ease-in-out infinite',
                            }}
                          />
                        )}

                        {/* Content */}
                        <div className="relative z-10 flex flex-col h-full p-2.5">
                          {/* Top: rarity + edition */}
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className="text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded"
                              style={{
                                color: rarityConfig?.color,
                                background: rarityConfig?.color + '15',
                                border: `1px solid ${rarityConfig?.color}33`,
                              }}
                            >
                              {def?.rarity}
                            </span>
                            <span className="text-[7px] text-white/30 tracking-wider">
                              #{cd.minted.editionNumber.toString().padStart(4, '0')}
                            </span>
                          </div>

                          {/* Icon glyph */}
                          <div className="flex-1 flex items-center justify-center">
                            <div
                              className="text-4xl md:text-5xl"
                              style={{
                                filter: `drop-shadow(0 0 12px ${rarityConfig?.color}88)`,
                              }}
                            >
                              {def?.iconGlyph}
                            </div>
                          </div>

                          {/* Agent info */}
                          <div className="space-y-1">
                            {/* Name */}
                            <div className="text-center">
                              <div className="text-[11px] md:text-xs font-bold text-white tracking-wide leading-tight truncate">
                                {def?.name}
                              </div>
                              <div className="text-[8px] text-white/40 italic truncate">{def?.codename}</div>
                            </div>

                            {/* Class badge */}
                            <div className="flex justify-center">
                              <span
                                className="text-[7px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full flex items-center gap-1"
                                style={{
                                  color: classConfig?.color,
                                  background: classConfig?.color + '15',
                                  border: `1px solid ${classConfig?.color}33`,
                                }}
                              >
                                <span className="text-[9px]">{classConfig?.icon}</span>
                                {def?.class}
                              </span>
                            </div>

                            {/* Mini stat bars */}
                            <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 mt-1">
                              {STAT_LABELS.map(({ key, short }) => (
                                <div key={key} className="flex items-center gap-1">
                                  <span className="text-[6px] text-white/30 w-4">{short}</span>
                                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${def?.stats?.[key] || 0}%`,
                                        background: `linear-gradient(90deg, ${rarityConfig?.color}66, ${rarityConfig?.color})`,
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Edition */}
                            <div className="text-center mt-0.5">
                              <span className="text-[6px] text-white/20 tracking-[0.2em] uppercase">
                                {def?.edition} Edition
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 mt-2">
            {cardData.map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{
                  background: revealedIndices.has(i)
                    ? (cardData[i]?.def ? AGENT_RARITY_CONFIG[cardData[i].def.rarity]?.color : '#fff')
                    : 'rgba(255,255,255,0.1)',
                  boxShadow: revealedIndices.has(i)
                    ? `0 0 6px ${cardData[i]?.def ? AGENT_RARITY_CONFIG[cardData[i].def.rarity]?.color : '#fff'}66`
                    : 'none',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── PHASE 4: Summary ─────────────────────────────────── */}
      {phase === PHASE.SUMMARY && (
        <div
          className="flex flex-col items-center gap-6 w-full max-w-5xl px-4 py-8"
          style={{ animation: 'slide-up-in 0.5s ease-out' }}
        >
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-black text-white tracking-wide uppercase">
              Pack Results
            </h2>
            <p className="text-white/30 text-[10px] mt-1 tracking-widest uppercase">
              {AGENT_PACK_TYPES[selectedPackId]?.name}
            </p>
          </div>

          {/* Fan layout */}
          <div className="relative flex justify-center items-end gap-2 md:gap-3 min-h-[260px] md:min-h-[300px]">
            {cardData.map((cd, i) => {
              const def = cd.def;
              const rarityConfig = def ? AGENT_RARITY_CONFIG[def.rarity] : null;
              const classConfig = def ? AGENT_CLASS_CONFIG[def.class] : null;
              const rarityIdx = def ? RARITY_ORDER.indexOf(def.rarity) : 0;
              const isBest = i === bestPullIndex;
              const totalCards = cardData.length;
              const fanAngle = ((i - (totalCards - 1) / 2) / Math.max(totalCards - 1, 1)) * 16;
              const sellValue = def ? AGENT_RARITY_CONFIG[def.rarity].quickSellValue : 0;

              return (
                <div
                  key={cd.minted.mintId}
                  className="relative group"
                  style={{
                    '--fan-x': '0px',
                    '--fan-rot': `${fanAngle}deg`,
                    animation: `fan-spread 0.6s ease-out ${i * 0.08}s both`,
                    transform: `rotate(${fanAngle}deg)`,
                    transformOrigin: 'bottom center',
                    zIndex: isBest ? 10 : i,
                  }}
                >
                  {/* BEST PULL badge */}
                  {isBest && (
                    <div
                      className="absolute -top-8 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full text-[8px] font-bold tracking-[0.2em] uppercase whitespace-nowrap"
                      style={{
                        background: rarityConfig?.color + '20',
                        color: rarityConfig?.color,
                        border: `1px solid ${rarityConfig?.color}66`,
                        boxShadow: `0 0 16px ${rarityConfig?.color}44`,
                        animation: 'glow-pulse 2s ease-in-out infinite',
                        '--glow-color': rarityConfig?.color + '44',
                      }}
                    >
                      Best Pull
                    </div>
                  )}

                  {/* Summary card */}
                  <div
                    className={`
                      relative w-[120px] h-[170px] md:w-[140px] md:h-[200px]
                      rounded-xl overflow-hidden
                      transition-all duration-300
                      ${isBest ? 'scale-110 -translate-y-4' : 'hover:scale-105 hover:-translate-y-2'}
                    `}
                    style={{
                      border: `2px solid ${rarityConfig?.color || '#444'}${isBest ? '' : '44'}`,
                      boxShadow: isBest
                        ? `0 0 30px ${rarityConfig?.color}66, 0 0 60px ${rarityConfig?.color}33`
                        : rarityConfig?.glow || 'none',
                    }}
                  >
                    {/* Portrait gradient */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: def
                          ? `linear-gradient(135deg, ${def.portraitGradient[0]}, ${def.portraitGradient[1]}, ${def.portraitGradient[2]})`
                          : '#1a1a2e',
                      }}
                    />

                    {/* Holographic for Epic+ */}
                    {rarityIdx >= 3 && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `linear-gradient(135deg, transparent 20%, ${rarityConfig?.color}15 40%, ${rarityConfig?.color}30 50%, ${rarityConfig?.color}15 60%, transparent 80%)`,
                          backgroundSize: '200% 200%',
                          animation: 'holographic 4s ease-in-out infinite',
                        }}
                      />
                    )}

                    {/* Content */}
                    <div className="relative z-10 flex flex-col h-full p-2">
                      {/* Rarity */}
                      <div className="flex justify-between items-center">
                        <span
                          className="text-[7px] font-bold tracking-wider uppercase px-1 py-0.5 rounded"
                          style={{
                            color: rarityConfig?.color,
                            background: rarityConfig?.color + '15',
                          }}
                        >
                          {def?.rarity}
                        </span>
                        <span className="text-[6px] text-white/20">
                          #{cd.minted.editionNumber.toString().padStart(4, '0')}
                        </span>
                      </div>

                      {/* Icon */}
                      <div className="flex-1 flex items-center justify-center">
                        <span
                          className="text-3xl md:text-4xl"
                          style={{ filter: `drop-shadow(0 0 8px ${rarityConfig?.color}66)` }}
                        >
                          {def?.iconGlyph}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="text-center space-y-0.5">
                        <div className="text-[10px] font-bold text-white truncate">{def?.name}</div>
                        <div className="flex justify-center">
                          <span
                            className="text-[6px] tracking-wider uppercase px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                            style={{
                              color: classConfig?.color,
                              background: classConfig?.color + '12',
                            }}
                          >
                            <span className="text-[8px]">{classConfig?.icon}</span>
                            {def?.class}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick sell button (on hover) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickSell(cd.minted.mintId);
                    }}
                    data-sfx="quick-sell"
                    className="absolute -bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-2 py-0.5 rounded text-[7px] bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 whitespace-nowrap"
                  >
                    Sell Q{sellValue}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Total value */}
          <div className="text-center text-white/30 text-[10px] tracking-wider">
            Total Quick-Sell Value:{' '}
            <span className="text-amber-300 font-mono font-bold">
              Q{cardData.reduce((sum, cd) => {
                if (!cd.def) return sum;
                return sum + AGENT_RARITY_CONFIG[cd.def.rarity].quickSellValue;
              }, 0).toLocaleString()}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-2">
            {/* Open Another */}
            {selectedPackId && aegisPoints >= (AGENT_PACK_TYPES[selectedPackId]?.cost || Infinity) && (
              <button
                onClick={handleOpenAnother}
                data-sfx="pack-another"
                className="px-6 py-2.5 rounded-lg font-bold text-sm tracking-wide uppercase transition-all duration-200 hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${PACK_DISPLAY[selectedPackId]?.accentColor}33, ${PACK_DISPLAY[selectedPackId]?.accentColor}11)`,
                  color: PACK_DISPLAY[selectedPackId]?.accentColor,
                  border: `1px solid ${PACK_DISPLAY[selectedPackId]?.accentColor}44`,
                  boxShadow: `0 0 20px ${PACK_DISPLAY[selectedPackId]?.accentColor}22`,
                }}
              >
                Open Another
                <span className="ml-2 text-[10px] opacity-60 font-mono">
                  €{AGENT_PACK_TYPES[selectedPackId]?.cost.toLocaleString()}
                </span>
              </button>
            )}

            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-lg font-bold text-sm tracking-wide uppercase bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80 transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackOverlay;
