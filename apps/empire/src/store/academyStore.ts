import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type AgentClass,
  computeOverallRating,
} from '../data/agentCards';
import { COLLEGE_CATALOG, type CollegeDef } from '../data/societyData';
import { useAgentCardStore } from './agentCardStore';

// ── Name Generation ─────────────────────────────────────────────

const STUDENT_FIRST_NAMES = [
  'Lukas', 'Sofia', 'Matteo', 'Elif', 'Henrik', 'Clara', 'Rasmus', 'Ines',
  'Mikael', 'Lea', 'Tomas', 'Hana', 'Niklas', 'Marta', 'Emil', 'Zara',
  'Oskar', 'Amelie', 'Jan', 'Freya', 'Viktor', 'Nadia', 'Felix', 'Elina',
  'Marco', 'Alina', 'Sven', 'Eva', 'Adrian', 'Katja', 'Patrik', 'Lina',
  'Daan', 'Annika', 'Hugo', 'Chiara', 'Kasper', 'Lucia', 'Bram', 'Petra',
];

const STUDENT_LAST_NAMES = [
  'Lindqvist', 'Moretti', 'Kowalski', 'Van den Berg', 'Schmidt', 'Duval',
  'Novak', 'Johansson', 'Fernandez', 'Muller', 'Andersen', 'Papadopoulos',
  'Horvath', 'De Vries', 'Rossi', 'Eriksson', 'Laurent', 'Szabo',
  'Petersen', 'Kovalenko', 'Virtanen', 'Marques', 'Bergmann', 'O\'Sullivan',
  'Janssen', 'Bianchi', 'Larsen', 'Ionescu', 'Weber', 'Nilsson',
];

function randomName(): string {
  const first = STUDENT_FIRST_NAMES[Math.floor(Math.random() * STUDENT_FIRST_NAMES.length)];
  const last = STUDENT_LAST_NAMES[Math.floor(Math.random() * STUDENT_LAST_NAMES.length)];
  return `${first} ${last}`;
}

// ── CV Templates ────────────────────────────────────────────────

const CV_WORK_TEMPLATES = [
  'Completed Q{q} data analysis project',
  'Led team sprint on market research',
  'Built prototype for autonomous trading bot',
  'Optimized signal processing pipeline',
  'Published internal whitepaper on risk modelling',
  'Coordinated cross-department intelligence brief',
  'Developed sentiment analysis module',
  'Ran penetration test on simulated network',
  'Designed dashboard for real-time metrics',
  'Assisted in large-scale data migration',
  'Contributed to open-source agent framework',
  'Mentored junior students on code review',
  'Presented quarterly findings to advisory board',
  'Implemented automated regression testing suite',
  'Audited compliance workflows for EU standards',
  'Engineered low-latency websocket feed handler',
  'Benchmarked three competing ML frameworks',
  'Drafted strategic memo on emerging fintech trends',
  'Scripted CI/CD pipeline for deployment automation',
  'Conducted field reconnaissance simulation exercise',
];

function randomCVEntry(): string {
  const tpl = CV_WORK_TEMPLATES[Math.floor(Math.random() * CV_WORK_TEMPLATES.length)];
  return tpl.replace('{q}', String(Math.ceil(Math.random() * 4)));
}

// ── Types ───────────────────────────────────────────────────────

export interface StudentAgent {
  id: string;
  name: string;
  collegeId: string;
  societyId: string;
  class: AgentClass;
  stats: {
    intelligence: number;
    speed: number;
    stealth: number;
    loyalty: number;
    adaptability: number;
    influence: number;
  };
  currentRating: number;
  potentialRating: number;
  workAssigned: number;
  growthProgress: number;        // 0-100
  graduationProgress: number;    // 0-100
  isIntern: boolean;
  enrolledAt: number;
  cv: {
    previousWork: string[];
    metrics: {
      projectsCompleted: number;
      avgScore: number;
      peakPerformance: number;
    };
    benchmarks: {
      vsClassAvg: number;
      vsPotential: number;
      growthRate: number;
    };
  };
  status: 'studying' | 'interning' | 'graduating' | 'graduated' | 'recruited' | 'passed';
}

