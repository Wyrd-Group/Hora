/**
 * gemmaOllamaBridge.ts — Gemma 4 via Ollama Integration
 *
 * Bridges local Gemma 4 model (via Ollama) to all AEGIS engines.
 * Provides narrative synthesis, contextual analysis, and coaching
 * without modifying the pure-function engine contracts.
 *
 * Architecture:
 *   Pure Engine → numerical result → Gemma Bridge → narrative enrichment
 *   Gemma Bridge → shared brain (LanceDB) → long-term memory
 *
 * All engines remain deterministic. Gemma enhances with natural language.
 */

import { eventBridge, EVENTS } from '../eventBridge';

// ── Configuration ───────────────────────────────────────────────

const OLLAMA_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OLLAMA_URL) || 'http://localhost:11434';
const GEMMA_MODEL = 'gemma3'; // Gemma 3 via Ollama — upgrade to gemma4 when available
const FALLBACK_MODEL = 'llama3.2';
const MAX_TOKENS = 512;
const TEMPERATURE = 0.4; // Low for analytical output
const TIMEOUT_MS = 30000; // 30s — models may need cold-start loading time

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaVisionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[]; // base64-encoded images
}

interface OllamaCompletionRequest {
  model: string;
  messages: (OllamaMessage | OllamaVisionMessage)[];
  options?: {
    temperature?: number;
    num_predict?: number;
    top_p?: number;
    stop?: string[];
  };
  stream: false;
}

interface OllamaCompletionResponse {
  model: string;
  message: { role: string; content: string };
  done: boolean;
  total_duration?: number;
  eval_count?: number;
}

// ── Shared Brain Interface ──────────────────────────────────────
// Connects to the LanceDB shared_brain_ontology for long-term memory

interface BrainEntry {
  id: string;
  type: 'macro_narrative' | 'bias_coaching' | 'portfolio_insight' | 'venture_analysis' | 'risk_assessment';
  content: string;
  context: Record<string, unknown>;
  timestamp: number;
  engineSource: string;
}

const sharedBrainBuffer: BrainEntry[] = [];

export function getSharedBrainBuffer(): BrainEntry[] {
  return [...sharedBrainBuffer];
}

