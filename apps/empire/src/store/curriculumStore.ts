import { createPersistedStore } from './createPersistedStore';
import { eventBridge, EVENTS } from '../lib/eventBridge';
import { useCardEconomyStore } from './cardEconomyStore';
import { useBattlePassStore } from './battlePassStore';
import { useFoundationsStore } from './foundationsStore';
import { isFoundationCourse } from '../lib/foundationsUnlocks';
import type { Certificate, NotebookEntry, DistinctionLevel } from '../types/curriculum';

// ── Grade helpers ────────────────────────────────────────────────

function scoreToGrade(pct: number): string {
  if (pct >= 97) return 'A+';
  if (pct >= 93) return 'A';
  if (pct >= 90) return 'A-';
  if (pct >= 87) return 'B+';
  if (pct >= 83) return 'B';
  if (pct >= 80) return 'B-';
  if (pct >= 77) return 'C+';
  if (pct >= 73) return 'C';
  if (pct >= 70) return 'C-';
  if (pct >= 65) return 'D';
  return 'F';
}

function scoreToDistinction(pct: number): DistinctionLevel {
  if (pct >= 90) return 'High Distinction';
  if (pct >= 80) return 'Distinction';
  if (pct >= 70) return 'Merit';
  return 'Pass';
}

// ── Types ────────────────────────────────────────────────────────

type ECFLBand = 'F0' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | null;

interface ExamResult {
  score: number;
  passed: boolean;
  date: number;
  grade?: string;
  distinction?: DistinctionLevel;
  totalQuestions?: number;
  correctAnswers?: number;
  timeTaken?: number;
}

interface CurriculumState {
  currentCourseId: string | null;
  currentLessonIndex: number;
  completedLessons: string[];
  quizScores: Record<string, number>;
  examResults: Record<string, ExamResult>;
  certificates: Certificate[];
  notebook: NotebookEntry[];
  ttsActive: boolean;
  ecflBand: ECFLBand;

  // Actions
  setCourse: (courseId: string) => void;
  clearCourse: () => void;
  setLessonIndex: (index: number) => void;
  completeLesson: (lessonId: string) => void;
  recordQuizScore: (lessonId: string, score: number) => void;
  recordExamResult: (courseId: string, score: number, passingScore: number, meta?: { totalQuestions?: number; correctAnswers?: number; timeTaken?: number; timeAllowed?: number; band?: string; courseName?: string }) => void;
  addNotebookEntry: (lessonId: string, text: string) => void;
  removeNotebookEntry: (id: string) => void;
  toggleTTS: () => void;
  getCompletionPercent: (courseId: string, lessons: { id: string }[]) => number;
  getHighestBand: () => ECFLBand;
}

// ── Store ────────────────────────────────────────────────────────

