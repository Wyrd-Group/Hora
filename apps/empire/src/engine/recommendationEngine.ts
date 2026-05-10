// ── Recommendation Engine ────────────────────────────────────────────
// Hybrid collaborative-filtering + content-based ranking engine.
// Inspired by TikTok's monolith architecture and Twitter's open-source
// "For You" algorithm (heavy-ranker / light-ranker / candidate-gen).
//
// Incorporates algorithms from Quadratic's core engines:
//  - Proof-of-Learning weighted consensus (ConsensusEngine v2):
//    learningScore = successRate*0.7 + experience*0.3 → author credibility
//  - Spectral stability analysis (SpectralEngine v3):
//    eigenvalue gap detection for feed coherence + filter bubble detection
//  - Priority scheduling (TaskOrchestrator v3):
//    priority-weighted queue with time-based tiebreaking
//
// Signals used:
//  1. Explicit: likes, saves, follows, posts
//  2. Implicit: watch/scroll dwell time, clip completion
//  3. Content: category affinity, tag co-occurrence, author affinity
//  4. Social: following graph, engagement reciprocity
//  5. Freshness: time-decay, novelty bonus
//  6. Exploration: epsilon-greedy diversity injection
//  7. Author credibility: Proof-of-Learning weighted quality score
//  8. Feed coherence: spectral gap analysis for diversity health

// ── Types ────────────────────────────────────────────────────────────

export interface UserInteractionLog {
  // Accumulated interest scores per category (0-100 scale)
  categoryScores: Record<string, number>;
  // Per-author affinity (0-100)
  authorScores: Record<string, number>;
  // Tag interest weights
  tagScores: Record<string, number>;
  // Content IDs already seen (for dedup)
  seenIds: Set<string>;
  // Session depth counter (how far into the feed)
  sessionDepth: number;
}

export interface RankableItem {
  id: string;
  authorId: string;
  category?: string;
  tags?: string[];
  text: string;
  likes: number;
  comments?: number;
  saves?: number;
  shares?: number;
  timestamp: number;
  isUserContent?: boolean;   // player-created
  creatorLevel?: number;     // creator's level
}

export interface RankedItem extends RankableItem {
  score: number;
  reason: string; // human-readable reason for ranking
}

// ── Constants ────────────────────────────────────────────────────────

const EPSILON = 0.15;              // 15% exploration rate
const TIME_DECAY_HALF_LIFE = 3600000 * 6; // 6 hours half-life
const ENGAGEMENT_WEIGHT = 0.25;
const PERSONALIZATION_WEIGHT = 0.30;
const FRESHNESS_WEIGHT = 0.12;
const SOCIAL_WEIGHT = 0.10;
const DIVERSITY_WEIGHT = 0.08;
const CREDIBILITY_WEIGHT = 0.10;   // from Proof-of-Learning
const COHERENCE_WEIGHT = 0.05;     // from Spectral stability

// Category taxonomy with parent groups for cross-category affinity
const CATEGORY_GROUPS: Record<string, string> = {
  tip: 'education',
  explainer: 'education',
  strategy: 'trading',
  options: 'trading',
  macro: 'markets',
  crypto: 'markets',
  news: 'markets',
  mindset: 'growth',
};

// ── TF-IDF inspired text relevance ──────────────────────────────────

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'out', 'off', 'up',
  'down', 'this', 'that', 'these', 'those', 'it', 'its', 'your', 'my',
  'and', 'but', 'or', 'nor', 'not', 'no', 'so', 'if', 'when', 'than',
  'too', 'very', 'just', 'about', 'also', 'more', 'i', 'you', 'we',
  'they', 'he', 'she', 'all', 'each', 'every', 'both', 'few', 'some',
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9$#\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

// ── Core Scoring Functions ───────────────────────────────────────────

/** Engagement quality score (0-1) — uses Wilson score interval lower bound
 *  This is the same algorithm Reddit uses for "best" ranking.
 *  It accounts for both the ratio of likes AND the sample size. */
function wilsonScore(likes: number, total: number): number {
  if (total === 0) return 0;
  const z = 1.96; // 95% confidence
  const p = likes / total;
  const denominator = 1 + (z * z) / total;
  const centre = p + (z * z) / (2 * total);
  const spread = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total);
  return (centre - spread) / denominator;
}

