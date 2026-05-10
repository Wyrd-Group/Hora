import { supabase } from './supabase';
import { eventBridge, EVENTS } from './eventBridge';
import { createLogger } from './logger';

const log = createLogger('livingworld');

// ── Interfaces ──

export interface WorldNode {
  id: string;
  creator_id: string;
  name: string;
  sector: string;
  lat: number;
  lng: number;
  h3_index: string;
  level: number;
  business_model: string | null;
  base_income: number;
  base_cost: number;
  description: string | null;
  upvotes: number;
  purchase_count: number;
  investor_count: number;
  partnership_count: number;
  status: 'active' | 'flagged' | 'removed' | 'pivoted';
  created_at: string;
}

export interface WorldRoute {
  id: string;
  from_node_id: string;
  to_node_id: string;
  route_type: 'supply_chain' | 'partnership' | 'franchise' | 'distribution';
  traffic_score: number;
  creator_id: string | null;
  last_active: string;
}

export interface WorldEvent {
  id: string;
  event_type: 'boom' | 'bust' | 'disruption' | 'opportunity' | 'crisis';
  region_h3: string | null;
  sector: string | null;
  title: string;
  description: string | null;
  effects: { income_modifier?: number; cost_modifier?: number };
  severity: number;
  source: string;
  expires_at: string;
  created_at: string;
}

export interface WorldMeta {
  top_nodes: { id: string; name: string; investor_count: number }[];
  emerging_sectors: { h3: string; sector: string; growth: number }[];
}

type WorldUpdateCallback = (data: {
  nodes: Record<string, WorldNode>;
  routes: Record<string, WorldRoute>;
  events: WorldEvent[];
}) => void;

// ── Module State ──

let nodeCache: Record<string, WorldNode> = {};
let routeCache: Record<string, WorldRoute> = {};
let eventCache: WorldEvent[] = [];
let loadedH3Cells: Set<string> = new Set();
let listeners: WorldUpdateCallback[] = [];
let nodesChannel: any = null;
let eventsChannel: any = null;
let routesChannel: any = null;

// ── Parse helpers ──

function parseNode(row: any): WorldNode {
  return {
    ...row,
    lat: parseFloat(row.lat),
    lng: parseFloat(row.lng),
    level: parseInt(row.level, 10),
    base_income: parseInt(row.base_income, 10),
    base_cost: parseInt(row.base_cost, 10),
    upvotes: parseInt(row.upvotes, 10),
    purchase_count: parseInt(row.purchase_count, 10),
    investor_count: parseInt(row.investor_count, 10),
    partnership_count: parseInt(row.partnership_count, 10),
  };
}

function parseRoute(row: any): WorldRoute {
  return {
    ...row,
    traffic_score: parseFloat(row.traffic_score),
  };
}

function parseEvent(row: any): WorldEvent {
  return {
    ...row,
    severity: parseFloat(row.severity),
    effects: typeof row.effects === 'string' ? JSON.parse(row.effects) : (row.effects || {}),
  };
}

// ── Load nodes by H3 cells (viewport-based) ──

export async function loadNodesByH3(h3Cells: string[]): Promise<Record<string, WorldNode>> {
  // Filter out already-loaded cells
  const newCells = h3Cells.filter(c => !loadedH3Cells.has(c));
  if (newCells.length === 0) return nodeCache;

  const { data, error } = await supabase
    .from('world_nodes')
    .select('*')
    .in('h3_index', newCells)
    .eq('status', 'active');

  if (error) {
    // Silently fail — RLS blocks unauthenticated reads
    return nodeCache;
  }

  (data || []).forEach((row: any) => {
    nodeCache[row.id] = parseNode(row);
  });

  newCells.forEach(c => loadedH3Cells.add(c));
  notifyListeners();
  return nodeCache;
}

// ── Load routes for visible nodes ──

