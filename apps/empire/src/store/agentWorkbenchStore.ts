import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentClass } from '../data/agentCards';

// ── Interfaces ────────────────────────────────────────────────────

export interface RealWorldTask {
  id: string;
  agentMintId: string;
  taskType: 'research' | 'code' | 'automate' | 'analyze' | 'social' | 'monitor';
  description: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  result: string | null;
  createdAt: number;
  completedAt: number | null;
  xpAwarded: number;
  dataCollected: {
    taskCategory: string;
    duration: number;
    toolsUsed: string[];
    complexity: number;
  };
}

export interface DelegationPlan {
  id: string;
  directive: string;
  tasks: {
    agentMintId: string;
    agentName: string;
    taskDescription: string;
    taskType: string;
    reason: string;
  }[];
  createdAt: number;
  status: 'planning' | 'executing' | 'completed' | 'failed';
}

export interface UserProfile {
  cvRaw: string | null;
  skills: string[];
  experience: { role: string; company: string; duration: string }[];
  education: { institution: string; degree: string; year: number }[];
  interests: string[];
  parsedAt: number | null;
}

// ── Task-to-class preference map ──────────────────────────────────

export const TASK_CLASS_MAP: Record<RealWorldTask['taskType'], AgentClass[]> = {
  research: ['Researcher', 'Analyst'],
  code:     ['Coder', 'Specialist'],
  automate: ['Autonomous', 'Navigator', 'Coder'],
  analyze:  ['Analyst', 'Researcher', 'Trader'],
  social:   ['Social', 'Orchestrator'],
  monitor:  ['Infiltrator', 'Navigator'],
};

// ── Directive keyword map (used by athenaDelegate) ────────────────

const DIRECTIVE_KEYWORDS: Record<string, RealWorldTask['taskType']> = {
  research:  'research',
  investigate: 'research',
  find:      'research',
  analyze:   'analyze',
  analyse:   'analyze',
  evaluate:  'analyze',
  code:      'code',
  build:     'code',
  develop:   'code',
  program:   'code',
  implement: 'code',
  social:    'social',
  post:      'social',
  engage:    'social',
  community: 'social',
  monitor:   'monitor',
  watch:     'monitor',
  track:     'monitor',
  surveil:   'monitor',
  automate:  'automate',
  schedule:  'automate',
  workflow:  'automate',
};

// ── Common keywords for CV parsing ────────────────────────────────

const SKILL_KEYWORDS = [
  'javascript', 'typescript', 'python', 'java', 'rust', 'go', 'c++', 'c#',
  'react', 'vue', 'angular', 'node', 'express', 'django', 'flask',
  'sql', 'postgresql', 'mongodb', 'redis', 'graphql', 'rest',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
  'machine learning', 'deep learning', 'nlp', 'ai', 'data science',
  'product management', 'project management', 'agile', 'scrum',
  'marketing', 'sales', 'finance', 'accounting', 'strategy',
  'design', 'figma', 'photoshop', 'ux', 'ui',
  'blockchain', 'solidity', 'web3', 'defi',
  'leadership', 'communication', 'analytics', 'excel',
];

// ── Store interface ───────────────────────────────────────────────

interface AgentWorkbenchState {
  activeTasks: Record<string, RealWorldTask>;
  taskHistory: RealWorldTask[];
  totalTasksCompleted: number;
  realWorldXpMultiplier: number;
  delegationPlans: DelegationPlan[];
  userProfile: UserProfile | null;

  // Actions
  deployToRealWorld: (mintId: string, taskType: RealWorldTask['taskType'], description: string) => string;
  completeTask: (taskId: string, result: string) => void;
  failTask: (taskId: string, reason: string) => void;
  athenaDelegate: (
    directive: string,
    availableAgents: {
      mintId: string;
      name: string;
      class: AgentClass;
      ovr: number;
      busy: boolean;
    }[],
  ) => DelegationPlan;
  importCV: (fileText: string) => void;
  clearCV: () => void;
  getAgentCapabilities: (agentClass: AgentClass, ovr: number) => string[];
}

// ── Helper: generate unique ID ────────────────────────────────────

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Store ─────────────────────────────────────────────────────────