function engagementScore(item: RankableItem): number {
  const totalEngagement = item.likes + (item.comments || 0) + (item.saves || 0) * 2 + (item.shares || 0) * 3;
  // Approximate total impressions from engagement (assume 5% engagement rate)
  const estImpressions = Math.max(totalEngagement * 20, 100);
  const wilson = wilsonScore(item.likes, estImpressions);

  // Log-scale engagement magnitude (prevents mega-viral content from dominating)
  const magnitude = Math.log10(Math.max(totalEngagement, 1) + 1) / 5; // normalize to ~0-1

  return wilson * 0.6 + Math.min(magnitude, 1) * 0.4;
}

/** Content-based personalization score (0-1) */
function personalizationScore(item: RankableItem, profile: UserInteractionLog): number {
  let score = 0;
  let weights = 0;

  // Category affinity
  if (item.category) {
    const catScore = (profile.categoryScores[item.category] || 0) / 100;
    score += catScore * 3;
    weights += 3;

    // Cross-category affinity (related categories get partial credit)
    const group = CATEGORY_GROUPS[item.category];
    if (group) {
      for (const [cat, grp] of Object.entries(CATEGORY_GROUPS)) {
        if (grp === group && cat !== item.category) {
          score += ((profile.categoryScores[cat] || 0) / 100) * 0.5;
          weights += 0.5;
        }
      }
    }
  }

  // Author affinity
  const authorAffinity = (profile.authorScores[item.authorId] || 0) / 100;
  score += authorAffinity * 2;
  weights += 2;

  // Tag match (TF-IDF lite)
  const itemKeywords = extractKeywords(item.text);
  const tagMatches = itemKeywords.filter(kw => (profile.tagScores[kw] || 0) > 0);
  if (itemKeywords.length > 0) {
    const tagRelevance = tagMatches.reduce((sum, kw) => sum + (profile.tagScores[kw] || 0), 0) /
      (itemKeywords.length * 100);
    score += tagRelevance * 2;
    weights += 2;
  }

  return weights > 0 ? Math.min(score / weights, 1) : 0;
}

/** Freshness score (0-1) — exponential decay */
function freshnessScore(item: RankableItem): number {
  const age = Date.now() - item.timestamp;
  // Half-life decay
  const decay = Math.pow(0.5, age / TIME_DECAY_HALF_LIFE);
  // Novelty bonus for very fresh content (< 30min)
  const noveltyBonus = age < 1800000 ? 0.2 : 0;
  return Math.min(decay + noveltyBonus, 1);
}

/** Social graph score (0-1) — boost content from followed authors */
function socialScore(item: RankableItem, following: string[]): number {
  let score = 0;
  if (following.includes(item.authorId)) score += 0.6;
  // User-generated content gets social boost
  if (item.isUserContent) score += 0.3;
  // Verified/high-level creators get small boost
  if (item.creatorLevel && item.creatorLevel >= 10) score += 0.1;
  return Math.min(score, 1);
}

/** Diversity score — penalize seeing too much of the same category/author in a row */
function diversityPenalty(
  item: RankableItem,
  recentCategories: string[],
  recentAuthors: string[]
): number {
  let penalty = 0;
  // Category fatigue: penalize if last 3 items had same category
  if (item.category) {
    const catCount = recentCategories.filter(c => c === item.category).length;
    penalty += catCount * 0.15;
  }
  // Author fatigue: penalize repeated authors
  const authorCount = recentAuthors.filter(a => a === item.authorId).length;
  penalty += authorCount * 0.2;

  return Math.min(penalty, 0.6);
}

// ── Proof-of-Learning Author Credibility ─────────────────────────────
// Adapted from ConsensusEngine v2 — weights author quality by their
// historical success rate and experience level, exactly as the swarm
// agents use learningScore = successRate*0.7 + experience*0.3.

export interface AuthorCredibility {
  successRate: number;     // 0-1 (ratio of liked posts to total posts)
  experienceScore: number; // 0-1 (normalized by level/20)
  totalPosts: number;
  totalLikes: number;
  avgEngagement: number;
}

/** Calculate Proof-of-Learning credibility score for an author.
 *  Formula from ConsensusEngine v2: learningScore = successRate*0.7 + experience*0.3
 *  Then consensus confidence = learningScore, used as vote weight. */
