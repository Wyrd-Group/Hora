/**
 * Match Social Store — Air-gapped social media for in-match gameplay.
 * Completely isolated from the real SocialOS / socialStore / socialExtStore.
 * Lives only during an active match and resets when the match ends.
 *
 * Features:
 *   - Posts feed (For You) — players + bots post market tips, trash talk, propaganda
 *   - Campus — match server community, online players, company overviews
 *   - Ranking — detailed leaderboard with social metrics
 *   - Influence — social influence score, market sentiment manipulation
 *   - Profile — in-match player profile with stats
 *
 * Market influence: posts can shift sentiment on stocks, affecting price volatility.
 * More followers in the match = more influence per post.
 */

import { create } from 'zustand';
import { globalRNG } from '../lib/rng';

// ── Types ────────────────────────────────────────────────────────

export type PostSentiment = 'bullish' | 'bearish' | 'neutral' | 'trash_talk';

export interface MatchPost {
  id: string;
  authorId: string;
  authorName: string;
  authorIsBot: boolean;
  content: string;
  sentiment: PostSentiment;
  targetAsset: string | null;       // Stock/crypto ticker this post is about
  likes: number;
  reposts: number;
  influence: number;                // How much this post moved the market
  timestamp: number;
  likedByMe: boolean;
  repostedByMe: boolean;
}

export interface MatchSocialPlayer {
  playerId: string;
  displayName: string;
  isBot: boolean;
  companyName: string;
  followers: number;                // In-match followers
  following: number;
  posts: number;
  influenceScore: number;           // 0-100, how much market power they have
  credibility: number;              // 0-100, based on correct market calls
  marketCalls: { asset: string; direction: 'bullish' | 'bearish'; timestamp: number; resolved: boolean; correct?: boolean }[];
  bio: string;
}

export interface SentimentShift {
  asset: string;
  direction: 'bullish' | 'bearish';
  magnitude: number;                // 0.0-1.0 how strong the shift is
  expiresAt: number;                // When this sentiment fades
  sourcePostId: string;
}

interface MatchSocialState {
  // Feed
  posts: MatchPost[];
  // Players
  players: Record<string, MatchSocialPlayer>;
  // Market sentiment shifts caused by social posts
  sentimentShifts: SentimentShift[];
  // My state
  myPlayerId: string;

  // Actions
  initialize: (players: Array<{ playerId: string; displayName: string; isBot: boolean }>, myPlayerId: string) => void;
  createPost: (content: string, sentiment: PostSentiment, targetAsset?: string) => void;
  likePost: (postId: string) => void;
  repostPost: (postId: string) => void;
  followPlayer: (playerId: string) => void;
  unfollowPlayer: (playerId: string) => void;
  makeMarketCall: (asset: string, direction: 'bullish' | 'bearish') => void;
  generateBotActivity: () => void;
  getMyProfile: () => MatchSocialPlayer | null;
  getInfluenceRanking: () => MatchSocialPlayer[];
  getActiveSentiment: () => SentimentShift[];
  tick: () => void;
  reset: () => void;
}

// ── Bot Content ──────────────────────────────────────────────────

