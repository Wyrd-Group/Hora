import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useEmpireStore } from '../../store/empireStore';
import { useAuthStore } from '../../store/authStore';
import { useSocialStore } from '../../store/socialStore';
import { useFriendsStore } from '../../store/friendsStore';
import { useShallow } from 'zustand/shallow';
import { createRoom, sendGameInvite as sendInviteToPlayer } from '../../lib/multiplayerSync';
import { NPC_PROFILES, POST_TEMPLATES, BIZTOK_CLIPS, COMMENT_TEMPLATES, DAILY_CHALLENGES } from '../../data/socialData';
import FollowerDashboard from '../social/FollowerDashboard';
import MarketCallsPanel from '../social/MarketCallsPanel';
import VerificationBadge from '../social/VerificationBadge';
import DeskShell from '../desk/DeskShell';

import {
  buildInteractionProfile, buildAuthorCredibility, analyzeFeedCoherence,
  rankForYou, rankBizTok, rankContent,
  getCreatorLevel, getCreatorTier, MONETIZATION_TIERS,
} from '../../engine/recommendationEngine';

// ── Helpers ──────────────────────────────────────────────────────────

// ── In-Game Ads ──────────────────────────────────────────────────────

const ADS = [
  { id: 'ad-1', brand: 'Aegis Trading Academy', tagline: 'Master the markets. Enroll in ECFL F1 today.', cta: 'Start Learning', accent: 'cyan', icon: '🎓', type: 'education' },
  { id: 'ad-2', brand: 'VortexPrime Brokerage', tagline: '0.02% commission. Institutional-grade execution. Level 10+ traders only.', cta: 'Apply Now', accent: 'purple', icon: '⚡', type: 'finance' },
  { id: 'ad-3', brand: 'NexusPay', tagline: 'Send money across borders. Zero fees on your first €10K transfer.', cta: 'Get Started', accent: 'emerald', icon: '💸', type: 'fintech' },
  { id: 'ad-4', brand: 'Sentinel Analytics', tagline: 'AI-powered market intelligence. See what the whales see.', cta: 'Try Free', accent: 'amber', icon: '🔍', type: 'saas' },
  { id: 'ad-5', brand: 'Quadratic Ventures', tagline: 'Invest in the future. Series A fund now open to accredited traders.', cta: 'Learn More', accent: 'rose', icon: '🚀', type: 'vc' },
  { id: 'ad-6', brand: 'DefiVault', tagline: 'Earn 12% APY on stablecoins. Non-custodial. Audited.', cta: 'Deposit Now', accent: 'amber', icon: '🏦', type: 'defi' },
  { id: 'ad-7', brand: 'OptionFlow Pro', tagline: 'Real-time unusual options activity. 14-day free trial.', cta: 'Start Trial', accent: 'cyan', icon: '📊', type: 'tools' },
  { id: 'ad-8', brand: 'Empire Realty', tagline: 'Commercial real estate. Fractional ownership from €1,000.', cta: 'Invest', accent: 'emerald', icon: '🏢', type: 'realestate' },
  { id: 'ad-9', brand: 'CryptoTax Pro', tagline: 'Automated crypto tax reports. Supports 40+ exchanges.', cta: 'Calculate Free', accent: 'purple', icon: '📋', type: 'tax' },
  { id: 'ad-10', brand: 'Aether Premium', tagline: 'Unlock premium features. Ad-free feed. Priority support.', cta: 'Upgrade', accent: 'yellow', icon: '✦', type: 'premium' },
  { id: 'ad-11', brand: 'Athena Intelligence', tagline: 'Geopolitical risk scoring for your portfolio. Real-time threat assessment.', cta: 'Activate', accent: 'rose', icon: '🛰️', type: 'intelligence' },
  { id: 'ad-12', brand: 'Nordic Wealth Management', tagline: 'ESG-aligned portfolios. 0.15% annual fee. Scandinavian precision.', cta: 'Open Account', accent: 'emerald', icon: '🌿', type: 'wealth' },
  { id: 'ad-13', brand: 'BlockForge', tagline: 'Institutional-grade crypto custody. $2B insured. SOC 2 certified.', cta: 'Secure Assets', accent: 'purple', icon: '🔐', type: 'crypto' },
  { id: 'ad-14', brand: 'TradeWire Terminal', tagline: 'Bloomberg-grade market data. Fraction of the cost. 50+ exchanges.', cta: 'Free Trial', accent: 'cyan', icon: '🖥️', type: 'terminal' },
  { id: 'ad-15', brand: 'Offshore Structures Ltd', tagline: 'Legal tax optimization. 40+ jurisdictions. Compliance guaranteed.', cta: 'Consult Free', accent: 'amber', icon: '🏝️', type: 'legal' },
  { id: 'ad-16', brand: 'AlgoTrader Pro', tagline: 'No-code algorithmic trading. Backtest in seconds. Deploy in one click.', cta: 'Build Now', accent: 'cyan', icon: '🤖', type: 'tools' },
  { id: 'ad-17', brand: 'Meridian Insurance', tagline: 'Portfolio insurance for volatile markets. Hedge your downside risk.', cta: 'Get Quote', accent: 'rose', icon: '🛡️', type: 'insurance' },
  { id: 'ad-18', brand: 'Capital Stack Academy', tagline: 'Learn real estate finance. Cap rates, LTV, NOI. Free first module.', cta: 'Enroll', accent: 'amber', icon: '📚', type: 'education' },
  { id: 'ad-19', brand: 'DarkPool Analytics', tagline: 'Track institutional order flow. See block trades before they hit tape.', cta: 'Subscribe', accent: 'purple', icon: '👁️', type: 'analytics' },
  { id: 'ad-20', brand: 'Sovereign Gold Vault', tagline: 'Allocated gold storage in Zurich. 99.99% purity. Fully audited.', cta: 'Buy Gold', accent: 'yellow', icon: '🥇', type: 'commodity' },
];

function getAdForSlot(slotIndex, gameTick) {
  const seed = Math.floor(Date.now() / 3600000) + gameTick; // rotates hourly
  return ADS[(seed + slotIndex * 7) % ADS.length];
}

const ACCENT_STYLES = {
  cyan: { border: 'border-cyan-500/30', bg: 'bg-cyan-500/[0.06]', text: 'text-cyan-400', btn: 'bg-cyan-500/20 border-cyan-400/40 text-cyan-400 hover:bg-cyan-500/30', glow: 'shadow-[0_0_15px_rgba(0,229,255,0.08)]' },
  purple: { border: 'border-purple-500/30', bg: 'bg-purple-500/[0.06]', text: 'text-purple-400', btn: 'bg-purple-500/20 border-purple-400/40 text-purple-400 hover:bg-purple-500/30', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.08)]' },
  emerald: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/[0.06]', text: 'text-emerald-400', btn: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-400 hover:bg-emerald-500/30', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.08)]' },
  amber: { border: 'border-amber-500/30', bg: 'bg-amber-500/[0.06]', text: 'text-amber-400', btn: 'bg-amber-500/20 border-amber-400/40 text-amber-400 hover:bg-amber-500/30', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.08)]' },
  rose: { border: 'border-rose-500/30', bg: 'bg-rose-500/[0.06]', text: 'text-rose-400', btn: 'bg-rose-500/20 border-rose-400/40 text-rose-400 hover:bg-rose-500/30', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.08)]' },
  yellow: { border: 'border-yellow-500/30', bg: 'bg-yellow-500/[0.06]', text: 'text-yellow-400', btn: 'bg-yellow-500/20 border-yellow-400/40 text-yellow-400 hover:bg-yellow-500/30', glow: 'shadow-[0_0_15px_rgba(234,179,8,0.08)]' },
};

const AdCard = ({ ad }) => {
  const s = ACCENT_STYLES[ad.accent] || ACCENT_STYLES.cyan;
  return (
    <div className={`relative ${s.bg} border ${s.border} rounded-xl p-4 ${s.glow} overflow-hidden`}>
      <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.03]" style={{ background: `radial-gradient(circle, currentColor 0%, transparent 70%)` }} />
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[7px] font-mono tracking-[0.2em] uppercase text-white/25 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">Sponsored</span>
        <span className={`text-[8px] font-mono font-bold tracking-wider ${s.text}`}>{ad.type.toUpperCase()}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-2xl shrink-0">{ad.icon}</span>
        <div className="flex-1 min-w-0">
          <div className={`font-mono font-bold text-xs ${s.text} mb-0.5`}>{ad.brand}</div>
          <p className="text-white/50 font-mono text-[10px] leading-relaxed">{ad.tagline}</p>
        </div>
        <button className={`shrink-0 px-3 py-1.5 rounded-lg border font-mono text-[9px] font-bold tracking-wider transition-all ${s.btn}`}>
          {ad.cta}
        </button>
      </div>
    </div>
  );
};

// ── Friend Search (Supabase-backed) ─────────────────────────────────
const FriendSearchBox = ({ friendsStore }) => {
  const [query, setQuery] = useState('');
  const debounceRef = useRef(null);

  const handleSearch = useCallback((val) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) {
      friendsStore.clearSearch();
      return;
    }
    debounceRef.current = setTimeout(() => {
      friendsStore.searchUsers(val.trim());
    }, 400);
  }, [friendsStore]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <div className="bg-[#0a0e17] border border-white/[0.08] rounded-xl p-4 md:p-5">
      <h3 className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/40 mb-3">FIND PLAYERS</h3>
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search by display name..."
        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white/80 placeholder:text-white/20 outline-none focus:border-purple-500/40 transition-all"
      />
      {friendsStore.searchLoading && (
        <p className="text-[9px] font-mono text-white/20 mt-2 animate-pulse">Searching...</p>
      )}
      {friendsStore.searchResults.length > 0 && (
        <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
          {friendsStore.searchResults.map(u => (
            <div key={u.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-purple-500/[0.03] border border-purple-500/10">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-[10px]">
                  {(u.display_name[0] || '?').toUpperCase()}
                </div>
                <div>
                  <span className="text-white font-mono text-xs font-bold">{u.display_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-mono text-white/30 tracking-wider">{u.tier}</span>
                    <span className="text-[8px] font-mono text-white/20">LVL {u.level}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  friendsStore.sendRequest(u.id);
                  setQuery('');
                }}
                className="px-3 py-1.5 rounded text-[9px] font-mono font-bold tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:bg-purple-500/25 transition-all"
              >
                ADD
              </button>
            </div>
          ))}
        </div>
      )}
      {query.length >= 2 && !friendsStore.searchLoading && friendsStore.searchResults.length === 0 && (
        <p className="text-[9px] font-mono text-white/20 mt-2">No players found.</p>
      )}
    </div>
  );
};