function authorCredibilityScore(
  item: RankableItem,
  authorStats: Record<string, AuthorCredibility>
): number {
  const stats = authorStats[item.authorId];
  if (!stats) return 0.5; // neutral for unknown authors

  // Direct port of ConsensusEngine v2's Proof-of-Learning formula
  const successRate = stats.successRate; // already 0-1
  const experienceNorm = Math.min(1.0, stats.totalPosts / 100); // tasks_completed / 100
  const learningScore = (successRate * 0.7) + (experienceNorm * 0.3);

  // Confidence modifier: higher confidence = more reliable signal
  // (same as weighted voting: weightedPositive uses confidence as weight)
  const confidence = learningScore;

  // Apply engagement quality multiplier (average engagement per post)
  const engQuality = Math.min(1, stats.avgEngagement / 200); // normalize against 200 avg

  // Final credibility: learning-weighted confidence * engagement quality
  return confidence * 0.7 + engQuality * 0.3;
}

/** Build author credibility map from all content history */
export function buildAuthorCredibility(
  allContent: RankableItem[],
  likedIds: string[]
): Record<string, AuthorCredibility> {
  const likedSet = new Set(likedIds);
  const authorMap: Record<string, { posts: number; liked: number; totalEng: number; level: number }> = {};

  for (const item of allContent) {
    const a = authorMap[item.authorId] || { posts: 0, liked: 0, totalEng: 0, level: 0 };
    a.posts++;
    a.totalEng += item.likes + (item.comments || 0) + (item.saves || 0);
    if (likedSet.has(item.id)) a.liked++;
    if (item.creatorLevel && item.creatorLevel > a.level) a.level = item.creatorLevel;
    authorMap[item.authorId] = a;
  }

  const result: Record<string, AuthorCredibility> = {};
  for (const [id, stats] of Object.entries(authorMap)) {
    result[id] = {
      successRate: stats.posts > 0 ? stats.liked / stats.posts : 0,
      experienceScore: Math.min(1, stats.level / 20),
      totalPosts: stats.posts,
      totalLikes: stats.liked,
      avgEngagement: stats.posts > 0 ? stats.totalEng / stats.posts : 0,
    };
  }
  return result;
}

// ── Spectral Feed Coherence ──────────────────────────────────────────
// Adapted from SpectralEngine v3 — uses eigenvalue analysis to detect
// filter bubbles (too much category concentration) and inject diversity.
//
// We build a small category co-occurrence matrix from the user's
// interaction history, compute eigenvalues via power iteration, and
// use the spectral gap to determine feed health.
//
// Spectral gap > 0.2 → stable (diverse interests)
// Spectral gap 0.05-0.2 → marginal (mild bubble)
// Spectral gap < 0.05 → unstable (strong filter bubble, force diversity)

/** Power iteration eigenvalue computation — direct port from SpectralEngine v3.
 *  Computes top k eigenvalues using power iteration + Hotelling deflation. */
function computeEigenvalues(matrix: number[][], k?: number): number[] {
  const n = matrix.length;
  if (n === 0) return [];
  const numEigs = Math.min(k || n, n, 10);
  const eigenvalues: number[] = [];

  // Work on a copy for deflation
  const M = matrix.map(row => [...row]);

  for (let eigIdx = 0; eigIdx < numEigs; eigIdx++) {
    // Initialize random vector
    let v = Array.from({ length: n }, () => Math.random() - 0.5);
    let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    v = v.map(x => x / (norm || 1));

    let lambda = 0;

    // Power iteration (max 100 iterations, tolerance 1e-6)
    for (let iter = 0; iter < 100; iter++) {
      // Matrix-vector multiply: Av = M * v
      const Av = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          Av[i] += M[i][j] * v[j];
        }
      }

      // Rayleigh quotient: λ = v · Av
      const newLambda = v.reduce((s, vi, i) => s + vi * Av[i], 0);

      // Normalize: v = Av / ||Av||
      norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0));
      if (norm < 1e-10) break;
      v = Av.map(x => x / norm);

      // Convergence check
      if (Math.abs(newLambda - lambda) < 1e-6) {
        lambda = newLambda;
        break;
      }
      lambda = newLambda;
    }

    eigenvalues.push(lambda);

    // Hotelling deflation: A' = A - λ * v * vᵀ
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        M[i][j] -= lambda * v[i] * v[j];
      }
    }
  }

  return eigenvalues.sort((a, b) => Math.abs(b) - Math.abs(a));
}

