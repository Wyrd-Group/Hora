/**
 * ReplayNewsFeed.jsx -- Bulletin news feed during replay sessions.
 * Reveals bulletins at specific ticks, colored by sentiment, sourced from bulletin system.
 */

import { useMemo, useState } from 'react';
import { useReplayStore } from '../../store/replayStore';
import { getScenarioById } from '../../data/replayScenarios';
import { ALL_BULLETINS, NEWS_ORGS, FINANCIAL_TERMS } from '../../data/bulletins';

// ── Deterministic seeded PRNG for bulletin scheduling ──
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ── Sentiment styling ──
const SENTIMENT_STYLES = {
  bullish: {
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    icon: '▲',
  },
  bearish: {
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
    icon: '▼',
  },
  neutral: {
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    icon: '◆',
  },
};

/**
 * Generate scheduled bulletins for a scenario.
 * Deterministically assigns ticks to bulletins based on scenario ID seed.
 * Bulletins appear throughout the replay at natural intervals.
 */
function generateScheduledBulletins(scenario) {
  const seed = hashStr(scenario.id);
  const duration = scenario.duration;

  // Schedule ~1 bulletin every 15-25 ticks
  const intervalBase = Math.max(12, Math.floor(duration / 15));
  const scheduled = [];

  // First, add scenario annotations as "breaking news"
  for (const ann of scenario.annotations) {
    if (ann.type === 'event') {
      scheduled.push({
        id: `ann-${ann.tick}`,
        tick: ann.tick,
        source: 'scenario',
        headline: ann.text.split(':')[0] || ann.text,
        summary: ann.text,
        sentiment: 'neutral',
        category: 'breaking',
        isAnnotation: true,
      });
    }
  }

  // Then schedule regular bulletins throughout the replay
  let tickCursor = Math.floor(intervalBase * 0.5);
  const usedBulletins = new Set();

  while (tickCursor < duration) {
    const bulletinIdx = Math.floor(seededRandom(seed + tickCursor * 3) * ALL_BULLETINS.length);
    const bulletin = ALL_BULLETINS[bulletinIdx];

    if (bulletin && !usedBulletins.has(bulletin.id)) {
      usedBulletins.add(bulletin.id);
      const org = NEWS_ORGS[bulletin.source];

      scheduled.push({
        id: `${bulletin.id}-${tickCursor}`,
        tick: tickCursor,
        source: org?.name ?? bulletin.source,
        sourceId: bulletin.source,
        headline: bulletin.headline,
        summary: bulletin.summary,
        sentiment: bulletin.sentiment,
        category: bulletin.category,
        assets: bulletin.assets,
        impact: bulletin.impact,
        projection: bulletin.projection,
        body: bulletin.body,
        drift: bulletin.drift,
        terms: bulletin.terms,
      });
    }

    // Vary interval slightly for natural feel
    const jitter = Math.floor((seededRandom(seed + tickCursor * 7) - 0.5) * intervalBase * 0.4);
    tickCursor += intervalBase + jitter;
  }

  return scheduled.sort((a, b) => a.tick - b.tick);
}

