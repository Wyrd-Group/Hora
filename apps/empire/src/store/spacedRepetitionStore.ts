/**
 * spacedRepetitionStore — SM-2 flashcard scheduler for exam questions.
 *
 * Rationale: one-and-done exams test momentary recall. Long-term mastery
 * needs spaced review. Every wrong answer on an ECFL exam seeds a card
 * here; the REVIEW tab surfaces cards whose next-review date has arrived.
 *
 * SM-2 algorithm (SuperMemo 2, 1987):
 *   - quality 0–2: card lapsed; reset repetitions, interval = 1 day.
 *   - quality 3–5: interval grows with easiness; repetitions++.
 *   - EF (easiness factor) is clamped at 1.3 minimum.
 */

import { createPersistedStore } from './createPersistedStore';

// ── Types ───────────────────────────────────────────────────────

export interface ReviewCard {
  id: string;            // unique card id = `${courseId}:${questionId}`
  courseId: string;
  questionId: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  // SM-2 state
  ef: number;            // easiness factor (≥ 1.3)
  interval: number;      // days until next review
  repetitions: number;   // consecutive successful reviews
  dueAt: number;         // ms epoch
  lapses: number;        // cumulative times dropped to quality < 3
  createdAt: number;
  updatedAt: number;
}

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

interface SpacedRepetitionState {
  cards: Record<string, ReviewCard>;
  lastReviewAt: number | null;
  reviewStreak: number;  // consecutive days with ≥1 review
  totalReviews: number;

  // Actions
  seedCard: (input: {
    courseId: string;
    questionId: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
  }) => void;
  recordReview: (cardId: string, quality: ReviewQuality) => void;
  removeCard: (cardId: string) => void;
  clearAll: () => void;

  // Selectors
  dueCards: (now?: number) => ReviewCard[];
  allCardsSorted: () => ReviewCard[];
  dueCount: (now?: number) => number;
  stats: () => {
    total: number;
    due: number;
    mastered: number;   // repetitions ≥ 4
    struggling: number; // lapses ≥ 2
  };
}

// ── SM-2 step (pure) ────────────────────────────────────────────

export function sm2Step(
  card: Pick<ReviewCard, 'ef' | 'interval' | 'repetitions' | 'lapses'>,
  quality: ReviewQuality,
): Pick<ReviewCard, 'ef' | 'interval' | 'repetitions' | 'lapses'> {
  let { ef, interval, repetitions, lapses } = card;

  if (quality < 3) {
    // Lapsed — restart but keep EF drift
    repetitions = 0;
    interval = 1;
    lapses += 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * ef);
    }
  }

  // EF update (classic SM-2 formula)
  const delta =
    0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  ef = Math.max(1.3, ef + delta);

  return { ef, interval, repetitions, lapses };
}

const DAY_MS = 24 * 60 * 60 * 1000;

// ── Store ───────────────────────────────────────────────────────

export const useSpacedRepetitionStore = createPersistedStore<SpacedRepetitionState>(
  'spaced-repetition',
  (set, get) => ({
    cards: {},
    lastReviewAt: null,
    reviewStreak: 0,
    totalReviews: 0,

    seedCard: ({ courseId, questionId, question, options, correctIndex, explanation }) => {
      const id = `${courseId}:${questionId}`;
      const now = Date.now();
      set(s => {
        // If the card already exists, leave its schedule alone — just refresh question text
        // in case the exam bank was edited.
        const existing = s.cards[id];
        if (existing) {
          return {
            cards: {
              ...s.cards,
              [id]: {
                ...existing,
                question,
                options,
                correctIndex,
                explanation,
                updatedAt: now,
              },
            },
          };
        }
        const card: ReviewCard = {
          id,
          courseId,
          questionId,
          question,
          options,
          correctIndex,
          explanation,
          ef: 2.5,
          interval: 0,
          repetitions: 0,
          dueAt: now, // immediately due
          lapses: 0,
          createdAt: now,
          updatedAt: now,
        };
        return { cards: { ...s.cards, [id]: card } };
      });
    },

    recordReview: (cardId, quality) => {
      const now = Date.now();
      const card = get().cards[cardId];
      if (!card) return;

      const next = sm2Step(card, quality);
      const dueAt = now + next.interval * DAY_MS;

      set(s => {
        // Streak logic: if last review was yesterday, +1; if today, unchanged; else reset to 1.
        const last = s.lastReviewAt;
        let streak = s.reviewStreak;
        if (!last) {
          streak = 1;
        } else {
          const dayDiff = Math.floor((now - last) / DAY_MS);
          if (dayDiff === 0) {
            streak = Math.max(1, streak);
          } else if (dayDiff === 1) {
            streak = streak + 1;
          } else {
            streak = 1;
          }
        }

        return {
          cards: {
            ...s.cards,
            [cardId]: {
              ...card,
              ...next,
              dueAt,
              updatedAt: now,
            },
          },
          lastReviewAt: now,
          totalReviews: s.totalReviews + 1,
          reviewStreak: streak,
        };
      });
    },

    removeCard: (cardId) => {
      set(s => {
        const next = { ...s.cards };
        delete next[cardId];
        return { cards: next };
      });
    },

    clearAll: () => set({ cards: {}, lastReviewAt: null, reviewStreak: 0, totalReviews: 0 }),

    dueCards: (now = Date.now()) =>
      Object.values(get().cards)
        .filter(c => c.dueAt <= now)
        .sort((a, b) => a.dueAt - b.dueAt),

    allCardsSorted: () =>
      Object.values(get().cards).sort((a, b) => a.dueAt - b.dueAt),

    dueCount: (now = Date.now()) =>
      Object.values(get().cards).filter(c => c.dueAt <= now).length,

    stats: () => {
      const cards = Object.values(get().cards);
      const now = Date.now();
      return {
        total: cards.length,
        due: cards.filter(c => c.dueAt <= now).length,
        mastered: cards.filter(c => c.repetitions >= 4).length,
        struggling: cards.filter(c => c.lapses >= 2).length,
      };
    },
  }),
);