/** Compute spectral gap — direct port from SpectralEngine v3 */
function computeSpectralGap(eigenvalues: number[]): number {
  if (eigenvalues.length < 2) return 0;
  return Math.abs(Math.abs(eigenvalues[0]) - Math.abs(eigenvalues[1]));
}

/** Compute stability index — direct port from SpectralEngine v3
 *  gapRatio * (1 - negativePenalty * 0.5), clamped to [0,1] */
function computeStabilityIndex(eigenvalues: number[]): number {
  if (eigenvalues.length < 2) return 0.5;
  const spectralGap = computeSpectralGap(eigenvalues);
  const maxEig = Math.abs(eigenvalues[0]) || 1;
  const gapRatio = spectralGap / maxEig;
  const negativeCount = eigenvalues.filter(e => e < 0).length;
  const negativePenalty = negativeCount / eigenvalues.length;
  const rawIndex = gapRatio * (1 - negativePenalty * 0.5);
  return Math.max(0, Math.min(1, rawIndex));
}

export type FeedHealth = 'diverse' | 'mild_bubble' | 'filter_bubble';

/** Analyze feed coherence using spectral analysis.
 *  Builds a category co-occurrence matrix from user interactions,
 *  then checks the spectral gap to detect filter bubbles. */
export function analyzeFeedCoherence(
  interactedItems: RankableItem[],
  allCategories: string[]
): { health: FeedHealth; stabilityIndex: number; explorationBoost: number } {
  const n = allCategories.length;
  if (n < 2 || interactedItems.length < 3) {
    return { health: 'diverse', stabilityIndex: 0.5, explorationBoost: 0 };
  }

  // Build category co-occurrence matrix
  const catIdx = Object.fromEntries(allCategories.map((c, i) => [c, i]));
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  // For each pair of consecutive interactions, increment co-occurrence
  for (let i = 0; i < interactedItems.length - 1; i++) {
    const c1 = interactedItems[i].category;
    const c2 = interactedItems[i + 1].category;
    if (c1 && c2 && catIdx[c1] !== undefined && catIdx[c2] !== undefined) {
      matrix[catIdx[c1]][catIdx[c2]]++;
      matrix[catIdx[c2]][catIdx[c1]]++; // symmetric
    }
    // Self-occurrence (diagonal)
    if (c1 && catIdx[c1] !== undefined) matrix[catIdx[c1]][catIdx[c1]]++;
  }

  const eigenvalues = computeEigenvalues(matrix, Math.min(n, 5));
  const spectralGap = computeSpectralGap(eigenvalues);
  const stabilityIndex = computeStabilityIndex(eigenvalues);

  // Apply SpectralEngine v3 thresholds
  let health: FeedHealth;
  let explorationBoost: number;

  if (spectralGap > 0.2) {
    health = 'diverse';
    explorationBoost = 0; // healthy feed, no extra exploration needed
  } else if (spectralGap > 0.05) {
    health = 'mild_bubble';
    explorationBoost = 0.08; // slightly boost exploration
  } else {
    health = 'filter_bubble';
    explorationBoost = 0.20; // aggressively inject diverse content
  }

  return { health, stabilityIndex, explorationBoost };
}

// ── Priority Scheduling ──────────────────────────────────────────────
// Adapted from TaskOrchestrator v3 — priority-weighted queue with
// time-based tiebreaking for content scheduling.
// Priority mapping: critical(0) > high(1) > medium(2) > low(3)
// Used to schedule user-generated content among NPC content fairly.

type ContentPriority = 'critical' | 'high' | 'medium' | 'low';

const PRIORITY_ORDER: Record<ContentPriority, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

/** Assign priority to content based on signals — mirrors TaskOrchestrator's
 *  priority queue sorting: priority first, then createdAt for tiebreaking. */
export function assignContentPriority(item: RankableItem): ContentPriority {
  const eng = item.likes + (item.comments || 0) + (item.saves || 0);
  if (eng > 500 || item.isUserContent) return 'critical'; // user's own + viral
  if (eng > 100) return 'high';
  if (eng > 20) return 'medium';
  return 'low';
}

