/**
 * NewsFeed.jsx — News article list with category filtering,
 * sentiment badges, and unread indicators.
 */

import { useState, useMemo } from 'react';
import { useNewsStore } from '../../store/newsStore';
import { BULLETIN_CATEGORIES } from '../../data/bulletins';
import ArticleReader from './ArticleReader';

function sentimentColor(s) {
  if (s === 'bullish') return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
  if (s === 'bearish') return 'text-rose-400 bg-rose-500/15 border-rose-500/30';
  return 'text-gray-400 bg-gray-500/15 border-gray-500/30';
}

function sentimentIcon(s) {
  if (s === 'bullish') return '\u25B2';
  if (s === 'bearish') return '\u25BC';
  return '\u25CF';
}

function timeAgo(ts) {
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function NewsFeed() {
  const { bulletins, readBulletins, refreshBulletins, markAsRead } = useNewsStore();
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState(null);

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return bulletins;
    return bulletins.filter((b) => b.category === activeCategory);
  }, [bulletins, activeCategory]);

  const unreadCount = useMemo(
    () => bulletins.filter((b) => !readBulletins.includes(b.id)).length,
    [bulletins, readBulletins],
  );

  const handleOpen = (bulletin) => {
    markAsRead(bulletin.id);
    setSelectedArticle(bulletin);
  };

  if (selectedArticle) {
    return (
      <ArticleReader
        bulletin={selectedArticle}
        onBack={() => setSelectedArticle(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[10px] font-mono tracking-widest uppercase text-tactical-text">
            Intelligence Feed
          </h2>
          {unreadCount > 0 && (
            <span className="text-[9px] font-mono bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/30 px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={() => refreshBulletins(activeCategory === 'all' ? undefined : activeCategory)}
          className="text-[9px] font-mono tracking-wider uppercase text-[#00e5ff]/70 hover:text-[#00e5ff] border border-tactical-border hover:border-[#00e5ff]/40 px-2 py-1 rounded transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 mb-3 border-b border-tactical-border pb-2">
        {BULLETIN_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`text-[9px] font-mono tracking-wider uppercase px-2 py-1 rounded transition-colors ${
              activeCategory === cat.id
                ? 'bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/30'
                : 'text-tactical-text/50 hover:text-tactical-text border border-transparent'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Bulletin List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[10px] font-mono text-tactical-text/40">No bulletins available.</p>
            <p className="text-[9px] font-mono text-tactical-text/25 mt-1">
              Click Refresh to pull latest intel.
            </p>
          </div>
        ) : (
          filtered.map((bulletin) => {
            const isRead = readBulletins.includes(bulletin.id);
            return (
              <button
                key={bulletin.id}
                onClick={() => handleOpen(bulletin)}
                className={`w-full text-left group border rounded-lg px-3 py-2.5 transition-all ${
                  isRead
                    ? 'border-tactical-border/40 bg-transparent hover:border-tactical-border'
                    : 'border-tactical-border hover:border-[#00e5ff]/30 bg-white/[0.01]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Sentiment + Time */}
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-mono border ${sentimentColor(
                          bulletin.sentiment,
                        )}`}
                      >
                        <span>{sentimentIcon(bulletin.sentiment)}</span>
                        {bulletin.sentiment}
                      </span>
                      <span className="text-[8px] font-mono text-tactical-text/30">
                        {timeAgo(bulletin.publishedAt)}
                      </span>
                      <span className="text-[8px] font-mono text-tactical-text/20">
                        {bulletin.source}
                      </span>
                    </div>

                    {/* Headline */}
                    <h3
                      className={`text-[11px] font-mono leading-snug truncate ${
                        isRead
                          ? 'text-tactical-text/50'
                          : 'text-tactical-text group-hover:text-white'
                      }`}
                    >
                      {bulletin.headline}
                    </h3>
                  </div>

                  {/* Unread dot */}
                  {!isRead && (
                    <div className="flex-shrink-0 mt-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