const BOT_POSTS: Array<{ content: string; sentiment: PostSentiment; asset?: string }> = [
  { content: 'Loading up on $TSLA. This dip is a gift.', sentiment: 'bullish', asset: 'TSLA' },
  { content: '$BTC breaking resistance. Next stop: moon.', sentiment: 'bullish', asset: 'BTC' },
  { content: 'Selling everything. Market correction incoming.', sentiment: 'bearish' },
  { content: '$NVDA overvalued at these levels. Shorting.', sentiment: 'bearish', asset: 'NVDA' },
  { content: 'Just acquired 3 new nodes. Empire expanding.', sentiment: 'neutral' },
  { content: 'My portfolio is up 40% this match. Stay mad.', sentiment: 'trash_talk' },
  { content: 'Who else is bearish on tech right now?', sentiment: 'bearish' },
  { content: '$AAPL earnings going to crush estimates.', sentiment: 'bullish', asset: 'AAPL' },
  { content: 'Diversifying into commodities. Gold looking strong.', sentiment: 'bullish', asset: 'GOLD' },
  { content: 'Your nodes are mine. Coming for you next.', sentiment: 'trash_talk' },
  { content: '$ETH merge was just the beginning. Loading.', sentiment: 'bullish', asset: 'ETH' },
  { content: 'Market is overheated. Cash is king right now.', sentiment: 'bearish' },
  { content: 'Just stole a node from rank #1. Get rekt.', sentiment: 'trash_talk' },
  { content: '$AMZN cloud revenue accelerating. Strong buy.', sentiment: 'bullish', asset: 'AMZN' },
  { content: 'Deploying 5 agents to intel. Knowledge is power.', sentiment: 'neutral' },
  { content: 'Anyone else think bonds are a trap right now?', sentiment: 'bearish', asset: 'BONDS' },
  { content: 'Consolidating positions. Quality over quantity.', sentiment: 'neutral' },
  { content: '$SOL ecosystem exploding. Don\'t sleep on it.', sentiment: 'bullish', asset: 'SOL' },
  { content: 'Heat at 80. Time to lay low.', sentiment: 'neutral' },
  { content: 'GG to whoever is in first. Won\'t last long tho.', sentiment: 'trash_talk' },
  { content: 'Forex majors looking volatile. USD weakness ahead.', sentiment: 'bearish', asset: 'EUR/USD' },
  { content: 'Real estate nodes = passive income machine.', sentiment: 'bullish' },
  { content: 'Just hit €1M net worth. LFG.', sentiment: 'trash_talk' },
  { content: 'Market manipulation should be a crime. Oh wait.', sentiment: 'neutral' },
  { content: '$MSFT AI play is underpriced. Loading calls.', sentiment: 'bullish', asset: 'MSFT' },
];

const BOT_BIOS = [
  'Algorithmic trader. 10x or bust.',
  'Node collector. Your empire is my shopping list.',
  'Value investor. Patience > FOMO.',
  'Degen trader. Send it.',
  'Quant fund operator. Data-driven decisions only.',
  'Empire builder. Infrastructure is king.',
  'Contrarian. When you buy, I sell.',
  'Risk management specialist. Capital preservation first.',
  'Social media mogul. Influence moves markets.',
  'Shadow operator. You won\'t see me coming.',
];

const BOT_COMPANY_NAMES = [
  'Alpha Capital Corp', 'Meridian Holdings', 'Sterling Ventures', 'Zenith Industries',
  'Horizon Group', 'Vanguard Enterprises', 'Obsidian Global', 'Atlas Financial',
  'Drake & Wolfe', 'Nova Capital', 'Ironclad Holdings', 'Cipher Dynamics',
];

let postIdCounter = 0;
function nextPostId(): string {
  return `mp-${Date.now().toString(36)}-${(postIdCounter++).toString(36)}`;
}

// ── Store ─────────────────────────────────────────────────────────