/** Schedule content using task-orchestrator priority queue pattern.
 *  Items sorted by priority first, then by timestamp for tiebreaking. */
export function prioritySchedule(items: RankedItem[]): RankedItem[] {
  return [...items].sort((a, b) => {
    const pa = PRIORITY_ORDER[assignContentPriority(a)];
    const pb = PRIORITY_ORDER[assignContentPriority(b)];
    if (pa !== pb) return pa - pb;
    // Tiebreak by score (higher first), then by timestamp (newer first)
    if (Math.abs(a.score - b.score) > 0.01) return b.score - a.score;
    return b.timestamp - a.timestamp;
  });
}

// ── Interaction Profile Builder ──────────────────────────────────────

/** Build a user interaction profile from their activity history */
export function buildInteractionProfile(
  likedPostIds: string[],
  savedClipIds: string[],
  followingIds: string[],
  userPosts: { text: string }[],
  allContent: RankableItem[],
): UserInteractionLog {
  const categoryScores: Record<string, number> = {};
  const authorScores: Record<string, number> = {};
  const tagScores: Record<string, number> = {};
  const seenIds = new Set<string>();

  // Index all content by ID for fast lookup
  const contentMap = new Map<string, RankableItem>();
  for (const item of allContent) contentMap.set(item.id, item);

  // Score from likes (strongest explicit signal)
  for (const id of likedPostIds) {
    const item = contentMap.get(id);
    if (!item) continue;
    seenIds.add(id);
    if (item.category) categoryScores[item.category] = (categoryScores[item.category] || 0) + 15;
    authorScores[item.authorId] = (authorScores[item.authorId] || 0) + 20;
    for (const kw of extractKeywords(item.text)) {
      tagScores[kw] = (tagScores[kw] || 0) + 5;
    }
  }

  // Score from saves (strong intent signal, 1.5x like weight)
  for (const id of savedClipIds) {
    const item = contentMap.get(id);
    if (!item) continue;
    seenIds.add(id);
    if (item.category) categoryScores[item.category] = (categoryScores[item.category] || 0) + 22;
    authorScores[item.authorId] = (authorScores[item.authorId] || 0) + 25;
    for (const kw of extractKeywords(item.text)) {
      tagScores[kw] = (tagScores[kw] || 0) + 8;
    }
  }

  // Score from follows (social affinity)
  for (const authorId of followingIds) {
    authorScores[authorId] = (authorScores[authorId] || 0) + 40;
  }

  // Score from user's own posts (self-interest signal)
  for (const post of userPosts) {
    for (const kw of extractKeywords(post.text)) {
      tagScores[kw] = (tagScores[kw] || 0) + 10;
    }
  }

  // Normalize all scores to 0-100
  const normalizeTo100 = (scores: Record<string, number>) => {
    const max = Math.max(...Object.values(scores), 1);
    for (const key of Object.keys(scores)) {
      scores[key] = Math.min(100, (scores[key] / max) * 100);
    }
  };

  normalizeTo100(categoryScores);
  normalizeTo100(authorScores);
  normalizeTo100(tagScores);

  // Cold start: if no interactions, seed with balanced category scores
  if (Object.keys(categoryScores).length === 0) {
    for (const cat of Object.keys(CATEGORY_GROUPS)) {
      categoryScores[cat] = 50; // neutral interest
    }
  }

  return { categoryScores, authorScores, tagScores, seenIds, sessionDepth: 0 };
}

// ── Main Ranking Pipeline ────────────────────────────────────────────

/** Multi-pass ranking pipeline: candidate-gen → heavy-rank → rerank → schedule
 *  Modeled after TikTok's monolith architecture + Quadratic engine patterns:
 *  - Pass 1: Heavy scoring (Wilson + personalization + credibility + coherence)
 *  - Pass 2: Sort by composite score
 *  - Pass 3: Epsilon-greedy exploration (boosted by spectral coherence feedback)
 *  - Pass 4: Position-based reranking (hook strategy)
 *  - Pass 5: Priority scheduling (TaskOrchestrator pattern) */