export function addToBrain(entry: Omit<BrainEntry, 'id' | 'timestamp'>): void {
  sharedBrainBuffer.push({
    ...entry,
    id: `brain-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  });
  // Keep buffer manageable (last 200 entries)
  if (sharedBrainBuffer.length > 200) {
    sharedBrainBuffer.splice(0, sharedBrainBuffer.length - 200);
  }
}

// ── Core Ollama Call ────────────────────────────────────────────

let ollamaAvailable: boolean | null = null;
let ollamaResponsive: boolean = false; // true only if model can actually generate
let activeModel: string = GEMMA_MODEL;
let visionCapable: boolean = false;

// Models known to support vision (multimodal image input)
const VISION_MODELS = ['gemma3', 'gemma4', 'llava', 'llava-llama3', 'bakllava', 'moondream', 'minicpm-v'];

export async function checkOllamaHealth(): Promise<boolean> {
  // Skip Ollama check in production — it only runs locally
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    ollamaAvailable = false;
    return false;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!resp.ok) return false;
    const data = await resp.json();
    const rawModels: string[] = (data.models || []).map((m: any) => m.name || '');
    const modelBases = rawModels.map(n => n.split(':')[0]);
    // Check if Gemma is available, fallback to llama, then first available
    // Use full model name (with :tag) for API calls
    const findFull = (base: string) => rawModels.find(n => n.startsWith(base)) || base;
    if (modelBases.includes('gemma4')) {
      activeModel = findFull('gemma4');
    } else if (modelBases.includes('gemma3')) {
      activeModel = findFull('gemma3');
    } else if (modelBases.includes('gemma2')) {
      activeModel = findFull('gemma2');
    } else if (modelBases.includes(FALLBACK_MODEL)) {
      activeModel = findFull(FALLBACK_MODEL);
    } else if (rawModels.length > 0) {
      activeModel = rawModels[0];
    }
    // Check if active model supports vision
    const activeBase = activeModel.split(':')[0];
    visionCapable = VISION_MODELS.some(vm => activeBase.startsWith(vm));
    ollamaAvailable = true;

    // Quick inference ping — verify model can actually respond (8s timeout)
    try {
      const pingCtrl = new AbortController();
      const pingTimeout = setTimeout(() => pingCtrl.abort(), 8000);
      const pingResp = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: activeModel,
          messages: [{ role: 'user', content: 'OK' }],
          options: { num_predict: 1 },
          stream: false,
        }),
        signal: pingCtrl.signal,
      });
      clearTimeout(pingTimeout);
      ollamaResponsive = pingResp.ok;
    } catch {
      ollamaResponsive = false;
    }

    return true;
  } catch {
    ollamaAvailable = false;
    visionCapable = false;
    return false;
  }
}

async function callOllama(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = MAX_TOKENS,
): Promise<string | null> {
  // Lazy health check
  if (ollamaAvailable === null) await checkOllamaHealth();
  if (!ollamaAvailable || !ollamaResponsive) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const body: OllamaCompletionRequest = {
      model: activeModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      options: {
        temperature: TEMPERATURE,
        num_predict: maxTokens,
      },
      stream: false,
    };

    const resp = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) return null;
    const data: OllamaCompletionResponse = await resp.json();
    return data.message?.content || null;
  } catch {
    return null;
  }
}

// ── Engine Enhancement Functions ────────────────────────────────

const SYSTEM_BASE = `You are AEGIS-BRAIN, the AI intelligence core of AEGIS Empire, a financial simulation game. You provide concise, expert-level financial analysis narratives. Be direct, analytical, and actionable. Max 3 sentences unless asked for more.`;

/**
 * Enhance macro regime with narrative explanation
 * Enriches macroEngine.getMacroRegime() output
 */
export async function enhanceMacroRegime(regime: {
  phase: string;
  gdpGrowth: number;
  inflation: number;
  interestRate: number;
  sentiment: number;
}): Promise<string | null> {
  const narrative = await callOllama(
    SYSTEM_BASE + ` You specialize in macroeconomics. Explain economic phases in terms a financial professional would appreciate.`,
    `Current macro regime:
- Phase: ${regime.phase}
- GDP Growth: ${(regime.gdpGrowth * 100).toFixed(1)}%
- Inflation: ${(regime.inflation * 100).toFixed(1)}%
- Interest Rate: ${(regime.interestRate * 100).toFixed(1)}%
- Market Sentiment: ${regime.sentiment.toFixed(2)} (-1 to 1)

Explain the current economic environment, its implications for investment strategy, and what phase transition to watch for next.`,
  );

  if (narrative) {
    addToBrain({
      type: 'macro_narrative',
      content: narrative,
      context: regime,
      engineSource: 'macroEngine',
    });
    eventBridge.emit(EVENTS.GEMMA_MACRO_NARRATIVE, { regime, narrative });
  }
  return narrative;
}

/**
 * Enhance portfolio advice with natural language reasoning
 * Enriches aiController.getPortfolioAdvice() output
 */
export async function enhancePortfolioAdvice(advice: {
  symbol: string;
  action: string;
  confidence: number;
  reasoning: string[];
}[]): Promise<Record<string, string>> {
  const narratives: Record<string, string> = {};

  // Batch: generate one narrative for top 5 most important actions
  const topAdvice = advice.slice(0, 5);
  if (topAdvice.length === 0) return narratives;

  const adviceSummary = topAdvice.map(a =>
    `${a.symbol}: ${a.action} (confidence ${(a.confidence * 100).toFixed(0)}%) — ${a.reasoning.join('; ')}`
  ).join('\n');

  const narrative = await callOllama(
    SYSTEM_BASE + ` You are a portfolio strategist. For each position, synthesize the reasoning into a single clear paragraph explaining the action.`,
    `Portfolio actions to explain:\n${adviceSummary}\n\nFor each symbol, provide a one-paragraph narrative synthesizing all reasoning into coherent investment logic.`,
    800,
  );

  if (narrative) {
    // Parse response — try to split by symbol
    for (const a of topAdvice) {
      const regex = new RegExp(`${a.symbol}[:\\s]([^]*?)(?=\\n[A-Z]{2,}[:\\s]|$)`, 'i');
      const match = narrative.match(regex);
      narratives[a.symbol] = match ? match[1].trim() : narrative;
    }

    addToBrain({
      type: 'portfolio_insight',
      content: narrative,
      context: { symbols: topAdvice.map(a => a.symbol) },
      engineSource: 'aiController',
    });
    eventBridge.emit(EVENTS.GEMMA_PORTFOLIO_NARRATIVE, { advice: topAdvice, narratives });
  }
  return narratives;
}

/**
 * Enhance bias detection with personalized coaching
 * Enriches behavioralEngine.detectBiases() output
 */
export async function enhanceBiasCoaching(biases: {
  type: string;
  symbol?: string;
  description: string;
  severity: number;
}[]): Promise<Record<string, string>> {
  const coaching: Record<string, string> = {};
  if (biases.length === 0) return coaching;

  const biasText = biases.map(b =>
    `[${b.type}] ${b.description}${b.symbol ? ` (${b.symbol})` : ''} — severity: ${b.severity.toFixed(2)}`
  ).join('\n');

  const narrative = await callOllama(
    SYSTEM_BASE + ` You are a behavioral finance coach. For each bias detected, explain the psychology briefly and give ONE concrete corrective action. Be empathetic but direct.`,
    `Detected biases in user trading behavior:\n${biasText}\n\nFor each bias, provide coaching: explain the psychology and suggest a specific corrective action.`,
    600,
  );

  if (narrative) {
    for (const b of biases) {
      const regex = new RegExp(`\\[?${b.type}\\]?[:\\s]([^]*?)(?=\\n\\[|$)`, 'i');
      const match = narrative.match(regex);
      coaching[b.type] = match ? match[1].trim() : narrative;
    }

    addToBrain({
      type: 'bias_coaching',
      content: narrative,
      context: { biasTypes: biases.map(b => b.type) },
      engineSource: 'behavioralEngine',
    });
    eventBridge.emit(EVENTS.GEMMA_BIAS_COACHING, { biases, coaching });
  }
  return coaching;
}

/**
 * Enhance network analysis with systemic risk narratives
 * Enriches gnnEngine.worldNetworkAnalysis() output
 */
export async function enhanceNetworkAnalysis(analysis: {
  systemicRisk: number;
  vulnerableNodes: string[];
  communityCount: number;
  topPageRank: { nodeId: string; score: number }[];
}): Promise<string | null> {
  const narrative = await callOllama(
    SYSTEM_BASE + ` You specialize in network topology and systemic risk analysis. Explain cascade scenarios in business terms.`,
    `Venture ecosystem network analysis:
- Systemic risk score: ${analysis.systemicRisk.toFixed(2)} (0-1 scale)
- Vulnerable hub nodes: ${analysis.vulnerableNodes.length} (IDs: ${analysis.vulnerableNodes.slice(0, 5).join(', ')})
- Community clusters: ${analysis.communityCount}
- Top centrality nodes: ${analysis.topPageRank.slice(0, 3).map(n => `${n.nodeId} (${n.score.toFixed(3)})`).join(', ')}

Explain the ecosystem's fragility, identify the most dangerous cascade scenarios, and suggest portfolio resilience strategies.`,
  );

  if (narrative) {
    addToBrain({
      type: 'venture_analysis',
      content: narrative,
      context: analysis,
      engineSource: 'gnnEngine',
    });
    eventBridge.emit(EVENTS.GEMMA_NETWORK_NARRATIVE, { analysis, narrative });
  }
  return narrative;
}

/**
 * Enhance risk assessment with contextual warnings
 * Enriches aiController.riskAssessment() output
 */
export async function enhanceRiskAssessment(risk: {
  overallRisk: number;
  concentrationRisk: number;
  correlationRisk: number;
  drawdownRisk: number;
  warnings: string[];
}): Promise<string | null> {
  const narrative = await callOllama(
    SYSTEM_BASE + ` You are a risk management specialist. Prioritize the most dangerous risk and suggest specific hedging actions.`,
    `Portfolio risk assessment:
- Overall risk: ${risk.overallRisk.toFixed(2)} (0-1)
- Concentration risk: ${risk.concentrationRisk.toFixed(2)}
- Correlation risk: ${risk.correlationRisk.toFixed(2)}
- Drawdown risk: ${risk.drawdownRisk.toFixed(2)}
- Warnings: ${risk.warnings.join('; ')}

Identify the single most dangerous risk, explain why, and recommend a specific hedging action.`,
  );

  if (narrative) {
    addToBrain({
      type: 'risk_assessment',
      content: narrative,
      context: risk,
      engineSource: 'aiController',
    });
    eventBridge.emit(EVENTS.GEMMA_RISK_NARRATIVE, { risk, narrative });
  }
  return narrative;
}

/**
 * Enhance sentiment analysis with semantic depth
 * Enriches altDataEngine.processSentiment() output
 */
export async function enhanceSentimentAnalysis(sentimentData: {
  overallSentiment: number;
  topBullish: string[];
  topBearish: string[];
  trendingTopics: string[];
}): Promise<string | null> {
  const narrative = await callOllama(
    SYSTEM_BASE + ` You are a market sentiment analyst. Identify emerging narratives and contrarian signals in market sentiment.`,
    `Market sentiment snapshot:
- Overall: ${sentimentData.overallSentiment.toFixed(2)} (-1 bearish to +1 bullish)
- Bullish drivers: ${sentimentData.topBullish.slice(0, 5).join(', ') || 'none'}
- Bearish drivers: ${sentimentData.topBearish.slice(0, 5).join(', ') || 'none'}
- Trending: ${sentimentData.trendingTopics.slice(0, 5).join(', ') || 'none'}

Analyze the sentiment landscape: identify the dominant narrative, any emerging contrarian signals, and what shift to watch for.`,
  );

  if (narrative) {
    eventBridge.emit(EVENTS.GEMMA_SENTIMENT_NARRATIVE, { sentimentData, narrative });
  }
  return narrative;
}

/**
 * General-purpose Gemma query — used by Athena COO for directive analysis
 */
export async function queryGemma(
  systemContext: string,
  query: string,
  maxTokens: number = MAX_TOKENS,
): Promise<string | null> {
  return callOllama(systemContext || SYSTEM_BASE, query, maxTokens);
}

/**
 * Athena COO directive analysis — breaks down user directives into sub-tasks
 * Used by agentWorkbenchStore for task delegation
 */
export async function analyzeDirective(
  directive: string,
  availableAgentClasses: string[],
): Promise<{ taskType: string; description: string; suggestedClass: string; reason: string }[] | null> {
  const response = await callOllama(
    `You are Athena, the COO of AEGIS Empire. You break down high-level directives into concrete sub-tasks and assign them to agent classes. Available agent classes: ${availableAgentClasses.join(', ')}. Respond in JSON array format: [{"taskType": "research|code|automate|analyze|social|monitor", "description": "task description", "suggestedClass": "ClassName", "reason": "why this class"}]`,
    `Directive: "${directive}"\n\nBreak this into 1-4 concrete sub-tasks. Respond ONLY with the JSON array.`,
    600,
  );

  if (!response) return null;
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch { /* parse error */ }
  return null;
}

// ── Vision API ─────────────────────────────────────────────────

/**
 * Call Ollama with a vision-capable model, passing a base64 image.
 * Falls back to text-only callOllama if no vision model is available.
 */
async function callOllamaVision(
  systemPrompt: string,
  userPrompt: string,
  imageBase64: string,
  maxTokens: number = MAX_TOKENS,
): Promise<string | null> {
  if (ollamaAvailable === null) await checkOllamaHealth();
  if (!ollamaAvailable || !ollamaResponsive) return null;

  // If model doesn't support vision, fall back to text-only
  if (!visionCapable) {
    return callOllama(systemPrompt, userPrompt + '\n[Note: Image analysis unavailable — text-only mode]', maxTokens);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS * 2); // Vision takes longer

    // Strip data URI prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const body: OllamaCompletionRequest = {
      model: activeModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt, images: [cleanBase64] },
      ],
      options: {
        temperature: TEMPERATURE,
        num_predict: maxTokens,
      },
      stream: false,
    };

    const resp = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) return null;
    const data: OllamaCompletionResponse = await resp.json();
    return data.message?.content || null;
  } catch {
    return null;
  }
}