// Helper: interleave ads every N items
function interleaveAds(items, interval, gameTick) {
  const result = [];
  let adSlot = 0;
  for (let i = 0; i < items.length; i++) {
    result.push(items[i]);
    if ((i + 1) % interval === 0) {
      result.push({ _isAd: true, ad: getAdForSlot(adSlot++, gameTick) });
    }
  }
  return result;
}

const REACTION_MAP = {
  fire: { emoji: '\uD83D\uDD25', label: 'Fire' },
  rocket: { emoji: '\uD83D\uDE80', label: 'Rocket' },
  chart: { emoji: '\uD83D\uDCC8', label: 'Bullish' },
  money: { emoji: '\uD83D\uDCB0', label: 'Money' },
};

const COLOR_MAP = {
  purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400' },
  cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', text: 'text-cyan-400' },
  amber: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-400' },
  rose: { bg: 'bg-rose-500/20', border: 'border-rose-500/50', text: 'text-rose-400' },
  emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-400' },
  yellow: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400' },
  indigo: { bg: 'bg-indigo-500/20', border: 'border-indigo-500/50', text: 'text-indigo-400' },
  pink: { bg: 'bg-pink-500/20', border: 'border-pink-500/50', text: 'text-pink-400' },
  red: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400' },
};

// deterministic shuffle with seed
function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function timeAgo(ms) {
  const diff = Date.now() - ms;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// Build NPC feed posts with deterministic IDs and timestamps
function buildFeedPosts(gameTick) {
  const seed = Math.floor(Date.now() / (1000 * 60 * 60 * 6)); // rotates every 6 hours
  const shuffled = seededShuffle(POST_TEMPLATES, seed + gameTick);
  return shuffled.map((tpl, i) => ({
    ...tpl,
    id: `npc-${seed}-${i}`,
    timestamp: Date.now() - (i * 1800000 + Math.floor(((seed + i * 31) % 100) * 60000)), // staggered
  }));
}

// Build BizTok clips with IDs
function buildBizTokClips(gameTick) {
  const seed = Math.floor(Date.now() / (1000 * 60 * 60 * 12));
  const shuffled = seededShuffle(BIZTOK_CLIPS, seed + gameTick * 3);
  return shuffled.map((clip, i) => ({ ...clip, id: `bt-${seed}-${i}` }));
}

function getDailyChallenge() {
  const dayIndex = Math.floor(Date.now() / 86400000);
  return DAILY_CHALLENGES[dayIndex % DAILY_CHALLENGES.length];
}

// ── Mini Components ──────────────────────────────────────────────────

const Sparkline = ({ data, color = '#00e5ff', width = 64, height = 20 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const Avatar = ({ initial, color, size = 'md', level, showRing = false }) => {
  const c = COLOR_MAP[color] || COLOR_MAP.cyan;
  const sizeClasses = size === 'lg'
    ? 'w-20 h-20 md:w-24 md:h-24 text-xl md:text-3xl'
    : size === 'podium'
    ? 'w-12 h-12 md:w-14 md:h-14 text-base md:text-lg'
    : 'w-8 h-8 md:w-10 md:h-10 text-xs md:text-sm';
  return (
    <div className="relative inline-flex items-center justify-center">
      {showRing && level && (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
          <circle cx="50" cy="50" r="46" fill="none" stroke="#00e5ff" strokeWidth="4"
            strokeDasharray={`${(level / 20) * 289} 289`} strokeLinecap="round" transform="rotate(-90 50 50)"
            className="drop-shadow-[0_0_4px_rgba(0,229,255,0.6)]" />
        </svg>
      )}
      <div className={`${sizeClasses} rounded-full ${c.bg} border ${c.border} flex items-center justify-center shrink-0`}>
        <span className={`${c.text} font-bold font-mono`}>{initial}</span>
      </div>
    </div>
  );
};

const TierBadge = ({ tier }) => {
  const tierColors = {
    Bronze: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
    Silver: 'text-gray-300 bg-gray-300/10 border-gray-300/30',
    Gold: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    Platinum: 'text-blue-300 bg-blue-300/10 border-blue-300/30',
    Diamond: 'text-cyan-300 bg-cyan-300/10 border-cyan-300/30',
  };
  return (
    <span className={`text-[8px] md:text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${tierColors[tier] || tierColors.Bronze} uppercase tracking-wider`}>
      {tier}
    </span>
  );
};

// Render $TICKER tags as highlighted
const TaggedText = ({ text }) => (
  <>
    {text.split(/(\$[A-Z]+)/g).map((part, i) =>
      part.startsWith('$') ? <span key={i} className="text-cyan-400 font-bold hover:underline cursor-pointer">{part}</span> : <span key={i}>{part}</span>
    )}
  </>
);

// ── Post Card ────────────────────────────────────────────────────────

const PostCard = ({ post, isLiked, onLike, fyp = false, reason = null, isLive = false, liveComments, onLoadComments, onAddComment, commentInput, onCommentInputChange }) => {
  const author = isLive ? null : NPC_PROFILES[post.authorId];
  const [showComments, setShowComments] = useState(false);

  // For NPC posts: deterministic comments
  const commentSeed = post.id.split('-').pop() || '0';
  const npcComments = !isLive ? seededShuffle(COMMENT_TEMPLATES, parseInt(commentSeed) || 0).slice(0, Math.min(post.comments, 4)) : [];

  const displayName = isLive ? (post.display_name || 'Anonymous') : author?.name;
  const initial = isLive ? (post.display_name?.[0]?.toUpperCase() || '?') : author?.initial;
  const color = isLive ? 'cyan' : (author?.color || 'cyan');
  const verified = isLive ? false : author?.verified;
  const tier = isLive ? null : author?.tier;
  const level = isLive ? null : author?.level;
  const timestamp = isLive ? new Date(post.created_at).getTime() : post.timestamp;
  const likeCount = isLive ? post.likes_count : post.likes;
  const commentCount = isLive ? post.comments_count : post.comments;

  if (!isLive && !author) return null;

  const handleToggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next && isLive && onLoadComments) {
      onLoadComments(post.id);
    }
  };

  return (
    <div className={`bg-[#0d1117] border ${isLive ? 'border-cyan-500/15' : 'border-white/[0.08]'} rounded-xl p-4 md:p-5 hover:border-white/[0.15] transition-colors group`}>
      <div className="flex items-center gap-3 mb-3">
        <Avatar initial={initial} color={color} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-mono font-bold text-xs md:text-sm">{displayName}</span>
            {isLive && <span className="text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded text-[7px] md:text-[9px] font-mono font-bold border border-emerald-400/30">LIVE</span>}
            {verified && <span className="text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded text-[7px] md:text-[9px] font-mono font-bold border border-cyan-400/30">VERIFIED</span>}
            {tier && <TierBadge tier={tier} />}
            {level && <span className="text-white/30 font-mono text-[8px] md:text-[9px]">LVL {level}</span>}
          </div>
          <div className="text-white/40 font-mono text-[9px] md:text-[10px] mt-0.5">{timeAgo(timestamp)}</div>
        </div>
        {fyp && <span className="text-purple-400/60 text-[8px] font-mono bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">FYP</span>}
        {reason && (
          <span className={`text-[7px] font-mono px-1.5 py-0.5 rounded border ${
            reason === 'Trending' ? 'text-amber-400/70 bg-amber-500/10 border-amber-500/20' :
            reason === 'Based on your interests' ? 'text-purple-400/70 bg-purple-500/10 border-purple-500/20' :
            reason === 'Trusted creator' ? 'text-emerald-400/70 bg-emerald-500/10 border-emerald-500/20' :
            reason === 'New' ? 'text-cyan-400/70 bg-cyan-500/10 border-cyan-500/20' :
            'text-white/30 bg-white/[0.04] border-white/[0.08]'
          }`}>{reason}</span>
        )}
      </div>

      {likeCount >= 100 && (
        <div className="mb-2">
          <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded border text-amber-300 bg-amber-400/15 border-amber-400/50 shadow-[0_0_8px_rgba(245,158,11,0.3)] tracking-[0.2em] uppercase animate-pulse">HOT TAKE</span>
        </div>
      )}

      <p className="text-white/90 font-mono text-xs md:text-sm mb-3 md:mb-4 leading-relaxed">
        <TaggedText text={post.text} />
      </p>

      <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
        <div className="flex items-center gap-2">
          {!isLive && (post.reactions || []).map(r => (
            <span key={r} className="text-[10px] md:text-xs bg-white/5 border border-white/[0.08] rounded-full px-2 py-0.5 cursor-pointer hover:bg-white/10 hover:border-white/[0.15] transition-colors">
              {REACTION_MAP[r]?.emoji}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-4 text-white/40 font-mono text-[9px] md:text-[10px]">
          <button
            onClick={() => onLike(post.id)}
            className={`flex items-center gap-1 transition-colors ${isLiked ? 'text-rose-400' : 'hover:text-rose-400'} cursor-pointer`}
          >
            <svg className="w-3 h-3" fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            {likeCount + (isLiked ? 1 : 0)}
            {!isLiked && <span className="text-[7px] text-emerald-400/0 group-hover:text-emerald-400/80 transition-colors font-bold">+1 REP</span>}
          </button>
          <button onClick={handleToggleComments} className="flex items-center gap-1 hover:text-cyan-400 cursor-pointer transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            {commentCount}
          </button>
        </div>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] flex flex-col gap-2">
          {isLive ? (
            <>
              {(liveComments || []).map((c) => (
                <div key={c.id} className="flex items-start gap-2 pl-2">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center shrink-0">
                    <span className="text-cyan-400 font-bold font-mono text-[7px]">{(c.display_name || '?')[0]}</span>
                  </div>
                  <div>
                    <span className="text-white/60 font-mono text-[9px] font-bold">{c.display_name || 'Anonymous'}</span>
                    <p className="text-white/40 font-mono text-[9px]">{c.text}</p>
                  </div>
                </div>
              ))}
              {onAddComment && (
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={commentInput || ''}
                    onChange={(e) => onCommentInputChange?.(post.id, e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-black/50 border border-white/[0.1] rounded px-2 py-1 text-white/80 font-mono text-[10px] outline-none focus:border-cyan-400/40"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && commentInput?.trim()) {
                        onAddComment(post.id, commentInput.trim());
                        onCommentInputChange?.(post.id, '');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (commentInput?.trim()) {
                        onAddComment(post.id, commentInput.trim());
                        onCommentInputChange?.(post.id, '');
                      }
                    }}
                    className="px-2 py-1 bg-cyan-500/20 border border-cyan-400/30 rounded text-cyan-400 font-mono text-[9px] font-bold hover:bg-cyan-500/30"
                  >SEND</button>
                </div>
              )}
            </>
          ) : (
            npcComments.map((c, i) => {
              const ca = NPC_PROFILES[c.authorId];
              return ca ? (
                <div key={i} className="flex items-start gap-2 pl-2">
                  <div className={`w-5 h-5 rounded-full ${(COLOR_MAP[ca.color] || COLOR_MAP.cyan).bg} border ${(COLOR_MAP[ca.color] || COLOR_MAP.cyan).border} flex items-center justify-center shrink-0`}>
                    <span className={`${(COLOR_MAP[ca.color] || COLOR_MAP.cyan).text} font-bold font-mono text-[7px]`}>{ca.initial}</span>
                  </div>
                  <div>
                    <span className="text-white/60 font-mono text-[9px] font-bold">{ca.name}</span>
                    <p className="text-white/40 font-mono text-[9px]">{c.text}</p>
                  </div>
                </div>
              ) : null;
            })
          )}
        </div>
      )}
    </div>
  );
};

// ── BizTok Clip Card (vertical full-screen style) ────────────────────

const BizTokCard = ({ clip, isSaved, onSave, onWatch, isFollowing, onFollow }) => {
  const author = NPC_PROFILES[clip.authorId];
  const cardRef = useRef(null);
  const [wasViewed, setWasViewed] = useState(false);

  useEffect(() => {
    if (!cardRef.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !wasViewed) {
        setWasViewed(true);
        onWatch();
      }
    }, { threshold: 0.6 });
    obs.observe(cardRef.current);
    return () => obs.disconnect();
  }, [wasViewed, onWatch]);

  if (!author) return null;

  const CATEGORY_LABELS = {
    tip: { label: 'PRO TIP', color: 'emerald' },
    explainer: { label: 'EXPLAINER', color: 'cyan' },
    news: { label: 'MARKET NEWS', color: 'amber' },
    strategy: { label: 'STRATEGY', color: 'purple' },
    mindset: { label: 'MINDSET', color: 'pink' },
    macro: { label: 'MACRO', color: 'yellow' },
    crypto: { label: 'CRYPTO', color: 'amber' },
    options: { label: 'OPTIONS', color: 'cyan' },
  };
  const cat = CATEGORY_LABELS[clip.category] || CATEGORY_LABELS.tip;

  return (
    <div
      ref={cardRef}
      className={`relative bg-gradient-to-b ${clip.bgGradient} border border-white/[0.08] rounded-2xl overflow-hidden snap-start`}
      style={{ minHeight: '70vh' }}
    >
      {/* Category pill */}
      <div className="absolute top-4 left-4 z-10">
        <span className={`text-[9px] font-mono font-bold tracking-[0.2em] uppercase px-2.5 py-1 rounded-full border
          ${cat.color === 'emerald' ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' :
            cat.color === 'cyan' ? 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30' :
            cat.color === 'amber' ? 'text-amber-400 bg-amber-500/15 border-amber-500/30' :
            cat.color === 'purple' ? 'text-purple-400 bg-purple-500/15 border-purple-500/30' :
            cat.color === 'pink' ? 'text-pink-400 bg-pink-500/15 border-pink-500/30' :
            cat.color === 'yellow' ? 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30' :
            'text-cyan-400 bg-cyan-500/15 border-cyan-500/30'
          }`}
        >
          {cat.label}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col justify-center items-center px-6 py-16 md:px-10 h-full min-h-[70vh]">
        <span className="text-5xl mb-6">{clip.icon}</span>
        <h3 className="text-white font-mono font-bold text-lg md:text-xl text-center mb-6 leading-tight">
          {clip.title}
        </h3>
        <p className="text-white/60 font-mono text-xs md:text-sm text-center leading-relaxed max-w-md mb-8">
          {clip.text}
        </p>
        <div className="bg-white/[0.06] border border-white/[0.1] rounded-xl px-5 py-3 max-w-sm">
          <p className="text-white font-mono text-[11px] md:text-xs font-bold text-center leading-relaxed">
            {clip.keyTakeaway}
          </p>
        </div>
      </div>

      {/* Right-side action bar */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5">
        <div className="flex flex-col items-center">
          <Avatar initial={author.initial} color={author.color} size="md" />
          {!isFollowing && (
            <button onClick={onFollow} className="mt-[-6px] w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center text-white text-[10px] font-bold shadow-lg z-10">+</button>
          )}
        </div>
        <button className="flex flex-col items-center gap-1 group">
          <svg className="w-6 h-6 text-white/60 group-hover:text-rose-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
          <span className="text-white/40 font-mono text-[9px]">{(clip.likes / 1000).toFixed(1)}K</span>
        </button>
        <button className="flex flex-col items-center gap-1 group">
          <svg className="w-6 h-6 text-white/60 group-hover:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
          <span className="text-white/40 font-mono text-[9px]">{clip.shares}</span>
        </button>
        <button
          onClick={() => onSave(clip.id)}
          className="flex flex-col items-center gap-1 group"
        >
          <svg className={`w-6 h-6 transition-colors ${isSaved ? 'text-amber-400' : 'text-white/60 group-hover:text-amber-400'}`} fill={isSaved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
          <span className="text-white/40 font-mono text-[9px]">{clip.saves + (isSaved ? 1 : 0)}</span>
        </button>
      </div>

      {/* Bottom author info */}
      <div className="absolute bottom-4 left-4 right-16">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white font-mono font-bold text-xs">@{author.name}</span>
          {author.verified && <span className="text-cyan-400 text-[8px]">&#10003;</span>}
        </div>
        <p className="text-white/40 font-mono text-[9px] line-clamp-2">{author.bio}</p>
      </div>
    </div>
  );
};

// ── Leaderboard Data (static NPCs + player) ─────────────────────────

const PROFILE_BADGES = [
  { icon: '7d', label: '7-Day Streak', color: 'amber' },
  { icon: 'FT', label: 'First Trade', color: 'cyan' },
  { icon: 'DV', label: 'Diversified', color: 'emerald' },
  { icon: 'LV', label: 'Leveraged', color: 'rose' },
  { icon: 'SA', label: 'Series A', color: 'purple' },
  { icon: 'QZ', label: 'Quiz Master', color: 'yellow' },
];

const FYP_TRENDING_TAGS = ['$NVDA', '$TSLA', '$BTC', '#Options', '#IPOTrack', '#MacroPlay'];

// ── Main Component ───────────────────────────────────────────────────

const SocialOS = ({ onJoinRoom }) => {
  const [activeTab, setActiveTab] = useState('fyp');
  const [composerText, setComposerText] = useState('');
  const [commentInputs, setCommentInputs] = useState({});

  const store = useEmpireStore();
  const {
    gameTick, followers, socialReputation, socialFollowing, socialLikedPosts,
    socialSavedClips, socialPosts, socialClipsWatched,
    socialLikePost, socialFollow, socialUnfollow, socialSaveClip, socialUnsaveClip,
    socialPublishPost, socialWatchClip,
    creatorXp, creatorEarnings, creatorTotalViews, creatorTotalLikes,
  } = store;

  // Auth + Supabase social state
  const { user, guestMode } = useAuthStore();
  const isOnline = !!user && !guestMode;
  // Select primitives individually to avoid infinite re-render from Set/object refs
  const livePosts = useSocialStore(s => s.livePosts);
  const livePostsLoaded = useSocialStore(s => s.livePostsLoaded);
  const userLikes = useSocialStore(s => s.userLikes);
  const liveFollowing = useSocialStore(s => s.userFollowing);
  const followerCount = useSocialStore(s => s.followerCount);
  const leaderboard = useSocialStore(s => s.leaderboard);
  const leaderboardLoading = useSocialStore(s => s.leaderboardLoading);
  const commentsCache = useSocialStore(s => s.commentsCache);
  const commentsLoading = useSocialStore(s => s.commentsLoading);
  const loadPosts = useSocialStore(s => s.loadPosts);
  const livePublishPost = useSocialStore(s => s.publishPost);
  const loadUserSocialData = useSocialStore(s => s.loadUserSocialData);
  const loadLeaderboard = useSocialStore(s => s.loadLeaderboard);
  const syncLeaderboardScore = useSocialStore(s => s.syncLeaderboardScore);
  const liveToggleLike = useSocialStore(s => s.toggleLike);
  const liveToggleFollow = useSocialStore(s => s.toggleFollow);
  const loadComments = useSocialStore(s => s.loadComments);
  const addComment = useSocialStore(s => s.addComment);
  const startRealtime = useSocialStore(s => s.startRealtime);
  const stopRealtime = useSocialStore(s => s.stopRealtime);

  // Friends store — useShallow prevents infinite loop from Set<string> in onlineUserIds
  const friendsStore = useFriendsStore(useShallow(s => s));
  const friendsInit = useFriendsStore(s => s.init);
  useEffect(() => { friendsInit(); }, []);

  // Load social data from Supabase on mount (if online)
  useEffect(() => {
    if (!isOnline) return;
    loadPosts();
    loadUserSocialData();
    loadLeaderboard();
    startRealtime();
    return () => stopRealtime();
  }, [isOnline]);

  // Periodically sync leaderboard score (every 60 ticks ≈ 30 min)
  useEffect(() => {
    if (!isOnline || !user || gameTick % 60 !== 0) return;
    const displayName = user.user_metadata?.display_name || 'Anonymous';
    syncLeaderboardScore({
      user_id: user.id,
      display_name: displayName,
      net_worth: store.netWorth || 0,
      level: store.playerLevel || 1,
      tier: store.playerTier || 'Bronze',
      followers: followers + followerCount,
      win_rate: 0,
      reputation: socialReputation,
    });
  }, [gameTick, isOnline]);

  // Creator economy (needed early for creatorLevel references)
  const creatorLevel = getCreatorLevel(creatorXp);
  const creatorTierName = getCreatorTier(creatorLevel.level);

  // ── Recommendation Engine Pipeline ──
  // Build raw content pools
  const npcPosts = buildFeedPosts(gameTick);
  const rawBizTokClips = buildBizTokClips(gameTick);

  // All content as RankableItems for the engine
  const allRankable = useMemo(() => [
    ...npcPosts.map(p => ({
      ...p, category: undefined, saves: 0, shares: 0,
      creatorLevel: NPC_PROFILES[p.authorId]?.level || 1,
    })),
    ...rawBizTokClips.map(c => ({
      ...c, comments: 0,
      creatorLevel: NPC_PROFILES[c.authorId]?.level || 1,
    })),
    ...socialPosts.map(p => ({
      ...p, authorId: 'player', category: undefined, reactions: [], tags: [],
      saves: 0, shares: 0, isUserContent: true, creatorLevel: creatorLevel.level,
    })),
  ], [gameTick, socialPosts.length]);

  // Build interaction profile (Proof-of-Learning + TF-IDF)
  const interactionProfile = useMemo(() =>
    buildInteractionProfile(socialLikedPosts, socialSavedClips, socialFollowing, socialPosts, allRankable),
    [socialLikedPosts.length, socialSavedClips.length, socialFollowing.length, socialPosts.length, allRankable]
  );

  // Author credibility map (Proof-of-Learning consensus scoring)
  const authorCredibility = useMemo(() =>
    buildAuthorCredibility(allRankable, socialLikedPosts),
    [allRankable, socialLikedPosts.length]
  );

  // Feed coherence analysis (Spectral stability from SpectralEngine v3)
  const interactedItems = useMemo(() =>
    allRankable.filter(i => socialLikedPosts.includes(i.id) || socialSavedClips.includes(i.id)),
    [allRankable, socialLikedPosts.length, socialSavedClips.length]
  );
  const allCategories = ['tip', 'explainer', 'strategy', 'options', 'macro', 'crypto', 'news', 'mindset'];
  const feedCoherence = useMemo(() =>
    analyzeFeedCoherence(interactedItems, allCategories),
    [interactedItems]
  );

  // Engine options
  const engineOpts = { authorCredibility, feedCoherence };

  // ── Ranked feeds ──
  // For You: Twitter/Instagram hybrid with full engine pipeline
  const fypPosts = useMemo(() => {
    const allPosts = [
      ...npcPosts.map(p => ({ ...p, category: undefined, saves: 0, shares: 0, creatorLevel: NPC_PROFILES[p.authorId]?.level || 1 })),
      ...socialPosts.map(p => ({ ...p, authorId: 'player', category: undefined, reactions: [], tags: [], saves: 0, shares: 0, isUserContent: true, creatorLevel: creatorLevel.level })),
    ];
    return rankForYou(allPosts, interactionProfile, socialFollowing, { limit: 12, ...engineOpts });
  }, [gameTick, socialPosts.length, interactionProfile, socialFollowing.length]);

  // Campus Feed: chronological + relevance hybrid
  const allFeedPosts = useMemo(() => {
    const all = [
      ...socialPosts.map(p => ({ ...p, authorId: 'player', reactions: [], tags: [], saves: 0, shares: 0, isUserContent: true, creatorLevel: creatorLevel.level })),
      ...npcPosts.map(p => ({ ...p, category: undefined, saves: 0, shares: 0, creatorLevel: NPC_PROFILES[p.authorId]?.level || 1 })),
    ];
    return rankContent(all, interactionProfile, socialFollowing, { limit: 20, ...engineOpts });
  }, [gameTick, socialPosts.length, interactionProfile, socialFollowing.length]);

  // BizTok: TikTok-style personalized ranking
  const bizTokClips = useMemo(() => {
    const clips = rawBizTokClips.map(c => ({
      ...c, comments: 0, creatorLevel: NPC_PROFILES[c.authorId]?.level || 1,
    }));
    return rankBizTok(clips, interactionProfile, socialFollowing, { limit: 25, ...engineOpts });
  }, [gameTick, interactionProfile, socialFollowing.length]);

  const challenge = getDailyChallenge();

  const handlePublish = async () => {
    if (!composerText.trim()) return;
    const text = composerText.trim();
    // Always update local game state
    socialPublishPost(text);
    // Also publish to Supabase if online
    if (isOnline) {
      await livePublishPost(text);
    }
    setComposerText('');
  };

  const handleWatchClip = useCallback(() => { socialWatchClip(); }, [socialWatchClip]);

  const repLevel = Math.min(20, Math.floor(socialReputation / 500) + 1);

  // Merge real leaderboard entries with NPC fallback
  const mergedLeaderboard = useMemo(() => {
    const realEntries = (isOnline && leaderboard.length > 0) ? leaderboard.map((e, i) => ({
      rank: i + 1,
      id: e.user_id,
      nw: e.net_worth >= 1000000 ? `€${(e.net_worth / 1000000).toFixed(1)}M` : e.net_worth >= 1000 ? `€${(e.net_worth / 1000).toFixed(0)}K` : `€${e.net_worth.toFixed(0)}`,
      sparkline: [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65].map(v => v + Math.floor(e.net_worth / 100000)),
      winRate: `${e.win_rate}%`,
      move: 'up',
      moveAmount: 0,
      me: e.user_id === user?.id,
      displayName: e.display_name,
      tier: e.tier || 'Bronze',
      isReal: true,
    })) : [];

    // Only show real players — no NPC bots in rankings
    return realEntries;
  }, [isOnline, leaderboard, user?.id]);

  return (
    <div className="fixed inset-0 pt-24 md:pt-28 z-20 backdrop-blur-xl bg-[#060a12]/95 flex flex-col items-center">

      {/* Scan-line overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.08) 2px, rgba(255,255,255,0.08) 4px)',
      }} />

      {/* Sub-Navigation Tabs */}
      <div className="relative flex gap-1 p-1 bg-[#0a0f1a] rounded-lg border border-white/[0.06] max-w-full overflow-x-auto no-scrollbar md:mb-8 mb-4 shrink-0 w-[92%] md:w-auto">
        {[
          { id: 'fyp', label: 'For You', sub: 'Curated', icon: '✦', accent: 'purple' },
          { id: 'feed', label: 'Campus', sub: 'Live Posts', icon: '◉', accent: 'cyan' },
          { id: 'biztok', label: 'BizTok', sub: 'Learn & Scroll', icon: '▶', accent: 'rose' },
          { id: 'leader', label: 'Rankings', sub: 'Leaderboard', icon: '◈', accent: 'amber' },
          { id: 'profile', label: 'Profile', sub: 'Your Stats', icon: '◎', accent: 'emerald' },
          { id: 'friends', label: 'Friends', sub: 'Social & Invite', icon: '⊞', accent: 'purple' },
          { id: 'influence', label: 'Influence', sub: 'Followers & Calls', icon: '⊕', accent: 'cyan' },
          { id: 'desk', label: 'Research', sub: 'Desk & Intel', icon: '⌖', accent: 'amber' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 sm:px-6 py-2.5 sm:py-3 rounded-md flex items-center gap-2 transition-all duration-300 w-full sm:w-auto font-mono text-xs
              ${activeTab === tab.id
                ? `bg-white/[0.06] text-white ${
                    tab.accent === 'amber' ? 'shadow-[inset_0_-2px_0_#f59e0b,0_0_20px_rgba(245,158,11,0.15)]' :
                    tab.accent === 'emerald' ? 'shadow-[inset_0_-2px_0_#10b981,0_0_20px_rgba(16,185,129,0.15)]' :
                    tab.accent === 'purple' ? 'shadow-[inset_0_-2px_0_#a855f7,0_0_20px_rgba(168,85,247,0.15)]' :
                    tab.accent === 'rose' ? 'shadow-[inset_0_-2px_0_#f43f5e,0_0_20px_rgba(244,63,94,0.15)]' :
                    'shadow-[inset_0_-2px_0_#00e5ff,0_0_20px_rgba(0,229,255,0.15)]'
                  }`
                : 'text-white/30 hover:text-white/60 hover:bg-white/[0.03]'
              }`}
          >
            <span className={`text-base transition-all duration-300 ${activeTab === tab.id ? (
              tab.accent === 'amber' ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]' :
              tab.accent === 'emerald' ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]' :
              tab.accent === 'purple' ? 'text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]' :
              tab.accent === 'rose' ? 'text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]' :
              'text-cyan-400 drop-shadow-[0_0_6px_rgba(0,229,255,0.8)]'
            ) : 'opacity-40'}`}>
              {tab.icon}
            </span>
            <div className="flex flex-col items-start">
              <span className="font-bold text-[11px] tracking-wide uppercase">{tab.label}</span>
              <span className={`text-[8px] tracking-[0.15em] uppercase transition-colors duration-300 ${activeTab === tab.id ? (
                tab.accent === 'amber' ? 'text-amber-400/70' :
                tab.accent === 'emerald' ? 'text-emerald-400/70' :
                tab.accent === 'purple' ? 'text-purple-400/70' :
                tab.accent === 'rose' ? 'text-rose-400/70' :
                'text-cyan-400/70'
              ) : 'text-white/20'}`}>
                {tab.sub}
              </span>
            </div>
            {activeTab === tab.id && (
              <span className={`absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full ${
                tab.accent === 'amber' ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]' :
                tab.accent === 'emerald' ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' :
                tab.accent === 'purple' ? 'bg-purple-400 shadow-[0_0_6px_#a855f7]' :
                tab.accent === 'rose' ? 'bg-rose-400 shadow-[0_0_6px_#f43f5e]' :
                'bg-cyan-400 shadow-[0_0_6px_#00e5ff]'
              } animate-pulse`} />
            )}
          </button>
        ))}
      </div>

      {/* Content Container */}
      <div className="w-full max-w-3xl flex-1 overflow-y-auto px-4 md:px-0 pb-8">

        {/* ==================== FOR YOU PAGE ==================== */}
        {activeTab === 'fyp' && (
          <div className="animate-fade-in flex flex-col max-w-2xl mx-auto gap-3 md:gap-4">

            {/* Trending Tags */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {FYP_TRENDING_TAGS.map(tag => (
                <span key={tag} className="shrink-0 px-3 py-1.5 bg-purple-500/10 border border-purple-400/30 rounded-full text-purple-400 font-mono text-[10px] font-bold tracking-wider cursor-pointer hover:bg-purple-500/20 hover:border-purple-400/50 transition-all shadow-[0_0_8px_rgba(168,85,247,0.1)]">
                  {tag}
                </span>
              ))}
            </div>

            {/* Spotlight */}
            {(() => {
              const top = NPC_PROFILES.alpha;
              return (
                <div className="relative bg-gradient-to-br from-[#0d1220] via-[#0a0f1a] to-[#120a1a] border border-purple-500/30 rounded-xl p-5 overflow-hidden group hover:border-purple-400/50 transition-all shadow-[0_0_20px_rgba(168,85,247,0.08)]">
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)' }} />
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[8px] font-mono tracking-[0.2em] uppercase text-purple-400/60 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">Top Trader This Week</span>
                    <span className="text-[8px] font-mono text-amber-400 animate-pulse">FEATURED</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Avatar initial={top.initial} color={top.color} size="md" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-mono font-bold text-sm">{top.name}</span>
                        <TierBadge tier={top.tier} />
                        <span className="text-emerald-400 font-mono text-xs font-bold">+€2.4M P&L</span>
                      </div>
                      <p className="text-white/40 font-mono text-[10px]">Closed 12 trades with 91% win rate. Follow for alpha.</p>
                    </div>
                    <button
                      onClick={() => socialFollowing.includes('alpha') ? socialUnfollow('alpha') : socialFollow('alpha')}
                      className={`px-4 py-2 rounded-lg font-mono text-[10px] font-bold tracking-wider transition-all ${
                        socialFollowing.includes('alpha')
                          ? 'bg-white/[0.06] border border-white/[0.15] text-white/60'
                          : 'bg-purple-500/20 border border-purple-400/40 text-purple-400 hover:bg-purple-500/30 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                      }`}
                    >
                      {socialFollowing.includes('alpha') ? 'FOLLOWING' : 'FOLLOW'}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Daily Challenge */}
            <div className="bg-[#0a0f1a]/80 border border-amber-500/30 rounded-xl p-4 shadow-[0_0_15px_rgba(245,158,11,0.08)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">&#9889;</span>
                  <span className="text-amber-400 font-mono text-[10px] font-bold tracking-[0.2em] uppercase">DAILY CHALLENGE</span>
                </div>
                <span className="text-amber-400 font-mono text-[10px] font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.2)]">+{challenge.reward} XP</span>
              </div>
              <p className="text-white/60 font-mono text-xs mb-3">{challenge.desc}</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all shadow-[0_0_8px_rgba(245,158,11,0.4)]" style={{ width: `${Math.min(100, (store.socialChallengeProgress / challenge.total) * 100)}%` }} />
                </div>
                <span className="text-amber-400/70 font-mono text-[10px] font-bold">{Math.min(store.socialChallengeProgress, challenge.total)}/{challenge.total}</span>
              </div>
            </div>

            {/* Live posts from Supabase (if online) */}
            {isOnline && livePosts.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 px-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-mono text-emerald-400/70 tracking-[0.2em] uppercase">Live from players</span>
                  <div className="h-px flex-1 bg-emerald-500/20" />
                </div>
                {livePosts.slice(0, 3).map(post => (
                  <PostCard
                    key={`live-${post.id}`}
                    post={post}
                    isLiked={userLikes.has(post.id)}
                    onLike={(id) => liveToggleLike(id)}
                    isLive
                    liveComments={commentsCache[post.id]}
                    onLoadComments={loadComments}
                    onAddComment={addComment}
                    commentInput={commentInputs[post.id] || ''}
                    onCommentInputChange={(id, val) => setCommentInputs(s => ({ ...s, [id]: val }))}
                  />
                ))}
              </div>
            )}

            {/* FYP Posts with Ads every 5 */}
            {interleaveAds(fypPosts, 5, gameTick).map((item, idx) =>
              item._isAd ? (
                <AdCard key={`ad-fyp-${idx}`} ad={item.ad} />
              ) : (
                <PostCard
                  key={item.id}
                  post={item}
                  isLiked={socialLikedPosts.includes(item.id)}
                  onLike={socialLikePost}
                  fyp
                  reason={item.reason}
                />
              )
            )}

            {/* Pro Tip */}
            <div className="bg-[#0a0f1a]/80 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
              <span className="text-xl shrink-0 mt-0.5">&#128161;</span>
              <div>
                <span className="text-emerald-400 font-mono text-[9px] font-bold tracking-[0.2em] uppercase block mb-1">PRO TIP</span>
                <p className="text-white/50 font-mono text-[11px] leading-relaxed">Use stop-losses on every position. Top traders risk &lt;2% per trade. Head to the Lab to practice risk management.</p>
              </div>
            </div>

            {/* Watchlist */}
            <div className="bg-[#0a0f1a]/80 border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-purple-400 font-mono text-[9px] font-bold tracking-[0.2em] uppercase">TRENDING NOW</span>
                <div className="h-px flex-1 bg-purple-500/20" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { symbol: '$NVDA', change: '+8.2%', hot: true },
                  { symbol: '$BTC', change: '+4.1%', hot: true },
                  { symbol: '$AAPL', change: '-1.3%', hot: false },
                  { symbol: '$TSLA', change: '+6.7%', hot: true },
                ].map(item => (
                  <div key={item.symbol} className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 hover:bg-white/[0.06] transition-all cursor-pointer">
                    <span className="text-white font-mono text-xs font-bold">{item.symbol}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-mono text-xs font-bold ${item.change.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>{item.change}</span>
                      {item.hot && <span className="text-[9px]">{'\uD83D\uDD25'}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== CAMPUS FEED ==================== */}
        {activeTab === 'feed' && (
          <div className="animate-fade-in flex flex-col max-w-2xl mx-auto h-full">

            {/* Reputation Counter */}
            <div className="flex items-center justify-between bg-[#0a0e17]/80 border border-cyan-500/20 rounded-lg px-4 py-2.5 mb-4 shadow-[0_0_12px_rgba(0,229,255,0.06)]">
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/30">Reputation</span>
                <span className="text-cyan-400 font-mono font-bold text-sm md:text-base drop-shadow-[0_0_6px_rgba(0,229,255,0.5)]">{socialReputation.toLocaleString()}</span>
                <span className="text-[8px] font-mono text-white/20">pts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 rounded-full shadow-[0_0_6px_rgba(0,229,255,0.4)]" style={{ width: `${((socialReputation % 500) / 500) * 100}%` }}></div>
                </div>
                <span className="text-[8px] font-mono text-cyan-400/60 font-bold">LVL {repLevel}</span>
              </div>
            </div>

            {/* Post Composer */}
            <div className="bg-[#0a0e17] border border-cyan-400/30 rounded-xl p-3 md:p-4 mb-4 md:mb-6 shadow-[0_0_20px_rgba(0,229,255,0.05)]">
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-cyan-400 font-mono text-[10px] md:text-xs font-bold opacity-70">BROADCAST://campus</span>
                <div className="flex-1 h-px bg-cyan-400/20"></div>
                <span className="text-white/30 font-mono text-[9px]">LIVE</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <div className="relative">
                <div className="absolute top-3 left-3 md:top-4 md:left-4 text-cyan-400 font-mono text-xs md:text-sm opacity-60 pointer-events-none select-none">&gt;_</div>
                <textarea
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  placeholder="broadcast a market call..."
                  className="w-full bg-black/70 border border-white/[0.1] rounded max-h-24 pl-8 pr-3 py-3 md:pl-10 md:pr-4 md:py-4 text-cyan-400 font-mono text-xs md:text-sm resize-none h-20 md:h-24 outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,229,255,0.15)] transition-all placeholder:text-white/25 caret-cyan-400"
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-3 gap-2 sm:gap-0">
                <span className="text-white/30 text-[9px] md:text-[10px] font-mono pl-1">Tag assets with $ (e.g., $AAPL) // attach charts with #</span>
                <button
                  onClick={handlePublish}
                  disabled={!composerText.trim()}
                  className="bg-cyan-400 text-black px-4 sm:px-6 py-2 rounded text-[10px] md:text-xs font-bold font-mono tracking-widest hover:brightness-125 hover:shadow-[0_0_20px_rgba(0,229,255,0.5)] w-full sm:w-auto shadow-[0_0_10px_rgba(0,229,255,0.3)] transition-all border border-cyan-400/50 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  BROADCAST <span className="opacity-70">(+10 REP)</span>
                </button>
              </div>
            </div>

            {/* Feed Posts — live Supabase posts first, then NPC */}
            <div className="flex flex-col gap-3 md:gap-4">
              {isOnline && livePosts.length > 0 && livePosts.map(post => (
                <PostCard
                  key={`live-${post.id}`}
                  post={post}
                  isLiked={userLikes.has(post.id)}
                  onLike={(id) => liveToggleLike(id)}
                  isLive
                  liveComments={commentsCache[post.id]}
                  onLoadComments={loadComments}
                  onAddComment={addComment}
                  commentInput={commentInputs[post.id] || ''}
                  onCommentInputChange={(id, val) => setCommentInputs(s => ({ ...s, [id]: val }))}
                />
              ))}
              {interleaveAds(allFeedPosts.slice(0, 15), 5, gameTick).map((item, idx) =>
                item._isAd ? (
                  <AdCard key={`ad-feed-${idx}`} ad={item.ad} />
                ) : (
                  <PostCard
                    key={item.id}
                    post={item}
                    isLiked={socialLikedPosts.includes(item.id)}
                    onLike={socialLikePost}
                    reason={item.reason}
                  />
                )
              )}
            </div>
          </div>
        )}

        {/* ==================== BIZTOK ==================== */}
        {activeTab === 'biztok' && (
          <div className="animate-fade-in max-w-lg mx-auto">

            {/* BizTok Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-rose-400 font-mono text-sm font-bold tracking-wider">BizTok</span>
                <span className="text-[8px] font-mono text-white/30 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">{socialClipsWatched} clips watched</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-mono text-amber-400/70">{socialSavedClips.length} saved</span>
              </div>
            </div>

            {/* Feed Health Indicator (Spectral Analysis) */}
            <div className="flex items-center gap-2 mb-4 px-1">
              <span className={`w-1.5 h-1.5 rounded-full ${
                feedCoherence.health === 'diverse' ? 'bg-emerald-400 shadow-[0_0_4px_#10b981]' :
                feedCoherence.health === 'mild_bubble' ? 'bg-amber-400 shadow-[0_0_4px_#f59e0b]' :
                'bg-rose-400 shadow-[0_0_4px_#f43f5e]'
              }`} />
              <span className="text-[8px] font-mono text-white/30">
                Feed: {feedCoherence.health === 'diverse' ? 'Diverse mix' : feedCoherence.health === 'mild_bubble' ? 'Expanding horizons...' : 'Breaking your bubble'}
              </span>
              <span className="text-[7px] font-mono text-white/20">
                stability: {(feedCoherence.stabilityIndex * 100).toFixed(0)}%
              </span>
            </div>

            {/* Category Filter */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-3">
              {['All', 'Tips', 'Strategy', 'Macro', 'Crypto', 'Options', 'Mindset'].map(cat => (
                <span key={cat} className="shrink-0 px-3 py-1.5 bg-rose-500/10 border border-rose-400/20 rounded-full text-rose-400 font-mono text-[9px] font-bold tracking-wider cursor-pointer hover:bg-rose-500/20 hover:border-rose-400/40 transition-all">
                  {cat}
                </span>
              ))}
            </div>

            {/* Vertical Snap-Scroll Feed with Ads every 5 */}
            <div className="flex flex-col gap-4 snap-y snap-mandatory">
              {interleaveAds(bizTokClips, 5, gameTick).map((item, idx) =>
                item._isAd ? (
                  <div key={`ad-bt-${idx}`} className="snap-start">
                    <AdCard ad={item.ad} />
                  </div>
                ) : (
                  <BizTokCard
                    key={item.id}
                    clip={item}
                    isSaved={socialSavedClips.includes(item.id)}
                    onSave={socialSavedClips.includes(item.id) ? socialUnsaveClip : socialSaveClip}
                    onWatch={handleWatchClip}
                    isFollowing={socialFollowing.includes(item.authorId)}
                    onFollow={() => socialFollow(item.authorId)}
                  />
                )
              )}
            </div>
          </div>
        )}

        {/* ==================== RANKINGS ==================== */}
        {activeTab === 'leader' && (
          <div className="animate-fade-in max-w-2xl mx-auto mt-2 md:mt-4">

            {/* Live badge */}
            {mergedLeaderboard.length > 0 && (
              <div className="flex items-center gap-2 mb-4 px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-mono text-emerald-400/70 tracking-[0.2em] uppercase">Live leaderboard — {mergedLeaderboard.length} players</span>
              </div>
            )}

            {/* Empty state */}
            {mergedLeaderboard.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <span className="text-4xl mb-4">🏆</span>
                <h3 className="text-white/60 font-mono text-sm font-bold mb-2">No players ranked yet</h3>
                <p className="text-white/30 font-mono text-[11px] text-center max-w-xs">Start playing and your stats will appear here. Rankings are based on real player performance — no bots.</p>
              </div>
            )}

            {/* Podium */}
            {mergedLeaderboard.length >= 3 && (
            <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
              {[1, 0, 2].map((idx, pos) => {
                const p = mergedLeaderboard[idx];
                if (!p) return null;
                const name = p.me ? (user?.user_metadata?.display_name || 'You') : (p.displayName || p.id);
                const initial = (name?.[0] || '?').toUpperCase();
                const color = p.me ? 'cyan' : 'purple';
                const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
                const medalColor = medalColors[idx];
                const mt = pos === 0 ? 'mt-6 md:mt-8' : pos === 1 ? '' : 'mt-10 md:mt-12';

                return (
                  <div key={p.rank} className={`flex flex-col items-center ${mt}`}>
                    <div className="relative mb-2">
                      {idx === 0 && <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-yellow-400 text-sm md:text-base">&#9733;</div>}
                      <Avatar initial={initial} color={color} size="podium" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: medalColor, boxShadow: `0 0 8px ${medalColor}80` }}>
                        <span className="text-black font-mono font-bold text-[9px]">{p.rank}</span>
                      </div>
                    </div>
                    <span className="text-white font-mono font-bold text-[10px] md:text-xs truncate max-w-full">{name}</span>
                    <span className="font-mono font-bold text-xs md:text-sm" style={{ color: medalColor }}>{p.nw}</span>
                    <Sparkline data={p.sparkline} color={medalColor} width={56} height={16} />
                  </div>
                );
              })}
            </div>
            )}

            {/* Full Rank List */}
            <div className="bg-[#0a0e17] border border-[#f59e0b]/20 rounded-xl p-3 md:p-5">
              <div className="grid grid-cols-[28px_1fr_60px_64px] sm:grid-cols-[36px_1fr_90px_70px] mb-2 px-2 md:px-3 text-white/40 font-mono text-[8px] md:text-[9px] uppercase tracking-widest border-b border-white/[0.06] pb-2">
                <span>#</span>
                <span>Operator</span>
                <span className="text-right">Net Worth</span>
                <span className="text-right">7d</span>
              </div>

              {mergedLeaderboard.map(p => {
                const name = p.me ? (user?.user_metadata?.display_name || 'You') : (p.displayName || p.id);
                const tier = p.me ? (store.playerTier || 'Silver') : (p.tier || 'Bronze');
                const isFollowing = !p.me && liveFollowing.has(p.id);
                const rankColor = p.rank === 1 ? 'text-[#FFD700]' : p.rank === 2 ? 'text-[#C0C0C0]' : p.rank === 3 ? 'text-[#CD7F32]' : 'text-white/40';
                const sparkColor = p.rank === 1 ? '#FFD700' : p.rank === 2 ? '#C0C0C0' : p.rank === 3 ? '#CD7F32' : p.me ? '#00e5ff' : '#4ade80';

                return (
                  <div
                    key={p.rank}
                    className={`grid grid-cols-[28px_1fr_60px_64px] sm:grid-cols-[36px_1fr_90px_70px] items-center p-2.5 md:p-3 rounded-lg mb-1.5 md:mb-2 gap-1 ${
                      p.me
                        ? 'bg-cyan-400/10 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,229,255,0.1),inset_0_0_12px_rgba(0,229,255,0.05)]'
                        : 'bg-[#111827]/60 border border-white/[0.06] hover:border-white/[0.15]'
                    } transition-colors cursor-pointer`}
                  >
                    <span className={`font-mono font-bold text-xs md:text-sm ${rankColor}`}>{p.rank}</span>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-mono text-xs md:text-sm truncate ${p.me ? 'text-cyan-400 font-bold' : 'text-white'}`}>{name}</span>
                        {p.me && (
                          <span className="relative text-[8px] md:text-[9px] font-mono text-black bg-cyan-400 rounded px-1.5 py-0.5 font-bold shadow-[0_0_10px_rgba(0,229,255,0.5),0_0_20px_rgba(0,229,255,0.2)]">
                            <span className="absolute inset-0 rounded bg-cyan-400 animate-ping opacity-30"></span>
                            <span className="relative">YOU</span>
                          </span>
                        )}
                        {p.rank === 1 && <span className="text-[7px] md:text-[8px] font-mono font-bold text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/30 rounded px-1 py-0.5 tracking-wider">THE LEGEND</span>}
                        {p.rank === 2 && <span className="text-[7px] md:text-[8px] font-mono font-bold text-[#C0C0C0] bg-[#C0C0C0]/10 border border-[#C0C0C0]/30 rounded px-1 py-0.5 tracking-wider">ELITE</span>}
                        {p.rank === 3 && <span className="text-[7px] md:text-[8px] font-mono font-bold text-[#CD7F32] bg-[#CD7F32]/10 border border-[#CD7F32]/30 rounded px-1 py-0.5 tracking-wider">VETERAN</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <TierBadge tier={tier} />
                        <span className={`text-[7px] md:text-[8px] font-mono ${p.move === 'up' ? 'text-emerald-400' : p.move === 'down' ? 'text-rose-400' : 'text-white/30'}`}>
                          {p.move === 'up' ? '\u25B2' : p.move === 'down' ? '\u25BC' : '-'}{p.moveAmount > 0 ? ` ${p.moveAmount}` : ''}
                        </span>
                        {!p.me && isOnline && (
                          <button
                            onClick={(e) => { e.stopPropagation(); liveToggleFollow(p.id); }}
                            className={`text-[7px] font-mono font-bold px-1.5 py-0.5 rounded border transition-all ${
                              isFollowing
                                ? 'text-white/40 border-white/[0.1] bg-white/[0.03]'
                                : 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10 hover:bg-cyan-400/20'
                            }`}
                          >
                            {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                          </button>
                        )}
                      </div>
                      {p.me && (
                        <div className="mt-1">
                          <span className="text-[7px] md:text-[8px] font-mono text-amber-400/80 bg-amber-400/10 border border-amber-400/20 rounded px-1.5 py-0.5 tracking-wider">
                            CLIMB TO #{p.rank - 1} → +500 XP
                          </span>
                        </div>
                      )}
                    </div>

                    <span className="font-mono text-[11px] md:text-sm font-bold text-emerald-400 text-right">{p.nw}</span>
                    <div className="flex justify-end">
                      <Sparkline data={p.sparkline} color={sparkColor} width={56} height={16} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== PROFILE ==================== */}
        {activeTab === 'profile' && (
          <div className="animate-fade-in max-w-lg mx-auto mt-2 md:mt-4 flex flex-col gap-4">

            {/* Profile Header */}
            <div className="bg-[#0a0e17] border border-white/[0.08] rounded-xl p-5 md:p-7 flex flex-col items-center">
              <Avatar initial={(isOnline ? (user?.user_metadata?.display_name?.[0] || 'Y') : 'S').toUpperCase()} color="cyan" size="lg" level={store.playerLevel || 12} showRing />
              <h2 className="text-white font-mono text-xl md:text-2xl mb-1 mt-4 font-bold">{isOnline ? (user?.user_metadata?.display_name || 'You') : 'ShowMan'}</h2>
              <div className="flex items-center gap-2 mb-1">
                <TierBadge tier={store.playerTier || 'Silver'} />
                <span className="text-white/50 font-mono text-[9px] md:text-[10px]">Level {store.playerLevel || 12} / 20</span>
              </div>

              {/* XP Progress */}
              <div className="w-full max-w-[200px] mt-2 mb-5">
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-300 rounded-full w-[60%] shadow-[0_0_8px_rgba(0,229,255,0.4)]"></div>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-white/30 font-mono text-[8px]">7,200 XP</span>
                  <span className="text-white/30 font-mono text-[8px]">12,000 XP</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
                {[
                  { label: 'Followers', value: (followers + (isOnline ? followerCount : 0)).toLocaleString(), accent: 'text-cyan-400' },
                  { label: 'Reputation', value: socialReputation.toLocaleString(), accent: 'text-purple-400' },
                  { label: 'Following', value: (socialFollowing.length + (isOnline ? liveFollowing.size : 0)).toString(), accent: 'text-amber-400' },
                  { label: 'Posts', value: (socialPosts.length + (isOnline ? livePosts.filter(p => p.author_id === user?.id).length : 0)).toString(), accent: 'text-emerald-400' },
                ].map(s => (
                  <div key={s.label} className="bg-black/40 border border-white/[0.06] rounded-lg p-3 text-center">
                    <div className={`font-mono font-bold text-sm md:text-base ${s.accent}`}>{s.value}</div>
                    <div className="text-white/40 font-mono text-[8px] md:text-[9px] uppercase tracking-wider mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Streaks */}
              <div className="w-full mt-4 flex items-center justify-center gap-2 bg-amber-400/[0.06] border border-amber-400/20 rounded-lg px-4 py-2.5">
                <span className="text-base">&#128293;</span>
                <span className="text-[10px] font-mono font-bold text-amber-400 tracking-wider uppercase">Daily Login Streak: 7 days</span>
                <span className="text-base">&#128293;</span>
              </div>
            </div>

            {/* Creator Economy Card */}
            <div className="bg-gradient-to-br from-[#0d1220] via-[#0a0f1a] to-[#1a0a1a] border border-rose-500/20 rounded-xl p-4 md:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  <span className="text-white/50 font-mono text-[9px] md:text-[10px] uppercase tracking-widest">Creator Program</span>
                </div>
                <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded border ${
                  creatorTierName === 'Diamond' ? 'text-cyan-300 bg-cyan-300/10 border-cyan-300/30' :
                  creatorTierName === 'Platinum' ? 'text-blue-300 bg-blue-300/10 border-blue-300/30' :
                  creatorTierName === 'Gold' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' :
                  creatorTierName === 'Silver' ? 'text-gray-300 bg-gray-300/10 border-gray-300/30' :
                  'text-orange-400 bg-orange-400/10 border-orange-400/30'
                } uppercase tracking-wider`}>{creatorTierName} Creator</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-black/40 border border-white/[0.06] rounded-lg p-2.5 text-center">
                  <div className="text-emerald-400 font-mono font-bold text-sm">{'\u20AC'}{creatorEarnings.toFixed(2)}</div>
                  <div className="text-white/40 font-mono text-[7px] uppercase tracking-wider mt-0.5">Earnings</div>
                </div>
                <div className="bg-black/40 border border-white/[0.06] rounded-lg p-2.5 text-center">
                  <div className="text-cyan-400 font-mono font-bold text-sm">{creatorTotalViews.toLocaleString()}</div>
                  <div className="text-white/40 font-mono text-[7px] uppercase tracking-wider mt-0.5">Total Views</div>
                </div>
                <div className="bg-black/40 border border-white/[0.06] rounded-lg p-2.5 text-center">
                  <div className="text-rose-400 font-mono font-bold text-sm">{creatorTotalLikes.toLocaleString()}</div>
                  <div className="text-white/40 font-mono text-[7px] uppercase tracking-wider mt-0.5">Total Likes</div>
                </div>
                <div className="bg-black/40 border border-white/[0.06] rounded-lg p-2.5 text-center">
                  <div className="text-purple-400 font-mono font-bold text-sm">LVL {creatorLevel.level}</div>
                  <div className="text-white/40 font-mono text-[7px] uppercase tracking-wider mt-0.5">Creator Level</div>
                </div>
              </div>

              {/* XP Progress */}
              <div className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-[7px] font-mono text-white/30">{creatorXp.toLocaleString()} XP</span>
                  <span className="text-[7px] font-mono text-white/30">{creatorLevel.nextThreshold.toLocaleString()} XP</span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-rose-500 to-pink-400 rounded-full shadow-[0_0_6px_rgba(244,63,94,0.4)] transition-all" style={{ width: `${(creatorLevel.progress * 100).toFixed(0)}%` }} />
                </div>
              </div>

              {/* Monetization Tiers */}
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                {MONETIZATION_TIERS.map(tier => {
                  const active = creatorTierName === tier.name;
                  const unlocked = creatorLevel.level >= tier.minLevel;
                  return (
                    <div key={tier.name} className={`shrink-0 px-2.5 py-1.5 rounded border text-center ${
                      active ? 'border-rose-400/40 bg-rose-500/10' :
                      unlocked ? 'border-white/[0.08] bg-white/[0.02]' :
                      'border-white/[0.04] bg-black/20 opacity-40'
                    }`}>
                      <div className={`text-[8px] font-mono font-bold ${active ? 'text-rose-400' : unlocked ? 'text-white/60' : 'text-white/20'}`}>{tier.name}</div>
                      <div className="text-[7px] font-mono text-white/30">{tier.rate}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="bg-[#0a0e17] border border-white/[0.08] rounded-xl p-4 md:p-5">
              <div className="text-white/50 font-mono text-[9px] md:text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                Operator Stats
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {[
                  { label: 'Net Worth', value: `€${(store.netWorth / 1000).toFixed(0)}K`, icon: '\u20AC' },
                  { label: 'Clips Watched', value: socialClipsWatched.toString(), icon: '\u25B6' },
                  { label: 'Rep Level', value: `Level ${repLevel}`, icon: '\u2605' },
                  { label: 'Clips Saved', value: socialSavedClips.length.toString(), icon: '\u2606' },
                  { label: 'Posts Liked', value: socialLikedPosts.length.toString(), icon: '\u2665' },
                  { label: 'Social Rank', value: `#5 / ${followers.toLocaleString()}`, icon: '#' },
                ].map(s => (
                  <div key={s.label} className="flex justify-between items-center py-1.5 border-b border-white/[0.04] last:border-0">
                    <span className="text-white/50 font-mono text-[10px] md:text-xs flex items-center gap-1.5">
                      <span className="text-cyan-400/50 text-[9px] w-3 text-center">{s.icon}</span>
                      {s.label}
                    </span>
                    <span className="text-white font-mono text-[10px] md:text-xs font-bold">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Badges */}
            <div className="bg-[#0a0e17] border border-white/[0.08] rounded-xl p-4 md:p-5">
              <div className="text-white/50 font-mono text-[9px] md:text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Achievements
                <span className="text-white/30 ml-auto">{PROFILE_BADGES.length} unlocked</span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {PROFILE_BADGES.map(badge => {
                  const c = COLOR_MAP[badge.color] || COLOR_MAP.cyan;
                  return (
                    <div key={badge.label} className="flex flex-col items-center gap-1 group cursor-pointer">
                      <div className={`w-10 h-10 md:w-11 md:h-11 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <span className={`${c.text} font-mono font-bold text-[10px] md:text-xs`}>{badge.icon}</span>
                      </div>
                      <span className="text-white/40 font-mono text-[7px] md:text-[8px] text-center leading-tight">{badge.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-[#0a0e17] border border-white/[0.08] rounded-xl p-4 md:p-5">
              <div className="text-white/50 font-mono text-[9px] md:text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Recent Activity
              </div>
              <div className="flex flex-col gap-1">
                {socialPosts.length > 0 ? (
                  socialPosts.slice(0, 5).map((post, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                      <span className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-mono font-bold shrink-0 text-cyan-400 bg-cyan-400/10">&#9998;</span>
                      <span className="text-white/70 font-mono text-[10px] md:text-xs flex-1 truncate">
                        <TaggedText text={post.text} />
                      </span>
                      <span className="text-white/30 font-mono text-[8px] md:text-[9px] shrink-0">{timeAgo(post.timestamp)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-white/30 font-mono text-[10px] text-center py-4">No activity yet. Start broadcasting on the Campus Feed!</p>
                )}
              </div>
            </div>

            {/* Apply for Verified */}
            <VerificationBadge />
          </div>
        )}

        {/* ==================== FRIENDS TAB ==================== */}
        {activeTab === 'friends' && (
          <div className="animate-fade-in max-w-2xl mx-auto mt-2 md:mt-4 flex flex-col gap-4">

            {/* Guest mode gate */}
            {!isOnline ? (
              <div className="bg-[#0a0e17] border border-white/[0.08] rounded-xl p-8 text-center">
                <span className="text-4xl block mb-3">🔒</span>
                <h3 className="text-white font-mono text-sm font-bold mb-2">Sign In Required</h3>
                <p className="text-white/30 font-mono text-[11px]">Sign in with a Supabase account to add friends and play together.</p>
              </div>
            ) : (
              <>
                {/* Pending Incoming Requests */}
                {friendsStore.requests.filter(r => r.direction === 'incoming').length > 0 && (
                  <div className="bg-[#0a0e17] border border-purple-500/20 rounded-xl p-4 md:p-5">
                    <h3 className="text-[10px] font-mono tracking-[0.2em] uppercase text-purple-400/70 mb-3">
                      FRIEND REQUESTS ({friendsStore.requests.filter(r => r.direction === 'incoming').length})
                    </h3>
                    <div className="space-y-2">
                      {friendsStore.requests.filter(r => r.direction === 'incoming').map(req => (
                        <div key={req.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-purple-500/[0.04] border border-purple-500/10">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-xs">
                              {req.avatar}
                            </div>
                            <div>
                              <span className="text-white font-mono text-xs font-bold">{req.senderName}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] font-mono text-white/30 tracking-wider">{req.senderTier}</span>
                                <span className="text-[8px] font-mono text-white/20">LVL {req.senderLevel}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => friendsStore.acceptRequest(req.id)}
                              className="px-3 py-1.5 rounded text-[9px] font-mono font-bold tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all"
                            >
                              ACCEPT
                            </button>
                            <button
                              onClick={() => friendsStore.declineRequest(req.id)}
                              className="px-3 py-1.5 rounded text-[9px] font-mono font-bold tracking-wider bg-white/5 text-white/30 border border-white/10 hover:text-white/50 transition-all"
                            >
                              DECLINE
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search & Add Friend */}
                <FriendSearchBox friendsStore={friendsStore} />

                {/* Friends List */}
                <div className="bg-[#0a0e17] border border-white/[0.08] rounded-xl p-4 md:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/40">
                      FRIENDS ({friendsStore.friends.length})
                    </h3>
                    <span className="text-[9px] font-mono text-emerald-400/60">
                      {friendsStore.friends.filter(f => f.status === 'online').length} online
                    </span>
                  </div>

                  {friendsStore.friends.length === 0 && (
                    <div className="text-center py-8">
                      <span className="text-3xl mb-3 block">👥</span>
                      <p className="text-white/30 font-mono text-[11px]">No friends yet. Search for a player above to get started.</p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {[...friendsStore.friends]
                      .sort((a, b) => {
                        const order = { online: 0, offline: 1 };
                        return (order[a.status] ?? 1) - (order[b.status] ?? 1);
                      })
                      .map(friend => (
                      <div key={friend.userId} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
                        friend.status === 'online' ? 'bg-emerald-500/[0.03] border-emerald-500/10 hover:border-emerald-500/20' :
                        'bg-white/[0.01] border-white/[0.04] hover:border-white/10'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs border ${
                              friend.status === 'online' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                              'bg-white/5 border-white/10 text-white/30'
                            }`}>
                              {friend.avatar}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0a0e17] ${
                              friend.status === 'online' ? 'bg-emerald-400' : 'bg-white/20'
                            }`} />
                          </div>
                          <div>
                            <span className="text-white font-mono text-xs font-bold">{friend.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-mono text-white/30 tracking-wider">{friend.tier}</span>
                              <span className="text-[8px] font-mono text-white/20">LVL {friend.level}</span>
                              <span className="text-[8px] font-mono text-emerald-400/50">{friend.netWorth}</span>
                            </div>
                            <span className={`text-[8px] font-mono tracking-wider ${
                              friend.status === 'online' ? 'text-emerald-400/60' : 'text-white/15'
                            }`}>
                              {friend.status === 'online' ? 'ONLINE' : 'OFFLINE'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {friend.status === 'online' && (
                            <button
                              onClick={async () => {
                                const displayName = user?.user_metadata?.display_name || 'Anonymous';
                                // Create a room, then send invite with real roomId/roomCode
                                const room = await createRoom(user.id, displayName, {
                                  mode: 'free_for_all', duration: 10, timeMultiplier: 10,
                                  maxPlayers: 2, startingCapital: 500000, allowAgents: true, eventFrequency: 'Normal',
                                });
                                if (room) {
                                  await sendInviteToPlayer(room.id, room.code, user.id, displayName, friend.userId, 'free_for_all', 10);
                                  // Navigate host to the lobby
                                  onJoinRoom?.(room.code);
                                }
                              }}
                              className="px-3 py-1.5 rounded text-[9px] font-mono font-bold tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:bg-purple-500/25 hover:shadow-[0_0_10px_rgba(167,139,250,0.15)] transition-all"
                            >
                              INVITE
                            </button>
                          )}
                          <button
                            onClick={() => friendsStore.removeFriend(friend.requestId)}
                            className="px-2 py-1.5 rounded text-[9px] font-mono text-white/20 hover:text-rose-400/60 transition-colors"
                            title="Remove friend"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Game Invites (incoming) */}
                {friendsStore.invites.filter(i => i.status === 'pending').length > 0 && (
                  <div className="bg-[#0a0e17] border border-amber-500/20 rounded-xl p-4 md:p-5">
                    <h3 className="text-[10px] font-mono tracking-[0.2em] uppercase text-amber-400/70 mb-3">GAME INVITES</h3>
                    <div className="space-y-2">
                      {friendsStore.invites.filter(i => i.status === 'pending').map(inv => (
                        <div key={inv.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-amber-500/[0.03] border border-amber-500/10">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-white/60">{inv.senderName}</span>
                            <span className="text-[10px] font-mono text-amber-400/80 tracking-wider">
                              ROOM {inv.roomCode}
                            </span>
                            <span className="text-[8px] font-mono text-white/20">
                              {inv.mode.replace(/_/g, ' ').toUpperCase()} · {inv.duration}MIN
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                await friendsStore.respondToInvite(inv.id, true);
                                // Navigate to private server and auto-join the room
                                onJoinRoom?.(inv.roomCode);
                              }}
                              className="px-3 py-1.5 rounded text-[9px] font-mono font-bold tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all"
                            >
                              JOIN
                            </button>
                            <button
                              onClick={() => friendsStore.respondToInvite(inv.id, false)}
                              className="px-3 py-1.5 rounded text-[9px] font-mono font-bold tracking-wider bg-white/5 text-white/30 border border-white/10 hover:text-white/50 transition-all"
                            >
                              DECLINE
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outgoing requests */}
                {friendsStore.requests.filter(r => r.direction === 'outgoing').length > 0 && (
                  <div className="bg-[#0a0e17] border border-white/[0.06] rounded-xl p-4 md:p-5">
                    <h3 className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/30 mb-3">
                      PENDING SENT ({friendsStore.requests.filter(r => r.direction === 'outgoing').length})
                    </h3>
                    <div className="space-y-1.5">
                      {friendsStore.requests.filter(r => r.direction === 'outgoing').map(req => (
                        <div key={req.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 font-mono font-bold text-[10px]">
                              {req.avatar}
                            </div>
                            <span className="text-white/50 font-mono text-xs">{req.senderName}</span>
                          </div>
                          <span className="text-[8px] font-mono text-white/20 tracking-wider">PENDING</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ==================== INFLUENCE TAB ==================== */}
        {activeTab === 'influence' && (
          <div className="animate-fade-in flex flex-col max-w-2xl mx-auto gap-4">
            <FollowerDashboard />
            <MarketCallsPanel />
          </div>
        )}

        {/* ==================== RESEARCH DESK TAB ==================== */}
        {activeTab === 'desk' && (
          <div className="animate-fade-in w-full">
            <DeskShell />
          </div>
        )}



      </div>
    </div>
  );
};

export default SocialOS;