export function rankContent(
  candidates: RankableItem[],
  profile: UserInteractionLog,
  following: string[],
  options: {
    limit?: number;
    boostUnseen?: boolean;
    sessionItems?: RankableItem[];
    authorCredibility?: Record<string, AuthorCredibility>;
    feedCoherence?: { explorationBoost: number };
  } = {}
): RankedItem[] {
  const { limit = 20, boostUnseen = true, sessionItems = [],
    authorCredibility = {}, feedCoherence } = options;

  // Track recent categories/authors for diversity
  const recentCategories = sessionItems.slice(-5).map(i => i.category || '');
  const recentAuthors = sessionItems.slice(-5).map(i => i.authorId);

  // Adaptive exploration rate: base epsilon + spectral coherence feedback
  const adaptiveEpsilon = EPSILON + (feedCoherence?.explorationBoost || 0);

  // ── Pass 1: Heavy scoring with all signals ──
  const scored: RankedItem[] = candidates.map(item => {
    const eng = engagementScore(item);
    const pers = personalizationScore(item, profile);
    const fresh = freshnessScore(item);
    const social = socialScore(item, following);
    const divPenalty = diversityPenalty(item, recentCategories, recentAuthors);
    const credibility = authorCredibilityScore(item, authorCredibility);

    // Unseen bonus
    const unseenBonus = boostUnseen && !profile.seenIds.has(item.id) ? 0.1 : 0;

    // Weighted combination (all weights sum to 1.0)
    let finalScore =
      eng * ENGAGEMENT_WEIGHT +
      pers * PERSONALIZATION_WEIGHT +
      fresh * FRESHNESS_WEIGHT +
      social * SOCIAL_WEIGHT +
      (1 - divPenalty) * DIVERSITY_WEIGHT +
      credibility * CREDIBILITY_WEIGHT +
      COHERENCE_WEIGHT * (1 - divPenalty) + // coherence-driven diversity
      unseenBonus;

    // Determine primary reason
    const scores = [
      { name: 'engagement', val: eng * ENGAGEMENT_WEIGHT },
      { name: 'personalized', val: pers * PERSONALIZATION_WEIGHT },
      { name: 'fresh', val: fresh * FRESHNESS_WEIGHT },
      { name: 'social', val: social * SOCIAL_WEIGHT },
      { name: 'credibility', val: credibility * CREDIBILITY_WEIGHT },
    ];
    scores.sort((a, b) => b.val - a.val);
    const reason = scores[0].name === 'engagement' ? 'Trending'
      : scores[0].name === 'personalized' ? 'Based on your interests'
      : scores[0].name === 'fresh' ? 'New'
      : scores[0].name === 'credibility' ? 'Trusted creator'
      : 'From someone you follow';

    return { ...item, score: finalScore, reason };
  });

  // ── Pass 2: Sort by score ──
  scored.sort((a, b) => b.score - a.score);

  // ── Pass 3: Epsilon-greedy exploration (spectral-adaptive) ──
  const result: RankedItem[] = [];
  const remaining = [...scored];

  for (let i = 0; i < Math.min(limit, remaining.length); i++) {
    if (Math.random() < adaptiveEpsilon && remaining.length > 3) {
      const explorationPool = remaining.slice(Math.floor(remaining.length * 0.4));
      const randomIdx = Math.floor(Math.random() * explorationPool.length);
      const picked = explorationPool[randomIdx];
      picked.reason = 'Discover something new';
      result.push(picked);
      const globalIdx = remaining.indexOf(picked);
      if (globalIdx !== -1) remaining.splice(globalIdx, 1);
    } else {
      result.push(remaining.shift()!);
    }
  }

  // ── Pass 4: Position-based reranking (hook strategy) ──
  if (result.length >= 3) {
    const bestEngagement = result.reduce((best, item, idx) =>
      engagementScore(item) > engagementScore(result[best]) ? idx : best, 0);
    if (bestEngagement > 0) {
      const [item] = result.splice(bestEngagement, 1);
      result.unshift(item);
    }
  }

  // ── Pass 5: Priority scheduling for user-created content ──
  // Ensure user's own content surfaces near the top (TaskOrchestrator pattern)
  const userContent = result.filter(r => r.isUserContent);
  if (userContent.length > 0) {
    // Insert first user post at position 2 (after the hook)
    const userIdx = result.indexOf(userContent[0]);
    if (userIdx > 2) {
      result.splice(userIdx, 1);
      result.splice(2, 0, userContent[0]);
    }
  }

  return result;
}

