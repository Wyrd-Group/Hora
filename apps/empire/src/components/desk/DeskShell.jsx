import { useState } from 'react';
import { useDeskStore } from '../../store/deskStore';
import { PODCASTS, DAILY_DIGESTS, MARKET_BRIEFINGS } from '../../data/deskContent';
import WatchlistPanel from './WatchlistPanel';
import PodcastPlayer from './PodcastPlayer';

/**
 * DeskShell -- Research Desk hub with subtabs: Briefing, Podcasts, Watchlists, Digest.
 * Designed to be placed as a subtab inside Social (not wired yet).
 */

const TABS = [
  { id: 'briefing', label: 'BRIEFING' },
  { id: 'podcasts', label: 'PODCASTS' },
  { id: 'watchlists', label: 'WATCHLISTS' },
  { id: 'digest', label: 'DIGEST' },
];

export default function DeskShell() {
  const { activeTab, setActiveTab, listenedPodcasts, readDigests, markDigestRead } = useDeskStore();
  const [activePodcast, setActivePodcast] = useState(null);
  const [expandedBriefing, setExpandedBriefing] = useState(null);
  const [expandedDigest, setExpandedDigest] = useState(null);

  // Pick today's briefing using day-of-year seed
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000);
  const todayBriefing = MARKET_BRIEFINGS[dayOfYear % MARKET_BRIEFINGS.length];

  return (
    <div className="h-full flex flex-col text-tactical-text">
      {/* Tab bar */}
      <div className="flex border-b border-tactical-border">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-[10px] font-mono tracking-widest transition-colors ${
              activeTab === tab.id
                ? 'text-[#00e5ff] border-b border-[#00e5ff]'
                : 'text-tactical-text/40 hover:text-tactical-text/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">

        {/* ── Briefing Tab ── */}
        {activeTab === 'briefing' && (
          <>
            {/* Today's briefing */}
            <div className="bg-[#0a1020] border border-[#00e5ff]/20 rounded p-3">
              <div className="text-[10px] tracking-widest uppercase text-[#00e5ff]/60 font-mono mb-1">TODAY'S BRIEFING</div>
              <div className="text-sm font-mono text-tactical-text mb-2">{todayBriefing.title}</div>
              {todayBriefing.sections.map((section, i) => (
                <div key={i} className="mb-2">
                  <div className="text-[10px] font-mono text-amber-400/80 mb-0.5">{section.heading}</div>
                  <div className="text-[10px] font-mono text-tactical-text/60 leading-relaxed">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>

            {/* All briefings */}
            <div className="text-[10px] tracking-widest uppercase text-tactical-text/40 font-mono">ALL BRIEFINGS</div>
            {MARKET_BRIEFINGS.map(briefing => (
              <button
                key={briefing.id}
                onClick={() => setExpandedBriefing(expandedBriefing === briefing.id ? null : briefing.id)}
                className="w-full text-left bg-black/20 border border-tactical-border rounded p-2 hover:border-tactical-border/60 transition-colors"
              >
                <div className="text-[10px] font-mono text-tactical-text">{briefing.title}</div>
                <div className="text-[9px] font-mono text-tactical-text/30">{briefing.sections.length} sections</div>
                {expandedBriefing === briefing.id && (
                  <div className="mt-2 space-y-2">
                    {briefing.sections.map((s, i) => (
                      <div key={i}>
                        <div className="text-[9px] font-mono text-amber-400/70">{s.heading}</div>
                        <div className="text-[9px] font-mono text-tactical-text/50 leading-relaxed">{s.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </>
        )}

        {/* ── Podcasts Tab ── */}
        {activeTab === 'podcasts' && (
          <>
            {activePodcast ? (
              <PodcastPlayer
                podcast={activePodcast}
                onClose={() => setActivePodcast(null)}
              />
            ) : (
              <div className="space-y-1.5">
                {PODCASTS.map(pod => {
                  const listened = listenedPodcasts.includes(pod.id);
                  return (
                    <button
                      key={pod.id}
                      onClick={() => setActivePodcast(pod)}
                      className="w-full text-left bg-black/20 border border-tactical-border rounded p-2 hover:border-[#00e5ff]/20 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-[#00e5ff]/10 flex items-center justify-center text-[10px] font-mono text-[#00e5ff]">
                            {listened ? '>' : '|>'}
                          </div>
                          <div>
                            <div className="text-[10px] font-mono text-tactical-text">{pod.title}</div>
                            <div className="text-[9px] font-mono text-tactical-text/30">{pod.host} / {pod.duration} / {pod.topic}</div>
                          </div>
                        </div>
                        {listened && (
                          <span className="text-[9px] font-mono text-emerald-400">DONE</span>
                        )}
                      </div>
                      <div className="text-[9px] font-mono text-tactical-text/40 mt-1 line-clamp-2">
                        {pod.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Watchlists Tab ── */}
        {activeTab === 'watchlists' && <WatchlistPanel />}

        {/* ── Digest Tab ── */}
        {activeTab === 'digest' && (
          <div className="space-y-1.5">
            {DAILY_DIGESTS.map(digest => {
              const isRead = readDigests.includes(digest.id);
              const isExpanded = expandedDigest === digest.id;
              return (
                <button
                  key={digest.id}
                  onClick={() => {
                    setExpandedDigest(isExpanded ? null : digest.id);
                    if (!isRead) markDigestRead(digest.id);
                  }}
                  className="w-full text-left bg-black/20 border border-tactical-border rounded p-2 hover:border-tactical-border/60 transition-colors"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="text-[10px] font-mono text-tactical-text">{digest.title}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-tactical-text/30">{digest.readTime}</span>
                      {isRead && <span className="text-[9px] font-mono text-emerald-400">READ</span>}
                    </div>
                  </div>
                  <div className="text-[9px] font-mono text-tactical-text/30">{digest.authors} / {digest.category}</div>

                  {isExpanded && (
                    <div className="mt-2 space-y-2">
                      <div className="text-[9px] font-mono text-tactical-text/60 leading-relaxed">
                        {digest.abstract}
                      </div>
                      <div>
                        <div className="text-[9px] font-mono text-amber-400/70 mb-1">KEY FINDINGS</div>
                        {digest.keyFindings.map((f, i) => (
                          <div key={i} className="text-[9px] font-mono text-tactical-text/50 leading-relaxed pl-2 border-l border-tactical-border mb-1">
                            {f}
                          </div>
                        ))}
                      </div>
                      <div>
                        <div className="text-[9px] font-mono text-[#00e5ff]/60 mb-0.5">IMPLICATIONS</div>
                        <div className="text-[9px] font-mono text-tactical-text/50 leading-relaxed">
                          {digest.implications}
                        </div>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