export const useMatchSocialStore = create<MatchSocialState>()((set, get) => ({
  posts: [],
  players: {},
  sentimentShifts: [],
  myPlayerId: '',

  initialize: (players, myPlayerId) => {
    const playerMap: Record<string, MatchSocialPlayer> = {};

    for (const p of players) {
      const seed = p.playerId.charCodeAt(4) || 50;
      playerMap[p.playerId] = {
        playerId: p.playerId,
        displayName: p.displayName,
        isBot: p.isBot,
        companyName: p.isBot ? BOT_COMPANY_NAMES[seed % BOT_COMPANY_NAMES.length] : 'My Empire',
        followers: p.isBot ? globalRNG.int(100, 999) : 0,
        following: p.isBot ? globalRNG.int(50, 249) : 0,
        posts: 0,
        influenceScore: p.isBot ? globalRNG.int(20, 59) : 10,
        credibility: p.isBot ? globalRNG.int(40, 79) : 50,
        marketCalls: [],
        bio: p.isBot ? BOT_BIOS[seed % BOT_BIOS.length] : 'Empire operator.',
      };
    }

    // Initial system post
    const welcomePost: MatchPost = {
      id: nextPostId(),
      authorId: 'system',
      authorName: 'AEGIS SOCIAL',
      authorIsBot: false,
      content: `Match social feed is live. ${players.length} players connected. Post market calls to influence sentiment. Build your influence to move markets.`,
      sentiment: 'neutral',
      targetAsset: null,
      likes: players.length,
      reposts: 0,
      influence: 0,
      timestamp: Date.now(),
      likedByMe: false,
      repostedByMe: false,
    };

    set({
      posts: [welcomePost],
      players: playerMap,
      sentimentShifts: [],
      myPlayerId,
    });
  },

  createPost: (content, sentiment, targetAsset) => {
    const { myPlayerId, players } = get();
    const me = players[myPlayerId];
    if (!me) return;

    const post: MatchPost = {
      id: nextPostId(),
      authorId: myPlayerId,
      authorName: me.displayName,
      authorIsBot: false,
      content,
      sentiment,
      targetAsset: targetAsset || null,
      likes: 0,
      reposts: 0,
      influence: 0,
      timestamp: Date.now(),
      likedByMe: false,
      repostedByMe: false,
    };

    // Calculate influence based on follower count + credibility
    const influencePower = (me.followers / 1000) * (me.credibility / 100) * (me.influenceScore / 100);

    // If post targets an asset and has sentiment, create a sentiment shift
    if (targetAsset && sentiment !== 'neutral' && sentiment !== 'trash_talk') {
      const magnitude = Math.min(0.5, 0.05 + influencePower * 0.3);
      const shift: SentimentShift = {
        asset: targetAsset,
        direction: sentiment as 'bullish' | 'bearish',
        magnitude,
        expiresAt: Date.now() + 120_000, // 2 minutes
        sourcePostId: post.id,
      };
      post.influence = Math.round(magnitude * 100);

      set(s => ({
        sentimentShifts: [...s.sentimentShifts, shift],
        posts: [post, ...s.posts].slice(0, 100),
        players: {
          ...s.players,
          [myPlayerId]: {
            ...me,
            posts: me.posts + 1,
            influenceScore: Math.min(100, me.influenceScore + Math.round(magnitude * 5)),
          },
        },
      }));
    } else {
      set(s => ({
        posts: [post, ...s.posts].slice(0, 100),
        players: {
          ...s.players,
          [myPlayerId]: { ...me, posts: me.posts + 1 },
        },
      }));
    }
  },

  likePost: (postId) => {
    set(s => ({
      posts: s.posts.map(p => {
        if (p.id !== postId || p.likedByMe) return p;
        return { ...p, likes: p.likes + 1, likedByMe: true };
      }),
    }));

    // Give the author a small follower/influence boost
    const post = get().posts.find(p => p.id === postId);
    if (post && post.authorId !== 'system') {
      set(s => {
        const author = s.players[post.authorId];
        if (!author) return s;
        return {
          players: {
            ...s.players,
            [post.authorId]: {
              ...author,
              influenceScore: Math.min(100, author.influenceScore + 1),
            },
          },
        };
      });
    }
  },

  repostPost: (postId) => {
    set(s => ({
      posts: s.posts.map(p => {
        if (p.id !== postId || p.repostedByMe) return p;
        return { ...p, reposts: p.reposts + 1, repostedByMe: true };
      }),
    }));

    // Reposts amplify sentiment shifts
    const post = get().posts.find(p => p.id === postId);
    if (post?.targetAsset && post.sentiment !== 'neutral' && post.sentiment !== 'trash_talk') {
      set(s => ({
        sentimentShifts: s.sentimentShifts.map(shift =>
          shift.sourcePostId === postId
            ? { ...shift, magnitude: Math.min(0.8, shift.magnitude + 0.05), expiresAt: shift.expiresAt + 30_000 }
            : shift
        ),
      }));
    }
  },

  followPlayer: (playerId) => {
    const { myPlayerId, players } = get();
    const me = players[myPlayerId];
    const target = players[playerId];
    if (!me || !target || playerId === myPlayerId) return;

    set(s => ({
      players: {
        ...s.players,
        [myPlayerId]: { ...me, following: me.following + 1 },
        [playerId]: {
          ...target,
          followers: target.followers + 1,
          influenceScore: Math.min(100, target.influenceScore + 2),
        },
      },
    }));
  },

  unfollowPlayer: (playerId) => {
    const { myPlayerId, players } = get();
    const me = players[myPlayerId];
    const target = players[playerId];
    if (!me || !target || playerId === myPlayerId) return;

    set(s => ({
      players: {
        ...s.players,
        [myPlayerId]: { ...me, following: Math.max(0, me.following - 1) },
        [playerId]: {
          ...target,
          followers: Math.max(0, target.followers - 1),
          influenceScore: Math.max(0, target.influenceScore - 1),
        },
      },
    }));
  },

  makeMarketCall: (asset, direction) => {
    const { myPlayerId, players } = get();
    const me = players[myPlayerId];
    if (!me) return;

    const call = { asset, direction, timestamp: Date.now(), resolved: false };

    // Also create a post about the market call
    get().createPost(
      `📊 MARKET CALL: $${asset} — ${direction.toUpperCase()}. Putting my credibility on the line.`,
      direction === 'bullish' ? 'bullish' : 'bearish',
      asset,
    );

    set(s => ({
      players: {
        ...s.players,
        [myPlayerId]: {
          ...me,
          marketCalls: [call, ...me.marketCalls].slice(0, 20),
        },
      },
    }));
  },

  generateBotActivity: () => {
    const { players, posts } = get();
    const bots = Object.values(players).filter(p => p.isBot);
    if (bots.length === 0) return;

    // Random bot posts (30% chance per tick)
    if (globalRNG.chance(0.3)) {
      const bot = globalRNG.pick(bots);
      const template = globalRNG.pick(BOT_POSTS);

      const post: MatchPost = {
        id: nextPostId(),
        authorId: bot.playerId,
        authorName: bot.displayName,
        authorIsBot: true,
        content: template.content,
        sentiment: template.sentiment,
        targetAsset: template.asset || null,
        likes: globalRNG.int(0, 14),
        reposts: globalRNG.int(0, 4),
        influence: 0,
        timestamp: Date.now(),
        likedByMe: false,
        repostedByMe: false,
      };

      // Bot posts can create sentiment shifts too
      if (template.asset && (template.sentiment === 'bullish' || template.sentiment === 'bearish')) {
        const magnitude = Math.min(0.3, (bot.influenceScore / 100) * 0.2);
        const shift: SentimentShift = {
          asset: template.asset,
          direction: template.sentiment,
          magnitude,
          expiresAt: Date.now() + 90_000,
          sourcePostId: post.id,
        };
        post.influence = Math.round(magnitude * 100);

        set(s => ({
          sentimentShifts: [...s.sentimentShifts, shift],
          posts: [post, ...s.posts].slice(0, 100),
          players: {
            ...s.players,
            [bot.playerId]: { ...bot, posts: bot.posts + 1 },
          },
        }));
      } else {
        set(s => ({
          posts: [post, ...s.posts].slice(0, 100),
          players: {
            ...s.players,
            [bot.playerId]: { ...bot, posts: bot.posts + 1 },
          },
        }));
      }
    }

    // Bots randomly like player posts (20% chance)
    if (globalRNG.chance(0.2) && posts.length > 0) {
      const randomPost = posts[globalRNG.int(0, Math.min(10, posts.length) - 1)];
      if (randomPost && randomPost.authorId !== 'system') {
        set(s => ({
          posts: s.posts.map(p =>
            p.id === randomPost.id ? { ...p, likes: p.likes + 1 } : p
          ),
        }));
      }
    }

    // Bots grow followers organically
    const updatedPlayers = { ...get().players };
    for (const bot of bots) {
      if (globalRNG.chance(0.15)) {
        const p = updatedPlayers[bot.playerId];
        updatedPlayers[bot.playerId] = {
          ...p,
          followers: p.followers + globalRNG.int(0, 19),
          influenceScore: Math.min(100, p.influenceScore + (globalRNG.chance(0.3) ? 1 : 0)),
        };
      }
    }
    set({ players: updatedPlayers });
  },

  getMyProfile: () => {
    const { myPlayerId, players } = get();
    return players[myPlayerId] || null;
  },

  getInfluenceRanking: () => {
    const { players } = get();
    return Object.values(players).sort((a, b) => b.influenceScore - a.influenceScore);
  },

  getActiveSentiment: () => {
    const { sentimentShifts } = get();
    return sentimentShifts.filter(s => s.expiresAt > Date.now());
  },

  tick: () => {
    // Clean expired sentiment shifts
    set(s => ({
      sentimentShifts: s.sentimentShifts.filter(shift => shift.expiresAt > Date.now()),
    }));

    // Generate bot activity
    get().generateBotActivity();
  },

  reset: () => {
    set({
      posts: [],
      players: {},
      sentimentShifts: [],
      myPlayerId: '',
    });
  },
}));