// ── BizTok-specific ranking ──────────────────────────────────────────
// TikTok-style: heavier weight on completion/save signals,
// stronger exploration, full-screen so order matters more

export function rankBizTok(
  clips: RankableItem[],
  profile: UserInteractionLog,
  following: string[],
  options: {
    limit?: number;
    sessionItems?: RankableItem[];
    authorCredibility?: Record<string, AuthorCredibility>;
    feedCoherence?: { explorationBoost: number };
  } = {}
): RankedItem[] {
  const BASE_BIZTOK_EPSILON = 0.20;
  const { limit = 20, sessionItems = [], authorCredibility = {}, feedCoherence } = options;

  // Spectral-adaptive exploration: if filter bubble detected, explore harder
  const epsilon = BASE_BIZTOK_EPSILON + (feedCoherence?.explorationBoost || 0);

  const recentCategories = sessionItems.slice(-3).map(i => i.category || '');
  const recentAuthors = sessionItems.slice(-3).map(i => i.authorId);

  const scored: RankedItem[] = clips.map(item => {
    const eng = engagementScore(item);
    const pers = personalizationScore(item, profile);
    const fresh = freshnessScore(item);
    const social = socialScore(item, following);
    const divPenalty = diversityPenalty(item, recentCategories, recentAuthors);
    const credibility = authorCredibilityScore(item, authorCredibility);
    const unseenBonus = !profile.seenIds.has(item.id) ? 0.15 : 0;

    // BizTok weights: personalization dominates (like TikTok)
    // + Proof-of-Learning credibility for educational content quality
    let finalScore =
      eng * 0.15 +
      pers * 0.35 +
      fresh * 0.08 +
      social * 0.08 +
      credibility * 0.12 +     // educational quality matters on BizTok
      (1 - divPenalty) * 0.12 +
      unseenBonus;

    // Already-seen penalty
    if (profile.seenIds.has(item.id)) finalScore *= 0.3;

    const reason = pers > 0.5 ? 'Matched to your interests'
      : credibility > 0.6 ? 'Top creator'
      : eng > 0.5 ? 'Trending clip'
      : social > 0.3 ? 'From creators you follow'
      : 'Discover';

    return { ...item, score: finalScore, reason };
  });

  scored.sort((a, b) => b.score - a.score);

  // Spectral-adaptive epsilon-greedy exploration
  const result: RankedItem[] = [];
  const remaining = [...scored];

  for (let i = 0; i < Math.min(limit, remaining.length); i++) {
    if (Math.random() < epsilon && remaining.length > 2) {
      const pool = remaining.slice(Math.floor(remaining.length * 0.3));
      const idx = Math.floor(Math.random() * pool.length);
      const picked = pool[idx];
      picked.reason = 'Discover';
      result.push(picked);
      remaining.splice(remaining.indexOf(picked), 1);
    } else {
      result.push(remaining.shift()!);
    }
  }

  // Category diversity enforcement in first 5 clips
  if (result.length >= 5) {
    const seen = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const cat = result[i].category || '';
      if (seen.has(cat)) {
        const swapIdx = result.findIndex((r, j) => j > 4 && !seen.has(r.category || ''));
        if (swapIdx !== -1) {
          [result[i], result[swapIdx]] = [result[swapIdx], result[i]];
        }
      }
      seen.add(result[i].category || '');
    }
  }

  return result;
}

// ── For You (Twitter/Instagram hybrid) ──────────────────────────────
// Mix of followed-author content + algorithmic suggestions

/** For You ranking — Twitter/Instagram hybrid with full engine pipeline.
 *  Splits content into followed vs algorithmic pools, ranks each with
 *  credibility + coherence, then interleaves with priority scheduling. */
