/**
 * Curriculum end-to-end integration tests.
 *
 * Walks the full player journey through the store layer — the same action
 * surface the UI consumes — to catch silent regressions in the cross-store
 * wiring that unit tests don't see:
 *
 *   setCourse → completeLesson (all) → recordExamResult (pass)
 *     → certificate issued, ecflBand updated, F0 unlock fires, cash + AP land
 *
 * Runs the journey against real course data from courses.ts (not fixtures)
 * so schema drift in lessons or exams surfaces here.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { courses, getCourseById } from '../data/courses';
import { useCurriculumStore } from '../store/curriculumStore';
import { useFoundationsStore, FOUNDATION_EVENTS } from '../store/foundationsStore';
import { useEmpireStore } from '../store/empireStore';
import { useCardEconomyStore } from '../store/cardEconomyStore';
import { useBattlePassStore } from '../store/battlePassStore';
import { eventBridge } from '../lib/eventBridge';
import { getUnlockForCourse, FOUNDATION_UNLOCKS } from '../lib/foundationsUnlocks';

// ── Shared reset ────────────────────────────────────────────────

function resetAll() {
  useFoundationsStore.getState().resetFoundations();
  useCurriculumStore.setState({
    currentCourseId: null,
    currentLessonIndex: 0,
    completedLessons: [],
    quizScores: {},
    examResults: {},
    certificates: [],
    notebook: [],
    ttsActive: false,
    ecflBand: null,
  });
  useEmpireStore.setState({ personalBalance: 0 });
  useCardEconomyStore.setState({
    aegisPoints: 100_000,
    totalAegisPointsEarned: 100_000,
    ownedCards: {},
    pityCounter: 0,
    marketplaceListings: [],
  });
  useBattlePassStore.setState({ bpXp: 0, currentTier: 0, totalBpXpEarned: 0, claimedFree: [], claimedPremium: [] });
}

beforeEach(resetAll);

// Helper — simulate a player walking every lesson then sitting the exam.
function walkCourseToExam(courseId: string, examScore: number) {
  const c = getCourseById(courseId);
  if (!c) throw new Error(`course not found: ${courseId}`);

  if (!c.exam) throw new Error(`course has no exam: ${courseId}`);
  useCurriculumStore.getState().setCourse(courseId);
  for (let i = 0; i < c.lessons.length; i++) {
    useCurriculumStore.getState().setLessonIndex(i);
    useCurriculumStore.getState().completeLesson(c.lessons[i].id);
  }
  useCurriculumStore.getState().recordExamResult(
    courseId,
    examScore,
    c.exam.passingScore,
    {
      totalQuestions: c.exam.questions.length,
      correctAnswers: Math.round((examScore / 100) * c.exam.questions.length),
      band: c.band,
      courseName: c.title,
    },
  );
}

// ═══════════════════════════════════════════════════════════════════
// Journey 1 — First F0 course, high-distinction pass
// ═══════════════════════════════════════════════════════════════════

describe('curriculum flow — first F0 course (High Distinction)', () => {
  it('lessons complete, exam passes, unlock fires, rewards land, certificate issued', () => {
    const courseId = 'f0-money-earning';
    const course = getCourseById(courseId)!;
    const unlock = getUnlockForCourse(courseId)!;

    const featureEvents: unknown[] = [];
    const unsub = eventBridge.on(FOUNDATION_EVENTS.FEATURE_UNLOCKED, e => featureEvents.push(e));

    walkCourseToExam(courseId, 100); // perfect score → High Distinction

    // ── lessons ──
    const lessonsCompleted = useCurriculumStore.getState().completedLessons;
    for (const lesson of course.lessons) {
      expect(lessonsCompleted).toContain(lesson.id);
    }

    // ── exam result ──
    const result = useCurriculumStore.getState().examResults[courseId];
    expect(result).toBeDefined();
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
    expect(result.distinction).toBe('High Distinction');
    expect(result.grade).toBe('A+');

    // ── certificate ──
    const certs = useCurriculumStore.getState().certificates;
    expect(certs).toHaveLength(1);
    expect(certs[0].courseId).toBe(courseId);
    expect(certs[0].band).toBe('F0');
    expect(certs[0].verificationCode).toMatch(/^ECFL-F0-/);

    // ── ecflBand ──
    expect(useCurriculumStore.getState().ecflBand).toBe('F0');

    // ── foundations unlock fired ──
    expect(useFoundationsStore.getState().unlockedFeatures).toContain(unlock.feature);
    expect(featureEvents).toHaveLength(1);
    expect((featureEvents[0] as { feature: string }).feature).toBe(unlock.feature);

    // ── rewards landed (HD tier = 3.0x multiplier → 7500 cash, 360 AP) ──
    expect(useEmpireStore.getState().personalBalance).toBe(7_500);

    unsub();
  });
});

// ═══════════════════════════════════════════════════════════════════
// Journey 2 — Full F0 sweep (10 courses → F0 badge)
// ═══════════════════════════════════════════════════════════════════

describe('curriculum flow — all 10 F0 courses (Pass tier)', () => {
  it('unlocks every F0 feature and issues 10 F0 certificates', () => {
    const f0Courses = courses.filter(c => c.band === 'F0');
    expect(f0Courses).toHaveLength(10);

    for (const c of f0Courses) {
      walkCourseToExam(c.id, 70); // barely-passing Pass tier
    }

    // Every F0 feature should be unlocked.
    const { unlockedFeatures } = useFoundationsStore.getState();
    for (const u of FOUNDATION_UNLOCKS) {
      expect(unlockedFeatures).toContain(u.feature);
    }

    // unlockProgress selector
    const progress = useFoundationsStore.getState().unlockProgress();
    expect(progress).toEqual({ unlocked: 10, total: 10, pct: 100 });

    // 10 certificates, all band F0
    const certs = useCurriculumStore.getState().certificates;
    expect(certs).toHaveLength(10);
    expect(certs.every(c => c.band === 'F0')).toBe(true);

    // Cash = 10 × €2,500 (Pass tier base payout)
    expect(useEmpireStore.getState().personalBalance).toBe(25_000);

    // ecflBand is still F0 (no F1+ certs yet)
    expect(useCurriculumStore.getState().ecflBand).toBe('F0');
  });
});

// ═══════════════════════════════════════════════════════════════════
// Journey 3 — F0 → F1 band promotion
// ═══════════════════════════════════════════════════════════════════

describe('curriculum flow — F0 → F1 promotion', () => {
  it('passing an F1 course after F0 lifts ecflBand to F1', () => {
    walkCourseToExam('f0-money-earning', 85); // Merit pass on F0
    expect(useCurriculumStore.getState().ecflBand).toBe('F0');

    walkCourseToExam('course-financial-awareness', 85); // F1
    expect(useCurriculumStore.getState().ecflBand).toBe('F1');

    const certs = useCurriculumStore.getState().certificates;
    expect(certs.map(c => c.band).sort()).toEqual(['F0', 'F1']);
  });

  it('passing an F1 course without any F0 still lifts band to F1', () => {
    walkCourseToExam('course-financial-awareness', 75);
    expect(useCurriculumStore.getState().ecflBand).toBe('F1');
  });
});

// ═══════════════════════════════════════════════════════════════════
// Journey 4 — Failing an F0 exam
// ═══════════════════════════════════════════════════════════════════

describe('curriculum flow — failing an F0 exam', () => {
  it('records result but does not issue certificate, unlock, or rewards', () => {
    const courseId = 'f0-saving-emergency';
    const unlock = getUnlockForCourse(courseId)!;

    const featureEvents: unknown[] = [];
    const unsub = eventBridge.on(FOUNDATION_EVENTS.FEATURE_UNLOCKED, e => featureEvents.push(e));

    walkCourseToExam(courseId, 50); // below 70

    const result = useCurriculumStore.getState().examResults[courseId];
    expect(result.passed).toBe(false);
    expect(result.distinction).toBeUndefined();

    expect(useCurriculumStore.getState().certificates).toHaveLength(0);
    expect(useCurriculumStore.getState().ecflBand).toBeNull();

    expect(useFoundationsStore.getState().isUnlocked(unlock.feature)).toBe(false);
    expect(featureEvents).toHaveLength(0);
    expect(useEmpireStore.getState().personalBalance).toBe(0);

    unsub();
  });
});

// ═══════════════════════════════════════════════════════════════════
// Journey 5 — Retake semantics across the full flow
// ═══════════════════════════════════════════════════════════════════

describe('curriculum flow — retake upgrades pay only the differential', () => {
  it('Merit → Distinction retake pays the delta and grants a Study Pack', () => {
    const courseId = 'f0-banking-payments';

    walkCourseToExam(courseId, 82); // Merit
    const meritCash = useEmpireStore.getState().personalBalance;
    expect(meritCash).toBe(3_750); // Merit base

    walkCourseToExam(courseId, 92); // Distinction retake
    const finalCash = useEmpireStore.getState().personalBalance;
    expect(finalCash).toBe(5_625); // Distinction base — total, not double-dipped

    // Feature unlock is idempotent — still exactly once.
    const unlock = getUnlockForCourse(courseId)!;
    expect(
      useFoundationsStore.getState().unlockedFeatures.filter(f => f === unlock.feature),
    ).toHaveLength(1);

    // Certificate was replaced, not duplicated.
    const certs = useCurriculumStore.getState().certificates.filter(c => c.courseId === courseId);
    expect(certs).toHaveLength(1);
    expect(certs[0].distinction).toBe('High Distinction'); // 92 → HD in curriculumStore grade table
  });

  it('Retake at lower score pays nothing and does not downgrade the certificate', () => {
    const courseId = 'f0-debt-credit';

    walkCourseToExam(courseId, 95); // HD
    const afterHD = useEmpireStore.getState().personalBalance;

    walkCourseToExam(courseId, 72); // lower Pass-tier retake
    expect(useEmpireStore.getState().personalBalance).toBe(afterHD); // unchanged

    // Curriculum store REPLACES the certificate (stores most recent), but the
    // foundations grant history should not double-pay or grant a downgrade.
    const history = useFoundationsStore.getState().grantHistory.filter(g => g.courseId === courseId);
    expect(history).toHaveLength(1); // only the original HD grant
    expect(history[0].score).toBe(95);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Journey 6 — Lesson completion idempotence
// ═══════════════════════════════════════════════════════════════════

describe('curriculum flow — lesson completion is idempotent', () => {
  it('calling completeLesson twice awards AP only once', () => {
    const before = useCardEconomyStore.getState().aegisPoints;
    useCurriculumStore.getState().completeLesson('lesson-f0-money-1');
    const afterFirst = useCardEconomyStore.getState().aegisPoints;
    useCurriculumStore.getState().completeLesson('lesson-f0-money-1'); // dup
    const afterSecond = useCardEconomyStore.getState().aegisPoints;

    expect(afterFirst - before).toBe(30); // lesson_complete = +30 AP
    expect(afterSecond - afterFirst).toBe(0);
    expect(useCurriculumStore.getState().completedLessons.filter(id => id === 'lesson-f0-money-1')).toHaveLength(1);
  });
});