export async function loadRoutesForNodes(nodeIds: string[]): Promise<Record<string, WorldRoute>> {
  if (nodeIds.length === 0) return routeCache;

  const { data, error } = await supabase
    .from('world_routes')
    .select('*')
    .or(`from_node_id.in.(${nodeIds.join(',')}),to_node_id.in.(${nodeIds.join(',')})`);

  if (error) {
    // Silently fail — RLS blocks unauthenticated reads
    return routeCache;
  }

  (data || []).forEach((row: any) => {
    routeCache[row.id] = parseRoute(row);
  });

  notifyListeners();
  return routeCache;
}

// ── Load active events for H3 cells ──

export async function loadActiveEvents(h3Cells: string[]): Promise<WorldEvent[]> {
  const { data, error } = await supabase.rpc('get_active_events', {
    p_h3_cells: h3Cells,
  });

  if (error) {
    // Silently fail — RLS blocks unauthenticated reads
    return eventCache;
  }

  eventCache = (data || []).map(parseEvent);
  notifyListeners();
  return eventCache;
}

// ── Load trending data (cheap read from world_meta) ──

export async function loadTrending(): Promise<WorldMeta> {
  const { data, error } = await supabase
    .from('world_meta')
    .select('trending')
    .eq('id', 'global')
    .single();

  if (error) {
    // Silently return empty data — table may not exist or RLS blocks unauthenticated reads
    return { top_nodes: [], emerging_sectors: [] };
  }

  return (data?.trending as WorldMeta) || { top_nodes: [], emerging_sectors: [] };
}

// ── Subscribe to Realtime world updates ──

export function subscribeToWorld(callback: WorldUpdateCallback) {
  listeners.push(callback);

  // Subscribe to new world nodes
  if (!nodesChannel) {
    nodesChannel = supabase
      .channel('world-nodes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'world_nodes' },
        (payload: any) => {
          const node = parseNode(payload.new);
          nodeCache[node.id] = node;
          eventBridge.emit(EVENTS.VENTURE_FOUNDED, node);
          notifyListeners();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'world_nodes' },
        (payload: any) => {
          const node = parseNode(payload.new);
          nodeCache[node.id] = node;
          notifyListeners();
        }
      )
      .subscribe();
  }

  // Subscribe to new world events
  if (!eventsChannel) {
    eventsChannel = supabase
      .channel('world-events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'world_events' },
        (payload: any) => {
          const evt = parseEvent(payload.new);
          eventCache.push(evt);
          eventBridge.emit(EVENTS.WORLD_EVENT_STARTED, evt);
          notifyListeners();
        }
      )
      .subscribe();
  }

  // Subscribe to route changes
  if (!routesChannel) {
    routesChannel = supabase
      .channel('world-routes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'world_routes' },
        (payload: any) => {
          if (payload.eventType === 'DELETE') {
            delete routeCache[payload.old.id];
          } else {
            routeCache[payload.new.id] = parseRoute(payload.new);
          }
          notifyListeners();
        }
      )
      .subscribe();
  }

  return () => {
    listeners = listeners.filter(l => l !== callback);
    if (listeners.length === 0) {
      if (nodesChannel) { supabase.removeChannel(nodesChannel); nodesChannel = null; }
      if (eventsChannel) { supabase.removeChannel(eventsChannel); eventsChannel = null; }
      if (routesChannel) { supabase.removeChannel(routesChannel); routesChannel = null; }
    }
  };
}

// ── Create a new world node (found a venture) ──

export async function createWorldNode(node: {
  name: string;
  sector: string;
  lat: number;
  lng: number;
  h3_index: string;
  business_model?: string;
  base_income: number;
  base_cost: number;
  description?: string;
}): Promise<{ success: boolean; node?: WorldNode; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('world_nodes')
    .insert({ ...node, creator_id: user.id })
    .select()
    .single();

  if (error) {
    log.error('Failed to create node', error);
    return { success: false, error: error.message };
  }

  const created = parseNode(data);
  nodeCache[created.id] = created;
  notifyListeners();
  return { success: true, node: created };
}