export interface Society {
  id: string;
  collegeId: string;
  name: string;
  openedAt: number;
  students: string[];             // StudentAgent IDs
  totalGraduates: number;
  reputation: number;             // 0-100
  scoutAssigned: string | null;   // MintId of deployed Scout
}

// ── Helpers ─────────────────────────────────────────────────────

function getCollege(id: string): CollegeDef | undefined {
  return COLLEGE_CATALOG.find((c) => c.id === id);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

const STAT_KEYS = ['intelligence', 'speed', 'stealth', 'loyalty', 'adaptability', 'influence'] as const;
type StatKey = typeof STAT_KEYS[number];

// ── Store Interface ─────────────────────────────────────────────

interface AcademyState {
  societies: Record<string, Society>;
  students: Record<string, StudentAgent>;
  freeAgentPool: string[];  // StudentAgent IDs that were "passed" — available to Jobhunters

  // Actions
  openSociety: (collegeId: string, name: string) => Society | null;
  closeSociety: (societyId: string) => void;
  assignWork: (studentId: string, units: number) => void;
  takeAsIntern: (studentId: string) => void;
  returnFromInternship: (studentId: string) => void;
  recruitStudent: (studentId: string) => string | null;
  passOnStudent: (studentId: string) => void;
  assignScout: (societyId: string, mintId: string) => void;
  removeScout: (societyId: string) => void;
  processAcademyTick: () => void;
  generateStudent: (collegeId: string, societyId: string) => StudentAgent;
}

// ── Store ───────────────────────────────────────────────────────

export const useAcademyStore = create<AcademyState>()(
  persist(
    (set, get) => ({
      societies: {},
      students: {},
      freeAgentPool: [],

      // ── Open Society ──────────────────────────────────────────
      openSociety: (collegeId, name) => {
        const college = getCollege(collegeId);
        if (!college) return null;

        const id = `soc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const society: Society = {
          id,
          collegeId,
          name,
          openedAt: Date.now(),
          students: [],
          totalGraduates: 0,
          reputation: 20,
          scoutAssigned: null,
        };

        set((s) => ({
          societies: { ...s.societies, [id]: society },
        }));

        return society;
      },

      // ── Close Society ─────────────────────────────────────────
      closeSociety: (societyId) => {
        const state = get();
        const society = state.societies[societyId];
        if (!society) return;

        // Remove all students belonging to the society
        const updatedStudents = { ...state.students };
        for (const sid of society.students) {
          delete updatedStudents[sid];
        }

        const updatedSocieties = { ...state.societies };
        delete updatedSocieties[societyId];

        set({
          societies: updatedSocieties,
          students: updatedStudents,
          freeAgentPool: state.freeAgentPool.filter(
            (id) => !society.students.includes(id),
          ),
        });
      },

      // ── Assign Work ───────────────────────────────────────────
      assignWork: (studentId, units) => {
        const student = get().students[studentId];
        if (!student || student.status === 'graduated' || student.status === 'recruited' || student.status === 'passed') return;

        set((s) => ({
          students: {
            ...s.students,
            [studentId]: {
              ...student,
              workAssigned: student.workAssigned + units,
            },
          },
        }));
      },

      // ── Internship ───────────────────────────────────────────
      takeAsIntern: (studentId) => {
        const student = get().students[studentId];
        if (!student || student.status !== 'studying') return;

        set((s) => ({
          students: {
            ...s.students,
            [studentId]: {
              ...student,
              isIntern: true,
              status: 'interning' as const,
            },
          },
        }));
      },

      returnFromInternship: (studentId) => {
        const student = get().students[studentId];
        if (!student || student.status !== 'interning') return;

        set((s) => ({
          students: {
            ...s.students,
            [studentId]: {
              ...student,
              isIntern: false,
              status: 'studying' as const,
            },
          },
        }));
      },

      // ── Recruit ───────────────────────────────────────────────
      recruitStudent: (studentId) => {
        const student = get().students[studentId];
        if (!student || (student.status !== 'graduating' && student.status !== 'graduated')) return null;

        set((s) => ({
          students: {
            ...s.students,
            [studentId]: { ...student, status: 'recruited' as const },
          },
        }));

        // Return the student ID so the UI layer can handle the MintedAgent conversion
        return studentId;
      },

      // ── Pass ──────────────────────────────────────────────────
      passOnStudent: (studentId) => {
        const student = get().students[studentId];
        if (!student || (student.status !== 'graduating' && student.status !== 'graduated')) return;

        set((s) => ({
          students: {
            ...s.students,
            [studentId]: { ...student, status: 'passed' as const },
          },
          freeAgentPool: [...s.freeAgentPool, studentId],
        }));
      },

      // ── Scout Assignment ──────────────────────────────────────
      assignScout: (societyId, mintId) => {
        const society = get().societies[societyId];
        if (!society) return;

        set((s) => ({
          societies: {
            ...s.societies,
            [societyId]: { ...society, scoutAssigned: mintId },
          },
        }));
      },

      removeScout: (societyId) => {
        const society = get().societies[societyId];
        if (!society) return;

        set((s) => ({
          societies: {
            ...s.societies,
            [societyId]: { ...society, scoutAssigned: null },
          },
        }));
      },

      // ── Tick Processor ────────────────────────────────────────
      processAcademyTick: () => {
        const state = get();
        const updatedStudents = { ...state.students };
        const updatedSocieties = { ...state.societies };
        let changed = false;

        // 1) Process each active student
        for (const [sid, student] of Object.entries(updatedStudents)) {
          if (student.status !== 'studying' && student.status !== 'interning') continue;

          const college = getCollege(student.collegeId);
          if (!college) continue;

          changed = true;
          const internMultiplier = student.isIntern ? 2 : 1;
          const workBonus = student.workAssigned / 500;

          // Advance graduation progress
          const gradStep = (100 / college.graduationTicks) * (1 + workBonus);
          const newGradProgress = Math.min(100, student.graduationProgress + gradStep);

          // Grow stats toward potential
          const baseGrowthRate = 0.8; // base growth per tick
          const growthStep = (baseGrowthRate + workBonus * 0.5) * internMultiplier;
          const newGrowthProgress = student.growthProgress + growthStep;

          let newStats = { ...student.stats };
          let newRating = student.currentRating;
          let resetGrowth = newGrowthProgress;

          // Stat increase when growth cycle completes
          if (newGrowthProgress >= 100) {
            resetGrowth = newGrowthProgress - 100;
            const numStats = 1 + (Math.random() > 0.5 ? 1 : 0); // 1-2 stats
            const shuffled = [...STAT_KEYS].sort(() => Math.random() - 0.5).slice(0, numStats);
            for (const stat of shuffled) {
              const boost = randInt(1, 3);
              // Cap individual stats at potential-derived ceiling
              const ceiling = clamp(student.potentialRating + 5, 0, 99);
              newStats[stat] = clamp(newStats[stat] + boost, 1, ceiling);
            }
            newRating = computeOverallRating(newStats, student.class);
            newRating = Math.min(newRating, student.potentialRating);
          }

          // Update CV metrics periodically (every ~20% graduation)
          let newCV = student.cv;
          const prevBucket = Math.floor(student.graduationProgress / 20);
          const nextBucket = Math.floor(newGradProgress / 20);
          if (nextBucket > prevBucket) {
            const newWork = [...student.cv.previousWork];
            newWork.push(randomCVEntry());
            if (newWork.length > 8) newWork.shift(); // keep max 8 entries
            const completed = student.cv.metrics.projectsCompleted + 1;
            const score = clamp(
              student.cv.metrics.avgScore * 0.8 + (newRating / student.potentialRating) * 100 * 0.2,
              0, 100,
            );
            newCV = {
              previousWork: newWork,
              metrics: {
                projectsCompleted: completed,
                avgScore: Math.round(score * 10) / 10,
                peakPerformance: Math.max(student.cv.metrics.peakPerformance, newRating),
              },
              benchmarks: {
                vsClassAvg: Math.round((newRating / ((college.potentialRange[0] + college.potentialRange[1]) / 2)) * 100),
                vsPotential: Math.round((newRating / student.potentialRating) * 100),
                growthRate: Math.round(growthStep * 100) / 100,
              },
            };
          }

          // Check graduation
          let newStatus: typeof student.status | 'graduating' = student.status;
          if (newGradProgress >= 100) {
            newStatus = 'graduating';
            // Update society graduate count
            const society = updatedSocieties[student.societyId];
            if (society) {
              updatedSocieties[student.societyId] = {
                ...society,
                totalGraduates: society.totalGraduates + 1,
                reputation: clamp(society.reputation + 1, 0, 100),
              };
            }
          }

          updatedStudents[sid] = {
            ...student,
            stats: newStats,
            currentRating: newRating,
            growthProgress: resetGrowth,
            graduationProgress: newGradProgress,
            cv: newCV,
            status: newStatus,
          };
        }

        // 2) Scout discovery: for each society with a scout, roll for new student
        for (const [socId, society] of Object.entries(updatedSocieties)) {
          if (!society.scoutAssigned) continue;

          const college = getCollege(society.collegeId);
          if (!college) continue;

          // Only discover if under max capacity
          const currentCount = society.students.filter((sid) => {
            const st = updatedStudents[sid];
            return st && (st.status === 'studying' || st.status === 'interning');
          }).length;
          if (currentCount >= college.maxStudents) continue;

          // Get scout stats for discovery chance
          const scoutAgent = useAgentCardStore.getState().agents[society.scoutAssigned];
          if (!scoutAgent) continue;

          // Base 8% chance per tick, boosted by scout intelligence and adaptability
          const scoutBonus = (scoutAgent.currentOverallRating / 99) * 0.12;
          const discoveryChance = 0.08 + scoutBonus;

          if (Math.random() < discoveryChance) {
            // Generate a new student
            const newStudent = get().generateStudent(society.collegeId, socId);
            updatedStudents[newStudent.id] = newStudent;
            updatedSocieties[socId] = {
              ...updatedSocieties[socId],
              students: [...updatedSocieties[socId].students, newStudent.id],
            };
            changed = true;
          }
        }

        if (changed) {
          set({ students: updatedStudents, societies: updatedSocieties });
        }
      },

      // ── Student Generator ─────────────────────────────────────
      generateStudent: (collegeId, societyId) => {
        const college = getCollege(collegeId);
        if (!college) {
          // Fallback — should never happen, but keep type-safe
          throw new Error(`College not found: ${collegeId}`);
        }

        const [potMin, potMax] = college.potentialRange;
        const potential = randInt(potMin, potMax);

        // Starting stats: 60-80% of potential, random distribution
        const stats: Record<StatKey, number> = {} as any;
        for (const key of STAT_KEYS) {
          const floor = Math.floor(potential * 0.45);
          const ceiling = Math.floor(potential * 0.75);
          stats[key] = randInt(Math.max(1, floor), Math.max(1, ceiling));
        }

        const agentClass = college.specializations[
          Math.floor(Math.random() * college.specializations.length)
        ];

        const currentRating = computeOverallRating(
          stats as StudentAgent['stats'],
          agentClass,
        );

        const id = `stu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

        const student: StudentAgent = {
          id,
          name: randomName(),
          collegeId,
          societyId,
          class: agentClass,
          stats: stats as StudentAgent['stats'],
          currentRating,
          potentialRating: potential,
          workAssigned: 0,
          growthProgress: 0,
          graduationProgress: 0,
          isIntern: false,
          enrolledAt: Date.now(),
          cv: {
            previousWork: [randomCVEntry()],
            metrics: {
              projectsCompleted: 0,
              avgScore: 0,
              peakPerformance: currentRating,
            },
            benchmarks: {
              vsClassAvg: Math.round(
                (currentRating / ((potMin + potMax) / 2)) * 100,
              ),
              vsPotential: Math.round((currentRating / potential) * 100),
              growthRate: 0,
            },
          },
          status: 'studying',
        };

        return student;
      },
    }),
    {
      name: 'aegis-academy-v1',
      partialize: (state) => ({
        societies: state.societies,
        students: state.students,
        freeAgentPool: state.freeAgentPool,
      }),
    },
  ),
);