const MAP_VISION_SYSTEM = `You are AEGIS-VISION, the geospatial intelligence core of AEGIS Empire. You analyze satellite-style map views of the player's corporate empire. You can see:
- Colored dots representing corporate nodes (green = player-owned, red = market/rivals, amber = rival factions)
- Arc lines representing trade routes and supply chains
- 3D column extrusions representing venture scale and sector type
- Geographic clustering patterns and strategic gaps
- World events overlaid as markers

Provide concise strategic intelligence: identify concentration risks, expansion opportunities, supply chain vulnerabilities, and geographic advantages. Be direct and actionable. Max 5 bullet points.`;

/**
 * Analyze the map strategically — uses vision when available, falls back to
 * rich text-only analysis using structured empire data.
 */
export async function analyzeMapVision(
  imageBase64: string,
  context: {
    playerNodeCount: number;
    totalNodeCount: number;
    activeRoutes: number;
    zoomLevel: number;
    centerLat: number;
    centerLng: number;
    activeLayer: string;
    activeEvents?: string[];
    playerNodes?: { name: string; type: string; region: string; level: number }[];
    rivalNodes?: { name: string; type: string; region: string }[];
    routeSummary?: string[];
  },
): Promise<string | null> {
  let narrative: string | null = null;

  if (visionCapable && imageBase64) {
    // Vision path: send the actual map screenshot
    const contextText = `Map context:
- Player nodes: ${context.playerNodeCount} of ${context.totalNodeCount} total
- Active trade routes: ${context.activeRoutes}
- Zoom: ${context.zoomLevel.toFixed(1)} (${context.zoomLevel < 4 ? 'global' : context.zoomLevel < 8 ? 'regional' : 'city-scale'})
- Center: ${context.centerLat.toFixed(1)}°N, ${context.centerLng.toFixed(1)}°E
- Layer: ${context.activeLayer}
${context.activeEvents?.length ? `- Events: ${context.activeEvents.join(', ')}` : ''}

Analyze the map image and provide strategic intelligence about geographic positioning.`;

    narrative = await callOllamaVision(MAP_VISION_SYSTEM, contextText, imageBase64, 768);
  }

  // Text-only path: use structured data instead of image
  if (!narrative) {
    const textSystem = `You are AEGIS-VISION, the geospatial intelligence core of AEGIS Empire. You analyze the player's corporate empire positioning and provide strategic intelligence. Be direct, analytical, and actionable. Format as 4-5 bullet points prefixed with "▸".`;

    const playerNodeList = context.playerNodes?.length
      ? context.playerNodes.map(n => `  ${n.name} (${n.type}, L${n.level}, ${n.region})`).join('\n')
      : '  No player nodes found';

    const rivalNodeList = context.rivalNodes?.length
      ? context.rivalNodes.slice(0, 10).map(n => `  ${n.name} (${n.type}, ${n.region})`).join('\n')
      : '  Rival positions unknown';

    const routeList = context.routeSummary?.length
      ? context.routeSummary.join('\n  ')
      : 'No active routes';

    const textPrompt = `EMPIRE STATUS REPORT:

Player controls ${context.playerNodeCount} of ${context.totalNodeCount} nodes.
Active trade routes: ${context.activeRoutes}
Current view: ${context.zoomLevel < 4 ? 'Global overview' : context.zoomLevel < 8 ? 'Regional focus' : 'City-scale'} centered at ${context.centerLat.toFixed(1)}°N, ${context.centerLng.toFixed(1)}°E
Active intelligence layer: ${context.activeLayer}
${context.activeEvents?.length ? `Active world events: ${context.activeEvents.join(', ')}` : 'No active world events'}

PLAYER ASSETS:
${playerNodeList}

RIVAL POSITIONS:
${rivalNodeList}

TRADE ROUTES:
  ${routeList}

Provide strategic intelligence:
1. Geographic concentration risks
2. Expansion opportunities (underserved regions/sectors)
3. Supply chain vulnerabilities
4. Competitive threats from rival positioning
5. Recommended next strategic move`;

    narrative = await callOllama(textSystem, textPrompt, 768);
  }

  if (narrative) {
    addToBrain({
      type: 'venture_analysis',
      content: narrative,
      context: { ...context, source: visionCapable ? 'map_vision' : 'map_text_analysis' },
      engineSource: 'gemmaVision',
    });
    eventBridge.emit(EVENTS.GEMMA_MAP_VISION, { context, narrative });
  }
  return narrative;
}

