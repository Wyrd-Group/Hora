/**
 * featureStore.ts — Persisted store for AI-generated game features.
 *
 * Tracks features through their lifecycle:
 *   testing → deployed → (optionally published to community)
 *
 * Deployed features register as dynamic Athena tools and can be
 * called like any built-in tool.
 */

import { createPersistedStore } from './createPersistedStore';
import { registerDynamicTool } from '../data/athenaTools';
import type { AthenaTool } from '../data/athenaTools';

export interface FeatureTestResults {
  passed: boolean;
  actions: string[];
  logs: string[];
  error?: string;
  testedAt: number;
}

export interface GameFeature {
  id: string;
  name: string;
  description: string;
  code: string;
  toolDef: AthenaTool;
  version: number;
  status: 'testing' | 'deployed' | 'failed' | 'disabled';
  testResults: FeatureTestResults | null;
  createdAt: number;
  createdBy: string;
  deployedAt?: number;
  published: boolean;
  communityId?: string;
}

interface FeatureState {
  features: GameFeature[];
  installedCommunityIds: string[];

  addFeature: (f: GameFeature) => void;
  updateFeature: (id: string, patch: Partial<GameFeature>) => void;
  deployFeature: (id: string) => boolean;
  disableFeature: (id: string) => void;
  removeFeature: (id: string) => void;
  getDeployed: () => GameFeature[];
  rehydrateDynamicTools: () => void;
}

function uid(): string {
  return `feat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const useFeatureStore = createPersistedStore<FeatureState>(
  'features',
  (set, get) => ({
    features: [],
    installedCommunityIds: [],

    addFeature: (f) => {
      set(s => ({
        features: [{ ...f, id: f.id || uid() }, ...s.features],
      }));
    },

    updateFeature: (id, patch) => {
      set(s => ({
        features: s.features.map(f => f.id === id ? { ...f, ...patch } : f),
      }));
    },

    deployFeature: (id) => {
      const feature = get().features.find(f => f.id === id);
      if (!feature || !feature.testResults?.passed) return false;

      // Register as dynamic Athena tool
      registerDynamicTool(feature.toolDef);

      set(s => ({
        features: s.features.map(f =>
          f.id === id ? { ...f, status: 'deployed' as const, deployedAt: Date.now() } : f
        ),
      }));
      return true;
    },

    disableFeature: (id) => {
      set(s => ({
        features: s.features.map(f =>
          f.id === id ? { ...f, status: 'disabled' as const } : f
        ),
      }));
    },

    removeFeature: (id) => {
      set(s => ({
        features: s.features.filter(f => f.id !== id),
      }));
    },

    getDeployed: () => get().features.filter(f => f.status === 'deployed'),

    // Called on app startup to re-register deployed features as dynamic tools
    rehydrateDynamicTools: () => {
      const deployed = get().features.filter(f => f.status === 'deployed');
      for (const f of deployed) {
        registerDynamicTool(f.toolDef);
      }
      if (deployed.length > 0) {
        // Rehydrated deployed features silently
      }
    },
  })
);
