import { create } from 'zustand';
import {
  type WorldNode,
  type WorldRoute,
  type WorldEvent,
  type WorldMeta,
  loadNodesByH3,
  loadRoutesForNodes,
  loadActiveEvents,
  loadTrending,
  subscribeToWorld,
  createWorldNode,
  investInNode,
  createOrBoostRoute,
  logPlayerAction,
  getAllWorldNodes,
  getAllWorldRoutes,
} from '../lib/livingWorldSync';

// Re-export types for convenience
export type { WorldNode, WorldRoute, WorldEvent, WorldMeta };

interface LivingWorldState {
  // Data
  worldNodes: Record<string, WorldNode>;
  worldRoutes: Record<string, WorldRoute>;
  activeEvents: WorldEvent[];
  trending: WorldMeta;
  loadedH3Cells: string[];

  // UI state
  selectedVentureId: string | null;
  founderPanelOpen: boolean;
  founderPanelCoords: { lat: number; lng: number } | null;
  isLoading: boolean;

  // Actions
  loadViewport: (h3Cells: string[]) => Promise<void>;
  refreshEvents: (h3Cells: string[]) => Promise<void>;
  refreshTrending: () => Promise<void>;
  subscribe: () => () => void;
  foundVenture: (node: {
    name: string;
    sector: string;
    lat: number;
    lng: number;
    h3_index: string;
    business_model?: string;
    base_income: number;
    base_cost: number;
    description?: string;
  }) => Promise<{ success: boolean; node?: WorldNode; error?: string }>;
  invest: (nodeId: string) => Promise<{ success: boolean; error?: string }>;
  createRoute: (
    fromNodeId: string,
    toNodeId: string,
    routeType: WorldRoute['route_type'],
    boostAmount?: number,
  ) => Promise<{ success: boolean; error?: string }>;
  logAction: (actionType: string, targetId?: string, metadata?: Record<string, any>, h3Index?: string) => void;
  selectVenture: (id: string | null) => void;
  openFounderPanel: (lat: number, lng: number) => void;
  closeFounderPanel: () => void;

  // Selectors
  getVisibleNodes: () => WorldNode[];
  getVisibleRoutes: () => WorldRoute[];
  getNodesByCreator: (creatorId: string) => WorldNode[];
  getNodesBySector: (sector: string) => WorldNode[];
  getRoutesForNode: (nodeId: string) => WorldRoute[];
}

export const useLivingWorldStore = create<LivingWorldState>()((set, get) => ({
  // Initial data
  worldNodes: {},
  worldRoutes: {},
  activeEvents: [],
  trending: { top_nodes: [], emerging_sectors: [] },
  loadedH3Cells: [],

  // UI state
  selectedVentureId: null,
  founderPanelOpen: false,
  founderPanelCoords: null,
  isLoading: false,

  // ── Load nodes for viewport H3 cells ──
  loadViewport: async (h3Cells: string[]) => {
    set({ isLoading: true });
    const nodes = await loadNodesByH3(h3Cells);
    const nodeIds = Object.keys(nodes);
    const routes = await loadRoutesForNodes(nodeIds);
    const events = await loadActiveEvents(h3Cells);
    set({
      worldNodes: { ...nodes },
      worldRoutes: { ...routes },
      activeEvents: events,
      loadedH3Cells: Array.from(new Set([...get().loadedH3Cells, ...h3Cells])),
      isLoading: false,
    });
  },

  // ── Refresh events for current viewport ──
  refreshEvents: async (h3Cells: string[]) => {
    const events = await loadActiveEvents(h3Cells);
    set({ activeEvents: events });
  },

  // ── Refresh trending data ──
  refreshTrending: async () => {
    const trending = await loadTrending();
    set({ trending });
  },

  // ── Subscribe to realtime updates ──
  subscribe: () => {
    return subscribeToWorld(({ nodes, routes, events }) => {
      set({
        worldNodes: nodes,
        worldRoutes: routes,
        activeEvents: events,
      });
    });
  },

  // ── Found a new venture ──
  foundVenture: async (node) => {
    const result = await createWorldNode(node);
    if (result.success && result.node) {
      set(state => ({
        worldNodes: { ...state.worldNodes, [result.node!.id]: result.node! },
        founderPanelOpen: false,
        founderPanelCoords: null,
      }));
      logPlayerAction('venture_founded', result.node.id, {
        sector: node.sector,
        h3: node.h3_index,
      }, node.h3_index);
    }
    return result;
  },

  // ── Invest in a venture ──
  invest: async (nodeId: string) => {
    const result = await investInNode(nodeId);
    if (result.success) {
      // Sync from cache (optimistic update already done in livingWorldSync)
      set({ worldNodes: { ...getAllWorldNodes() } });
      logPlayerAction('venture_invested', nodeId);
    }
    return result;
  },

  // ── Create or boost a route ──
  createRoute: async (fromNodeId, toNodeId, routeType, boostAmount) => {
    const result = await createOrBoostRoute(fromNodeId, toNodeId, routeType, boostAmount);
    if (result.success) {
      set({ worldRoutes: { ...getAllWorldRoutes() } });
    }
    return result;
  },

  // ── Log action (fire-and-forget) ──
  logAction: (actionType, targetId, metadata, h3Index) => {
    logPlayerAction(actionType, targetId, metadata, h3Index);
  },

  // ── UI actions ──
  selectVenture: (id) => set({ selectedVentureId: id }),

  openFounderPanel: (lat, lng) => set({
    founderPanelOpen: true,
    founderPanelCoords: { lat, lng },
  }),

  closeFounderPanel: () => set({
    founderPanelOpen: false,
    founderPanelCoords: null,
  }),

  // ── Selectors ──
  getVisibleNodes: () => Object.values(get().worldNodes).filter(n => n.status === 'active'),

  getVisibleRoutes: () => Object.values(get().worldRoutes).filter(r => r.traffic_score >= 10),

  getNodesByCreator: (creatorId: string) =>
    Object.values(get().worldNodes).filter(n => n.creator_id === creatorId),

  getNodesBySector: (sector: string) =>
    Object.values(get().worldNodes).filter(n => n.sector === sector && n.status === 'active'),

  getRoutesForNode: (nodeId: string) =>
    Object.values(get().worldRoutes).filter(
      r => r.from_node_id === nodeId || r.to_node_id === nodeId
    ),
}));
