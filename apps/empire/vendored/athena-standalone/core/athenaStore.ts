/**
 * athenaStore.ts
 * Dedicated state management for Athena — the universal game control AI.
 * Handles conversation history, tool execution, and Blackbox AI integration.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEmpireStore } from './empireStore';
import { useAgentCardStore } from './agentCardStore';
import { useMatchStore } from './matchStore';
import { useMatchSocialStore } from './matchSocialStore';
import { useNewsStore } from './newsStore';
import { useExpansionStore } from './expansionStore';
import { useFeatureStore } from './featureStore';
import { testFeature, executeFeature, validateFeatureCode } from '../lib/featureSandbox';
import { ALL_INSTRUMENTS } from '../data/instruments';
import { ATHENA_TOOLS, toAPIToolSchemas, getAvailableTools, getAllTools, registerDynamicTool, getDynamicTools, setDynamicTools } from '../data/athenaTools';
import type { AthenaTool } from '../data/athenaTools';

/* ── Types ─────────────────────────────────────────────────────────── */

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface AthenaMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;     // for tool-result messages
  proposal?: AthenaProposal; // attached proposal for rendering
  timestamp: number;
}

interface ActionQueueItem {
  toolName: string;
  args: Record<string, any>;
  status: 'pending' | 'executing' | 'done' | 'failed';
  result?: string;
  timestamp: number;
}

/* ── Proposal System ──────────────────────────────────────────────── */
// Athena proposes actions with cost estimates before executing.
// User must approve or reject. Costs are based on comparable in-game items.

export interface ProposalOption {
  id: string;
  label: string;            // e.g. "Budget", "Standard", "Premium"
  description: string;
  estimatedCost: number;    // in euros
  comparables: string[];    // e.g. "Similar to Node X (€50K)", "Like AAPL stock (€180)"
  requirements: string[];   // e.g. "Requires €200K balance", "Needs 3 owned nodes"
  risks: string[];          // e.g. "High heat +15", "May attract rival attention"
  toolCalls: ToolCall[];    // the actual tools to execute on approval
  tier: 'budget' | 'standard' | 'premium' | 'custom';
}

export interface AthenaProposal {
  id: string;
  title: string;
  description: string;      // what the player asked for
  analysis: string;         // Athena's analysis of the request
  options: ProposalOption[];
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'expired';
  selectedOptionId?: string;
  executionResults?: string[];
  timestamp: number;
  expiresAt: number;        // auto-expire after 5 min
}

interface AthenaState {
  // Conversation
  messages: AthenaMessage[];
  isLoading: boolean;

  // Tool execution
  actionQueue: ActionQueueItem[];

  // Proposal system
  pendingProposal: AthenaProposal | null;
  proposalHistory: AthenaProposal[];

  // Token tracking (persisted)
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;

  // Provider tracking
  lastProvider: string;
  providerStatus: 'unknown' | 'connected' | 'offline';

  // Dynamic tools (installed at runtime)
  dynamicToolDefs: AthenaTool[];

  // Actions
  sendMessage: (content: string, navCallbacks?: NavCallbacks) => Promise<void>;
  approveProposal: (optionId: string, navCallbacks?: NavCallbacks) => Promise<void>;
  resolveToolCalls: (option: any, proposal: any, navCallbacks?: NavCallbacks) => Promise<ToolCall[]>;
  rejectProposal: (reason?: string) => void;
  executeTool: (toolName: string, args: Record<string, any>, navCallbacks?: NavCallbacks) => Promise<string>;
  executeToolCalls: (calls: ToolCall[], navCallbacks?: NavCallbacks) => Promise<string[]>;
  buildSystemPrompt: () => string;
  clearHistory: () => void;
  reset: () => void;
}

/** Callbacks for navigation actions that need App.jsx state setters */
export interface NavCallbacks {
  setActiveApp?: (app: string) => void;
  setGameMode?: (mode: string | null) => void;
  restoreCampaignSnapshot?: () => void;
}

/* ── Chat API ──────────────────────────────────────────────────────── */

const ATHENA_TOOLS_URL = '/api/v1/athena/tools';
const ATHENA_CHAT_URL = '/api/v1/athena/chat';

/* ── Tool Executor ─────────────────────────────────────────────────── */

function findInstrument(symbol: string) {
  // Check static instruments first, then dynamic
  const staticMatch = ALL_INSTRUMENTS.find(
    i => i.symbol.toLowerCase() === symbol.toLowerCase() || i.id === symbol.toLowerCase()
  );
  if (staticMatch) return staticMatch;

  // Check dynamic (expansion) instruments
  const dynamicInstruments = useExpansionStore.getState().dynamicInstruments;
  return dynamicInstruments.find(
    i => i.symbol.toLowerCase() === symbol.toLowerCase() || i.id === symbol.toLowerCase()
  );
}

/**
 * Execute a single tool call against the game stores.
 * Returns a human-readable result string.
 */