export function isVisionCapable(): boolean {
  return visionCapable;
}

// ── Initialization ──────────────────────────────────────────────

export async function initGemmaBridge(): Promise<{ available: boolean; model: string }> {
  const available = await checkOllamaHealth();
  if (import.meta.env.DEV) console.debug(`[GEMMA-BRIDGE] Ollama ${available ? 'connected' : 'offline'} — model: ${activeModel}`);
  return { available, model: activeModel };
}

// ── Engine Event Listeners ──────────────────────────────────────
// Auto-enhance engine outputs when events fire

let autoEnhanceEnabled = false;

export function enableAutoEnhance(): void {
  if (autoEnhanceEnabled) return;
  autoEnhanceEnabled = true;

  // Listen for macro regime updates
  eventBridge.on(EVENTS.WORLD_SIM_UPDATED, async (payload: any) => {
    if (payload?.macroRegime) {
      await enhanceMacroRegime(payload.macroRegime);
    }
  });

  // Listen for trade execution → analyze with Gemma
  eventBridge.on(EVENTS.TRADE_EXECUTED, async (payload: any) => {
    if (payload?.symbol && payload?.action) {
      const analysis = await callOllama(
        SYSTEM_BASE,
        `Trade executed: ${payload.action} ${payload.symbol} at ${payload.price}. Brief 1-sentence analysis of timing and positioning.`,
        128,
      );
      if (analysis) {
        eventBridge.emit(EVENTS.GEMMA_TRADE_ANALYSIS, { trade: payload, analysis });
      }
    }
  });

  // Listen for world events → contextualize
  eventBridge.on(EVENTS.WORLD_EVENT_STARTED, async (payload: any) => {
    if (payload?.title) {
      const context = await callOllama(
        SYSTEM_BASE,
        `World event: "${payload.title}" — ${payload.description || ''}. Brief economic impact analysis in 2 sentences.`,
        192,
      );
      if (context) {
        eventBridge.emit(EVENTS.GEMMA_EVENT_CONTEXT, { event: payload, context });
      }
    }
  });

  if (import.meta.env.DEV) console.debug('[GEMMA-BRIDGE] Auto-enhance listeners active');
}

// Export active model for UI display
export function getActiveModel(): string {
  return activeModel;
}

export function isOllamaAvailable(): boolean {
  return ollamaAvailable === true;
}
