/**
 * featureSandbox.ts — Main-thread manager for the sandbox Web Worker.
 *
 * Creates disposable workers, runs AI-generated code safely,
 * and returns structured results (actions, logs, errors).
 */

import { useEmpireStore } from '../store/empireStore';
import { useExpansionStore } from '../store/expansionStore';

export interface SandboxAction {
  type: string;
  params: Record<string, any>;
}

export interface SandboxResult {
  success: boolean;
  actions: SandboxAction[];
  logs: string[];
  error?: string;
  returnValue?: any;
}

const TIMEOUT_MS = 5000; // 5 seconds max execution

/**
 * Build a snapshot of current game state for the sandbox.
 */
function buildGameStateSnapshot(): Record<string, any> {
  const e = useEmpireStore.getState();
  const x = useExpansionStore.getState();

  const ownedNodes = Object.values(e.nodes || {}).filter((n: any) => n.owner === 'player');

  return {
    companyBalance: e.companyBalance || 0,
    personalBalance: e.personalBalance || 0,
    netWorth: e.netWorth || 0,
    monthlyIncome: e.monthlyIncome || 0,
    heat: e.heat || 0,
    growth: e.growth || 0,
    governance: e.governance || 0,
    impact: e.impact || 0,
    power: e.power || 0,
    structure: e.structure || 'sole_prop',
    ownedNodeCount: ownedNodes.length,
    ownedNodes: ownedNodes.slice(0, 20).map((n: any) => ({
      id: n.id, name: n.name, type: n.type, country: n.country,
      level: n.level, income: n.income,
    })),
    portfolio: Object.entries(e.portfolio || {}).map(([sym, pos]: [string, any]) => ({
      symbol: sym, quantity: pos.quantity, avgCost: pos.avgCost,
    })),
    portfolioCount: Object.keys(e.portfolio || {}).length,
    currentRegime: x.currentRegime,
    dynamicInstrumentCount: x.dynamicInstruments.length,
    dynamicMissionCount: x.getActiveMissions().length,
    totalExpansions: x.totalExpansions,
  };
}

/**
 * Run code in a disposable Web Worker sandbox.
 */
function runInWorker(code: string, gameState: Record<string, any>): Promise<SandboxResult> {
  return new Promise((resolve) => {
    let settled = false;

    const worker = new Worker(
      new URL('./sandboxWorker.js', import.meta.url),
      { type: 'module' }
    );

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        worker.terminate();
        resolve({ success: false, actions: [], logs: [], error: 'Execution timeout (5s) — possible infinite loop' });
      }
    }, TIMEOUT_MS);

    worker.onmessage = (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();

      if (e.data.type === 'error') {
        resolve({
          success: false,
          actions: e.data.actions || [],
          logs: e.data.logs || [],
          error: e.data.message,
        });
      } else {
        resolve({
          success: true,
          actions: e.data.actions || [],
          logs: e.data.logs || [],
          returnValue: e.data.returnValue,
        });
      }
    };

    worker.onerror = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      resolve({ success: false, actions: [], logs: [], error: err.message || 'Worker error' });
    };

    worker.postMessage({ code, gameState });
  });
}

/**
 * Test a feature — runs code against current game state snapshot.
 * Does NOT execute actions, just reports what it would do.
 */
export async function testFeature(code: string): Promise<SandboxResult> {
  const gameState = buildGameStateSnapshot();
  return runInWorker(code, gameState);
}

/**
 * Execute a deployed feature — runs code and dispatches actions to real stores.
 */
export async function executeFeature(code: string): Promise<SandboxResult> {
  const gameState = buildGameStateSnapshot();
  const result = await runInWorker(code, gameState);

  if (!result.success) return result;

  // Dispatch queued actions to real stores
  const expansion = useExpansionStore.getState();
  const executionLog: string[] = [];

  for (const action of result.actions) {
    try {
      switch (action.type) {
        case 'spawnInstrument':
          expansion.spawnInstrument(action.params as any);
          executionLog.push(`Spawned instrument: ${action.params.symbol || action.params.name}`);
          break;
        case 'createEvent':
          expansion.createEvent(action.params as any);
          executionLog.push(`Created event: ${action.params.title}`);
          break;
        case 'spawnNode':
          expansion.spawnNode(action.params as any);
          executionLog.push(`Spawned node: ${action.params.name}`);
          break;
        case 'createMission':
          expansion.createMission(action.params as any);
          executionLog.push(`Created mission: ${action.params.title}`);
          break;
        case 'shiftRegime':
          expansion.shiftRegime(action.params as any);
          executionLog.push(`Shifted regime to: ${action.params.toRegime}`);
          break;
        case 'injectNews':
          expansion.injectNews(action.params as any);
          executionLog.push(`Injected news: ${action.params.headline}`);
          break;
        case 'addMoney':
          useEmpireStore.setState(s => ({ companyBalance: s.companyBalance + (action.params.amount || 0) }));
          executionLog.push(`Added €${(action.params.amount || 0).toLocaleString()}`);
          break;
        case 'deductMoney':
          useEmpireStore.setState(s => ({ companyBalance: Math.max(0, s.companyBalance - (action.params.amount || 0)) }));
          executionLog.push(`Deducted €${(action.params.amount || 0).toLocaleString()}`);
          break;
        default:
          executionLog.push(`Unknown action: ${action.type}`);
      }
    } catch (err: any) {
      executionLog.push(`ERROR executing ${action.type}: ${err.message}`);
    }
  }

  return { ...result, logs: [...result.logs, ...executionLog] };
}

/**
 * Static analysis — quick lint check before community publishing.
 * NOT a security boundary. The Web Worker sandbox is the real isolation layer.
 * This only catches accidental/naive usage of blocked APIs and is trivially
 * bypassed (e.g. string concatenation). Do not rely on this for safety.
 */
export function validateFeatureCode(code: string): { safe: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const forbidden = [
    { pattern: /\bfetch\s*\(/, label: 'Network access (fetch)' },
    { pattern: /\bXMLHttpRequest\b/, label: 'Network access (XMLHttpRequest)' },
    { pattern: /\bWebSocket\b/, label: 'Network access (WebSocket)' },
    { pattern: /\bdocument\b/, label: 'DOM access (document)' },
    { pattern: /\bwindow\b/, label: 'DOM access (window)' },
    { pattern: /\blocalStorage\b/, label: 'Storage access (localStorage)' },
    { pattern: /\beval\s*\(/, label: 'Code injection (eval)' },
    { pattern: /\bnew\s+Function\b/, label: 'Code injection (Function constructor)' },
    { pattern: /\bimport\s*\(/, label: 'Dynamic import' },
    { pattern: /\brequire\s*\(/, label: 'CommonJS require' },
    { pattern: /\bimportScripts\b/, label: 'Worker importScripts' },
  ];

  for (const { pattern, label } of forbidden) {
    if (pattern.test(code)) warnings.push(`Blocked pattern: ${label}`);
  }

  if (code.length > 10240) warnings.push(`Code too large: ${code.length} chars (max 10KB)`);

  return { safe: warnings.length === 0, warnings };
}
