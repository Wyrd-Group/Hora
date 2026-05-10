import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Reward Table ─────────────────────────────────────────────────
const REWARD_TABLE: Record<number, number> = {
  25: 50,
  45: 100,
  60: 150,
  90: 250,
};

const BP_XP_PER_SESSION = 25;

// ── Helpers ──────────────────────────────────────────────────────
function todayISO(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function isConsecutiveDay(prev: string, current: string): boolean {
  const d1 = new Date(prev);
  const d2 = new Date(current);
  const diff = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0.5 && diff < 2; // accounts for timezone edge cases
}

// ── Types ────────────────────────────────────────────────────────
export interface FocusState {
  isRunning: boolean;
  isPaused: boolean;
  selectedDuration: number;        // minutes: 25, 45, 60, 90
  remainingSeconds: number;
  startedAt: number | null;        // Date.now() timestamp
  totalSessionsCompleted: number;
  totalAPFromFocus: number;
  currentStreak: number;           // consecutive days with a session
  lastSessionDate: string | null;  // YYYY-MM-DD
}

export interface FocusActions {
  startSession: (duration: number) => void;
  tick: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  completeSession: () => void;
  cancelSession: () => void;
  getRewardForDuration: (mins: number) => number;
}

export type FocusStore = FocusState & FocusActions;

// ── Store ────────────────────────────────────────────────────────
export const useFocusStore = create<FocusStore>()(
  persist(
    (set, get) => ({
      // State
      isRunning: false,
      isPaused: false,
      selectedDuration: 25,
      remainingSeconds: 0,
      startedAt: null,
      totalSessionsCompleted: 0,
      totalAPFromFocus: 0,
      currentStreak: 0,
      lastSessionDate: null,

      // Actions
      startSession: (duration: number) => {
        set({
          selectedDuration: duration,
          remainingSeconds: duration * 60,
          isRunning: true,
          isPaused: false,
          startedAt: Date.now(),
        });
      },

      tick: () => {
        const { remainingSeconds, isRunning, isPaused } = get();
        if (!isRunning || isPaused) return;

        const next = remainingSeconds - 1;
        if (next <= 0) {
          get().completeSession();
        } else {
          set({ remainingSeconds: next });
        }
      },

      pauseSession: () => {
        set({ isPaused: true });
      },

      resumeSession: () => {
        set({ isPaused: false });
      },

      completeSession: () => {
        const { selectedDuration, totalSessionsCompleted, totalAPFromFocus, currentStreak, lastSessionDate } = get();
        const reward = REWARD_TABLE[selectedDuration] ?? 50;
        const today = todayISO();

        // Streak tracking
        let newStreak = 1;
        if (lastSessionDate) {
          if (lastSessionDate === today) {
            // Already had a session today -- keep existing streak
            newStreak = currentStreak;
          } else if (isConsecutiveDay(lastSessionDate, today)) {
            newStreak = currentStreak + 1;
          }
          // else streak resets to 1
        }

        set({
          isRunning: false,
          isPaused: false,
          remainingSeconds: 0,
          startedAt: null,
          totalSessionsCompleted: totalSessionsCompleted + 1,
          totalAPFromFocus: totalAPFromFocus + reward,
          currentStreak: newStreak,
          lastSessionDate: today,
        });
      },

      cancelSession: () => {
        set({
          isRunning: false,
          isPaused: false,
          remainingSeconds: 0,
          startedAt: null,
        });
      },

      getRewardForDuration: (mins: number): number => {
        return REWARD_TABLE[mins] ?? 50;
      },
    }),
    {
      name: 'empire-focus',
      partialize: (state) => ({
        totalSessionsCompleted: state.totalSessionsCompleted,
        totalAPFromFocus: state.totalAPFromFocus,
        currentStreak: state.currentStreak,
        lastSessionDate: state.lastSessionDate,
        selectedDuration: state.selectedDuration,
      }),
    }
  )
);

export { BP_XP_PER_SESSION };