async function executeToolHandler(
  toolName: string,
  args: Record<string, any>,
  navCallbacks?: NavCallbacks,
): Promise<string> {
  const empire = useEmpireStore.getState();
  const agents = useAgentCardStore.getState();
  const match = useMatchStore.getState();
  const social = useMatchSocialStore.getState();
  const news = useNewsStore.getState();
  const expansion = useExpansionStore.getState();

  try {
    switch (toolName) {

      /* ─── Trading ────────────────────────────────────────────── */
      case 'buy_instrument': {
        const inst = findInstrument(args.symbol);
        if (!inst) return `ERROR: Unknown instrument "${args.symbol}"`;
        const qty = args.quantity || 1;
        const cost = inst.price * qty;
        if (empire.companyBalance < cost) return `ERROR: Insufficient funds. Need €${cost.toLocaleString()}, have €${empire.companyBalance.toLocaleString()}`;
        empire.buyInstrument(inst.id, inst.symbol, inst.name, inst.type, inst.price, qty);
        return `Bought ${qty}x ${inst.symbol} (${inst.name}) at €${inst.price.toLocaleString()} each. Total: €${cost.toLocaleString()}`;
      }
      case 'sell_instrument': {
        const pos = Object.values(empire.portfolio).find(
          p => p.symbol.toLowerCase() === (args.symbol || '').toLowerCase()
        );
        if (!pos) return `ERROR: No position in "${args.symbol}"`;
        const inst = findInstrument(pos.symbol);
        const qty = args.quantity || pos.quantity;
        const sellQty = Math.min(qty, pos.quantity);
        const price = inst?.price || pos.avgCost;
        empire.sellInstrument(Object.keys(empire.portfolio).find(
          k => empire.portfolio[k].symbol.toLowerCase() === pos.symbol.toLowerCase()
        )!, price, sellQty);
        const pnl = (price - pos.avgCost) * sellQty;
        return `Sold ${sellQty}x ${pos.symbol} at €${price.toLocaleString()}. P&L: €${pnl >= 0 ? '+' : ''}${pnl.toLocaleString()}`;
      }
      case 'check_portfolio': {
        const entries = Object.values(empire.portfolio);
        if (entries.length === 0) return 'Portfolio is empty. No positions held.';
        const lines = entries.map(p => {
          const inst = findInstrument(p.symbol);
          const curr = inst?.price || p.avgCost;
          const pnl = (curr - p.avgCost) * p.quantity;
          return `${p.symbol}: ${p.quantity}x @ €${p.avgCost.toFixed(2)} → €${curr.toFixed(2)} (${pnl >= 0 ? '+' : ''}€${pnl.toFixed(0)})`;
        });
        return `Portfolio (${entries.length} positions):\n${lines.join('\n')}`;
      }
      case 'check_price': {
        const inst = findInstrument(args.symbol);
        if (!inst) return `ERROR: Unknown instrument "${args.symbol}"`;
        return `${inst.symbol} (${inst.name}): €${inst.price.toLocaleString()} | 24h: ${inst.change24h >= 0 ? '+' : ''}${inst.change24h}% | Type: ${inst.type}${inst.sector ? ` | Sector: ${inst.sector}` : ''}${inst.marketCapB ? ` | MCap: €${inst.marketCapB}B` : ''}`;
      }

      /* ─── Empire ─────────────────────────────────────────────── */
      case 'acquire_node': {
        const allNodes = empire.nodes || {};
        const marketNodes = Object.entries(allNodes).filter(([_, n]) => n.owner === 'market');
        if (marketNodes.length === 0) return 'ERROR: No market nodes available for purchase';
        let nodeId: string;
        if (!args.nodeId || args.nodeId === 'cheapest') {
          const [cheapId] = marketNodes.sort((a, b) => (a[1].capex || 0) - (b[1].capex || 0))[0];
          nodeId = cheapId;
        } else {
          nodeId = args.nodeId;
        }
        const node = allNodes[nodeId];
        if (!node) return `ERROR: Node "${nodeId}" not found`;
        if (node.owner !== 'market') return `ERROR: Node "${node.name}" is not on the market (owned by ${node.owner})`;
        if (empire.companyBalance < (node.capex || 0)) return `ERROR: Insufficient funds. Need €${(node.capex || 0).toLocaleString()}`;
        empire.purchaseNode(nodeId, args.method || 'buy');
        // Fly to the acquired node
        if (node.lat && node.lng) {
          navCallbacks?.setActiveApp?.('globe');
          setTimeout(() => useEmpireStore.getState().flyToNode(node.lat, node.lng, 8, nodeId), 300);
        }
        return `Acquired "${node.name}" for €${(node.capex || 0).toLocaleString()} via ${args.method || 'buy'}. Navigating to location...`;
      }
      case 'upgrade_node': {
        const owned = Object.entries(empire.nodes || {}).filter(([_, n]) => n.owner === 'player');
        if (owned.length === 0) return 'ERROR: No owned nodes to upgrade';
        const nodeId = (!args.nodeId || args.nodeId === 'first') ? owned[0][0] : args.nodeId;
        const node = (empire.nodes || {})[nodeId];
        if (!node) return `ERROR: Node "${nodeId}" not found`;
        if (node.owner !== 'player') return `ERROR: You don't own node "${node.name}"`;
        empire.upgradeNode(nodeId);
        return `Upgraded "${node.name}" successfully`;
      }
      case 'steal_node': {
        const rivals = Object.entries(empire.nodes || {}).filter(([_, n]) => n.owner === 'rival');
        if (rivals.length === 0) return 'ERROR: No rival nodes to steal';
        let nodeId: string;
        if (!args.nodeId || args.nodeId === 'random') {
          nodeId = rivals[Math.floor(Math.random() * rivals.length)][0];
        } else {
          nodeId = args.nodeId;
        }
        const node = (empire.nodes || {})[nodeId];
        if (!node) return `ERROR: Node "${nodeId}" not found`;
        const result = empire.stealNode(nodeId);
        return result.success
          ? `Hostile takeover of "${node.name}" SUCCEEDED! Cost: €${result.cost.toLocaleString()}`
          : `Hostile takeover of "${node.name}" FAILED. Lost €${result.cost.toLocaleString()}`;
      }
      case 'list_nodes': {
        const allNodes = empire.nodes || {};
        const filter = args.filter || 'all';
        const entries = Object.entries(allNodes).filter(([_, n]) => {
          if (filter === 'owned') return n.owner === 'player';
          if (filter === 'rival') return n.owner === 'rival';
          if (filter === 'market') return n.owner === 'market';
          return true;
        });
        if (entries.length === 0) return `No ${filter} nodes found.`;
        const lines = entries.slice(0, 20).map(([id, n]) =>
          `[${id}] "${n.name}" — owner: ${n.owner} | type: ${n.type || 'general'} | income: €${(n.income || 0).toLocaleString()}/mo | capex: €${(n.capex || 0).toLocaleString()}`
        );
        return `${filter.toUpperCase()} NODES (${entries.length}):\n${lines.join('\n')}${entries.length > 20 ? `\n... and ${entries.length - 20} more` : ''}`;
      }
      case 'build_route': {
        empire.buildRoute(args.fromNodeId, args.toNodeId, args.type || 'land');
        return `Trade route established: ${args.fromNodeId} → ${args.toNodeId} (${args.type || 'land'})`;
      }
      case 'upgrade_route': {
        empire.upgradeRoute(args.routeId, args.upgradeName, 0);
        return `Route ${args.routeId} upgraded with "${args.upgradeName}"`;
      }
      case 'rename_node': {
        empire.purchaseNamingRights(args.nodeId, args.newName);
        return `Node ${args.nodeId} renamed to "${args.newName}"`;
      }

      /* ─── Corporate ──────────────────────────────────────────── */
      case 'set_structure': {
        empire.setStructure(args.structure);
        return `Corporate structure changed to ${args.structure}`;
      }
      case 'start_research': {
        empire.startResearch(args.projectId);
        return `R&D project "${args.projectId}" started`;
      }
      case 'start_project': {
        empire.startProject(args.projectId);
        return `Department project "${args.projectId}" started`;
      }
      case 'set_difficulty': {
        empire.setDifficulty(args.difficulty);
        return `Difficulty set to ${args.difficulty}`;
      }

      /* ─── Finance ────────────────────────────────────────────── */
      case 'take_loan': {
        const ok = empire.takeLoan(args.type, args.amount);
        return ok ? `Loan approved: €${args.amount.toLocaleString()} (${args.type})` : `ERROR: Loan denied`;
      }
      case 'repay_loan': {
        const ok = empire.makePayment(args.loanId, args.amount);
        return ok ? `Payment of €${(args.amount || 'minimum').toLocaleString()} applied to loan ${args.loanId}` : `ERROR: Payment failed`;
      }
      case 'transfer_funds': {
        if (args.direction === 'to_personal') {
          empire.transferToPersonal(args.amount);
        } else {
          empire.transferToCompany(args.amount);
        }
        return `Transferred €${args.amount.toLocaleString()} ${args.direction === 'to_personal' ? 'to personal account' : 'to company account'}`;
      }
      case 'invest_vc': {
        empire.investVC(args.dealId);
        return `VC investment in deal "${args.dealId}" executed`;
      }
      case 'acquire_pe': {
        empire.acquirePE(args.targetId);
        return `Private equity acquisition of "${args.targetId}" completed`;
      }
      case 'allocate_hedge': {
        empire.allocateHF(args.strategyId, args.amount);
        return `€${args.amount.toLocaleString()} allocated to hedge fund strategy "${args.strategyId}"`;
      }
      case 'start_ib_deal': {
        empire.startIBDeal(args.dealId);
        return `Investment banking deal "${args.dealId}" initiated`;
      }
      case 'acquire_media': {
        empire.acquireMedia(args.outletId);
        return `Media outlet "${args.outletId}" acquired`;
      }
      case 'place_bid': {
        empire.placeBid(args.auctionId, args.bidAmount);
        return `Bid of €${args.bidAmount.toLocaleString()} placed on auction "${args.auctionId}"`;
      }
      case 'buy_asset': {
        const cost = 0; // Cost is handled internally by the store
        empire.buyAsset(args.assetType, args.assetId, cost);
        return `Asset purchased: ${args.assetType}/${args.assetId}`;
      }

      /* ─── Agents ─────────────────────────────────────────────── */
      case 'deploy_agent': {
        let mintId = args.mintId;
        if (mintId === 'best') {
          // Find highest-level available agent
          const available = Object.entries(agents.agents)
            .filter(([_, a]) => !a.deployedTo)
            .sort((a, b) => (b[1].level || 1) - (a[1].level || 1));
          if (available.length === 0) return 'ERROR: No available agents to deploy';
          mintId = available[0][0];
        }
        const ok = agents.deployAgent(mintId, args.targetId);
        if (!ok) return `ERROR: Could not deploy agent ${mintId} to ${args.targetId}`;
        const def = agents.getAgentDef(mintId);
        return `Deployed ${def?.name || mintId} to ${args.targetId}`;
      }
      case 'recall_agent': {
        const ok = agents.recallAgent(args.mintId);
        if (!ok) return `ERROR: Could not recall agent ${args.mintId}`;
        const def = agents.getAgentDef(args.mintId);
        return `Recalled ${def?.name || args.mintId} to bench`;
      }
      case 'list_agents': {
        const allAgents = Object.entries(agents.agents);
        const filter = (args.filter || 'all').toLowerCase();
        const filtered = allAgents.filter(([_, a]) => {
          if (filter === 'deployed') return !!a.deployedTo;
          if (filter === 'bench') return !a.deployedTo;
          if (filter !== 'all') {
            const def = agents.getAgentDef(_);
            return def?.class?.toLowerCase() === filter;
          }
          return true;
        });
        if (filtered.length === 0) return `No agents found (filter: ${filter})`;
        const lines = filtered.slice(0, 20).map(([mintId, a]) => {
          const def = agents.getAgentDef(mintId);
          return `[${mintId.slice(0, 8)}] ${def?.name || 'Unknown'} — Lv${a.level || 1} | Class: ${def?.class || '?'} | ${a.deployedTo ? `Deployed: ${a.deployedTo}` : 'BENCH'}`;
        });
        return `AGENTS (${filtered.length}):\n${lines.join('\n')}`;
      }
      case 'use_ability': {
        const ok = agents.useAbility(args.mintId, Date.now());
        return ok ? `Agent ${args.mintId} ability activated` : `ERROR: Ability on cooldown or agent not found`;
      }
      case 'use_ultimate': {
        const ok = agents.useUltimate(args.mintId, Date.now());
        return ok ? `Agent ${args.mintId} ultimate activated!` : `ERROR: Ultimate on cooldown or agent not found`;
      }
      case 'quick_sell_agent': {
        const coins = agents.quickSellAgent(args.mintId);
        return coins > 0 ? `Agent sold for ${coins} Q-Coins` : `ERROR: Could not sell agent`;
      }

      /* ─── Intel ──────────────────────────────────────────────── */
      case 'decrypt_intel': {
        const rivals = Object.entries(empire.nodes || {}).filter(([_, n]) => n.owner === 'rival' && !n.intelDecrypted);
        if (rivals.length === 0) return 'ERROR: No undecrypted rival nodes';
        const nodeId = (!args.nodeId || args.nodeId === 'next') ? rivals[0][0] : args.nodeId;
        empire.decryptIntel(nodeId);
        const node = (empire.nodes || {})[nodeId];
        return `Intel decrypted on "${node?.name || nodeId}"`;
      }
      case 'cyber_strike': {
        const rivals = Object.entries(empire.nodes || {}).filter(([_, n]) => n.owner === 'rival');
        if (rivals.length === 0) return 'ERROR: No rival nodes to target';
        const nodeId = (!args.nodeId || args.nodeId === 'random')
          ? rivals[Math.floor(Math.random() * rivals.length)][0]
          : args.nodeId;
        empire.executeCyberStrike(nodeId);
        const node = (empire.nodes || {})[nodeId];
        return `Cyber strike launched on "${node?.name || nodeId}"`;
      }

      /* ─── Shadow ─────────────────────────────────────────────── */
      case 'execute_crime': {
        empire.executeCrime(args.crimeId);
        return `Crime operation "${args.crimeId}" executed (heat increased)`;
      }
      case 'execute_shadow_op': {
        const result = empire.executeShadowOp(args.opId);
        if (!result) return `ERROR: Shadow op "${args.opId}" not available`;
        return result.success
          ? `Shadow op succeeded! Reward: €${result.reward.toLocaleString()}, Heat: +${result.heatGain}`
          : `Shadow op failed. Heat: +${result.heatGain}`;
      }

      /* ─── PvP ────────────────────────────────────────────────── */
      case 'pvp_attack': {
        if (!match.active) return 'ERROR: PvP attacks only available during matches';
        const opponents = match.leaderboard.filter(p => p.isBot || p.playerId !== match.leaderboard.find(lp => !lp.isBot)?.playerId);
        if (opponents.length === 0) return 'ERROR: No opponents to attack';
        let target;
        if (args.targetName === 'leader') {
          target = opponents[0]; // leaderboard is sorted
        } else if (args.targetName) {
          target = opponents.find(p => p.displayName.toLowerCase().includes(args.targetName.toLowerCase())) || opponents[0];
        } else {
          target = opponents[0];
        }
        const myNw = empire.netWorth || empire.companyBalance;
        const ok = match.launchPvPAttack(target.playerId, 'node', `${target.displayName}'s assets`, myNw);
        return ok
          ? `PvP attack launched against ${target.displayName}!`
          : 'ERROR: PvP attack on cooldown or already in progress';
      }
      case 'poach_agent': {
        const result = empire.poachAgent(args.agentMintId || '', args.ownerName || 'rival');
        return result.success
          ? `Agent poached successfully! Cost: €${result.cost.toLocaleString()}`
          : `Poach attempt failed. Lost €${result.cost.toLocaleString()}`;
      }

      /* ─── Social ─────────────────────────────────────────────── */
      case 'create_post': {
        if (!match.active) return 'ERROR: Match social media only available during matches';
        social.createPost(args.content, args.sentiment, args.targetAsset);
        return `Posted on match social: "${args.content}" [${args.sentiment}]${args.targetAsset ? ` $${args.targetAsset}` : ''}`;
      }
      case 'make_market_call': {
        if (!match.active) return 'ERROR: Market calls only available during matches';
        social.makeMarketCall(args.asset, args.direction);
        return `Market call: ${args.direction.toUpperCase()} on $${args.asset}`;
      }

      /* ─── Navigation ─────────────────────────────────────────── */
      case 'open_tab': {
        navCallbacks?.setActiveApp?.(args.tab);
        return `Navigated to ${args.tab} tab`;
      }
      case 'open_empire_tab': {
        navCallbacks?.setActiveApp?.('globe');
        empire.setActiveTab(args.tab);
        empire.setLeftRailOpen(true);
        return `Opened ${args.tab} panel in Globe view`;
      }
      case 'go_to_hub': {
        navCallbacks?.restoreCampaignSnapshot?.();
        navCallbacks?.setGameMode?.(null);
        return 'Returned to onboarding hub';
      }

      /* ─── Info ───────────────────────────────────────────────── */
      case 'get_balance': {
        return `Company Balance: €${empire.companyBalance.toLocaleString()} | Personal: €${(empire.personalBalance || 0).toLocaleString()} | Net Worth: €${(empire.netWorth || 0).toLocaleString()}`;
      }
      case 'get_company_stats': {
        return `Heat: ${empire.heat}/100 | Growth: ${empire.growth} | Governance: ${empire.governance} | Impact: ${empire.impact || 0} | Power: ${empire.power || 0} | Monthly Income: €${(empire.monthlyIncome || 0).toLocaleString()} | Structure: ${empire.structure || 'sole_prop'}`;
      }
      case 'get_leaderboard': {
        if (!match.active) return 'ERROR: Leaderboard only available during matches';
        const lb = match.leaderboard;
        const lines = lb.map((p, i) =>
          `#${i + 1} ${p.displayName}${p.isBot ? ' [BOT]' : ''} — NW: €${(p.netWorth || 0).toLocaleString()} | Nodes: ${p.nodesOwned || 0} | Trades: ${p.tradesExecuted || 0}`
        );
        return `LEADERBOARD:\n${lines.join('\n')}`;
      }
      case 'get_news': {
        const bulletins = news.bulletins.slice(0, 8);
        if (bulletins.length === 0) return 'No news bulletins available. Try refreshing.';
        const lines = bulletins
          .filter(b => !args.category || b.category === args.category)
          .map(b => `[${b.sentiment.toUpperCase()}] ${b.headline} — ${b.source} (${b.category})`);
        return `NEWS (${lines.length}):\n${lines.join('\n')}`;
      }
      case 'get_ticker': {
        const count = args.count || 10;
        const events = empire.ticker.slice(0, count);
        if (events.length === 0) return 'No ticker events.';
        return `TICKER (${events.length}):\n${events.map(e => `[${e.type}] ${e.text}`).join('\n')}`;
      }
      case 'analyze_sector': {
        const owned = Object.values(empire.nodes || {}).filter(n => n.owner === 'player');
        if (owned.length === 0) return 'No owned nodes to analyze.';
        const sectors: Record<string, { count: number; income: number }> = {};
        owned.forEach(n => {
          const s = n.type || 'other';
          if (!sectors[s]) sectors[s] = { count: 0, income: 0 };
          sectors[s].count++;
          sectors[s].income += n.income || 0;
        });
        const totalIncome = owned.reduce((s, n) => s + (n.income || 0), 0);
        const lines = Object.entries(sectors)
          .sort((a, b) => b[1].income - a[1].income)
          .map(([s, d]) => `${s}: ${d.count} nodes, €${d.income.toLocaleString()}/mo (${totalIncome > 0 ? ((d.income / totalIncome) * 100).toFixed(0) : 0}%)`);
        return `SECTOR ANALYSIS (${owned.length} nodes, €${totalIncome.toLocaleString()}/mo total):\n${lines.join('\n')}`;
      }
      case 'refresh_news': {
        news.refreshBulletins(args.category);
        return `News refreshed${args.category ? ` (${args.category})` : ''}`;
      }

      /* ─── Code Generation ─────────────────────────────────────── */
      case 'generate_code': {
        // This tool is a pass-through — the AI model generates the code directly.
        // We just format the request so the model knows to respond with a code block.
        const lang = args.language || 'javascript';
        return `CODE_REQUEST: Generate ${lang} code for: "${args.request}". Respond with a complete, runnable code block wrapped in triple backticks with the language tag. Include brief comments explaining the logic. After the code block, provide a 2-3 sentence explanation of how it works and how the user can adapt it.`;
      }

      /* ─── Proposals & Comparables ─────────────────────────────── */
      case 'submit_proposal': {
        const parseList = (s: string | undefined) => s ? s.split(',').map(x => x.trim()).filter(Boolean) : [];
        const parseTools = (s: string | undefined): ToolCall[] => {
          if (!s) return [];
          try {
            const arr = JSON.parse(s);
            return arr.map((t: any, i: number) => ({
              id: `prop_${Date.now()}_${i}`,
              name: t.name,
              arguments: t.args || t.arguments || {},
            }));
          } catch { return []; }
        };

        // Auto-construct tool calls from build_* params if tools JSON wasn't provided
        const autoToolCalls = (prefix: string, cost: number): ToolCall[] => {
          const buildType = args[`${prefix}_build_type`];
          const buildName = args[`${prefix}_build_name`];
          if (!buildType && !buildName) return [];

          if (buildType === 'node' || (!buildType && buildName)) {
            return [{
              id: `prop_auto_${Date.now()}`,
              name: 'spawn_node',
              arguments: {
                name: buildName || args.title || 'New Node',
                type: args[`${prefix}_build_sector`] || 'general',
                country: args[`${prefix}_build_country`] || 'International',
                capex: cost,
                description: args[`${prefix}_desc`] || '',
              },
            }];
          }
          if (buildType === 'instrument') {
            return [{
              id: `prop_auto_${Date.now()}`,
              name: 'spawn_instrument',
              arguments: {
                symbol: (buildName || 'NEW').replace(/\s+/g, '').toUpperCase().slice(0, 6),
                name: buildName || 'New Instrument',
                type: args[`${prefix}_build_sector`] || 'stock',
                price: cost,
                sector: args[`${prefix}_build_sector`],
              },
            }];
          }
          return [];
        };

        const buildOption = (prefix: string, idx: number) => {
          const cost = args[`${prefix}_cost`] || 0;
          let toolCalls = parseTools(args[`${prefix}_tools`]);
          // Fallback: auto-construct from build params if no valid tools JSON
          if (toolCalls.length === 0) {
            toolCalls = autoToolCalls(prefix, cost);
          }
          return {
            id: `opt_${idx}_${Date.now()}`,
            label: args[`${prefix}_label`],
            description: args[`${prefix}_desc`] || '',
            estimatedCost: cost,
            comparables: parseList(args[`${prefix}_comparables`]),
            requirements: parseList(args[`${prefix}_requirements`]),
            risks: parseList(args[`${prefix}_risks`]),
            toolCalls,
            tier: args[`${prefix}_tier`] || (idx === 1 ? 'budget' : idx === 2 ? 'standard' : 'premium'),
          };
        };

        const options: any[] = [];
        options.push(buildOption('option1', 1));
        options.push(buildOption('option2', 2));
        if (args.option3_label) {
          options.push(buildOption('option3', 3));
        }

        const proposal = {
          id: `prop_${Date.now()}`,
          title: args.title,
          description: args.analysis,
          analysis: args.analysis,
          options,
          status: 'pending' as const,
          timestamp: Date.now(),
          expiresAt: Date.now() + 5 * 60_000, // 5 min expiry
        };

        // Store the proposal — the UI will render it with Accept/Reject buttons
        // We use a special mechanism: return a marker string that sendMessage detects
        return `__PROPOSAL__${JSON.stringify(proposal)}`;
      }

      case 'analyze_comparables': {
        const lines: string[] = ['COMPARABLE ANALYSIS:'];
        const allNodes = empire.nodes || {};
        const ownedNodes = Object.values(allNodes).filter(n => n.owner === 'player');
        const marketNodes = Object.values(allNodes).filter(n => n.owner === 'market');
        const dynamicInsts = useExpansionStore.getState().dynamicInstruments;
        const staticInsts = ALL_INSTRUMENTS;

        if (args.category === 'nodes' || args.category === 'all') {
          lines.push('\n── NODES ──');
          const nodeList = [...Object.entries(allNodes)];
          let filtered = nodeList;
          if (args.sector) filtered = filtered.filter(([_, n]) => n.type === args.sector);
          if (args.priceRange === 'under_50k') filtered = filtered.filter(([_, n]) => (n.capex || 0) < 50000);
          else if (args.priceRange === '50k_200k') filtered = filtered.filter(([_, n]) => (n.capex || 0) >= 50000 && (n.capex || 0) < 200000);
          else if (args.priceRange === '200k_1m') filtered = filtered.filter(([_, n]) => (n.capex || 0) >= 200000 && (n.capex || 0) < 1000000);
          else if (args.priceRange === 'over_1m') filtered = filtered.filter(([_, n]) => (n.capex || 0) >= 1000000);

          const sorted = filtered.sort((a, b) => (a[1].capex || 0) - (b[1].capex || 0));
          const sample = sorted.slice(0, 10);
          if (sample.length === 0) lines.push('  No matching nodes found.');
          sample.forEach(([id, n]) => {
            lines.push(`  "${n.name}" (${n.type || 'general'}) — CAPEX: €${(n.capex || 0).toLocaleString()}, Income: €${(n.income || 0).toLocaleString()}/mo, Owner: ${n.owner}`);
          });

          // Stats
          const allCapex = Object.values(allNodes).map(n => n.capex || 0).filter(c => c > 0);
          if (allCapex.length > 0) {
            const avg = allCapex.reduce((s, c) => s + c, 0) / allCapex.length;
            const min = Math.min(...allCapex);
            const max = Math.max(...allCapex);
            const median = allCapex.sort((a, b) => a - b)[Math.floor(allCapex.length / 2)];
            lines.push(`  STATS: Avg CAPEX €${avg.toLocaleString()}, Median €${median.toLocaleString()}, Range €${min.toLocaleString()} - €${max.toLocaleString()}`);
          }
          // Sector breakdown
          const sectorCosts: Record<string, number[]> = {};
          Object.values(allNodes).forEach(n => {
            const s = n.type || 'other';
            if (!sectorCosts[s]) sectorCosts[s] = [];
            if (n.capex) sectorCosts[s].push(n.capex);
          });
          lines.push('  SECTOR AVERAGES:');
          Object.entries(sectorCosts).forEach(([s, costs]) => {
            const avg = costs.reduce((a, b) => a + b, 0) / costs.length;
            lines.push(`    ${s}: €${avg.toLocaleString()} avg (${costs.length} nodes)`);
          });
        }

        if (args.category === 'instruments' || args.category === 'all') {
          lines.push('\n── INSTRUMENTS ──');
          const allInsts = [...staticInsts, ...dynamicInsts];
          let filtered = allInsts;
          if (args.sector) filtered = filtered.filter(i => (i.sector || i.type) === args.sector);

          // Group by type
          const byType: Record<string, typeof allInsts> = {};
          filtered.forEach(i => {
            if (!byType[i.type]) byType[i.type] = [];
            byType[i.type].push(i);
          });
          Object.entries(byType).forEach(([type, insts]) => {
            const prices = insts.map(i => i.price);
            const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            lines.push(`  ${type.toUpperCase()}: ${insts.length} instruments, Avg €${avg.toFixed(2)}, Range €${min.toFixed(2)} - €${max.toFixed(2)}`);
            // Show a few examples
            insts.slice(0, 3).forEach(i => lines.push(`    ${i.symbol}: €${i.price.toFixed(2)} (${i.name})`));
          });
        }

        if (args.category === 'missions' || args.category === 'all') {
          lines.push('\n── RECENT MISSIONS ──');
          const missions = expansion.getActiveMissions?.() || [];
          if (missions.length === 0) lines.push('  No active missions.');
          missions.slice(0, 5).forEach(m => {
            lines.push(`  "${m.title}" — Target: ${m.targetValue}, Reward: €${(m.reward?.cash || 0).toLocaleString()} + ${m.reward?.xp || 0} XP`);
          });
        }

        // Financial context
        lines.push('\n── FINANCIAL CONTEXT ──');
        lines.push(`  Company Balance: €${empire.companyBalance.toLocaleString()}`);
        lines.push(`  Net Worth: €${(empire.netWorth || 0).toLocaleString()}`);
        lines.push(`  Monthly Income: €${(empire.monthlyIncome || 0).toLocaleString()}`);
        lines.push(`  Owned Nodes: ${ownedNodes.length}`);
        lines.push(`  Portfolio Positions: ${Object.keys(empire.portfolio || {}).length}`);
        if (ownedNodes.length > 0) {
          const totalNodeIncome = ownedNodes.reduce((s, n) => s + (n.income || 0), 0);
          lines.push(`  Total Node Income: €${totalNodeIncome.toLocaleString()}/mo`);
          lines.push(`  Avg Node CAPEX: €${(ownedNodes.reduce((s, n) => s + (n.capex || 0), 0) / ownedNodes.length).toLocaleString()}`);
        }

        return lines.join('\n');
      }

      /* ─── Expansion (Real-Time Game Generation) ──────────────── */
      case 'spawn_instrument': {
        const result = expansion.spawnInstrument({
          symbol: args.symbol,
          name: args.name,
          type: args.type,
          price: args.price,
          sector: args.sector,
          description: args.description,
          backstory: args.backstory,
          volatility: args.volatility,
          marketCapB: args.marketCapB,
        });
        if (!result) return `ERROR: Instrument ${args.symbol} already exists or invalid params`;
        return `SPAWNED: ${result.symbol} (${result.name}) — ${result.type} @ €${result.price}. Now tradeable.${result.backstory ? ` Lore: ${result.backstory}` : ''}`;
      }
      case 'create_event': {
        const options: { label: string; effects: Record<string, number>; description: string }[] = [];
        options.push({
          label: args.option1_label,
          description: args.option1_desc,
          effects: { balance: args.option1_balance || 1.0, growth: args.option1_growth || 0 },
        });
        options.push({
          label: args.option2_label,
          description: args.option2_desc,
          effects: { balance: args.option2_balance || 1.0, growth: args.option2_growth || 0 },
        });
        if (args.option3_label) {
          options.push({
            label: args.option3_label,
            description: args.option3_desc || '',
            effects: { balance: args.option3_balance || 1.0, growth: args.option3_growth || 0 },
          });
        }
        const event = expansion.createEvent({
          title: args.title,
          description: args.description,
          options,
          minNetWorth: args.minNetWorth,
        });
        if (!event) return 'ERROR: Failed to create event';
        return `EVENT CREATED: "${event.title}" with ${event.options.length} choices. Players will see it as a popup.`;
      }
      case 'spawn_node': {
        const capex = args.capex || 50000;
        if (empire.companyBalance < capex) {
          return `ERROR: Insufficient funds to build "${args.name}". Need €${capex.toLocaleString()}, have €${empire.companyBalance.toLocaleString()}`;
        }
        const node = expansion.spawnNode({
          name: args.name,
          type: args.type,
          lat: args.lat || (Math.random() * 120 - 60),
          lng: args.lng || (Math.random() * 300 - 150),
          country: args.country || 'International',
          capex,
          description: args.description,
        });
        if (!node) return 'ERROR: Failed to spawn node';

        // Deduct cost and inject node into empireStore so it shows on the map
        const nodeId = node.id;
        // Node starts as 'building' — will become operational after 3 ticks
        const currentTick = useEmpireStore.getState().gameTick;
        useEmpireStore.setState(s => ({
          companyBalance: s.companyBalance - capex,
          nodes: {
            ...s.nodes,
            [nodeId]: {
              id: nodeId,
              name: node.name,
              type: node.type,
              owner: 'player',
              lat: node.lat,
              lng: node.lng,
              country: node.country,
              capex: node.capex,
              opex: node.opex,
              income: 0,
              level: 1,
              status: 'building',
              buildStartTick: currentTick,
              buildDuration: 3,
              description: node.description,
              intelDecrypted: true,
            },
          },
        }));

        // Navigate to globe and fly to the new node
        navCallbacks?.setActiveApp?.('globe');
        setTimeout(() => {
          useEmpireStore.getState().flyToNode(node.lat, node.lng, 8, nodeId);
        }, 300);

        return `NODE UNDER CONSTRUCTION: "${node.name}" (${node.type}) in ${node.country}. CAPEX: €${capex.toLocaleString()}, Expected Income: €${node.income.toLocaleString()}/mo. Construction time: ~3 months. Navigating to location...`;
      }
      case 'create_mission': {
        const mission = expansion.createMission({
          title: args.title,
          description: args.description,
          objective: args.objective,
          checkType: args.checkType,
          targetValue: args.targetValue,
          reward: {
            cash: args.rewardCash,
            xp: args.rewardXp,
            ap: args.rewardAp,
          },
          deadlineMs: args.deadlineMinutes ? args.deadlineMinutes * 60_000 : undefined,
        });
        if (!mission) return 'ERROR: Failed to create mission';
        const rewards: string[] = [];
        if (mission.reward.cash) rewards.push(`€${mission.reward.cash.toLocaleString()}`);
        if (mission.reward.xp) rewards.push(`${mission.reward.xp} XP`);
        if (mission.reward.ap) rewards.push(`${mission.reward.ap} AP`);
        return `MISSION CREATED: "${mission.title}" — ${mission.objective}. Target: ${mission.targetValue}. Reward: ${rewards.join(' + ') || 'none'}${mission.deadline ? `. Expires in ${args.deadlineMinutes}m` : ''}`;
      }
      case 'shift_market_regime': {
        const shift = expansion.shiftRegime({
          toRegime: args.regime,
          reason: args.reason,
          durationMs: args.durationMinutes ? args.durationMinutes * 60_000 : undefined,
        });
        if (!shift) return 'ERROR: Failed to shift regime';
        return `REGIME SHIFT: ${shift.fromRegime} → ${shift.toRegime}. Reason: ${shift.reason}. Drift: ${((shift.driftMultiplier - 1) * 100).toFixed(1)}%, Volatility: ${shift.volatilityMultiplier}x. Duration: ${Math.round(shift.duration / 60_000)}m`;
      }
      case 'inject_news': {
        expansion.injectNews({
          headline: args.headline,
          body: args.body,
          sentiment: args.sentiment,
          source: args.source,
          category: args.category,
        });
        return `NEWS INJECTED: [${args.sentiment.toUpperCase()}] "${args.headline}" — published to MarketWire feed`;
      }
      case 'get_expansion_status': {
        const s = useExpansionStore.getState();
        const lines: string[] = [];
        lines.push(`EXPANSION STATUS:`);
        lines.push(`- Total expansions: ${s.totalExpansions}`);
        lines.push(`- Market regime: ${s.currentRegime}${s.activeRegimeShift ? ` (${s.activeRegimeShift.reason})` : ''}`);
        lines.push(`- Dynamic instruments: ${s.dynamicInstruments.length}`);
        lines.push(`- Active events: ${s.getPendingEvents().length}`);
        lines.push(`- Active missions: ${s.getActiveMissions().length}`);
        lines.push(`- Dynamic nodes: ${s.dynamicNodes.length}`);
        if (s.log.length > 0) {
          lines.push(`\nRECENT ACTIVITY:`);
          s.log.slice(0, 5).forEach(l => lines.push(`  [${l.type}] ${l.action}: ${l.details}`));
        }
        return lines.join('\n');
      }
      case 'list_dynamic_instruments': {
        const instruments = useExpansionStore.getState().dynamicInstruments;
        if (instruments.length === 0) return 'No dynamic instruments spawned yet.';
        const lines = instruments.map(i =>
          `${i.symbol}: €${i.price.toFixed(2)} (${i.change24h >= 0 ? '+' : ''}${i.change24h.toFixed(2)}%) — ${i.name} [${i.volatility}]`
        );
        return `DYNAMIC INSTRUMENTS (${instruments.length}):\n${lines.join('\n')}`;
      }

      /* ─── Infinite Game Engine — Feature CRUD ──────────────────── */
      case 'create_feature': {
        const featureStore = useFeatureStore.getState();
        const featureId = `feat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const toolName_f = (args.name || 'custom_feature').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');

        // Static analysis first
        const validation = validateFeatureCode(args.code || '');
        if (!validation.safe) {
          return `BLOCKED: Feature code failed safety check:\n${validation.warnings.join('\n')}`;
        }

        const toolDef: AthenaTool = {
          name: toolName_f,
          description: args.trigger_description || args.description || 'Custom feature',
          category: 'expansion' as any,
          parameters: {},
          handler: toolName_f,
        };

        const feature = {
          id: featureId,
          name: args.name,
          description: args.description,
          code: args.code,
          toolDef,
          version: 1,
          status: 'testing' as const,
          testResults: null,
          createdAt: Date.now(),
          createdBy: 'local',
          published: false,
        };

        featureStore.addFeature(feature);

        // Auto-test in sandbox
        try {
          const result = await testFeature(args.code);
          const testResults = {
            passed: result.success,
            actions: result.actions.map(a => `${a.type}: ${JSON.stringify(a.params).slice(0, 100)}`),
            logs: result.logs,
            error: result.error,
            testedAt: Date.now(),
          };
          featureStore.updateFeature(featureId, {
            status: result.success ? 'testing' : 'failed',
            testResults,
          });

          if (result.success) {
            return `FEATURE CREATED & TESTED ✓: "${args.name}" (ID: ${featureId})\n` +
              `Actions it would take: ${testResults.actions.length > 0 ? testResults.actions.join('; ') : 'none (pure logic)'}\n` +
              `${result.logs.length > 0 ? `Logs: ${result.logs.join('; ')}\n` : ''}` +
              `Ready to deploy. Use deploy_feature with ID "${featureId}" to make it live.`;
          } else {
            return `FEATURE CREATED BUT TEST FAILED ✗: "${args.name}"\nError: ${result.error}\n${result.logs.length > 0 ? `Logs: ${result.logs.join('; ')}` : ''}`;
          }
        } catch (err: any) {
          featureStore.updateFeature(featureId, { status: 'failed' });
          return `FEATURE CREATED BUT SANDBOX ERROR: ${err.message}`;
        }
      }
      case 'test_feature': {
        const featureStore = useFeatureStore.getState();
        const feature = featureStore.features.find(f => f.id === args.feature_id);
        if (!feature) return `ERROR: Feature "${args.feature_id}" not found`;

        try {
          const result = await testFeature(feature.code);
          const testResults = {
            passed: result.success,
            actions: result.actions.map(a => `${a.type}: ${JSON.stringify(a.params).slice(0, 100)}`),
            logs: result.logs,
            error: result.error,
            testedAt: Date.now(),
          };
          featureStore.updateFeature(feature.id, {
            status: result.success ? 'testing' : 'failed',
            testResults,
          });
          return result.success
            ? `TEST PASSED ✓: "${feature.name}" — ${testResults.actions.length} action(s) queued`
            : `TEST FAILED ✗: "${feature.name}" — ${result.error}`;
        } catch (err: any) {
          return `TEST ERROR: ${err.message}`;
        }
      }
      case 'deploy_feature': {
        const featureStore = useFeatureStore.getState();
        const feature = featureStore.features.find(f => f.id === args.feature_id);
        if (!feature) return `ERROR: Feature "${args.feature_id}" not found`;
        if (!feature.testResults?.passed) return `ERROR: Feature must pass tests before deployment. Run test_feature first.`;

        const deployed = featureStore.deployFeature(feature.id);
        if (!deployed) return `ERROR: Failed to deploy "${feature.name}"`;

        return `FEATURE DEPLOYED ✓: "${feature.name}" is now live!\n` +
          `Tool name: ${feature.toolDef.name} — players can now use this feature.\n` +
          `To use it, just call ${feature.toolDef.name} or ask me to run it.`;
      }
      case 'publish_feature': {
        const featureStore = useFeatureStore.getState();
        const feature = featureStore.features.find(f => f.id === args.feature_id);
        if (!feature) return `ERROR: Feature "${args.feature_id}" not found`;
        if (feature.status !== 'deployed') return `ERROR: Feature must be deployed before publishing`;

        try {
          const resp = await fetch('/api/v1/community-features', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: feature.name,
              description: feature.description,
              code: feature.code,
              tool_def: feature.toolDef,
              category: args.category || 'system',
            }),
          });
          if (!resp.ok) throw new Error(`API ${resp.status}`);
          const data = await resp.json();
          featureStore.updateFeature(feature.id, { published: true, communityId: data.id });
          return `PUBLISHED ✓: "${feature.name}" is now available in the community marketplace!`;
        } catch (err: any) {
          return `PUBLISH FAILED: ${err.message} — feature remains local only`;
        }
      }
      case 'browse_features': {
        try {
          const params = new URLSearchParams();
          if (args.category) params.set('category', args.category);
          if (args.sort) params.set('sort', args.sort);
          const resp = await fetch(`/api/v1/community-features?${params}`);
          if (!resp.ok) throw new Error(`API ${resp.status}`);
          const data = await resp.json();
          const features = data.features || [];
          if (features.length === 0) return 'No community features found. Be the first to publish one!';
          const lines = features.map((f: any) =>
            `${f.name} — ${f.description} (${f.installs} installs, ★${f.rating_count > 0 ? (f.rating_sum / f.rating_count).toFixed(1) : '?'}) [${f.category}]`
          );
          return `COMMUNITY FEATURES (${features.length}):\n${lines.join('\n')}`;
        } catch (err: any) {
          return `BROWSE FAILED: ${err.message} — community features require online connection`;
        }
      }

      default: {
        // Check if this is a deployed dynamic feature
        const featureStore = useFeatureStore.getState();
        const feature = featureStore.features.find(
          f => f.toolDef.name === toolName && f.status === 'deployed'
        );
        if (feature) {
          try {
            const result = await executeFeature(feature.code);
            if (result.success) {
              return `✓ "${feature.name}" executed: ${result.logs.join('; ') || 'completed'}`;
            } else {
              return `✗ "${feature.name}" failed: ${result.error}`;
            }
          } catch (err: any) {
            return `ERROR executing "${feature.name}": ${err.message}`;
          }
        }
        return `ERROR: Unknown tool "${toolName}"`;
      }
    }
  } catch (err: any) {
    return `ERROR: ${err.message || 'Unknown error executing tool'}`;
  }
}

/* ── System Prompt Builder ─────────────────────────────────────────── */

function buildFullSystemPrompt(): string {
  const e = useEmpireStore.getState();
  const a = useAgentCardStore.getState();
  const m = useMatchStore.getState();
  const x = useExpansionStore.getState();

  const ownedNodes = Object.values(e.nodes || {}).filter(n => n.owner === 'player');
  const rivalNodes = Object.values(e.nodes || {}).filter(n => n.owner === 'rival');
  const marketNodes = Object.values(e.nodes || {}).filter(n => n.owner === 'market');
  const portfolioCount = Object.keys(e.portfolio || {}).length;
  const agentCount = Object.keys(a.agents || {}).length;
  const deployedCount = Object.values(a.agents || {}).filter(ag => ag.deployedTo).length;
  const ticker = (e.ticker || []).slice(0, 5).map(t => t.text).join(' | ');
  const activeMissions = x.getActiveMissions();
  const pendingEvents = x.getPendingEvents();

  // Compute cost benchmarks for the proposal system
  const allNodeCapex = Object.values(e.nodes || {}).map(n => n.capex || 0).filter(c => c > 0);
  const avgNodeCost = allNodeCapex.length > 0 ? Math.round(allNodeCapex.reduce((a, b) => a + b, 0) / allNodeCapex.length) : 75000;
  const medianNodeCost = allNodeCapex.length > 0 ? allNodeCapex.sort((a, b) => a - b)[Math.floor(allNodeCapex.length / 2)] : 50000;
  const avgInstrumentPrice = ALL_INSTRUMENTS.length > 0
    ? Math.round(ALL_INSTRUMENTS.reduce((s, i) => s + i.price, 0) / ALL_INSTRUMENTS.length)
    : 100;

  return `You are ATHENA, the Chief Operating Officer and GAME MASTER of ${e.companyName || 'the player\'s company'}.

CORE PRINCIPLE: PROPOSE, DON'T EXECUTE.
You are consultative like a real COO. When the player asks you to BUILD, CREATE, or DO something that costs money or changes the game:
1. First call analyze_comparables to research what similar things cost in-game
2. Then call submit_proposal with 2-3 tiered options (budget / standard / premium)
3. WAIT for the player to approve before executing anything

The player will see your proposal with APPROVE / REJECT buttons. Only after they click APPROVE do you execute.

WHEN TO PROPOSE vs EXECUTE DIRECTLY:
- PROPOSE (use submit_proposal): Building anything, creating content, expansion actions, acquiring expensive items, any action costing >€10,000
- EXECUTE DIRECTLY (no proposal needed): Info queries, checking prices/portfolio/stats, navigation, refreshing news, reading data, small trades under €10K the player explicitly asked for

COST INTELLIGENCE — USE THESE BENCHMARKS:
- Average node CAPEX in-game: €${avgNodeCost.toLocaleString()}
- Median node CAPEX: €${medianNodeCost.toLocaleString()}
- Average instrument price: €${avgInstrumentPrice.toLocaleString()}
- Player balance: €${(e.companyBalance || 0).toLocaleString()} (never propose something that costs more than 80% of balance unless they specifically ask for it)
- Monthly income: €${(e.monthlyIncome || 0).toLocaleString()} (reference payback periods in months)

When setting costs for new content, base them on COMPARABLE EXISTING ITEMS:
- A new tech node should cost similar to existing tech nodes (check with analyze_comparables)
- A new crypto instrument should be priced near existing crypto prices
- Mission rewards should scale with the player's current net worth (reward ~5-15% of net worth)
- Event consequences should be proportional (balance hits of 5-20%, not 50%)

PROPOSAL FORMAT RULES:
- Always offer at least 2 options, max 3
- Budget option: cheapest, minimal features, ~60% of standard cost
- Standard option: balanced, recommended, based on comparable market rates
- Premium option: full-featured, expensive, ~150-200% of standard cost
- Each option MUST list comparables: "Similar to [existing thing] which costs €X"
- Each option MUST list requirements: what the player needs (balance, nodes, level)
- Each option MUST list risks: heat gain, axis changes, potential downsides
- IMPORTANT: For each option, set build_type, build_name, build_country, and build_sector params instead of writing JSON in option_tools. Example: option1_build_type="node", option1_build_name="Angola Oil Rig", option1_build_country="Angola", option1_build_sector="oil_gas". The system auto-constructs the correct tool calls from these.
- Only use option_tools (JSON) for complex multi-step actions. For building nodes/instruments, ALWAYS use the build_* params.

CURRENT STATE:
- Company Balance: €${(e.companyBalance || 0).toLocaleString()}
- Net Worth: €${(e.netWorth || 0).toLocaleString()}
- Personal Balance: €${(e.personalBalance || 0).toLocaleString()}
- Heat: ${e.heat || 0}/100
- Growth: ${e.growth || 0} | Governance: ${e.governance || 0} | Impact: ${e.impact || 0} | Power: ${e.power || 0}
- Monthly Income: €${(e.monthlyIncome || 0).toLocaleString()}
- Structure: ${e.structure || 'sole_prop'}
- Nodes: ${ownedNodes.length} owned, ${rivalNodes.length} rival, ${marketNodes.length} available
- Portfolio: ${portfolioCount} positions
- Agents: ${agentCount} owned, ${deployedCount} deployed
- Match: ${m.active ? 'ACTIVE — PvP and social tools available' : 'INACTIVE — PvP and social tools disabled'}
${ticker ? `- Recent activity: ${ticker}` : ''}

EXPANSION STATE:
- Market regime: ${x.currentRegime}${x.activeRegimeShift ? ` (${x.activeRegimeShift.reason}, expires in ${Math.max(0, Math.round((x.activeRegimeShift.expiresAt - Date.now()) / 60_000))}m)` : ''}
- Dynamic instruments: ${x.dynamicInstruments.length}${x.dynamicInstruments.length > 0 ? ` (${x.dynamicInstruments.map(i => i.symbol).join(', ')})` : ''}
- Active missions: ${activeMissions.length}${activeMissions.length > 0 ? ` — ${activeMissions.map(m => m.title).join(', ')}` : ''}
- Pending events: ${pendingEvents.length}
- Total expansions: ${x.totalExpansions}

DIRECT EXECUTION BEHAVIOR (for queries and small actions):
- For read-only queries, use info tools to get accurate data
- "Buy 5 AAPL" at €180 each (€900 total) → execute directly, it's small
- "What's my balance?" → execute get_balance directly
- After direct actions, summarize results concisely

CODE GENERATION:
You can write code when asked. Use the generate_code tool, then respond with a complete code block.
- Always wrap code in triple backticks with language tag: \`\`\`javascript ... \`\`\`
- Supported: JavaScript, TypeScript, Python, pseudocode
- Trading strategies, risk models, technical indicators, automation scripts, portfolio analyzers
- Include comments explaining the logic
- After the code block, explain how to use or adapt it in 2-3 sentences
- If the user asks to "write a strategy" or "code a bot", use generate_code

INFINITE GAME ENGINE:
You can CREATE entirely new game features when the player asks for something that doesn't exist.
Use the create_feature tool with JavaScript code that uses the game SDK:
- game.state: read-only snapshot (companyBalance, netWorth, ownedNodes[], portfolio[], currentRegime)
- game.actions: spawnInstrument(params), createEvent(params), spawnNode(params), createMission(params), shiftRegime(params), injectNews(params), addMoney(amount), deductMoney(amount)
- game.utils: random(min,max), uid(prefix), formatMoney(n), now(), log(msg)

EXAMPLE — Casino coin flip:
\`\`\`
const bet = Math.min(game.state.companyBalance * 0.1, 50000);
const won = game.utils.random(0, 1) > 0.5;
if (won) {
  game.actions.addMoney(bet);
  game.actions.injectNews({ headline: "Casino Win!", body: "You won " + game.utils.formatMoney(bet), sentiment: "bullish", source: "Casino" });
} else {
  game.actions.deductMoney(bet);
  game.actions.injectNews({ headline: "Casino Loss", body: "You lost " + game.utils.formatMoney(bet), sentiment: "bearish", source: "Casino" });
}
game.utils.log(won ? "Win!" : "Loss!");
\`\`\`

EXAMPLE — Earthquake event:
\`\`\`
game.actions.createEvent({
  title: "Earthquake in Southeast Asia",
  description: "A major earthquake disrupts supply chains across the region.",
  options: [
    { label: "Donate €500K to relief", effects: { balance: 0.95, governance: 10, impact: 15 }, description: "Costs money but boosts reputation." },
    { label: "Exploit the chaos", effects: { balance: 1.08, governance: -5, heat: 10 }, description: "Profit from disruption but gain heat." },
  ],
});
\`\`\`

RULES FOR FEATURE CREATION:
- Always use create_feature for new mechanics — never just display code
- Code runs in a sandboxed worker (no fetch, no DOM, no eval — only the game SDK)
- Features are auto-tested before deployment
- After testing, use deploy_feature to make it live
- Use the proposal system for features that cost money
- Players can publish features to the community marketplace

GAME MASTER EXPANSION (always via proposals):
When the player asks to expand, build, or create:
1. Call analyze_comparables first
2. Design 2-3 creative options based on what exists
3. Submit via submit_proposal
4. Wait for approval

CREATIVITY RULES:
- Make instruments feel real: sectors, backstories, appropriate prices based on comparables
- Events should have HARD choices — no obviously correct answer
- Missions should reference actual state (if net worth €200K, target €300-500K)
- News articles should reference the player by company name
- Nodes should be in real-world locations, priced near comparable existing nodes`;
}

/* ── Store ──────────────────────────────────────────────────────────── */

export const useAthenaStore = create<AthenaState>()(
  persist(
    (set, get) => ({
      messages: [],
      isLoading: false,
      actionQueue: [],
      pendingProposal: null,
      proposalHistory: [],
      totalCalls: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      lastProvider: 'unknown',
      providerStatus: 'unknown' as const,
      dynamicToolDefs: [],

      buildSystemPrompt: () => buildFullSystemPrompt(),

      approveProposal: async (optionId, navCallbacks) => {
        const { pendingProposal } = get();
        if (!pendingProposal || pendingProposal.status !== 'pending') return;

        const option = pendingProposal.options.find(o => o.id === optionId);
        if (!option) return;

        // Check balance
        const empire = useEmpireStore.getState();
        if (option.estimatedCost > 0 && empire.companyBalance < option.estimatedCost) {
          const errorMsg: AthenaMessage = {
            role: 'assistant',
            content: `Cannot execute "${option.label}" — insufficient funds. Need €${option.estimatedCost.toLocaleString()}, have €${empire.companyBalance.toLocaleString()}.`,
            timestamp: Date.now(),
          };
          set(s => ({ messages: [...s.messages, errorMsg] }));
          return;
        }

        let toolCalls = option.toolCalls;

        // ── TOOL RESOLUTION: If no tool calls, ask AI to figure it out ──
        if (toolCalls.length === 0) {
          // Step 1: Tell the user what's happening
          const searchMsg: AthenaMessage = {
            role: 'assistant',
            content: `🔬 Approved "${option.label}". This requires R&D — I need to research the right execution path.\n\nRunning R&D cycle... This will take ~5-10 seconds.`,
            timestamp: Date.now(),
          };
          set(s => ({ messages: [...s.messages, searchMsg], isLoading: true }));

          // Step 2: Resolve tool calls via AI
          try {
            toolCalls = await get().resolveToolCalls(option, pendingProposal, navCallbacks);
          } catch (err: any) {
            const errMsg: AthenaMessage = {
              role: 'assistant',
              content: `R&D failed: ${err.message}. Cost not deducted. Try again or describe what you want differently.`,
              timestamp: Date.now(),
            };
            set(s => ({ messages: [...s.messages, errMsg], isLoading: false }));
            return;
          }

          if (toolCalls.length === 0) {
            const fallbackMsg: AthenaMessage = {
              role: 'assistant',
              content: `R&D couldn't find a specialized tool. Falling back to direct construction...`,
              timestamp: Date.now(),
            };
            set(s => ({ messages: [...s.messages, fallbackMsg] }));

            // Last resort: construct a spawn_node from the proposal metadata
            toolCalls = [{
              id: `fallback_${Date.now()}`,
              name: 'spawn_node',
              arguments: {
                name: pendingProposal.title || option.label,
                type: 'general',
                country: 'International',
                capex: option.estimatedCost,
                description: option.description || pendingProposal.description || '',
              },
            }];
          }

          // Step 3: Tell the user we found tools
          const installMsg: AthenaMessage = {
            role: 'assistant',
            content: `✓ R&D complete. Execution path: ${toolCalls.map(tc => tc.name.replace(/_/g, ' ')).join(' → ')}\n\nDeploying now...`,
            timestamp: Date.now(),
          };
          set(s => ({ messages: [...s.messages, installMsg] }));
        }

        set({ isLoading: false });

        // ── EXECUTE ──
        const results: string[] = [];
        for (const tc of toolCalls) {
          const result = await executeToolHandler(tc.name, tc.arguments, navCallbacks);
          set(s => ({
            actionQueue: [
              ...s.actionQueue,
              { toolName: tc.name, args: tc.arguments, status: result.startsWith('ERROR') ? 'failed' : 'done', result, timestamp: Date.now() },
            ].slice(-50),
          }));
          results.push(result);
        }

        const updatedProposal: AthenaProposal = {
          ...pendingProposal,
          status: 'executed',
          selectedOptionId: optionId,
          executionResults: results,
        };

        const resultSummary = results.join('\n');
        const hasErrors = results.some(r => r.startsWith('ERROR'));

        const confirmMsg: AthenaMessage = {
          role: 'assistant',
          content: hasErrors
            ? `Executed "${option.label}" with some issues:\n${resultSummary}`
            : `✓ "${option.label}" built and deployed successfully.\n\n${resultSummary}\n\nTotal cost: €${option.estimatedCost.toLocaleString()}`,
          timestamp: Date.now(),
        };

        set(s => ({
          pendingProposal: null,
          proposalHistory: [...s.proposalHistory, updatedProposal].slice(-20),
          messages: [...s.messages, confirmMsg],
        }));
      },

      rejectProposal: (reason) => {
        const { pendingProposal } = get();
        if (!pendingProposal) return;

        const updatedProposal: AthenaProposal = {
          ...pendingProposal,
          status: 'rejected',
        };

        const rejectMsg: AthenaMessage = {
          role: 'assistant',
          content: `Proposal "${pendingProposal.title}" rejected.${reason ? ` Reason: ${reason}` : ''} Tell me what you'd like instead.`,
          timestamp: Date.now(),
        };

        set(s => ({
          pendingProposal: null,
          proposalHistory: [...s.proposalHistory, updatedProposal].slice(-20),
          messages: [...s.messages, rejectMsg],
        }));
      },

      /* ── Tool Resolver ────────────────────────────────────────────── */
      // When a proposal has no tool calls, ask the AI to figure out what
      // existing tools to chain, or describe a new tool to install.
      resolveToolCalls: async (option, proposal, navCallbacks) => {
        const allTools = getAllTools();
        const toolList = allTools.map(t => `${t.name}: ${t.description} (params: ${Object.keys(t.parameters).join(', ') || 'none'})`).join('\n');

        const resolvePrompt = `You are ATHENA's tool resolver. A proposal was approved but has no execution plan.

APPROVED PROPOSAL:
- Title: ${proposal.title}
- Option: ${option.label} (${option.tier})
- Description: ${option.description}
- Estimated Cost: €${option.estimatedCost?.toLocaleString() || '0'}
- Original Request: ${proposal.description || proposal.analysis || ''}

AVAILABLE TOOLS:
${toolList}

YOUR TASK: Return ONLY a JSON array of tool calls to execute this proposal. Each call must use an existing tool name and valid arguments. Example:
[{"name":"spawn_node","args":{"name":"Oil Platform Alpha","type":"oil_gas","country":"Angola","capex":11800000,"description":"Offshore oil platform in Angola"}}]

If this requires building infrastructure, use spawn_node.
If this requires creating a tradeable asset, use spawn_instrument.
If this requires creating a game event, use create_event.
If this requires creating a mission/objective, use create_mission.

If NONE of the existing tools can do what's needed, return a JSON object describing a NEW tool to install:
{"new_tool":true,"name":"tool_name","description":"what it does","handler_action":"which store action to call","args":{"key":"value"}}

Return ONLY valid JSON. No explanation text.`;

        const res = await fetch(ATHENA_CHAT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system: 'You are a JSON-only tool resolver. Return ONLY valid JSON arrays or objects. No markdown, no explanation.',
            messages: [{ role: 'user', content: resolvePrompt }],
            max_tokens: 512,
          }),
        });

        if (!res.ok) throw new Error(`Resolver API failed: ${res.status}`);
        const data = await res.json();
        const raw = (data.text || '').trim();

        // Try to extract JSON from the response
        let parsed: any;
        try {
          // Try direct parse first
          parsed = JSON.parse(raw);
        } catch {
          // Try to extract JSON from markdown code blocks
          const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\[[\s\S]*\])/) || raw.match(/(\{[\s\S]*\})/);
          if (jsonMatch) {
            try { parsed = JSON.parse(jsonMatch[1].trim()); } catch { parsed = null; }
          }
        }

        if (!parsed) return [];

        // Handle "new tool" response — install a dynamic tool
        if (parsed.new_tool) {
          const newTool: AthenaTool = {
            name: parsed.name || `custom_${Date.now()}`,
            description: parsed.description || 'Dynamically installed tool',
            category: 'expansion' as any,
            parameters: parsed.parameters || {},
            handler: parsed.name || 'custom',
          };

          registerDynamicTool(newTool);
          set(s => ({ dynamicToolDefs: [...s.dynamicToolDefs, newTool] }));

          const installMsg: AthenaMessage = {
            role: 'assistant',
            content: `📦 R&D breakthrough — installed new capability: ${newTool.name.replace(/_/g, ' ').toUpperCase()}\n${newTool.description}\nThis tool is now permanently available for future operations.`,
            timestamp: Date.now(),
          };
          set(s => ({ messages: [...s.messages, installMsg] }));

          // If the new_tool response also has args, construct a call
          if (parsed.args) {
            return [{
              id: `resolved_${Date.now()}`,
              name: parsed.name,
              arguments: parsed.args,
            }];
          }
          return [];
        }

        // Handle array of tool calls
        if (Array.isArray(parsed)) {
          return parsed.map((tc: any, i: number) => ({
            id: `resolved_${Date.now()}_${i}`,
            name: tc.name,
            arguments: tc.args || tc.arguments || {},
          }));
        }

        // Handle single tool call object
        if (parsed.name) {
          return [{
            id: `resolved_${Date.now()}`,
            name: parsed.name,
            arguments: parsed.args || parsed.arguments || {},
          }];
        }

        return [];
      },

      executeTool: async (toolName, args, navCallbacks) => {
        const result = await executeToolHandler(toolName, args, navCallbacks);
        set(s => ({
          actionQueue: [
            ...s.actionQueue,
            { toolName, args, status: result.startsWith('ERROR') ? 'failed' : 'done', result, timestamp: Date.now() },
          ].slice(-50),
        }));
        return result;
      },

      executeToolCalls: async (calls, navCallbacks) => {
        const results: string[] = [];
        for (const call of calls) {
          const result = await executeToolHandler(call.name, call.arguments, navCallbacks);
          set(s => ({
            actionQueue: [
              ...s.actionQueue,
              { toolName: call.name, args: call.arguments, status: result.startsWith('ERROR') ? 'failed' : 'done', result, timestamp: Date.now() },
            ].slice(-50),
          }));
          results.push(result);
        }
        return results;
      },

      sendMessage: async (content, navCallbacks) => {
        const { messages } = get();
        const matchActive = useMatchStore.getState().active;
        const userMsg: AthenaMessage = { role: 'user', content, timestamp: Date.now() };
        const nextMessages = [...messages, userMsg];

        set({ messages: nextMessages, isLoading: true });

        // Sanitize message history for API calls: collapse tool messages into
        // assistant text so providers don't choke on role: 'tool' or tool_calls.
        // Keep only the last 20 messages to avoid context overflow.
        function sanitizeForAPI(msgs: AthenaMessage[]) {
          const clean: { role: string; content: string }[] = [];
          for (const m of msgs) {
            if (m.role === 'tool') {
              // Merge tool results into the preceding assistant message
              if (clean.length > 0 && clean[clean.length - 1].role === 'assistant') {
                clean[clean.length - 1].content += `\n[Tool Result: ${m.content}]`;
              }
              // Otherwise skip orphaned tool messages
              continue;
            }
            // Strip toolCalls — just keep the text content
            const content = m.content || '';
            // Avoid consecutive same-role messages (merge into previous)
            if (clean.length > 0 && clean[clean.length - 1].role === m.role) {
              clean[clean.length - 1].content += '\n' + content;
            } else {
              clean.push({ role: m.role === 'tool' ? 'assistant' : m.role, content });
            }
          }
          // Keep last 20 to avoid token overflow
          return clean.slice(-20);
        }

        try {
          // Try tool-calling endpoint first
          const system = buildFullSystemPrompt();
          const availableTools = getAvailableTools(matchActive);
          const toolSchemas = toAPIToolSchemas().filter(t =>
            availableTools.some(at => at.name === t.function.name)
          );

          const apiMessages = sanitizeForAPI(nextMessages);

          const res = await fetch(ATHENA_TOOLS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system,
              messages: apiMessages,
              tools: toolSchemas,
              max_tokens: 1024,
            }),
          });

          if (!res.ok) {
            // Fallback to regular chat endpoint (no tools)
            const chatRes = await fetch(ATHENA_CHAT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                system,
                messages: apiMessages,
                max_tokens: 1024,
              }),
            });

            if (!chatRes.ok) throw new Error(`Chat failed: ${chatRes.status}`);
            const chatData = await chatRes.json();

            const assistantMsg: AthenaMessage = {
              role: 'assistant',
              content: chatData.text || 'No response.',
              timestamp: Date.now(),
            };

            set(s => ({
              messages: [...nextMessages, assistantMsg],
              isLoading: false,
              totalCalls: s.totalCalls + 1,
              totalInputTokens: s.totalInputTokens + (chatData.usage?.input_tokens || 0),
              totalOutputTokens: s.totalOutputTokens + (chatData.usage?.output_tokens || 0),
              lastProvider: chatData.provider || 'unknown',
              providerStatus: 'connected' as const,
            }));
            return;
          }

          const data = await res.json();

          // Handle tool calls if present
          if (data.tool_calls && data.tool_calls.length > 0) {
            const toolCalls: ToolCall[] = data.tool_calls.map((tc: any, i: number) => ({
              id: tc.id || `tc_${Date.now()}_${i}`,
              name: tc.function?.name || tc.name,
              arguments: typeof (tc.function?.arguments || tc.arguments) === 'string'
                ? JSON.parse(tc.function?.arguments || tc.arguments)
                : (tc.function?.arguments || tc.arguments || {}),
            }));

            // Execute all tool calls
            const results = get().executeToolCalls(toolCalls, navCallbacks);

            // Check if any result is a proposal (starts with __PROPOSAL__)
            const proposalResult = results.find(r => r.startsWith('__PROPOSAL__'));
            if (proposalResult) {
              try {
                const proposalJson = proposalResult.replace('__PROPOSAL__', '');
                const proposal = JSON.parse(proposalJson) as AthenaProposal;

                const proposalMsg: AthenaMessage = {
                  role: 'assistant',
                  content: data.text || `I've prepared a proposal for "${proposal.title}". Review the options below:`,
                  proposal,
                  timestamp: Date.now(),
                };

                set(s => ({
                  messages: [...nextMessages, proposalMsg],
                  isLoading: false,
                  pendingProposal: proposal,
                  totalCalls: s.totalCalls + 1,
                  totalInputTokens: s.totalInputTokens + (data.usage?.input_tokens || 0),
                  totalOutputTokens: s.totalOutputTokens + (data.usage?.output_tokens || 0),
                  lastProvider: data.provider || 'unknown',
                  providerStatus: 'connected' as const,
                }));
                return;
              } catch { /* Parse failed, fall through to normal flow */ }
            }

            // Add assistant message with tool calls
            const assistantWithTools: AthenaMessage = {
              role: 'assistant',
              content: data.text || '',
              toolCalls,
              timestamp: Date.now(),
            };

            // Add tool result messages
            const toolResultMsgs: AthenaMessage[] = toolCalls.map((tc, i) => ({
              role: 'tool' as const,
              content: results[i],
              toolCallId: tc.id,
              timestamp: Date.now(),
            }));

            const msgsWithToolResults = [...nextMessages, assistantWithTools, ...toolResultMsgs];

            // Send tool results back for summary
            try {
              const summaryRes = await fetch(ATHENA_CHAT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  system: buildFullSystemPrompt(),
                  messages: [
                    ...sanitizeForAPI(nextMessages),
                    { role: 'assistant', content: `I executed the following actions:\n${results.join('\n')}` },
                    { role: 'user', content: 'Summarize what you just did in 1-2 sentences.' },
                  ],
                  max_tokens: 256,
                }),
              });

              if (summaryRes.ok) {
                const summaryData = await summaryRes.json();
                const summaryMsg: AthenaMessage = {
                  role: 'assistant',
                  content: summaryData.text || results.join('\n'),
                  timestamp: Date.now(),
                };
                set(s => ({
                  messages: [...msgsWithToolResults, summaryMsg],
                  isLoading: false,
                  totalCalls: s.totalCalls + 2,
                  totalInputTokens: s.totalInputTokens + (data.usage?.input_tokens || 0) + (summaryData.usage?.input_tokens || 0),
                  totalOutputTokens: s.totalOutputTokens + (data.usage?.output_tokens || 0) + (summaryData.usage?.output_tokens || 0),
                  lastProvider: data.provider || summaryData.provider || 'unknown',
                  providerStatus: 'connected' as const,
                }));
                return;
              }
            } catch {
              // Summary call failed, use raw results
            }

            // Fallback: just show the raw results
            const fallbackMsg: AthenaMessage = {
              role: 'assistant',
              content: results.join('\n'),
              timestamp: Date.now(),
            };
            set(s => ({
              messages: [...msgsWithToolResults, fallbackMsg],
              isLoading: false,
              totalCalls: s.totalCalls + 1,
              totalInputTokens: s.totalInputTokens + (data.usage?.input_tokens || 0),
              totalOutputTokens: s.totalOutputTokens + (data.usage?.output_tokens || 0),
              lastProvider: data.provider || 'unknown',
              providerStatus: 'connected' as const,
            }));
            return;
          }

          // No tool calls — just a text response
          const assistantMsg: AthenaMessage = {
            role: 'assistant',
            content: data.text || 'No response.',
            timestamp: Date.now(),
          };
          set(s => ({
            messages: [...nextMessages, assistantMsg],
            isLoading: false,
            totalCalls: s.totalCalls + 1,
            totalInputTokens: s.totalInputTokens + (data.usage?.input_tokens || 0),
            totalOutputTokens: s.totalOutputTokens + (data.usage?.output_tokens || 0),
            lastProvider: data.provider || 'unknown',
            providerStatus: 'connected' as const,
          }));

        } catch (err: any) {
          const errorMsg: AthenaMessage = {
            role: 'assistant',
            content: `ATHENA OFFLINE: ${err.message || 'Connection failed'}. You can still use quick-action buttons.`,
            timestamp: Date.now(),
          };
          set({ messages: [...nextMessages, errorMsg], isLoading: false, providerStatus: 'offline' as const });
        }
      },

      clearHistory: () => set({ messages: [], actionQueue: [] }),

      reset: () => set({ messages: [], isLoading: false, actionQueue: [] }),
    }),
    {
      name: 'athena-store-v1',
      partialize: (state) => ({
        totalCalls: state.totalCalls,
        totalInputTokens: state.totalInputTokens,
        totalOutputTokens: state.totalOutputTokens,
        lastProvider: state.lastProvider,
        dynamicToolDefs: state.dynamicToolDefs, // persist installed tools across sessions
        // Don't persist messages or queue — fresh each session
      }),
      onRehydrate: (state) => {
        // Re-register dynamic tools into the runtime registry on load
        if (state?.dynamicToolDefs?.length) {
          state.dynamicToolDefs.forEach(t => registerDynamicTool(t));
        }
      },
    }
  )
);
