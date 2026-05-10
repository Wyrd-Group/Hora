/**
 * MatchSocial — Air-gapped social media for in-match gameplay.
 * 5 tabs: For You, Campus, Ranking, Influence, Profile.
 * Completely isolated from the real SocialOS.
 * Players can post market sentiment to influence prices.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useMatchSocialStore } from '../../store/matchSocialStore';
import { useMatchStore } from '../../store/matchStore';

// ── Helpers ─────────────────────────────────────────────────────

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return 'now';
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

function formatMoney(n) {
  if (n >= 1e9) return `€${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `€${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `€${(n / 1e3).toFixed(1)}K`;
  return `€${Math.round(n).toLocaleString()}`;
}

const SENTIMENT_COLORS = {
  bullish: 'text-emerald-400',
  bearish: 'text-rose-400',
  neutral: 'text-white/40',
  trash_talk: 'text-orange-400',
};

const SENTIMENT_BADGES = {
  bullish: { label: 'BULL', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  bearish: { label: 'BEAR', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  neutral: { label: 'INFO', color: 'bg-white/5 text-white/40 border-white/10' },
  trash_talk: { label: '🔥', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
};

// ── For You Tab (Feed) ──────────────────────────────────────────

function ForYouTab({ posts, onLike, onRepost }) {
  const [composing, setComposing] = useState(false);
  const [postText, setPostText] = useState('');
  const [postSentiment, setPostSentiment] = useState('neutral');
  const [postAsset, setPostAsset] = useState('');
  const createPost = useMatchSocialStore(s => s.createPost);

  const handlePost = () => {
    if (!postText.trim()) return;
    createPost(postText.trim(), postSentiment, postAsset.trim().toUpperCase() || undefined);
    setPostText('');
    setPostAsset('');
    setPostSentiment('neutral');
    setComposing(false);
  };

  return (
    <div className="space-y-2">
      {/* Compose */}
      {composing ? (
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-3 space-y-2">
          <textarea
            value={postText}
            onChange={e => setPostText(e.target.value)}
            placeholder="Post to the match feed... influence the market"
            rows={2}
            className="w-full bg-transparent border border-white/[0.06] rounded px-2 py-1.5 text-[10px] font-mono text-white/70 placeholder-white/20 resize-none outline-none focus:border-[#a78bfa]/40"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {(['bullish', 'bearish', 'neutral', 'trash_talk']).map(s => (
                <button
                  key={s}
                  onClick={() => setPostSentiment(s)}
                  className={`px-1.5 py-0.5 rounded text-[7px] font-mono border transition-all ${
                    postSentiment === s ? SENTIMENT_BADGES[s].color : 'bg-transparent text-white/15 border-white/[0.04]'
                  }`}
                >
                  {SENTIMENT_BADGES[s].label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={postAsset}
              onChange={e => setPostAsset(e.target.value)}
              placeholder="$TICKER"
              className="w-16 bg-transparent border border-white/[0.06] rounded px-1.5 py-0.5 text-[8px] font-mono text-white/50 placeholder-white/15 outline-none"
            />
            <div className="ml-auto flex gap-1.5">
              <button onClick={() => setComposing(false)} className="px-2 py-0.5 text-[8px] font-mono text-white/20 hover:text-white/40">Cancel</button>
              <button
                onClick={handlePost}
                disabled={!postText.trim()}
                className={`px-2.5 py-0.5 rounded text-[8px] font-mono transition-all ${
                  postText.trim() ? 'bg-[#a78bfa]/20 text-[#a78bfa] border border-[#a78bfa]/30 hover:bg-[#a78bfa]/30' : 'text-white/10 bg-white/[0.02]'
                }`}
              >
                POST
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setComposing(true)}
          className="w-full text-left px-3 py-2 rounded-lg bg-white/[0.015] border border-white/[0.05] text-[10px] font-mono text-white/20 hover:text-white/40 hover:border-white/[0.08] transition-all"
        >
          Post to match feed...
        </button>
      )}

      {/* Feed */}
      <div className="space-y-1">
        {posts.map(post => {
          const badge = SENTIMENT_BADGES[post.sentiment];
          const isSystem = post.authorId === 'system';

          return (
            <div
              key={post.id}
              className={`px-3 py-2 rounded-lg border transition-all ${
                isSystem
                  ? 'bg-[#a78bfa]/[0.04] border-[#a78bfa]/10'
                  : 'bg-white/[0.015] border-white/[0.04] hover:bg-white/[0.025]'
              }`}
            >
              {/* Author line */}
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-mono font-bold ${isSystem ? 'text-[#a78bfa]/70' : 'text-white/60'}`}>
                  {post.authorName}
                </span>
                {post.authorIsBot && <span className="text-[6px] font-mono text-white/15 tracking-wider">BOT</span>}
                <span className={`text-[6px] font-mono px-1 py-px rounded border ${badge.color}`}>
                  {badge.label}
                </span>
                {post.targetAsset && (
                  <span className="text-[8px] font-mono text-cyan-400/60">${post.targetAsset}</span>
                )}
                <span className="ml-auto text-[7px] font-mono text-white/15">{timeAgo(post.timestamp)}</span>
              </div>

              {/* Content */}
              <div className="text-[10px] font-mono text-white/50 mb-1.5 leading-relaxed">{post.content}</div>

              {/* Actions */}
              {!isSystem && (
                <div className="flex items-center gap-4 text-[8px] font-mono">
                  <button
                    onClick={() => onLike(post.id)}
                    className={`flex items-center gap-1 transition-all ${
                      post.likedByMe ? 'text-rose-400/70' : 'text-white/15 hover:text-rose-400/40'
                    }`}
                  >
                    {post.likedByMe ? '♥' : '♡'} {post.likes}
                  </button>
                  <button
                    onClick={() => onRepost(post.id)}
                    className={`flex items-center gap-1 transition-all ${
                      post.repostedByMe ? 'text-cyan-400/70' : 'text-white/15 hover:text-cyan-400/40'
                    }`}
                  >
                    ↻ {post.reposts}
                  </button>
                  {post.influence > 0 && (
                    <span className="text-[7px] text-amber-400/40 ml-auto">
                      ⚡ {post.influence}% influence
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {posts.length === 0 && (
          <div className="text-center py-8 text-[10px] font-mono text-white/15">No posts yet. Be the first.</div>
        )}
      </div>
    </div>
  );
}

// ── Campus Tab ──────────────────────────────────────────────────

function CampusTab({ players, myPlayerId, onFollow }) {
  const leaderboard = useMatchStore(s => s.leaderboard);

  return (
    <div className="space-y-2">
      <div className="text-[8px] font-mono text-white/20 tracking-[0.2em] mb-2">MATCH SERVER — {Object.keys(players).length} CONNECTED</div>

      {/* Active Sentiment */}
      {(() => {
        const shifts = useMatchSocialStore.getState().getActiveSentiment();
        if (shifts.length === 0) return null;
        return (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2 mb-2">
            <div className="text-[7px] font-mono text-white/20 tracking-wider mb-1">ACTIVE MARKET SENTIMENT</div>
            <div className="flex flex-wrap gap-1">
              {shifts.map((s, i) => (
                <span
                  key={i}
                  className={`px-1.5 py-0.5 rounded text-[7px] font-mono border ${
                    s.direction === 'bullish' ? 'bg-emerald-500/10 text-emerald-400/60 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400/60 border-rose-500/20'
                  }`}
                >
                  ${s.asset} {s.direction === 'bullish' ? '↑' : '↓'} {Math.round(s.magnitude * 100)}%
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Player Cards */}
      {Object.values(players).map(player => {
        const isMe = player.playerId === myPlayerId;
        const lbEntry = leaderboard.find(p => p.playerId === player.playerId);

        return (
          <div
            key={player.playerId}
            className={`px-3 py-2 rounded-lg border transition-all ${
              isMe ? 'bg-[#a78bfa]/[0.04] border-[#a78bfa]/15' : 'bg-white/[0.015] border-white/[0.04]'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono font-bold ${isMe ? 'text-[#a78bfa]' : 'text-white/60'}`}>
                    {player.displayName}
                  </span>
                  {isMe && <span className="text-[6px] font-mono text-[#a78bfa]/40">YOU</span>}
                  {player.isBot && <span className="text-[6px] font-mono text-white/15">BOT</span>}
                </div>
                <div className="text-[8px] font-mono text-white/20">{player.companyName}</div>
                <div className="text-[7px] font-mono text-white/15 italic mt-0.5">{player.bio}</div>
              </div>

              <div className="text-right space-y-0.5">
                <div className="text-[9px] font-mono text-white/40">{player.followers} followers</div>
                <div className="text-[8px] font-mono text-white/20">{player.posts} posts</div>
                {lbEntry && <div className="text-[8px] font-mono text-emerald-400/40">{formatMoney(lbEntry.netWorth)}</div>}
              </div>

              {!isMe && (
                <button
                  onClick={() => onFollow(player.playerId)}
                  className="px-2 py-1 rounded text-[7px] font-mono text-cyan-400/60 bg-cyan-400/[0.06] border border-cyan-400/15 hover:bg-cyan-400/[0.12] transition-all"
                >
                  FOLLOW
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Ranking Tab ─────────────────────────────────────────────────

function RankingTab({ myPlayerId }) {
  const leaderboard = useMatchStore(s => s.leaderboard);
  const startingCapital = useMatchStore(s => s.startingCapital);
  const players = useMatchSocialStore(s => s.players);

  const combined = leaderboard.map(lb => ({
    ...lb,
    social: players[lb.playerId],
  }));

  return (
    <div className="space-y-1">
      <div className="text-[8px] font-mono text-white/20 tracking-[0.2em] mb-2">DETAILED RANKINGS</div>

      {/* Column headers */}
      <div className="flex items-center gap-2 px-2 py-1 text-[7px] font-mono text-white/15">
        <span className="w-4">#</span>
        <span className="flex-1">Player</span>
        <span className="w-14 text-right">Net Worth</span>
        <span className="w-10 text-right">P&L</span>
        <span className="w-10 text-right">Nodes</span>
        <span className="w-10 text-right">Trades</span>
        <span className="w-12 text-right">Influence</span>
      </div>

      {combined.map((player, i) => {
        const isMe = player.playerId === myPlayerId;
        const pnl = player.netWorth - startingCapital;
        const pnlPct = ((pnl / startingCapital) * 100).toFixed(1);

        return (
          <div
            key={player.playerId}
            className={`flex items-center gap-2 px-2 py-1.5 rounded transition-all ${
              isMe ? 'bg-[#a78bfa]/[0.06] border border-[#a78bfa]/15' : 'bg-white/[0.01] border border-transparent hover:bg-white/[0.02]'
            }`}
          >
            <span className={`w-4 text-[10px] font-mono font-bold ${
              i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-white/20'
            }`}>
              {player.rank}
            </span>
            <div className="flex-1 min-w-0">
              <span className={`text-[9px] font-mono truncate ${isMe ? 'text-[#a78bfa] font-bold' : 'text-white/50'}`}>
                {player.displayName}
              </span>
              {player.isBot && <span className="text-[6px] font-mono text-white/10 ml-1">BOT</span>}
            </div>
            <span className="w-14 text-right text-[9px] font-mono text-white/50">{formatMoney(player.netWorth)}</span>
            <span className={`w-10 text-right text-[8px] font-mono ${pnl >= 0 ? 'text-emerald-400/60' : 'text-rose-400/60'}`}>
              {pnl >= 0 ? '+' : ''}{pnlPct}%
            </span>
            <span className="w-10 text-right text-[8px] font-mono text-white/30">{player.nodesOwned}</span>
            <span className="w-10 text-right text-[8px] font-mono text-white/30">{player.tradesExecuted}</span>
            <span className="w-12 text-right text-[8px] font-mono text-amber-400/40">
              {player.social?.influenceScore || 0}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Influence Tab ───────────────────────────────────────────────

function InfluenceTab({ myPlayerId }) {
  const players = useMatchSocialStore(s => s.players);
  const sentimentShifts = useMatchSocialStore(s => s.sentimentShifts);
  const makeMarketCall = useMatchSocialStore(s => s.makeMarketCall);
  const ranking = useMemo(
    () => Object.values(players).sort((a, b) => b.influenceScore - a.influenceScore),
    [players],
  );
  const activeSentiment = useMemo(() => {
    const now = Date.now();
    return sentimentShifts.filter(s => s.expiresAt > now);
  }, [sentimentShifts]);

  const [callAsset, setCallAsset] = useState('');
  const [callDirection, setCallDirection] = useState('bullish');

  const me = players[myPlayerId];

  return (
    <div className="space-y-3">
      {/* My Influence Stats */}
      {me && (
        <div className="bg-[#a78bfa]/[0.04] border border-[#a78bfa]/15 rounded-lg p-3">
          <div className="text-[8px] font-mono text-[#a78bfa]/50 tracking-[0.2em] mb-2">YOUR INFLUENCE</div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[7px] font-mono text-white/20">SCORE</div>
              <div className="text-[14px] font-mono font-bold text-[#a78bfa]">{me.influenceScore}</div>
            </div>
            <div>
              <div className="text-[7px] font-mono text-white/20">CREDIBILITY</div>
              <div className="text-[14px] font-mono font-bold text-cyan-400">{me.credibility}</div>
            </div>
            <div>
              <div className="text-[7px] font-mono text-white/20">FOLLOWERS</div>
              <div className="text-[14px] font-mono font-bold text-white/60">{me.followers}</div>
            </div>
          </div>
          <div className="mt-2 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-[#a78bfa]/50 rounded-full transition-all" style={{ width: `${me.influenceScore}%` }} />
          </div>
          <div className="text-[7px] font-mono text-white/15 mt-1">
            Higher influence = more market impact per post. Grow through followers, correct calls, and engagement.
          </div>
        </div>
      )}

      {/* Make Market Call */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
        <div className="text-[8px] font-mono text-white/25 tracking-[0.2em] mb-2">MARKET CALL</div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={callAsset}
            onChange={e => setCallAsset(e.target.value)}
            placeholder="$TICKER"
            className="w-20 bg-transparent border border-white/[0.08] rounded px-2 py-1 text-[9px] font-mono text-white/50 placeholder-white/15 outline-none focus:border-[#a78bfa]/30"
          />
          <div className="flex gap-1">
            <button
              onClick={() => setCallDirection('bullish')}
              className={`px-2 py-1 rounded text-[8px] font-mono border transition-all ${
                callDirection === 'bullish' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'text-white/15 border-white/[0.04]'
              }`}
            >
              BULL ↑
            </button>
            <button
              onClick={() => setCallDirection('bearish')}
              className={`px-2 py-1 rounded text-[8px] font-mono border transition-all ${
                callDirection === 'bearish' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'text-white/15 border-white/[0.04]'
              }`}
            >
              BEAR ↓
            </button>
          </div>
          <button
            onClick={() => {
              if (callAsset.trim()) {
                makeMarketCall(callAsset.trim().toUpperCase(), callDirection);
                setCallAsset('');
              }
            }}
            disabled={!callAsset.trim()}
            className={`px-2.5 py-1 rounded text-[8px] font-mono transition-all ${
              callAsset.trim() ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25' : 'text-white/10 bg-white/[0.02]'
            }`}
          >
            CALL
          </button>
        </div>
        <div className="text-[7px] font-mono text-white/12 mt-1">
          Correct calls boost credibility. Wrong calls hurt it. Credibility amplifies influence.
        </div>
      </div>

      {/* Active Market Sentiment */}
      {activeSentiment.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
          <div className="text-[8px] font-mono text-white/25 tracking-[0.2em] mb-2">LIVE MARKET SENTIMENT</div>
          <div className="space-y-1">
            {activeSentiment.map((s, i) => {
              const remaining = Math.max(0, Math.ceil((s.expiresAt - Date.now()) / 1000));
              return (
                <div key={i} className="flex items-center gap-2 text-[9px] font-mono">
                  <span className="text-cyan-400/60">${s.asset}</span>
                  <span className={s.direction === 'bullish' ? 'text-emerald-400/60' : 'text-rose-400/60'}>
                    {s.direction === 'bullish' ? '↑ BULLISH' : '↓ BEARISH'}
                  </span>
                  <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.direction === 'bullish' ? 'bg-emerald-500/40' : 'bg-rose-500/40'}`}
                      style={{ width: `${s.magnitude * 100}%` }}
                    />
                  </div>
                  <span className="text-white/15 text-[7px]">{remaining}s</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Influence Ranking */}
      <div>
        <div className="text-[8px] font-mono text-white/25 tracking-[0.2em] mb-1.5">INFLUENCE RANKING</div>
        {ranking.map((player, i) => {
          const isMe = player.playerId === myPlayerId;
          return (
            <div
              key={player.playerId}
              className={`flex items-center gap-2 px-2 py-1 rounded text-[9px] font-mono ${
                isMe ? 'bg-[#a78bfa]/[0.04]' : ''
              }`}
            >
              <span className={`w-4 font-bold ${i === 0 ? 'text-amber-400' : 'text-white/15'}`}>{i + 1}</span>
              <span className={isMe ? 'text-[#a78bfa] font-bold flex-1' : 'text-white/40 flex-1'}>{player.displayName}</span>
              <span className="text-amber-400/50">{player.influenceScore}</span>
              <span className="text-white/15 text-[8px]">{player.followers} flw</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Profile Tab ─────────────────────────────────────────────────

function ProfileTab({ myPlayerId }) {
  const players = useMatchSocialStore(s => s.players);
  const posts = useMatchSocialStore(s => s.posts);
  const me = players[myPlayerId];
  const leaderboard = useMatchStore(s => s.leaderboard);
  const startingCapital = useMatchStore(s => s.startingCapital);

  if (!me) return <div className="text-center py-8 text-[10px] font-mono text-white/15">Profile loading...</div>;

  const lbEntry = leaderboard.find(p => p.playerId === myPlayerId);
  const myPosts = posts.filter(p => p.authorId === myPlayerId);
  const totalLikes = myPosts.reduce((sum, p) => sum + p.likes, 0);
  const pnl = lbEntry ? lbEntry.netWorth - startingCapital : 0;

  return (
    <div className="space-y-3">
      {/* Profile Header */}
      <div className="bg-[#a78bfa]/[0.04] border border-[#a78bfa]/15 rounded-lg p-4 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-[#a78bfa]/20 border border-[#a78bfa]/30 flex items-center justify-center text-lg mb-2">
          {me.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="text-[13px] font-mono font-bold text-[#a78bfa]">{me.displayName}</div>
        <div className="text-[9px] font-mono text-white/25">{me.companyName}</div>
        <div className="text-[8px] font-mono text-white/15 italic mt-1">{me.bio}</div>

        <div className="grid grid-cols-4 gap-2 mt-3">
          <div>
            <div className="text-[12px] font-mono font-bold text-white/60">{me.posts}</div>
            <div className="text-[7px] font-mono text-white/20">Posts</div>
          </div>
          <div>
            <div className="text-[12px] font-mono font-bold text-white/60">{me.followers}</div>
            <div className="text-[7px] font-mono text-white/20">Followers</div>
          </div>
          <div>
            <div className="text-[12px] font-mono font-bold text-white/60">{me.following}</div>
            <div className="text-[7px] font-mono text-white/20">Following</div>
          </div>
          <div>
            <div className="text-[12px] font-mono font-bold text-amber-400">{me.influenceScore}</div>
            <div className="text-[7px] font-mono text-white/20">Influence</div>
          </div>
        </div>
      </div>

      {/* Match Stats */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
        <div className="text-[8px] font-mono text-white/25 tracking-[0.2em] mb-2">MATCH STATS</div>
        <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
          <div className="flex justify-between">
            <span className="text-white/25">Rank</span>
            <span className="text-white/50">#{lbEntry?.rank || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/25">Net Worth</span>
            <span className="text-white/50">{lbEntry ? formatMoney(lbEntry.netWorth) : '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/25">P&L</span>
            <span className={pnl >= 0 ? 'text-emerald-400/60' : 'text-rose-400/60'}>
              {pnl >= 0 ? '+' : ''}{formatMoney(pnl)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/25">Nodes</span>
            <span className="text-white/50">{lbEntry?.nodesOwned || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/25">Trades</span>
            <span className="text-white/50">{lbEntry?.tradesExecuted || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/25">Total Likes</span>
            <span className="text-rose-400/50">{totalLikes}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/25">Credibility</span>
            <span className="text-cyan-400/50">{me.credibility}/100</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/25">PvP</span>
            <span className="text-orange-400/50">{lbEntry?.pvpWins || 0}W / {lbEntry?.pvpLosses || 0}L</span>
          </div>
        </div>
      </div>

      {/* My Recent Posts */}
      {myPosts.length > 0 && (
        <div>
          <div className="text-[8px] font-mono text-white/25 tracking-[0.2em] mb-1.5">YOUR POSTS</div>
          <div className="space-y-1">
            {myPosts.slice(0, 5).map(post => (
              <div key={post.id} className="px-2 py-1.5 rounded bg-white/[0.01] border border-white/[0.03] text-[9px] font-mono text-white/40">
                <div className="truncate">{post.content}</div>
                <div className="flex gap-3 mt-0.5 text-[7px] text-white/15">
                  <span>♥ {post.likes}</span>
                  <span>↻ {post.reposts}</span>
                  {post.influence > 0 && <span className="text-amber-400/30">⚡ {post.influence}%</span>}
                  <span className="ml-auto">{timeAgo(post.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main MatchSocial Component ──────────────────────────────────

export default function MatchSocial({ myPlayerId, onClose }) {
  const posts = useMatchSocialStore(s => s.posts);
  const players = useMatchSocialStore(s => s.players);
  const likePost = useMatchSocialStore(s => s.likePost);
  const repostPost = useMatchSocialStore(s => s.repostPost);
  const followPlayer = useMatchSocialStore(s => s.followPlayer);

  const [activeTab, setActiveTab] = useState('foryou');

  // Force re-render for timeAgo + sentiment expiry
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(iv);
  }, []);

  const tabs = [
    { key: 'foryou', label: 'FOR YOU' },
    { key: 'campus', label: 'CAMPUS' },
    { key: 'ranking', label: 'RANKING' },
    { key: 'influence', label: 'INFLUENCE' },
    { key: 'profile', label: 'PROFILE' },
  ];

  return (
    <div className="fixed inset-y-0 left-0 z-[50] w-[340px] bg-[#060a12]/98 backdrop-blur-xl border-r border-white/[0.06] flex flex-col shadow-[4px_0_40px_rgba(0,0,0,0.6)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-[#a78bfa] tracking-wider">SOCIAL</span>
          <span className="text-[7px] font-mono text-white/15 tracking-wider">MATCH FEED</span>
        </div>
        <button
          onClick={onClose}
          className="text-white/20 hover:text-white/50 text-[10px] font-mono transition-all px-1.5 py-0.5"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.04] flex-shrink-0 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-w-0 py-2 text-[7px] font-mono tracking-[0.12em] transition-all whitespace-nowrap px-1 ${
              activeTab === tab.key
                ? 'text-[#a78bfa] border-b border-[#a78bfa]/40 bg-[#a78bfa]/[0.03]'
                : 'text-white/20 hover:text-white/35'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-white/5">
        {activeTab === 'foryou' && <ForYouTab posts={posts} onLike={likePost} onRepost={repostPost} />}
        {activeTab === 'campus' && <CampusTab players={players} myPlayerId={myPlayerId} onFollow={followPlayer} />}
        {activeTab === 'ranking' && <RankingTab myPlayerId={myPlayerId} />}
        {activeTab === 'influence' && <InfluenceTab myPlayerId={myPlayerId} />}
        {activeTab === 'profile' && <ProfileTab myPlayerId={myPlayerId} />}
      </div>
    </div>
  );
}