// ── Individual Bulletin Card ──
function BulletinCard({ bulletin, expanded, onToggle }) {
  const style = SENTIMENT_STYLES[bulletin.sentiment] || SENTIMENT_STYLES.neutral;

  return (
    <div
      className={`border-b border-tactical-border/5 ${
        bulletin.isAnnotation ? 'bg-[#00e5ff]/5' : ''
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full text-left px-3 py-2 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-start gap-2">
          {/* Sentiment icon */}
          <span className={`text-[8px] mt-0.5 ${
            bulletin.sentiment === 'bullish' ? 'text-emerald-400' :
            bulletin.sentiment === 'bearish' ? 'text-rose-400' :
            'text-amber-400'
          }`}>
            {style.icon}
          </span>

          <div className="flex-1 min-w-0">
            {/* Source + tick */}
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[7px] font-mono text-tactical-text/25 uppercase tracking-widest">
                {bulletin.isAnnotation ? 'BREAKING' : bulletin.source}
              </span>
              <span className="text-[7px] font-mono text-tactical-text/15 tabular-nums">
                t{bulletin.tick}
              </span>
              <span className={`text-[6px] font-mono uppercase px-1 py-0.5 rounded border ${style.badge}`}>
                {bulletin.sentiment}
              </span>
              {bulletin.category && !bulletin.isAnnotation && (
                <span className="text-[6px] font-mono text-tactical-text/15 uppercase">
                  {bulletin.category}
                </span>
              )}
            </div>

            {/* Headline */}
            <p className={`text-[9px] font-mono leading-relaxed ${
              bulletin.isAnnotation ? 'text-[#00e5ff]/70' : 'text-tactical-text/60'
            }`}>
              {bulletin.headline}
            </p>

            {/* Assets tags */}
            {bulletin.assets && bulletin.assets.length > 0 && (
              <div className="flex gap-1 mt-1">
                {bulletin.assets.map(a => (
                  <span key={a} className="text-[6px] font-mono text-tactical-text/20 bg-tactical-border/10 px-1 py-0.5 rounded">
                    {a}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && !bulletin.isAnnotation && (
        <div className="px-3 pb-3 pl-7 space-y-2">
          <p className="text-[9px] font-mono text-tactical-text/40 leading-relaxed">
            {bulletin.summary}
          </p>

          {bulletin.impact && (
            <div className="bg-[#0a0f1a]/60 border border-tactical-border/10 rounded p-2">
              <span className="text-[7px] font-mono uppercase tracking-widest text-tactical-text/20 block mb-0.5">Impact</span>
              <p className="text-[8px] font-mono text-tactical-text/35 leading-relaxed">{bulletin.impact}</p>
            </div>
          )}

          {bulletin.projection && (
            <div className="bg-[#0a0f1a]/60 border border-tactical-border/10 rounded p-2">
              <span className="text-[7px] font-mono uppercase tracking-widest text-tactical-text/20 block mb-0.5">Projection</span>
              <p className="text-[8px] font-mono text-tactical-text/35 leading-relaxed">{bulletin.projection}</p>
            </div>
          )}

          {/* Key terms */}
          {bulletin.terms && bulletin.terms.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {bulletin.terms.map(t => {
                const term = FINANCIAL_TERMS[t];
                return term ? (
                  <span
                    key={t}
                    className="text-[6px] font-mono text-[#00e5ff]/40 bg-[#00e5ff]/5 px-1.5 py-0.5 rounded border border-[#00e5ff]/10 cursor-help"
                    title={`${term.term}: ${term.why}`}
                  >
                    {term.term}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Feed Component ──
export default function ReplayNewsFeed() {
  const activeScenarioId = useReplayStore(s => s.activeScenarioId);
  const currentTick = useReplayStore(s => s.currentTick);
  const scenario = activeScenarioId ? getScenarioById(activeScenarioId) : null;
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'bullish' | 'bearish' | 'neutral'

  // Generate and cache bulletins for this scenario
  const scheduledBulletins = useMemo(() => {
    if (!scenario) return [];
    return generateScheduledBulletins(scenario);
  }, [scenario]);

  // Filter to visible (up to current tick) and by sentiment
  const visibleBulletins = useMemo(() => {
    let visible = scheduledBulletins.filter(b => b.tick <= currentTick);
    if (filter !== 'all') visible = visible.filter(b => b.sentiment === filter);
    return visible.reverse(); // newest first
  }, [scheduledBulletins, currentTick, filter]);

  // Count upcoming (for teaser)
  const upcomingCount = scheduledBulletins.filter(b => b.tick > currentTick).length;

  if (!scenario) return null;

  return (
    <div className="border-t border-tactical-border/10 bg-[#060a12]/80 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-tactical-border/10">
        <div className="flex items-center gap-3">
          <h3 className="text-[8px] font-mono uppercase tracking-[0.2em] text-tactical-text/40">
            News Feed
          </h3>
          <span className="text-[7px] font-mono text-tactical-text/15 tabular-nums">
            {visibleBulletins.length} articles
          </span>
          {upcomingCount > 0 && (
            <span className="text-[7px] font-mono text-[#00e5ff]/20 tabular-nums">
              {upcomingCount} pending
            </span>
          )}
        </div>

        {/* Sentiment filter */}
        <div className="flex gap-1">
          {['all', 'bullish', 'bearish', 'neutral'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[7px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded transition-colors ${
                filter === f
                  ? f === 'bullish' ? 'bg-emerald-500/10 text-emerald-400' :
                    f === 'bearish' ? 'bg-rose-500/10 text-rose-400' :
                    f === 'neutral' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-[#00e5ff]/10 text-[#00e5ff]'
                  : 'text-tactical-text/20 hover:text-tactical-text/30'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Bulletin list */}
      <div className="flex-1 overflow-y-auto max-h-[240px]">
        {visibleBulletins.length === 0 ? (
          <p className="text-[9px] font-mono text-tactical-text/15 text-center py-6">
            {currentTick === 0 ? 'News will appear as the replay progresses...' : 'No matching articles'}
          </p>
        ) : (
          visibleBulletins.map(b => (
            <BulletinCard
              key={b.id}
              bulletin={b}
              expanded={expandedId === b.id}
              onToggle={() => setExpandedId(expandedId === b.id ? null : b.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