export const useCurriculumStore = createPersistedStore<CurriculumState>(
  'curriculum',
  (set, get) => ({
    currentCourseId: null,
    currentLessonIndex: 0,
    completedLessons: [],
    quizScores: {},
    examResults: {},
    certificates: [],
    notebook: [],
    ttsActive: false,
    ecflBand: null,

    setCourse: (courseId) => set({ currentCourseId: courseId, currentLessonIndex: 0 }),

    clearCourse: () => set({ currentCourseId: null, currentLessonIndex: 0 }),

    setLessonIndex: (index) => set({ currentLessonIndex: index }),

    completeLesson: (lessonId) => {
      const state = get();
      if (state.completedLessons.includes(lessonId)) return;
      set({ completedLessons: [...state.completedLessons, lessonId] });

      // Award AP and BP-XP directly + emit events
      useCardEconomyStore.getState().awardAegisPoints(30, 'lesson_complete');
      useBattlePassStore.getState().awardBPXP(15);
      eventBridge.emit(EVENTS.LESSON_COMPLETED, { lessonId });
    },

    recordQuizScore: (lessonId, score) => {
      const state = get();
      const prev = state.quizScores[lessonId] ?? 0;
      // Keep highest score
      if (score <= prev) return;
      set({ quizScores: { ...state.quizScores, [lessonId]: score } });

      useCardEconomyStore.getState().awardAegisPoints(20, 'quiz_complete');
      useBattlePassStore.getState().awardBPXP(10);
      eventBridge.emit(EVENTS.QUIZ_COMPLETED, { lessonId, score });
    },

    recordExamResult: (courseId, score, passingScore, meta) => {
      const passed = score >= passingScore;
      const state = get();
      const grade = scoreToGrade(score);
      const distinction = passed ? scoreToDistinction(score) : undefined;

      set({
        examResults: {
          ...state.examResults,
          [courseId]: {
            score,
            passed,
            date: Date.now(),
            grade,
            distinction,
            totalQuestions: meta?.totalQuestions,
            correctAnswers: meta?.correctAnswers,
            timeTaken: meta?.timeTaken,
          },
        },
      });

      if (passed) {
        // Generate rich certificate
        const hash = Date.now().toString(36).toUpperCase();
        const bandCode = (meta?.band ?? 'XX').toUpperCase();
        const verificationCode = `ECFL-${bandCode}-${courseId.slice(7, 15).toUpperCase()}-${hash}`;
        const cert: Certificate = {
          id: `cert-${courseId}-${Date.now()}`,
          courseId,
          courseName: meta?.courseName ?? courseId,
          earnedAt: Date.now(),
          verificationCode,
          band: (meta?.band as Certificate['band']) ?? undefined,
          score,
          grade,
          distinction,
          totalQuestions: meta?.totalQuestions,
          correctAnswers: meta?.correctAnswers,
          timeTaken: meta?.timeTaken,
          timeAllowed: meta?.timeAllowed,
        };

        // Replace existing cert for same course (retake) or add new
        const existingIdx = state.certificates.findIndex(c => c.courseId === courseId);
        const updatedCerts = [...state.certificates];
        if (existingIdx >= 0) {
          updatedCerts[existingIdx] = cert;
        } else {
          updatedCerts.push(cert);
        }
        set({ certificates: updatedCerts });

        // Update ECFL band to highest achieved (F0 counts too — it's the
        // certified "Financial Literacy" floor and the F1 prerequisite).
        const bandHierarchy: Exclude<ECFLBand, null>[] = ['F0', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6'];
        const certBands = updatedCerts.map(c => c.band).filter(Boolean) as string[];
        let highest: ECFLBand = null;
        for (const b of bandHierarchy) {
          if (certBands.includes(b)) highest = b;
        }
        set({ ecflBand: highest });

        // Award AP and BP-XP scaled by band.
        // F0 uses a gentler multiplier so onboarding feels rewarding but
        // doesn't compete with the heavier ECFL bands.
        const bandMultiplier: Record<string, number> = {
          F0: 0.5, F1: 1, F2: 1.5, F3: 2, F4: 3, F5: 4, F6: 5,
        };
        const mult = bandMultiplier[meta?.band ?? 'F1'] ?? 1;
        const apAward = Math.round(100 * mult);
        const bpAward = Math.round(50 * mult);
        useCardEconomyStore.getState().awardAegisPoints(apAward, 'exam_pass');
        useBattlePassStore.getState().awardBPXP(bpAward);
      }

      // ── Foundations reward + feature-unlock dispatcher ──
      // Any F0 exam (pass OR fail) feeds the foundationsStore so it can
      // emit FEATURE_UNLOCKED on first pass and handle tier upgrades.
      if (isFoundationCourse(courseId)) {
        useFoundationsStore.getState().grantExamRewards(courseId, score, passed);
      }
    },

    addNotebookEntry: (lessonId, text) => {
      const state = get();
      const entry: NotebookEntry = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        lessonId,
        text,
        createdAt: Date.now(),
      };
      set({ notebook: [...state.notebook, entry] });
    },

    removeNotebookEntry: (id) => {
      set({ notebook: get().notebook.filter((n) => n.id !== id) });
    },

    toggleTTS: () => set({ ttsActive: !get().ttsActive }),

    getCompletionPercent: (_courseId, lessons) => {
      const completed = get().completedLessons;
      if (!lessons.length) return 0;
      const done = lessons.filter((l) => completed.includes(l.id)).length;
      return Math.round((done / lessons.length) * 100);
    },

    getHighestBand: () => {
      return get().ecflBand;
    },
  })
);