export const useAgentWorkbenchStore = create<AgentWorkbenchState>()(
  persist(
    (set, get) => ({
      activeTasks: {},
      taskHistory: [],
      totalTasksCompleted: 0,
      realWorldXpMultiplier: 0.5,
      delegationPlans: [],
      userProfile: null,

      // ── Deploy an agent to a real-world task ───────────────────
      deployToRealWorld: (mintId, taskType, description) => {
        const id = uid();
        const task: RealWorldTask = {
          id,
          agentMintId: mintId,
          taskType,
          description,
          status: 'pending',
          result: null,
          createdAt: Date.now(),
          completedAt: null,
          xpAwarded: 0,
          dataCollected: {
            taskCategory: taskType,
            duration: 0,
            toolsUsed: [],
            complexity: 1,
          },
        };
        set((s) => ({
          activeTasks: { ...s.activeTasks, [id]: task },
        }));
        return id;
      },

      // ── Mark task completed, award XP, archive ─────────────────
      completeTask: (taskId, result) => {
        const state = get();
        const task = state.activeTasks[taskId];
        if (!task) return;

        const now = Date.now();
        const xp = Math.round(25 * state.realWorldXpMultiplier);

        const completed: RealWorldTask = {
          ...task,
          status: 'completed',
          result,
          completedAt: now,
          xpAwarded: xp,
          dataCollected: {
            ...task.dataCollected,
            duration: now - task.createdAt,
          },
        };

        const { [taskId]: _removed, ...remaining } = state.activeTasks;
        set({
          activeTasks: remaining,
          taskHistory: [...state.taskHistory, completed],
          totalTasksCompleted: state.totalTasksCompleted + 1,
        });
      },

      // ── Mark task failed ───────────────────────────────────────
      failTask: (taskId, reason) => {
        const state = get();
        const task = state.activeTasks[taskId];
        if (!task) return;

        const failed: RealWorldTask = {
          ...task,
          status: 'failed',
          result: reason,
          completedAt: Date.now(),
          dataCollected: {
            ...task.dataCollected,
            duration: Date.now() - task.createdAt,
          },
        };

        const { [taskId]: _removed, ...remaining } = state.activeTasks;
        set({
          activeTasks: remaining,
          taskHistory: [...state.taskHistory, failed],
        });
      },

      // ── Athena COO: parse directive, delegate to best agents ───
      athenaDelegate: (directive, availableAgents) => {
        const lower = directive.toLowerCase();

        // Infer task types from keywords in the directive
        const inferredTypes = new Set<RealWorldTask['taskType']>();
        for (const [keyword, taskType] of Object.entries(DIRECTIVE_KEYWORDS)) {
          if (lower.includes(keyword)) {
            inferredTypes.add(taskType);
          }
        }
        // Fallback: if nothing matched, default to research
        if (inferredTypes.size === 0) {
          inferredTypes.add('research');
        }

        const planTasks: DelegationPlan['tasks'] = [];
        const assignedMints = new Set<string>();

        for (const taskType of inferredTypes) {
          const preferredClasses = TASK_CLASS_MAP[taskType];

          // Find best available agent: match class preference, highest OVR, not busy, not already assigned
          let bestAgent: (typeof availableAgents)[number] | null = null;
          let bestClassRank = Infinity;

          for (const agent of availableAgents) {
            if (agent.busy || assignedMints.has(agent.mintId)) continue;

            const classRank = preferredClasses.indexOf(agent.class as AgentClass);
            if (classRank === -1) continue;

            if (
              classRank < bestClassRank ||
              (classRank === bestClassRank && (!bestAgent || agent.ovr > bestAgent.ovr))
            ) {
              bestAgent = agent;
              bestClassRank = classRank;
            }
          }

          // Fallback: pick highest-OVR non-busy agent if no class match
          if (!bestAgent) {
            bestAgent = availableAgents
              .filter((a) => !a.busy && !assignedMints.has(a.mintId))
              .sort((a, b) => b.ovr - a.ovr)[0] ?? null;
          }

          if (bestAgent) {
            assignedMints.add(bestAgent.mintId);
            planTasks.push({
              agentMintId: bestAgent.mintId,
              agentName: bestAgent.name,
              taskDescription: `${taskType}: ${directive}`,
              taskType,
              reason: `Best available ${bestAgent.class} agent (OVR ${bestAgent.ovr}) for ${taskType} tasks`,
            });
          }
        }

        const plan: DelegationPlan = {
          id: uid(),
          directive,
          tasks: planTasks,
          createdAt: Date.now(),
          status: planTasks.length > 0 ? 'executing' : 'failed',
        };

        // Auto-deploy each assigned agent
        const { deployToRealWorld } = get();
        for (const t of planTasks) {
          deployToRealWorld(
            t.agentMintId,
            t.taskType as RealWorldTask['taskType'],
            t.taskDescription,
          );
        }

        set((s) => ({
          delegationPlans: [...s.delegationPlans, plan],
        }));

        return plan;
      },

      // ── Import and parse CV text ───────────────────────────────
      importCV: (fileText) => {
        const lines = fileText.split('\n').map((l) => l.trim()).filter(Boolean);
        const lower = fileText.toLowerCase();

        // Extract skills
        const skills = SKILL_KEYWORDS.filter((kw) => lower.includes(kw));

        // Extract experience (heuristic: lines containing common role keywords)
        const experience: UserProfile['experience'] = [];
        const rolePatterns = /\b(engineer|developer|manager|director|analyst|designer|consultant|lead|intern|coordinator|cto|ceo|coo|vp|head of)\b/i;
        for (const line of lines) {
          if (rolePatterns.test(line)) {
            // Try to split "Role at Company | Duration" or "Role - Company (Duration)"
            const parts = line.split(/\s+(?:at|@|-|,|\|)\s+/i);
            experience.push({
              role: parts[0] ?? line,
              company: parts[1] ?? 'Unknown',
              duration: parts[2] ?? '',
            });
          }
        }

        // Extract education (heuristic: lines mentioning degree/university keywords)
        const education: UserProfile['education'] = [];
        const eduPatterns = /\b(university|college|institute|school|bachelor|master|mba|phd|degree|bsc|msc|ba|ma)\b/i;
        for (const line of lines) {
          if (eduPatterns.test(line)) {
            const yearMatch = line.match(/\b(19|20)\d{2}\b/);
            education.push({
              institution: line,
              degree: '',
              year: yearMatch ? parseInt(yearMatch[0], 10) : 0,
            });
          }
        }

        // Extract interests (lines after "interests" or "hobbies" heading)
        const interests: string[] = [];
        let inInterests = false;
        for (const line of lines) {
          if (/^(interests|hobbies)/i.test(line)) {
            inInterests = true;
            continue;
          }
          if (inInterests) {
            if (/^[A-Z]/.test(line) && line.endsWith(':')) break; // next section heading
            interests.push(line.replace(/^[-*]\s*/, ''));
          }
        }

        set({
          userProfile: {
            cvRaw: fileText,
            skills,
            experience,
            education,
            interests,
            parsedAt: Date.now(),
          },
        });
      },

      // ── Clear CV data ──────────────────────────────────────────
      clearCV: () => {
        set({ userProfile: null });
      },

      // ── Capability tiers based on class + OVR ──────────────────
      getAgentCapabilities: (agentClass, ovr) => {
        if (ovr >= 85) {
          return [
            `Expert ${agentClass} tasks`,
            'Autonomous complex operations',
            'Strategic planning',
          ];
        }
        if (ovr >= 70) {
          return [
            `Advanced ${agentClass} tasks`,
            'Complex project management',
          ];
        }
        if (ovr >= 50) {
          return [
            `Intermediate ${agentClass} tasks`,
            'Multi-step workflows',
          ];
        }
        return [
          `Basic ${agentClass} tasks`,
          'Simple automation',
        ];
      },
    }),
    {
      name: 'aegis-workbench-v1',
      partialize: (state) => ({
        activeTasks: state.activeTasks,
        taskHistory: state.taskHistory,
        totalTasksCompleted: state.totalTasksCompleted,
        realWorldXpMultiplier: state.realWorldXpMultiplier,
        delegationPlans: state.delegationPlans,
        userProfile: state.userProfile,
      }),
    },
  ),
);
