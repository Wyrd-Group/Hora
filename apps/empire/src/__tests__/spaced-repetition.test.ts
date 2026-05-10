/**
 * Spaced-repetition tests — SM-2 math + seed/review semantics.
 *
 * Guards the scheduler that turns failed exam questions into a daily review
 * deck. Correctness of the SM-2 state transitions and due-card surfacing is
 * what makes the whole review system work.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  useSpacedRepetitionStore,
  sm2Step,
  type ReviewCard,
} from '../store/spacedRepetitionStore';

function resetAll() {
  useSpacedRepetitionStore.setState({
    cards: {},
    lastReviewAt: null,
    reviewStreak: 0,
    totalReviews: 0,
  });
}

beforeEach(resetAll);

// ══════════════════════════════════════════════════════════════
// SM-2 state transitions
// ══════════════════════════════════════════════════════════════

describe('sm2Step — easiness & interval', () => {
  const base: Pick<ReviewCard, 'ef' | 'interval' | 'repetitions' | 'lapses'> = {
    ef: 2.5, interval: 0, repetitions: 0, lapses: 0,
  };

  it('quality 5 on first review → interval 1d, reps 1, EF increases', () => {
    const r = sm2Step(base, 5);
    expect(r.interval).toBe(1);
    expect(r.repetitions).toBe(1);
    expect(r.ef).toBeCloseTo(2.6, 5);
  });

  it('quality 5 on second review → interval 6d', () => {
    const step1 = sm2Step(base, 5);
    const step2 = sm2Step(step1, 5);
    expect(step2.interval).toBe(6);
    expect(step2.repetitions).toBe(2);
  });

  it('quality 5 on third review → interval = prevInterval × EF', () => {
    const step1 = sm2Step(base, 5);
    const step2 = sm2Step(step1, 5);
    const step3 = sm2Step(step2, 5);
    // EF after two q=5 = 2.5 + 0.2 = 2.7 (clamped formula)
    // interval = round(6 * 2.7) = 16
    expect(step3.interval).toBeGreaterThanOrEqual(15);
    expect(step3.repetitions).toBe(3);
  });

  it('quality 2 lapses — resets interval, bumps lapses', () => {
    const step1 = sm2Step(base, 5);
    const step2 = sm2Step(step1, 2);
    expect(step2.repetitions).toBe(0);
    expect(step2.interval).toBe(1);
    expect(step2.lapses).toBe(1);
    // EF still drops from 2.6 toward 1.3 floor
    expect(step2.ef).toBeLessThan(step1.ef);
  });

  it('EF clamped at 1.3 after repeated failures', () => {
    let c = { ...base };
    for (let i = 0; i < 20; i++) c = { ...c, ...sm2Step(c, 0) };
    expect(c.ef).toBe(1.3);
  });
});

// ══════════════════════════════════════════════════════════════
// Store seeding & review cycle
// ══════════════════════════════════════════════════════════════

describe('seedCard', () => {
  it('creates a new card due immediately', () => {
    useSpacedRepetitionStore.getState().seedCard({
      courseId: 'f0-money-earning',
      questionId: 'q1',
      question: 'What is income?',
      options: ['a', 'b', 'c', 'd'],
      correctIndex: 0,
    });
    const cards = Object.values(useSpacedRepetitionStore.getState().cards);
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe('f0-money-earning:q1');
    expect(cards[0].repetitions).toBe(0);
    expect(cards[0].dueAt).toBeLessThanOrEqual(Date.now());
  });

  it('re-seeding an existing card updates text but preserves schedule', () => {
    const s = useSpacedRepetitionStore.getState();
    s.seedCard({
      courseId: 'f0-money-earning', questionId: 'q1',
      question: 'original', options: ['a', 'b', 'c', 'd'], correctIndex: 0,
    });
    s.recordReview('f0-money-earning:q1', 5);
    const scheduled = useSpacedRepetitionStore.getState().cards['f0-money-earning:q1'];

    // Re-seed with changed question text
    s.seedCard({
      courseId: 'f0-money-earning', questionId: 'q1',
      question: 'updated', options: ['a', 'b', 'c', 'd'], correctIndex: 0,
    });

    const after = useSpacedRepetitionStore.getState().cards['f0-money-earning:q1'];
    expect(after.question).toBe('updated');
    expect(after.repetitions).toBe(scheduled.repetitions); // schedule untouched
    expect(after.dueAt).toBe(scheduled.dueAt);
  });
});

describe('dueCards selector', () => {
  it('only surfaces cards whose dueAt ≤ now', () => {
    const s = useSpacedRepetitionStore.getState();
    s.seedCard({ courseId: 'c1', questionId: 'q1', question: '?', options: ['a', 'b', 'c', 'd'], correctIndex: 0 });
    s.seedCard({ courseId: 'c1', questionId: 'q2', question: '?', options: ['a', 'b', 'c', 'd'], correctIndex: 0 });

    // Good review on q1 pushes its due date ~1 day into the future
    s.recordReview('c1:q1', 5);

    const due = useSpacedRepetitionStore.getState().dueCards();
    expect(due.map(c => c.id)).toEqual(['c1:q2']);
  });

  it('dueCount matches dueCards length', () => {
    const s = useSpacedRepetitionStore.getState();
    for (let i = 0; i < 5; i++) {
      s.seedCard({ courseId: 'c1', questionId: `q${i}`, question: '?', options: ['a', 'b', 'c', 'd'], correctIndex: 0 });
    }
    expect(useSpacedRepetitionStore.getState().dueCount()).toBe(5);
  });
});

describe('stats', () => {
  it('counts mastered (reps ≥ 4) and struggling (lapses ≥ 2)', () => {
    const s = useSpacedRepetitionStore.getState();
    s.seedCard({ courseId: 'c1', questionId: 'q1', question: '?', options: ['a', 'b', 'c', 'd'], correctIndex: 0 });
    s.seedCard({ courseId: 'c1', questionId: 'q2', question: '?', options: ['a', 'b', 'c', 'd'], correctIndex: 0 });

    // q1 mastered
    for (let i = 0; i < 4; i++) s.recordReview('c1:q1', 5);
    // q2 struggling
    s.recordReview('c1:q2', 0);
    s.recordReview('c1:q2', 0);

    const stats = useSpacedRepetitionStore.getState().stats();
    expect(stats.total).toBe(2);
    expect(stats.mastered).toBe(1);
    expect(stats.struggling).toBe(1);
  });
});

describe('review streak', () => {
  it('consecutive-day reviews increment the streak', () => {
    const s = useSpacedRepetitionStore.getState();
    s.seedCard({ courseId: 'c1', questionId: 'q1', question: '?', options: ['a', 'b', 'c', 'd'], correctIndex: 0 });
    s.seedCard({ courseId: 'c1', questionId: 'q2', question: '?', options: ['a', 'b', 'c', 'd'], correctIndex: 0 });

    const base = new Date('2026-04-20T12:00:00Z').getTime();
    vi.setSystemTime(base);
    s.recordReview('c1:q1', 5);
    expect(useSpacedRepetitionStore.getState().reviewStreak).toBe(1);

    vi.setSystemTime(base + 24 * 3600 * 1000); // +1 day
    s.recordReview('c1:q2', 5);
    expect(useSpacedRepetitionStore.getState().reviewStreak).toBe(2);
    vi.useRealTimers();
  });

  it('a gap > 1 day resets the streak to 1', () => {
    const s = useSpacedRepetitionStore.getState();
    s.seedCard({ courseId: 'c1', questionId: 'q1', question: '?', options: ['a', 'b', 'c', 'd'], correctIndex: 0 });
    s.seedCard({ courseId: 'c1', questionId: 'q2', question: '?', options: ['a', 'b', 'c', 'd'], correctIndex: 0 });

    const base = new Date('2026-04-20T12:00:00Z').getTime();
    vi.setSystemTime(base);
    s.recordReview('c1:q1', 5);
    vi.setSystemTime(base + 3 * 24 * 3600 * 1000); // +3 days
    s.recordReview('c1:q2', 5);
    expect(useSpacedRepetitionStore.getState().reviewStreak).toBe(1);
    vi.useRealTimers();
  });
});