// ── Invest in a world node via RPC ──

export async function investInNode(nodeId: string): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase.rpc('purchase_world_node', {
    p_node_id: nodeId,
    p_user_id: user.id,
  });

  if (error) {
    log.error('Invest failed', error);
    return { success: false, error: error.message };
  }

  // Optimistically update local cache
  if (nodeCache[nodeId]) {
    nodeCache[nodeId] = {
      ...nodeCache[nodeId],
      investor_count: nodeCache[nodeId].investor_count + 1,
      purchase_count: nodeCache[nodeId].purchase_count + 1,
    };
  }

  eventBridge.emit(EVENTS.VENTURE_INVESTED, { nodeId });
  notifyListeners();
  return { success: true };
}

// ── Create or boost a route ──

export async function createOrBoostRoute(
  fromNodeId: string,
  toNodeId: string,
  routeType: WorldRoute['route_type'],
  boostAmount: number = 1
): Promise<{ success: boolean; route?: WorldRoute; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Check if route exists
  const existing = Object.values(routeCache).find(
    r => r.from_node_id === fromNodeId && r.to_node_id === toNodeId && r.route_type === routeType
  );

  if (existing) {
    const { error } = await supabase.rpc('boost_route_traffic', {
      p_route_id: existing.id,
      p_amount: boostAmount,
    });

    if (error) return { success: false, error: error.message };

    routeCache[existing.id] = {
      ...existing,
      traffic_score: existing.traffic_score + boostAmount,
      last_active: new Date().toISOString(),
    };
    notifyListeners();
    return { success: true, route: routeCache[existing.id] };
  }

  // Create new route
  const { data, error } = await supabase
    .from('world_routes')
    .insert({
      from_node_id: fromNodeId,
      to_node_id: toNodeId,
      route_type: routeType,
      traffic_score: boostAmount,
      creator_id: user.id,
    })
    .select()
    .single();

  if (error) {
    log.error('Route creation failed', error);
    return { success: false, error: error.message };
  }

  const route = parseRoute(data);
  routeCache[route.id] = route;

  if (routeType === 'supply_chain') {
    eventBridge.emit(EVENTS.SUPPLY_CHAIN_ESTABLISHED, route);
  } else if (routeType === 'partnership') {
    eventBridge.emit(EVENTS.PARTNERSHIP_FORMED, route);
  } else if (routeType === 'franchise') {
    eventBridge.emit(EVENTS.VENTURE_FRANCHISED, route);
  }

  notifyListeners();
  return { success: true, route };
}

// ── Log a player action ──

export async function logPlayerAction(
  actionType: string,
  targetId?: string,
  metadata?: Record<string, any>,
  h3Index?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('player_actions').insert({
    user_id: user.id,
    action_type: actionType,
    target_id: targetId,
    metadata: metadata || {},
    h3_index: h3Index,
  });
}

// ── Getters ──

export function getWorldNode(id: string): WorldNode | null {
  return nodeCache[id] || null;
}

export function getAllWorldNodes(): Record<string, WorldNode> {
  return nodeCache;
}

export function getAllWorldRoutes(): Record<string, WorldRoute> {
  return routeCache;
}

export function getActiveWorldEvents(): WorldEvent[] {
  const now = new Date().toISOString();
  return eventCache.filter(e => e.expires_at > now);
}

export function getLoadedH3Cells(): string[] {
  return Array.from(loadedH3Cells);
}

// ── Reset (useful for testing) ──

export function resetWorldCache() {
  nodeCache = {};
  routeCache = {};
  eventCache = [];
  loadedH3Cells = new Set();
}

function notifyListeners() {
  const data = {
    nodes: { ...nodeCache },
    routes: { ...routeCache },
    events: [...eventCache],
  };
  listeners.forEach(cb => cb(data));
}