export function rankForYou(
  posts: RankableItem[],
  profile: UserInteractionLog,
  following: string[],
  options: {
    limit?: number;
    authorCredibility?: Record<string, AuthorCredibility>;
    feedCoherence?: { explorationBoost: number };
  } = {}
): RankedItem[] {
  const { limit = 15, authorCredibility, feedCoherence } = options;

  // Split into followed vs algorithmic pools
  const followedPosts = posts.filter(p => following.includes(p.authorId));
  const algorithmicPosts = posts.filter(p => !following.includes(p.authorId));

  // Rank each pool with full engine pipeline
  const commonOpts = { authorCredibility, feedCoherence };
  const rankedFollowed = rankContent(followedPosts, profile, following,
    { limit: Math.ceil(limit * 0.4), ...commonOpts });
  const rankedAlgo = rankContent(algorithmicPosts, profile, following,
    { limit: Math.ceil(limit * 0.6), ...commonOpts });

  // Interleave: F-A-A-F-A-A (40/60 split — Twitter-style)
  const result: RankedItem[] = [];
  let fi = 0, ai = 0;

  for (let i = 0; i < limit; i++) {
    if (i % 3 === 0 && fi < rankedFollowed.length) {
      result.push(rankedFollowed[fi++]);
    } else if (ai < rankedAlgo.length) {
      result.push(rankedAlgo[ai++]);
    } else if (fi < rankedFollowed.length) {
      result.push(rankedFollowed[fi++]);
    }
  }

  // Final priority pass for user content (TaskOrchestrator)
  return prioritySchedule(result);
}

// ── Creator Monetization Calculator ──────────────────────────────────

export interface CreatorEarnings {
  viewRevenue: number;      // € earned from views
  likeBonus: number;        // € bonus from likes
  totalEarnings: number;
  xpGained: number;
  levelProgress: number;    // 0-1
}

// Revenue tiers (like TikTok Creator Fund / YouTube Partner Program)
const REVENUE_PER_1K_VIEWS: Record<string, number> = {
  bronze: 0.02,    // €0.02 per 1K views
  silver: 0.05,
  gold: 0.12,
  platinum: 0.25,
  diamond: 0.50,
};

const CREATOR_LEVEL_THRESHOLDS = [
  0, 50, 150, 400, 1000, 2500, 5000, 10000, 25000, 50000,
  100000, 200000, 350000, 500000, 750000, 1000000, 1500000, 2000000, 3000000, 5000000,
];

export function calculateCreatorEarnings(
  views: number,
  likes: number,
  creatorTier: string,
): CreatorEarnings {
  const rate = REVENUE_PER_1K_VIEWS[creatorTier.toLowerCase()] || REVENUE_PER_1K_VIEWS.bronze;
  const viewRevenue = (views / 1000) * rate;
  const likeBonus = likes * 0.001; // €0.001 per like
  const totalEarnings = viewRevenue + likeBonus;

  // XP: 1 per 10 views + 2 per like
  const xpGained = Math.floor(views / 10) + likes * 2;

  return { viewRevenue, likeBonus, totalEarnings, xpGained, levelProgress: 0 };
}

export function getCreatorLevel(totalXp: number): { level: number; progress: number; nextThreshold: number } {
  let level = 0;
  for (let i = CREATOR_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= CREATOR_LEVEL_THRESHOLDS[i]) {
      level = i;
      break;
    }
  }
  const current = CREATOR_LEVEL_THRESHOLDS[level] || 0;
  const next = CREATOR_LEVEL_THRESHOLDS[level + 1] || current + 10000;
  const progress = (totalXp - current) / (next - current);
  return { level, progress, nextThreshold: next };
}

export function getCreatorTier(level: number): string {
  if (level >= 15) return 'Diamond';
  if (level >= 10) return 'Platinum';
  if (level >= 6) return 'Gold';
  if (level >= 3) return 'Silver';
  return 'Bronze';
}

// ── Monetization Tier Info ──────────────────────────────────────────

export const MONETIZATION_TIERS = [
  { name: 'Bronze', minLevel: 0, rate: '€0.02/1K views', requirement: 'Start creating', color: 'orange' },
  { name: 'Silver', minLevel: 3, rate: '€0.05/1K views', requirement: '500+ total likes', color: 'gray' },
  { name: 'Gold', minLevel: 6, rate: '€0.12/1K views', requirement: '5K+ followers', color: 'yellow' },
  { name: 'Platinum', minLevel: 10, rate: '€0.25/1K views', requirement: '25K+ followers', color: 'blue' },
  { name: 'Diamond', minLevel: 15, rate: '€0.50/1K views', requirement: '100K+ followers', color: 'cyan' },
];
