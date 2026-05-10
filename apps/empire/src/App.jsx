import React, { useEffect, useState, useRef, useMemo, lazy, Suspense } from 'react';
import Shell from './components/layout/Shell';
import EmpireLeftRail from './components/empire/EmpireLeftRail';
import EmpireNodeDetail from './components/empire/EmpireNodeDetail';
import EmpireTicker from './components/ticker/EmpireTicker';
import CommandTerminal from './components/empire/CommandTerminal';
import PackOverlay from './components/empire/PackOverlay';
// DevPanel is admin/beta-tester only — lazy so it never ships in the main
// bundle for regular users.
import TransferPanel from './components/empire/TransferPanel';
import { useEmpireStore, getFreshState } from './store/empireStore';
import { useWorldIntelStore } from './store/worldIntelStore';
import OnboardingHub from './components/onboarding/OnboardingHub';
import OnboardingRitual from './components/onboarding/OnboardingRitual';
import OnboardingShortIntro from './components/onboarding/OnboardingShortIntro';
import { useRitualGate } from './hooks/useRitualGate';
import { useMatchSocialStore } from './store/matchSocialStore';

import IntelHubPanel from './components/empire/IntelHubPanel';
import { useEventStream, useMacroTelemetry } from './hooks/useBackendSync';
import WelcomeTerminal from './components/empire/WelcomeTerminal';
import { useEngineTicker } from './hooks/useEngineTicker';

import { useAuthStore, selectIsAdFree } from './store/authStore';
import { canAccessSubstrate } from './lib/featureFlags';
import {
  usePrivilegeStore,
  selectIsAdmin,
  selectCanUseDevTools,
} from './store/privilegeStore';
import AuthScreen from './components/auth/AuthScreen';
import { loadGameState, saveGameState, saveGameStateNow } from './lib/cloudSync';

import EventModal from './components/events/EventModal';
import { useEventsStore } from './store/eventsStore';
import { useCardEconomyStore } from './store/cardEconomyStore';
import { useAgentCardStore } from './store/agentCardStore';
import { useMatchStore } from './store/matchStore';
import { initGemmaBridge, enableAutoEnhance } from './lib/engines/gemmaOllamaBridge';
import { useMarketWireObserver } from './hooks/useMarketWireObserver';
import { useExpansionTicker } from './hooks/useExpansionTicker';
import GameDate from './components/hud/GameDate';
import TaskManager from './components/hud/TaskManager';
import NotificationBanner from './components/hud/NotificationBanner';
import APPurchaseModal from './components/economy/APPurchaseModal';
import AchievementToast from './components/hud/AchievementToast';
import { useDailyMissionsStore } from './store/dailyMissionsStore';
import { useFeatureStore } from './store/featureStore';
import { useTranslation } from './lib/i18n';
import ErrorBoundary from './components/ErrorBoundary';
import CookieConsent from './components/legal/CookieConsent';

// ── Regulatory / jurisdiction system ─────────────────────────────
import {
  CountrySelectorFirstLaunch,
  CountrySelectorCompact,
  CountrySelectorModal,
} from './components/regulatory/CountrySelector';

// ── Lazy-loaded heavy modules (code splitting) ──────────────────
const MapViewer = lazy(() => import('./components/map/MapViewer'));
const DevPanel = lazy(() => import('./components/dev/DevPanel'));
const RegulatoryReviewDashboard = lazy(() =>
  import('./components/regulatory/RegulatoryReviewDashboard')
);
const AthenaPanel = lazy(() => import('./components/ai/AthenaPanel'));
const AcademyOS = lazy(() => import('./components/academy/AcademyOS'));
const ExchangeOS = lazy(() => import('./components/academy/ExchangeOS'));
const LabOS = lazy(() => import('./components/academy/LabOS'));
const LiveExchangeShell = lazy(() => import('./components/exchange/LiveExchangeShell'));
const SocialOS = lazy(() => import('./components/academy/SocialOS'));
const OverviewOS = lazy(() => import('./components/academy/OverviewOS'));
const AthenaLibrary = lazy(() => import('./components/academy/AthenaLibrary'));
const QuickMatchPanel = lazy(() => import('./components/arena/QuickMatchPanel'));
const PrivateServerPanel = lazy(() => import('./components/arena/PrivateServerPanel'));
const MatchHUD = lazy(() => import('./components/arena/MatchHUD'));
const MatchSocial = lazy(() => import('./components/arena/MatchSocial'));
const BattlePassTrack = lazy(() => import('./components/economy/BattlePassTrack'));
const Agency = lazy(() => import('./components/office/Agency'));
const CardEconomyShell = lazy(() => import('./components/economy/CardEconomyShell'));
const FocusTimer = lazy(() => import('./components/focus/FocusTimer'));
const AthenaDesigner = lazy(() => import('./components/athena/AthenaDesigner'));
const BugSpotter = lazy(() => import('./components/athena/BugSpotter'));
const MarketWireOS = lazy(() => import('./components/marketwire/MarketWireOS'));
const DailyMissionsPanel = lazy(() => import('./components/missions/DailyMissionsPanel'));
const AchievementsPanel = lazy(() => import('./components/missions/AchievementsPanel'));
// Substrate Mode root view (Phase 0 — wired but not user-reachable yet,
// SubstrateModeCard on the hub is greyed/non-clickable per the Phase 0
// build spec). See AEGIS_BUILD_SPEC.md §5.1.
const Substrate = lazy(() => import('./substrate'));

// Suspense fallback for lazy components
const LazyFallback = () => (
  <div className="flex items-center justify-center w-full h-full min-h-[200px]">
    <div className="text-[10px] font-mono tracking-[0.2em] text-white/20 uppercase animate-pulse">Loading...</div>
  </div>
);

// ── Ad System ─────────────────────────────────────────────────────
import AdBanner from './components/ads/AdBanner';
import AdInterstitial from './components/ads/AdInterstitial';
import AdRewarded from './components/ads/AdRewarded';
import RewardedAdButton from './components/ads/RewardedAdButton';
import FineReliefAd from './components/ads/FineReliefAd';
import { useAdSession } from './hooks/useAdSession';

function App() {
  const [devOpen, setDevOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [athenaQuery, setAthenaQuery] = useState('');
  const [activeApp, setActiveApp] = useState('globe');
  const [empireLayer, setEmpireLayer] = useState('CORPORATE');
  const [hudExpanded, setHudExpanded] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [layerSubTab, setLayerSubTab] = useState('layers'); // 'layers' | 'filter'
  const [intelHubOpen, setIntelHubOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [cardEconomyOpen, setCardEconomyOpen] = useState(false);
  const [topNavOpen, setTopNavOpen] = useState(true);
  const [bottomNavOpen, setBottomNavOpen] = useState(true);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [bugSpotterOpen, setBugSpotterOpen] = useState(false);
  const [dailyMissionsOpen, setDailyMissionsOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [regulatoryOpen, setRegulatoryOpen] = useState(false);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const processTick = useEmpireStore((s) => s.processTick);
  const ceoExperience = useEmpireStore((s) => s.ceoExperience);
  const ecflScore = useEmpireStore((s) => s.ecflScore);
  const flouLevel = useEmpireStore((s) => s.flouLevel);
  const companyBalance = useEmpireStore((s) => s.companyBalance);
  const trafficEnabled = useEmpireStore((s) => s.trafficEnabled);
  const setTrafficEnabled = useEmpireStore((s) => s.setTrafficEnabled);
  const sportsEnabled = useEmpireStore((s) => s.sportsEnabled);
  const setSportsEnabled = useEmpireStore((s) => s.setSportsEnabled);
  const feedOpen = useWorldIntelStore((s) => s.feedOpen);
  const toggleFeed = useWorldIntelStore((s) => s.toggleFeed);
  const aegisPoints = useCardEconomyStore((s) => s.aegisPoints);
  const matchActive = useMatchStore((s) => s.active);
  const [matchSocialOpen, setMatchSocialOpen] = useState(false);
  const [marketWireOverlay, setMarketWireOverlay] = useState(false);
  const [taskManagerOpen, setTaskManagerOpen] = useState(false);
  const [onboardingAthenaOpen, setOnboardingAthenaOpen] = useState(false);
  const [showAPPurchase, setShowAPPurchase] = useState(false);
  const isAdFree = useAuthStore(selectIsAdFree);
  const { t } = useTranslation();

  // ── Onboarding ritual gate ──────────────────────────────────────
  const { needsRitual, completeRitual, anonymousCallSign } = useRitualGate();

  // Short-intro phase — plays on every entry, doubles as the loading state
  // while auth resolves. 'short-intro' → 'ritual' (when needed) → 'app'.
  const [introPhase, setIntroPhase] = useState('short-intro');

  // Restore user preferences on app mount
  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('aegis-preferences') || '{}');
      if (prefs.fontSize) document.documentElement.style.fontSize = `${prefs.fontSize}px`;
      if (prefs.reducedMotion) document.documentElement.classList.add('reduce-motion');
      if (prefs.highContrast) document.documentElement.classList.add('high-contrast');
    } catch (e) { console.warn('[AEGIS] Failed to restore preferences:', e); }
  }, []);

  // ── Auth ────────────────────────────────────────────────────────
  const { user, guestMode, recoveryMode, loading: authLoading, initialize: initAuth } = useAuthStore();
  const [gameReady, setGameReady] = useState(false);
  const cloudSyncRef = useRef(false);

  // ── Privileges (admin / beta tester) ─────────────────────────────
  const isAdmin = usePrivilegeStore(selectIsAdmin);
  const canUseDevTools = usePrivilegeStore(selectCanUseDevTools);
  const refreshPrivileges = usePrivilegeStore((s) => s.refresh);
  const resetPrivileges = usePrivilegeStore((s) => s.reset);

  // Initialize auth on mount
  useEffect(() => {
    initAuth();
  }, []);

  // Initialize Gemma AI bridge (Ollama local model)
  useEffect(() => {
    initGemmaBridge().then(({ available, model }) => {
      if (available) {
        enableAutoEnhance();
        if (import.meta.env.DEV) console.debug(`[AEGIS] Gemma super-AI active — model: ${model}`);
      }
    });
  }, []);

  // Load game state from cloud when user logs in
  useEffect(() => {
    if (!user) {
      setGameReady(false);
      cloudSyncRef.current = false;
      resetPrivileges();
      return;
    }

    let cancelled = false;
    (async () => {
      // Privilege flags & game state load in parallel — privilege is tiny so
      // it completes first and the UI gets the right buttons immediately.
      refreshPrivileges();

      const cloudState = await loadGameState(user.id);
      if (cancelled) return;

      if (cloudState) {
        // Returning player — load their saved state
        useEmpireStore.getState().loadCloudState(cloudState);
      } else {
        // Brand new player — reset to fresh 100k state
        useEmpireStore.getState().resetToFresh();
      }

      cloudSyncRef.current = true;
      setGameReady(true);
    })();

    return () => { cancelled = true; };
  }, [user?.id, refreshPrivileges, resetPrivileges]);

  // Auto-save game state to cloud on every Zustand change (debounced)
  useEffect(() => {
    if (!user || !cloudSyncRef.current) return;

    const unsub = useEmpireStore.subscribe((state) => {
      if (sandboxActiveRef.current) return; // Don't save sandbox state to cloud
      saveGameState(user.id, state);
    });

    // Save on page unload
    const handleBeforeUnload = () => {
      if (sandboxActiveRef.current) return; // Don't save sandbox state to cloud
      const state = useEmpireStore.getState();
      saveGameStateNow(user.id, state);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsub();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id, gameReady]);

  // Backend telemetry — WS event stream + macro polling
  useEventStream();
  useMacroTelemetry();

  // Game Loop: 1 tick = 1 game minute. 1s per tick → 1 real second = 1 game minute.
  // 1 game day = 1440 ticks = 24 real min. 1 game month ≈ 12h real. 1 game year ≈ 6 real days.
  useEngineTicker(1000);

  // MarketWire agent journalism — observes player behavior for article generation
  useMarketWireObserver();

  // Expansion engine — ticks dynamic prices, checks mission progress
  useExpansionTicker();

  // Ad session tracker — cumulative usage timer, triggers interstitials every 20min
  useAdSession(activeApp);

  // Daily missions — ensure day is current, credit login
  useEffect(() => { useDailyMissionsStore.getState().ensureDay(); }, []);
  useEffect(() => { useFeatureStore.getState().rehydrateDynamicTools(); }, []);

  // ── Match social bot tick — generate bot posts/activity in the air-gapped social ──
  useEffect(() => {
    if (!sandboxActiveRef.current) return;
    const iv = setInterval(() => {
      if (useMatchStore.getState().active) {
        useMatchSocialStore.getState().tick();
      }
    }, 15_000); // Every 15s
    return () => clearInterval(iv);
  });

  // ── Match sync: push scores + broadcast player actions + intel + PvP to activity feed ──
  const lastTickerLenRef = useRef(0);
  useEffect(() => {
    if (!sandboxActiveRef.current) return;
    // Snapshot current ticker length so we only broadcast new entries
    lastTickerLenRef.current = useEmpireStore.getState().ticker?.length || 0;

    // Also subscribe to agent card changes for intel level updates
    const unsubAgents = useAgentCardStore.subscribe((agentState) => {
      if (!useMatchStore.getState().active) return;
      // Count deployed Infiltrator and Scout agents for intel level
      let infiltratorCount = 0;
      let scoutCount = 0;
      for (const [mintId, agent] of Object.entries(agentState.agents || {})) {
        if (!agent.deployedTo) continue;
        const agentDef = useAgentCardStore.getState().getAgentDef(mintId);
        if (!agentDef) continue;
        if (agentDef.class === 'Infiltrator') infiltratorCount++;
        else if (agentDef.class === 'Scout') scoutCount++;
      }
      useMatchStore.getState().updateIntelLevel(infiltratorCount, scoutCount);
    });

    const unsub = useEmpireStore.subscribe((state) => {
      if (!useMatchStore.getState().active) return;

      // Update leaderboard score
      const ownedNodes = Object.values(state.nodes).filter(n => n.owner === 'player' && n.status === 'operational');
      const portfolio = state.portfolio || {};
      const tradeCount = Object.values(portfolio).reduce((sum, p) => sum + (p.quantity > 0 ? 1 : 0), 0);
      useMatchStore.getState().updateMyScore({
        netWorth: state.netWorth || state.companyBalance + state.personalBalance,
        tradesExecuted: tradeCount,
        nodesOwned: ownedNodes.length,
      });

      // Broadcast new ticker events as activity feed entries
      const ticker = state.ticker || [];
      const prevLen = lastTickerLenRef.current;
      if (ticker.length > prevLen) {
        // New events are prepended to ticker, so new ones are at the start
        const newCount = ticker.length - prevLen;
        const newEvents = ticker.slice(0, Math.min(newCount, 5)); // Cap at 5 per batch
        const myName = user?.user_metadata?.display_name || 'You';
        const myId = user?.id || 'local';

        for (const evt of newEvents) {
          // Map ticker event types to activity actions
          const text = evt.text || '';
          let action = 'milestone';
          if (text.includes('BUY')) action = 'buy';
          else if (text.includes('SELL')) action = 'sell';
          else if (text.includes('TAKEOVER') || text.includes('Acquired')) action = 'acquire_node';
          else if (text.includes('POACH')) action = 'deploy_agent';
          else if (text.includes('LOAN')) action = 'take_loan';
          else if (text.includes('FUND') || text.includes('INSTITUTIONAL')) action = 'fund_invest';
          else if (text.includes('SHADOW') || text.includes('CYBER')) action = 'shadow_op';

          // Strip prefixes like "TRADE: " or "HOSTILE TAKEOVER: " for cleaner feed
          const detail = text.replace(/^[A-Z\s]+:\s*/, '');

          useMatchStore.getState().pushActivity({
            playerName: myName,
            playerId: myId,
            action,
            detail,
          });
        }
      }
      lastTickerLenRef.current = ticker.length;
    });
    return () => { unsub(); unsubAgents(); };
  });

  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [gameMode, setGameMode] = useState(null); // null = show onboarding hub, 'play_online'|'play_offline'|'pvp_quick'|'private_server'|'learn'|'social'|'lab'|'athena'
  const [pendingRoomCode, setPendingRoomCode] = useState(null); // Room code to auto-join when entering private_server
  const campaignSnapshotRef = useRef(null); // Snapshot of campaign state before private match
  const agentSnapshotRef = useRef(null);    // Snapshot of agent cards before private match
  const sandboxActiveRef = useRef(false);   // True while in a sandboxed private match — blocks cloud sync
  const selectedNodeId = useEmpireStore((s) => s.selectedNodeId);
  const terminalOpen = useEmpireStore((s) => s.terminalOpen);
  const athenaOpen = useEmpireStore((s) => s.athenaOpen);
  const packOpen = useEmpireStore((s) => s.packOpen);
  const setTerminalOpen = useEmpireStore((s) => s.setTerminalOpen);
  const setAthenaOpen = useEmpireStore((s) => s.setAthenaOpen);
  const setPackOpen = useEmpireStore((s) => s.setPackOpen);
  const selectNode = useEmpireStore((s) => s.selectNode);
  const sectorFilter = useEmpireStore((s) => s.sectorFilter);
  const setSectorFilter = useEmpireStore((s) => s.setSectorFilter);
  const setShowRoutes = useEmpireStore((s) => s.setShowRoutes);

  // ── Inline Search ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);

  const SEARCH_INDEX = useMemo(() => [
    // Main tabs
    { label: 'Overview Dashboard', desc: 'Empire stats, balances, performance metrics', action: () => setActiveApp('overview'), icon: '\u229E', category: 'Tabs' },
    { label: 'Globe Map', desc: 'Interactive 3D world map with business nodes', action: () => setActiveApp('globe'), icon: '\u25C9', category: 'Tabs' },
    { label: 'Learn / Academy', desc: 'ECFL courses, lessons, and exams', action: () => setActiveApp('learn'), icon: '\u25C8', category: 'Tabs' },
    { label: 'Exchange / Trading', desc: 'Stocks, crypto, forex, bonds trading', action: () => setActiveApp('exchange'), icon: '\u21C4', category: 'Tabs' },
    { label: 'Lab / Simulation', desc: 'Practice trading with simulated money', action: () => setActiveApp('lab'), icon: '\u2697', category: 'Tabs' },
    { label: 'Social / BizTok', desc: 'Social feed, NPC profiles, challenges', action: () => setActiveApp('social'), icon: '\u25CE', category: 'Tabs' },
    { label: 'Battle Pass', desc: '50-tier seasonal rewards, free + premium tracks', action: () => setActiveApp('battlepass'), icon: '\u2B50', category: 'Tabs' },
    { label: 'MarketWire', desc: 'Yahoo Finance-style news, screener, portfolio, agent journalism', action: () => setActiveApp('marketwire'), icon: '\u25C6', category: 'Tabs' },

    // New feature systems
    { label: 'Focus Timer', desc: 'Pomodoro sessions that earn AP', action: () => setFocusOpen(true), icon: '\u23F1', category: 'Actions' },
    { label: 'Card Collection', desc: 'View owned cards, open packs, marketplace', action: () => setCardEconomyOpen(true), icon: '\uD83C\uDCCF', category: 'Actions' },
    { label: 'Glossary', desc: '80+ financial terms with explanations', action: () => setActiveApp('learn'), icon: '\uD83D\uDCD6', category: 'Learn' },
    { label: 'Certificates', desc: 'View earned course certificates', action: () => setActiveApp('learn'), icon: '\uD83C\uDF93', category: 'Learn' },
    { label: 'PvP Takeovers', desc: 'Hostile takeover bids against rivals', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('pvp'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\u2694', category: 'Globe' },
    { label: 'Politics & Lobbying', desc: 'Political influence, lobbying, PACs', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('politics'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\uD83C\uDFDB', category: 'Globe' },
    { label: 'Luxury Assets', desc: 'Watches, cars, yachts with resale value', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('luxury'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\uD83D\uDC8E', category: 'Globe' },
    { label: 'News & Bulletins', desc: 'Market news with sentiment analysis', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('news'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\uD83D\uDCF0', category: 'Globe' },
    { label: 'Market Calls', desc: 'Public predictions that boost credibility', action: () => setActiveApp('social'), icon: '\uD83D\uDCE2', category: 'Social' },
    { label: 'Followers & Influence', desc: 'Dynamic follower economy and sponsorships', action: () => setActiveApp('social'), icon: '\uD83D\uDC65', category: 'Social' },
    { label: 'Research Desk', desc: 'Podcasts, digests, briefings, watchlists', action: () => setActiveApp('social'), icon: '\uD83D\uDD0D', category: 'Social' },
    { label: 'Solo Missions', desc: 'Challenges with XP and AP rewards', action: () => setActiveApp('lab'), icon: '\uD83C\uDFAF', category: 'Actions' },

    // Left rail sub-tabs
    { label: 'Office / Corporate Structure', desc: 'Upgrade to LLC, Partnership, Public Co.', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('office'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\uD83C\uDFE2', category: 'Globe' },
    { label: 'Departments', desc: 'Run HR, Trading, R&D, Marketing projects', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('departments'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\u2630', category: 'Globe' },
    { label: 'Assets & Portfolio', desc: 'View owned nodes, investments, cards', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('assets'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\uD83D\uDCBC', category: 'Globe' },
    { label: 'Market / Buy Nodes', desc: 'Browse and purchase business nodes', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('market'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\uD83C\uDFEA', category: 'Globe' },
    { label: 'Trade Routes', desc: 'View and manage logistics corridors', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('routes'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\uD83D\uDEE4\uFE0F', category: 'Globe' },
    { label: 'ESG & Sustainability', desc: 'Environmental, social, governance metrics', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('esg'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\u2618', category: 'Globe' },
    { label: 'R&D Lab', desc: 'Research and development projects', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('rnd'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\uD83D\uDD2C', category: 'Globe' },
    { label: 'Funds & Investments', desc: 'Mutual funds, ETFs, hedge funds', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('funds'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\uD83D\uDCCA', category: 'Globe' },
    { label: 'DEFCON / Shadow Ops', desc: 'Covert operations and shadow activities', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('defcon'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\u26A0', category: 'Globe' },
    { label: 'Shadow Operations', desc: 'Execute cyber, financial, physical ops', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('shadow'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\uD83D\uDD75\uFE0F', category: 'Globe' },
    { label: 'Perks & Upgrades', desc: 'Special abilities and empire perks', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('perks'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\u2B50', category: 'Globe' },
    { label: 'Shop', desc: 'Buy luxury assets, real estate, art', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('shopping'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\uD83D\uDECD\uFE0F', category: 'Globe' },
    { label: 'Sports Franchises', desc: 'Buy and manage sports teams', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('sports'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\u26BD', category: 'Globe' },
    { label: 'Divisions', desc: 'VC, PE, Hedge Fund, IB, Media, Auctions', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('divisions'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\u25C6', category: 'Globe' },
    { label: 'Venture Capital', desc: 'Invest in startups and early-stage companies', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('divisions'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\uD83D\uDE80', category: 'Divisions' },
    { label: 'Private Equity', desc: 'Acquire and restructure mid-market companies', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('divisions'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\uD83C\uDFE2', category: 'Divisions' },
    { label: 'Hedge Fund', desc: 'Run trading strategies with leveraged returns', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('divisions'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\uD83D\uDCC8', category: 'Divisions' },
    { label: 'Investment Banking', desc: 'M&A advisory, IPOs, debt issuance deals', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('divisions'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\uD83C\uDFE6', category: 'Divisions' },
    { label: 'Media Empire', desc: 'Acquire news networks, platforms, ad agencies', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('divisions'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\uD83D\uDCFA', category: 'Divisions' },
    { label: 'Auctions', desc: 'Bid on fine art, vintage cars, diamonds, real estate', action: () => { setActiveApp('globe'); useEmpireStore.getState().setActiveTab('divisions'); useEmpireStore.getState().setLeftRailOpen(true); }, icon: '\uD83D\uDD28', category: 'Divisions' },

    // Overlays / Actions
    { label: 'Transfer Funds', desc: 'Move money between personal and company wallets', action: () => setTransferOpen(true), icon: '\uD83D\uDCB8', category: 'Actions' },
    { label: 'Athena AI Advisor', desc: 'Strategic intelligence and advice', action: () => { setAthenaOpen(true); }, icon: '\uD83E\uDD16', category: 'Actions' },
    { label: 'Open Card Pack', desc: 'Pull employee cards (costs AP)', action: () => { useEmpireStore.getState().setPackOpen(true); }, icon: '\uD83C\uDCB4', category: 'Actions' },
    { label: 'Intel Hub', desc: 'Intelligence reports and market analysis', action: () => setIntelHubOpen(true), icon: '\uD83D\uDCE1', category: 'Actions' },
    { label: 'Command Terminal', desc: 'Quick command access (Cmd+K)', action: () => { useEmpireStore.getState().setTerminalOpen(true); }, icon: '\u25B6', category: 'Actions' },
    { label: 'UI Designer', desc: 'Describe UI changes to Athena and she implements them', action: () => setDesignerOpen(true), icon: '\uD83C\uDFA8', category: 'Actions' },
    { label: 'Bug Reporter', desc: 'Click on UI problems and Athena fixes them', action: () => setBugSpotterOpen(true), icon: '\uD83D\uDC1B', category: 'Actions' },

    // Map layers
    { label: 'Corporate Layer', desc: 'Default business node view on globe', action: () => { setActiveApp('globe'); setEmpireLayer('CORPORATE'); }, icon: '\u25C9', category: 'Layers' },
    { label: 'Routes Layer', desc: 'Trade route arcs on the globe', action: () => { setActiveApp('globe'); setEmpireLayer('ROUTES'); useEmpireStore.getState().setShowRoutes(true); }, icon: '\u21C4', category: 'Layers' },
    { label: 'Threats Layer', desc: 'Risk and threat visualization', action: () => { setActiveApp('globe'); setEmpireLayer('THREATS'); }, icon: '\u26A0', category: 'Layers' },
    { label: 'Sentiment Layer', desc: 'Market sentiment heatmap', action: () => { setActiveApp('globe'); setEmpireLayer('SENTIMENT'); }, icon: '\u25C8', category: 'Layers' },
    { label: 'ESG Layer', desc: 'ESG score visualization on globe', action: () => { setActiveApp('globe'); setEmpireLayer('ESG'); }, icon: '\u2618', category: 'Layers' },
  ], [setActiveApp, setTransferOpen, setAthenaOpen, setEmpireLayer]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return SEARCH_INDEX.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery, SEARCH_INDEX]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Global Keybindings for Terminal & Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setTerminalOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setAthenaOpen(prev => !prev);
      }
      if (e.key === 'F2') {
        e.preventDefault();
        // Gated: only admins and beta testers can open the DevPanel.
        if (canUseDevTools) setDevOpen(prev => !prev);
      }
      if (e.key === 'F3') {
        e.preventDefault();
        // Gated: regulatory review dashboard is admin-only.
        if (isAdmin) setRegulatoryOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setTerminalOpen(false);
        setAthenaOpen(false);
        setPackOpen(false);
        setDevOpen(false);
        setRegulatoryOpen(false);
        setCountryPickerOpen(false);
        setTransferOpen(false);
        setIntelHubOpen(false);
        setFocusOpen(false);
        setCardEconomyOpen(false);
        setDesignerOpen(false);
        setBugSpotterOpen(false);
        selectNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTerminalOpen, setAthenaOpen, setPackOpen, selectNode, canUseDevTools, isAdmin]);

  // ── Navigation helper for notifications / task manager ──
  const handleNotifNavigate = React.useCallback((nav) => {
    if (!nav) return;
    if (nav.app) setActiveApp(nav.app);
    if (nav.tab) useEmpireStore.getState().setActiveTab(nav.tab);
    if (nav.nodeId) useEmpireStore.getState().selectNode(nav.nodeId);
    if (nav.flyTo) {
      setTimeout(() => {
        useEmpireStore.getState().flyToNode(nav.flyTo.lat, nav.flyTo.lon, 6, nav.nodeId);
      }, 300);
    }
  }, []);

  // ── Cold-open short intro (every entry) ─────────────────────────
  // Replaces the old "Loading Empire" spinner. Plays on every app boot,
  // covering the auth-resolution window. When it finishes, the next
  // surface is decided based on auth state at that moment.
  if (introPhase === 'short-intro') {
    const userCallSign = user?.user_metadata?.call_sign;
    return (
      <OnboardingShortIntro
        callSign={userCallSign || anonymousCallSign}
        onComplete={() => {
          // If auth is still resolving, hold the intro for another beat
          // so we don't flash a spinner. The re-render after authLoading
          // flips will fall through to the right surface.
          if (authLoading) {
            setTimeout(() => setIntroPhase((p) => p), 400);
            return;
          }
          if (needsRitual) {
            setIntroPhase('ritual');
          } else {
            setIntroPhase('app');
          }
        }}
      />
    );
  }

  // ── Cold-open ritual (first time on this device) ────────────────
  // Pre-auth visitors capture their call sign here; on completion it
  // falls through to AuthScreen with the name pre-filled. Existing
  // accounts without the flag still hit this gate on next login —
  // that's the intended brand baptism (PR #21 behaviour preserved).
  if (introPhase === 'ritual') {
    return (
      <OnboardingRitual
        onComplete={async ({ callSign }) => {
          const isAnon = !user && !guestMode;
          await completeRitual({ callSign, isAnonymous: isAnon });
          setIntroPhase('app');
        }}
      />
    );
  }

  // ── Auth Gate ───────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-[#060a12] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#00e5ff]/30 border-t-[#00e5ff] rounded-full animate-spin" />
          <span className="text-tactical-text/40 font-mono text-[10px] tracking-[0.2em] uppercase">Initializing</span>
        </div>
      </div>
    );
  }

  if (recoveryMode) {
    return <AuthScreen recovery />;
  }

  if (!user && !guestMode) {
    return <AuthScreen />;
  }

  if (!guestMode && !gameReady) {
    return (
      <div className="fixed inset-0 bg-[#060a12] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#00e5ff]/30 border-t-[#00e5ff] rounded-full animate-spin" />
          <span className="text-tactical-text/40 font-mono text-[10px] tracking-[0.2em] uppercase">Loading Empire</span>
        </div>
      </div>
    );
  }

  // ── Onboarding Ritual Gate (fallback for authed-without-flag) ───
  // If a returning account predates the cold-open ritual and the short
  // intro decided to skip the ritual phase (e.g. auth resolved late),
  // catch them here before the hub. Idempotent: completeRitual writes
  // user_metadata so this fires at most once.
  if (gameMode === null && needsRitual) {
    return (
      <OnboardingRitual
        onComplete={async ({ callSign }) => {
          await completeRitual({ callSign });
        }}
      />
    );
  }

  // ── Onboarding Hub Gate ─────────────────────────────────────────
  if (gameMode === null) {
    return (
      <>
        <OnboardingHub onSelectMode={(mode) => {
          setGameMode(mode);
          if (mode === 'play_online' || mode === 'play_offline') {
            setActiveApp('globe');
          }
        }} />

        <button
          onClick={() => setOnboardingAthenaOpen(v => !v)}
          className={`interactive-focus elevate-soft fixed right-4 bottom-4 z-[72] px-3 py-2 rounded-lg text-[9px] micro-label border transition-all ${
            onboardingAthenaOpen
              ? 'bg-[#7c3aed]/20 border-[#7c3aed]/45 text-[#c4b5fd]'
              : 'bg-[#060a12]/85 border-white/[0.12] text-white/70 hover:text-[#c4b5fd] hover:border-[#7c3aed]/35'
          }`}
        >
          {onboardingAthenaOpen ? '✕ CLOSE ATHENA' : '⚡ ASK ATHENA'}
        </button>

        {onboardingAthenaOpen && (
          <AthenaPanel
            onClose={() => setOnboardingAthenaOpen(false)}
            initialTab="athena"
            initialQuery="I'm new. Explain the game basics and my best first moves."
            docked
            dockPosition="right"
            dockWidth={400}
            dockHeight="76vh"
            dockOffset={{ right: 16, bottom: 56 }}
            navCallbacks={{ setActiveApp, setGameMode }}
          />
        )}
      </>
    );
  }

  // ── MarketWire floating button + overlay for fullpage modes ──
  const MarketWireFloat = () => (
    <>
      <button
        onClick={() => setMarketWireOverlay(!marketWireOverlay)}
        className={`interactive-focus elevate-soft fixed bottom-4 right-4 z-[60] px-3 py-2 rounded-lg text-[8px] font-mono micro-label transition-all shadow-lg ${
          marketWireOverlay
            ? 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40'
            : 'bg-[#060a12]/90 text-[#f59e0b]/40 border border-[#f59e0b]/20 hover:text-[#f59e0b] hover:border-[#f59e0b]/40'
        }`}
      >
        ◆ WIRE
      </button>
      {marketWireOverlay && (
        <div className="fixed inset-0 z-[55] bg-[#060a12]">
          <div className="absolute top-0 left-0 right-0 z-30 bg-[#060a12]/90 border-b border-tactical-border/10 flex items-center h-10 px-4 backdrop-blur-xl">
            <button onClick={() => setMarketWireOverlay(false)} className="interactive-focus elevate-soft text-[9px] text-tactical-text/45 hover:text-[#f59e0b] transition-all font-mono micro-label">← BACK</button>
            <span className="ml-4 text-[10px] text-[#f59e0b] tracking-[0.2em] font-bold">MARKETWIRE</span>
          </div>
          <div className="pt-10 h-full relative"><MarketWireOS /></div>
        </div>
      )}
    </>
  );

  // ── Learn Mode (Athena Library) ───────────────────────────────
  if (gameMode === 'learn') {
    return <>
      <AthenaLibrary onBack={() => setGameMode(null)} />
      <MarketWireFloat />
    </>;
  }

  // ── Substrate Mode (R&D — feature-flag gated) ─────────────────
  // Substrate is on `main` from Phase 1 but not exposed to general users
  // until ready. Gate via VITE_SUBSTRATE_PUBLIC env (default false) or
  // per-user user_metadata.substrate_tester=true. See lib/featureFlags.ts.
  // If the flag is off and someone forces gameMode = 'substrate' from
  // devtools, we silently bounce them back to the hub.
  if (gameMode === 'substrate') {
    if (!canAccessSubstrate(user)) {
      // Side-effectful bounce back — schedule the state reset and render the hub.
      setTimeout(() => setGameMode(null), 0);
      return null;
    }
    return (
      <Suspense fallback={<LazyFallback />}>
        <Substrate onBack={() => setGameMode(null)} />
      </Suspense>
    );
  }

  // ── Social Mode ───────────────────────────────────────────────
  if (gameMode === 'social') {
    return (
      <div className="fixed inset-0 bg-[#060a12] text-tactical-text font-mono">
        <div className="absolute top-0 left-0 right-0 z-30 bg-[#060a12]/90 border-b border-tactical-border/10 flex items-center h-10 px-4 backdrop-blur-xl">
          <button onClick={() => setGameMode(null)} className="text-[9px] text-tactical-text/40 hover:text-tactical-cyan transition-all font-mono tracking-wider">← BACK TO HUB</button>
          <span className="ml-4 text-[10px] text-[#f59e0b] tracking-[0.2em] font-bold">SOCIAL</span>
        </div>
        <div className="pt-10"><SocialOS onJoinRoom={(roomCode) => { setPendingRoomCode(roomCode); setGameMode('private_server'); }} /></div>
        <MarketWireFloat />
      </div>
    );
  }

  // ── Restore campaign state from sandbox ────────────────────────
  const restoreCampaignSnapshot = () => {
    // Stop match HUD if running
    if (useMatchStore.getState().active) {
      useMatchStore.getState().endMatch();
    }
    useMatchStore.getState().cleanup();
    // Reset air-gapped match social
    useMatchSocialStore.getState().reset();
    setMatchSocialOpen(false);

    if (campaignSnapshotRef.current) {
      useEmpireStore.getState().loadCloudState(campaignSnapshotRef.current);
      campaignSnapshotRef.current = null;
    }
    if (agentSnapshotRef.current) {
      useAgentCardStore.setState(agentSnapshotRef.current);
      agentSnapshotRef.current = null;
    }
    sandboxActiveRef.current = false;
  };

  // ── Quick Match PvP ───────────────────────────────────────────
  if (gameMode === 'pvp_quick') {
    return <QuickMatchPanel onBack={() => setGameMode(null)} onMatchStart={() => { setGameMode('play_online'); setActiveApp('globe'); }} />;
  }

  // ── Private Server ────────────────────────────────────────────
  if (gameMode === 'private_server') {
    return <PrivateServerPanel
      onBack={() => {
        setPendingRoomCode(null);
        restoreCampaignSnapshot();
        setGameMode(null);
      }}
      onStartMatch={(matchSettings) => {
        setPendingRoomCode(null);
        sandboxActiveRef.current = true;

        // Snapshot current campaign state before sandboxing
        const currentState = useEmpireStore.getState();
        const snapshot = {};
        for (const [key, value] of Object.entries(currentState)) {
          if (typeof value !== 'function') snapshot[key] = value;
        }
        campaignSnapshotRef.current = snapshot;

        // Snapshot agent cards too
        const agentState = useAgentCardStore.getState();
        const agentSnapshot = {};
        for (const [key, value] of Object.entries(agentState)) {
          if (typeof value !== 'function') agentSnapshot[key] = value;
        }
        agentSnapshotRef.current = agentSnapshot;

        // Reset to fresh state with only the match's starting capital
        const fresh = getFreshState();
        fresh.companyBalance = matchSettings?.startingCapital || 500_000;
        fresh.personalBalance = 0;
        fresh.netWorth = fresh.companyBalance;
        useEmpireStore.getState().loadCloudState(fresh);

        // If agents NOT allowed, clear them for the match
        if (!matchSettings?.allowAgents) {
          useAgentCardStore.setState({ agents: {}, totalDeployed: 0 });
        }

        // Start match HUD (timer, leaderboard, activity feed)
        useMatchStore.getState().startMatch({
          roomId: matchSettings?.roomCode || 'local',
          roomCode: matchSettings?.roomCode || 'LOCAL',
          mode: matchSettings?.mode || 'free_for_all',
          duration: matchSettings?.duration || 10,
          timeMultiplier: matchSettings?.timeMultiplier || 10,
          startingCapital: matchSettings?.startingCapital || 500_000,
          players: (matchSettings?.players || []).map(p => ({
            userId: p.userId,
            name: p.name,
            isBot: p.isBot || false,
          })),
          myUserId: user?.id || 'local',
          myDisplayName: user?.user_metadata?.display_name || 'You',
          myColor: matchSettings?.myColor,
        });

        // Initialize air-gapped match social media
        useMatchSocialStore.getState().initialize(
          (matchSettings?.players || []).map(p => ({
            playerId: p.userId || `bot-${Math.random().toString(36).slice(2, 6)}`,
            displayName: p.name,
            isBot: p.isBot || false,
          })),
          user?.id || 'local',
        );

        setGameMode('play_online');
        setActiveApp('globe');
      }}
      initialRoomCode={pendingRoomCode}
    />;
  }

  // ── Lab Mode (from Hub) ──────────────────────────────────────
  if (gameMode === 'lab') {
    return (
      <div className="fixed inset-0 bg-[#060a12] text-tactical-text font-mono">
        <div className="absolute top-0 left-0 right-0 z-30 bg-[#060a12]/90 border-b border-tactical-border/10 flex items-center h-10 px-4 backdrop-blur-xl">
          <button onClick={() => setGameMode(null)} className="text-[9px] text-tactical-text/40 hover:text-tactical-cyan transition-all font-mono tracking-wider">← BACK TO HUB</button>
          <span className="ml-4 text-[10px] text-[#f97316] tracking-[0.2em] font-bold">SIMULATION LAB</span>
        </div>
        <div className="pt-10 h-full"><LabOS onNavigate={(app) => { setGameMode('play_offline'); setActiveApp(app); }} /></div>
        <MarketWireFloat />
      </div>
    );
  }

  // ── Athena Mode (from Hub) ──────────────────────────────────
  if (gameMode === 'athena') {
    return (
      <div className="fixed inset-0 bg-[#060a12] text-tactical-text font-mono">
        <div className="absolute top-0 left-0 right-0 z-30 bg-[#060a12]/90 border-b border-tactical-border/10 flex items-center h-10 px-4 backdrop-blur-xl">
          <button onClick={() => setGameMode(null)} className="text-[9px] text-tactical-text/40 hover:text-tactical-cyan transition-all font-mono tracking-wider">← BACK TO HUB</button>
          <span className="ml-4 text-[10px] text-[#00e5ff] tracking-[0.2em] font-bold">ATHENA AI</span>
        </div>
        <div className="pt-10 h-full">
          <AthenaPanel onClose={() => setGameMode(null)} fullPage />
        </div>
        <MarketWireFloat />
      </div>
    );
  }

  return (
    <>
    <ErrorBoundary label="AEGIS Empire">
    <div className="bg-[#060a12] min-h-screen text-tactical-text font-mono overflow-hidden">
      {!hasOnboarded && <WelcomeTerminal onComplete={() => setHasOnboarded(true)} />}

      {/* ── Match HUD (timer, leaderboard, feed) — visible during private server matches ── */}
      {matchActive && (
        <>
          <MatchHUD
            myPlayerId={user?.id || 'local'}
            onMatchEnd={() => {
              useMatchStore.getState().cleanup();
              useMatchSocialStore.getState().reset();
              setMatchSocialOpen(false);
              restoreCampaignSnapshot();
              setGameMode(null);
              setActiveApp('globe');
            }}
          />
          {/* Match Social toggle button */}
          <button
            onClick={() => setMatchSocialOpen(!matchSocialOpen)}
            className={`interactive-focus elevate-soft fixed bottom-20 left-3 z-[45] px-3 py-2 rounded-lg text-[8px] font-mono micro-label transition-all shadow-lg ${
              matchSocialOpen
                ? 'bg-[#a78bfa]/20 text-[#a78bfa] border border-[#a78bfa]/40'
                : 'bg-[#060a12]/90 text-white/30 border border-white/[0.08] hover:text-[#a78bfa] hover:border-[#a78bfa]/30'
            }`}
          >
            💬 SOCIAL
          </button>
          {/* Match Social panel */}
          {matchSocialOpen && (
            <MatchSocial
              myPlayerId={user?.id || 'local'}
              onClose={() => setMatchSocialOpen(false)}
            />
          )}
        </>
      )}

      <Shell>
        <Suspense fallback={<LazyFallback />}>
        {/* OS App Overlays */}
        {activeApp === 'learn' && <AcademyOS />}
        {activeApp === 'exchange' && (
          <ErrorBoundary label="Exchange"><LiveExchangeShell onExit={() => setActiveApp('globe')} /></ErrorBoundary>
        )}
        {activeApp === 'lab' && <LabOS onNavigate={setActiveApp} />}
        {activeApp === 'social' && <SocialOS />}
        {activeApp === 'overview' && <OverviewOS onNavigate={(app, tab) => { setActiveApp(app); if (tab) useEmpireStore.getState().setActiveTab(tab); }} />}
        {activeApp === 'battlepass' && <BattlePassTrack onClose={() => setActiveApp('globe')} />}
        {activeApp === 'office' && <Agency />}
        {activeApp === 'marketwire' && <MarketWireOS />}

        {/* Background Map (z-0) */}
        <MapViewer activeLayer={empireLayer} />

        {/* HUD Layers (z-10+) — only visible on globe view */}
        {activeApp === 'globe' && <EmpireLeftRail />}
        {activeApp === 'globe' && selectedNodeId && <EmpireNodeDetail />}
        {activeApp === 'globe' && <EmpireTicker />}

        {/* Overlays (z-50) */}
        {terminalOpen && <CommandTerminal />}
        {packOpen && <PackOverlay />}
        {athenaOpen && (
          <ErrorBoundary label="Athena AI">
          <AthenaPanel
            onClose={() => { setAthenaOpen(false); setAthenaQuery(''); }}
            initialQuery={athenaQuery}
            initialTab={athenaQuery ? 'athena' : 'brief'}
            navCallbacks={{ setActiveApp, setGameMode, restoreCampaignSnapshot }}
          />
          </ErrorBoundary>
        )}
        {transferOpen && (
          <TransferPanel
            onClose={() => setTransferOpen(false)}
            onAskAthena={(query) => {
              setAthenaQuery(query);
              setTransferOpen(false);
        setIntelHubOpen(false);
              setAthenaOpen(true);
            }}
          />
        )}
        {/* DevPanel — defense-in-depth: client gate even if devOpen is flipped
            externally (DevTools, URL param, etc.). Server side is guarded by
            RLS on any write, so this is purely UX. Lazy-loaded so it never
            ships in the regular-user bundle. */}
        {devOpen && canUseDevTools && (
          <Suspense fallback={<LazyFallback />}>
            <DevPanel onClose={() => setDevOpen(false)} />
          </Suspense>
        )}
        {regulatoryOpen && isAdmin && (
          <Suspense fallback={<LazyFallback />}>
            <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm p-6 overflow-auto">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-2xl font-bold text-white">Regulatory Review</h1>
                  <button
                    onClick={() => setRegulatoryOpen(false)}
                    className="text-stone-300 hover:text-white text-sm border border-stone-600 rounded px-3 py-1"
                  >
                    Close (Esc)
                  </button>
                </div>
                <RegulatoryReviewDashboard />
              </div>
            </div>
          </Suspense>
        )}
        {/* First-launch jurisdiction prompt — self-managed via useEffect in the component */}
        <CountrySelectorFirstLaunch />
        {countryPickerOpen && (
          <CountrySelectorModal
            open={countryPickerOpen}
            onClose={() => setCountryPickerOpen(false)}
            allowSkip
          />
        )}
        {intelHubOpen && <IntelHubPanel onClose={() => setIntelHubOpen(false)} />}
        {focusOpen && <FocusTimer onClose={() => setFocusOpen(false)} />}
        {cardEconomyOpen && <ErrorBoundary label="Card Economy"><CardEconomyShell onClose={() => setCardEconomyOpen(false)} /></ErrorBoundary>}
        {designerOpen && <AthenaDesigner onClose={() => setDesignerOpen(false)} />}
        {bugSpotterOpen && <BugSpotter onClose={() => setBugSpotterOpen(false)} />}
        {dailyMissionsOpen && <DailyMissionsPanel onClose={() => setDailyMissionsOpen(false)} />}
        {achievementsOpen && <AchievementsPanel onClose={() => setAchievementsOpen(false)} />}
        <EventModal />
        <TaskManager
          open={taskManagerOpen}
          onClose={() => setTaskManagerOpen(false)}
          onNavigate={handleNotifNavigate}
        />
        <NotificationBanner onNavigate={handleNotifNavigate} />
        <AchievementToast />

        {/* ── Ad System ── */}
        <AdBanner />
        <AdInterstitial activeApp={activeApp} />
        <AdRewarded />
        <FineReliefAd />

        {/* ── AP Purchase Modal ── */}
        {showAPPurchase && <APPurchaseModal onClose={() => setShowAPPurchase(false)} />}

        {/* HUD Buttons — above ticker */}
        {activeApp === 'globe' && (
          <div className="absolute bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 w-full px-4 md:px-0 md:w-auto z-20 flex flex-col items-center gap-2">
            <button onClick={() => setHudExpanded(!hudExpanded)} className="interactive-focus elevate-soft md:hidden px-6 py-2.5 bg-black/65 border border-white/[0.16] text-tactical-text/75 rounded-full font-mono text-[10px] uppercase micro-label backdrop-blur shadow-lg">
               {hudExpanded ? 'Hide Actions' : 'Show Actions'}
            </button>
            <div className={`flex gap-1.5 overflow-x-auto no-scrollbar justify-start md:justify-center w-full transition-all beta-surface panel-edge rounded-full p-1.5 md:w-auto ${hudExpanded ? 'opacity-100 max-h-24' : 'opacity-0 max-h-0 md:opacity-100 md:max-h-24 overflow-hidden'}`}>
              <button
                onClick={() => setTransferOpen(true)}
                className="interactive-focus elevate-soft whitespace-nowrap px-5 py-3 md:px-3.5 md:py-1.5 rounded-full font-mono text-[10px] md:text-[7px] micro-label hover:brightness-150 transition-all text-tactical-cyan/80 hover:text-tactical-cyan font-medium border border-transparent hover:border-tactical-cyan/25"
              >
                TRANSFER
              </button>
              <button
                onClick={() => setAthenaOpen(true)}
                className="interactive-focus elevate-soft whitespace-nowrap px-5 py-3 md:px-3.5 md:py-1.5 rounded-full font-mono text-[10px] md:text-[7px] micro-label hover:brightness-150 transition-all text-[#7c3aed]/70 hover:text-[#7c3aed] border border-transparent hover:border-[#7c3aed]/25"
              >
                ATHENA
              </button>
              <button
                onClick={() => setPackOpen(true)}
                className="interactive-focus elevate-soft whitespace-nowrap px-5 py-3 md:px-3.5 md:py-1.5 rounded-full font-mono text-[10px] md:text-[7px] micro-label hover:brightness-150 transition-all text-[#ffd700]/65 hover:text-[#ffd700] border border-transparent hover:border-[#ffd700]/30"
              >
                PACKS
              </button>
              <button
                onClick={() => setIntelHubOpen(true)}
                className="interactive-focus elevate-soft whitespace-nowrap px-5 py-3 md:px-3.5 md:py-1.5 rounded-full font-mono text-[10px] md:text-[7px] micro-label hover:brightness-150 transition-all text-[#f59e0b]/70 hover:text-[#f59e0b] border border-transparent hover:border-[#f59e0b]/25"
              >
                INTEL
              </button>
              <button
                onClick={() => setFocusOpen(true)}
                className="interactive-focus elevate-soft whitespace-nowrap px-5 py-3 md:px-3.5 md:py-1.5 rounded-full font-mono text-[10px] md:text-[7px] micro-label hover:brightness-150 transition-all text-[#10b981]/70 hover:text-[#10b981] border border-transparent hover:border-[#10b981]/25"
              >
                FOCUS
              </button>
              <button
                onClick={() => setCardEconomyOpen(true)}
                className="interactive-focus elevate-soft whitespace-nowrap px-5 py-3 md:px-3.5 md:py-1.5 rounded-full font-mono text-[10px] md:text-[7px] micro-label hover:brightness-150 transition-all text-[#a78bfa]/70 hover:text-[#a78bfa] border border-transparent hover:border-[#a78bfa]/25"
              >
                CARDS
              </button>
              <RewardedAdButton variant="compact" />
              <button
                onClick={() => setDesignerOpen(true)}
                className="interactive-focus elevate-soft whitespace-nowrap px-5 py-3 md:px-3.5 md:py-1.5 rounded-full font-mono text-[10px] md:text-[7px] micro-label hover:brightness-150 transition-all text-[#ec4899]/70 hover:text-[#ec4899] border border-transparent hover:border-[#ec4899]/25"
              >
                DESIGN
              </button>
              <button
                onClick={() => setBugSpotterOpen(true)}
                className="interactive-focus elevate-soft whitespace-nowrap px-5 py-3 md:px-3.5 md:py-1.5 rounded-full font-mono text-[10px] md:text-[7px] micro-label hover:brightness-150 transition-all text-[#ef4444]/70 hover:text-[#ef4444] border border-transparent hover:border-[#ef4444]/25"
              >
                BUG
              </button>
            </div>
          </div>
        )}

        {/* Empire Map Controls — Retractable Side Panel (Right): Layers + Sector Filters */}
        {activeApp === 'globe' && (() => {
          const LAYER_COLORS = {
            CORPORATE: { border: '#00e5ff', text: '#00e5ff', bg: 'rgba(0,229,255,0.1)', glow: 'rgba(0,229,255,0.5)', icon: '◉' },
            ROUTES:    { border: '#a78bfa', text: '#a78bfa', bg: 'rgba(167,139,250,0.1)', glow: 'rgba(167,139,250,0.5)', icon: '⇄' },
            THREATS:   { border: '#ef4444', text: '#ef4444', bg: 'rgba(239,68,68,0.1)', glow: 'rgba(239,68,68,0.5)', icon: '⚠' },
            SENTIMENT: { border: '#10b981', text: '#10b981', bg: 'rgba(16,185,129,0.1)', glow: 'rgba(16,185,129,0.5)', icon: '◈' },
            ESG:       { border: '#f59e0b', text: '#f59e0b', bg: 'rgba(245,158,11,0.1)', glow: 'rgba(245,158,11,0.5)', icon: '☘' },
          };
          const SECTOR_EMOJI = {
            finance: '🏦', tech: '💻', manufacturing: '🏭', energy: '⚡', oil_gas: '🛢️',
            defense: '🛡️', pharma: '🔬', healthcare: '🏥', education: '🎓', cultural: '🏛️',
            hospitality: '🏨', venue: '🏪', retail: '🛍️',
          };
          return (
          <div className={`fixed top-1/2 -translate-y-1/2 right-0 z-20 flex items-center transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${filtersExpanded ? 'translate-x-0' : 'translate-x-[calc(100%-20px)]'}`}>
            {/* Toggle Tab */}
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="w-5 h-16 bg-[#0a0e18]/70 border border-r-0 border-white/[0.04] rounded-l flex flex-col items-center justify-center gap-0.5 text-tactical-text/20 hover:text-tactical-cyan/50 backdrop-blur transition-all cursor-pointer shrink-0"
              title={filtersExpanded ? 'Hide Panel' : 'Show Panel'}
            >
              <span className="text-[7px] font-mono">{filtersExpanded ? '▶' : '◀'}</span>
            </button>
            {/* Combined Panel */}
            <div className="bg-[#0a0e18]/80 border border-white/[0.04] rounded-l-lg backdrop-blur shadow-[-2px_0_12px_rgba(0,0,0,0.3)] flex flex-col max-h-[70vh]">
              {/* Sub-tab Switcher */}
              <div className="flex border-b border-white/[0.04] px-1 pt-1.5 pb-0">
                {[
                  { key: 'layers', label: 'Layers', icon: '◎' },
                  { key: 'filter', label: 'Filter', icon: '⊞' },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setLayerSubTab(t.key)}
                    className={`flex-1 px-1.5 py-1 text-[7px] font-mono uppercase tracking-[0.1em] rounded-t transition-all flex items-center justify-center gap-0.5 ${
                      layerSubTab === t.key
                        ? 'text-[#00e5ff]/80 border-b border-[#00e5ff]/40 font-medium'
                        : 'text-tactical-text/20 hover:text-tactical-text/40'
                    }`}
                  >
                    <span className="text-[8px]">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="py-1.5 px-1.5 overflow-y-auto no-scrollbar flex-1">
                {layerSubTab === 'layers' && (
                  <div className="flex flex-col gap-1">
                    {['CORPORATE', 'ROUTES', 'THREATS', 'SENTIMENT', 'ESG'].map(layer => {
                      const lc = LAYER_COLORS[layer];
                      const isActive = empireLayer === layer;
                      return (
                      <button
                        key={layer}
                        onClick={() => {
                          setEmpireLayer(layer);
                          if (layer === 'ROUTES') setShowRoutes(true);
                          else setShowRoutes(false);
                        }}
                        className={`w-full px-2 py-1 rounded font-mono text-[7px] tracking-[0.1em] transition-all flex items-center gap-1.5 ${
                          isActive
                            ? ''
                            : 'text-tactical-text/25 hover:text-tactical-text/50'
                        }`}
                        style={isActive ? {
                          color: lc.text,
                          backgroundColor: `${lc.bg}`,
                        } : {}}
                      >
                        <span className="text-[9px]">{lc.icon}</span>
                        {layer}
                      </button>
                      );
                    })}

                    {/* Overlays — independent toggles (layered on top of the active layer) */}
                    <div className="mt-1.5 pt-1.5 border-t border-white/[0.05] text-[6px] font-mono uppercase tracking-[0.15em] text-tactical-text/25 px-1">
                      Overlays
                    </div>
                    <button
                      onClick={toggleFeed}
                      aria-pressed={feedOpen}
                      className={`w-full px-2 py-1 rounded font-mono text-[7px] tracking-[0.1em] transition-all flex items-center gap-1.5 ${
                        feedOpen
                          ? 'text-emerald-300 bg-emerald-500/10'
                          : 'text-tactical-text/25 hover:text-tactical-text/50'
                      }`}
                    >
                      <span className="text-[9px]">◈</span>
                      INTEL FEED
                    </button>
                    <button
                      onClick={() => setTrafficEnabled(!trafficEnabled)}
                      aria-pressed={trafficEnabled}
                      className={`w-full px-2 py-1 rounded font-mono text-[7px] tracking-[0.1em] transition-all flex items-center gap-1.5 ${
                        trafficEnabled
                          ? 'text-sky-300 bg-sky-500/10'
                          : 'text-tactical-text/25 hover:text-tactical-text/50'
                      }`}
                    >
                      <span className="text-[9px]">⇄</span>
                      TRAFFIC
                    </button>
                    <button
                      onClick={() => setSportsEnabled(!sportsEnabled)}
                      aria-pressed={sportsEnabled}
                      className={`w-full px-2 py-1 rounded font-mono text-[7px] tracking-[0.1em] transition-all flex items-center gap-1.5 ${
                        sportsEnabled
                          ? 'text-amber-300 bg-amber-500/10'
                          : 'text-tactical-text/25 hover:text-tactical-text/50'
                      }`}
                    >
                      <span className="text-[9px]">⚑</span>
                      SPORTS
                    </button>
                  </div>
                )}

                {layerSubTab === 'filter' && (
                  <div className="flex flex-col gap-0.5">
                    {['all', ...Object.keys(SECTOR_EMOJI)].map(sector => (
                      <button
                        key={sector}
                        onClick={() => setSectorFilter(sector)}
                        className={`w-full whitespace-nowrap px-2 py-1 rounded text-[7px] font-mono tracking-[0.1em] uppercase transition-all text-left ${
                          sectorFilter === sector
                          ? 'text-white bg-white/[0.06]'
                          : 'text-tactical-text/25 hover:text-tactical-text/50'
                        }`}
                      >
                        {sector === 'all' ? '🌍 All' : `${SECTOR_EMOJI[sector]} ${sector}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          );
        })()}

        {/* Top Navigation Bar (Retractable) */}
        <div className={`absolute ${isAdFree ? 'top-0' : 'top-[28px]'} md:top-0 left-0 right-0 z-30 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${topNavOpen ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="bg-[#060a12]/90 border-b border-tactical-border/10 flex flex-col px-3 md:px-4 backdrop-blur-xl pt-1 md:pt-0 pb-1 md:pb-0 relative">
            <div className="flex items-center justify-between h-9 md:h-8 w-full">
            {/* LEFT — Logo + Player Stats */}
            <div className="flex items-center gap-3">
              <span className="text-tactical-cyan font-mono font-bold text-xs md:text-[11px] tracking-[0.25em] text-glow-cyan">AEGIS</span>
              <span className="text-tactical-border/30 font-mono text-[10px] hidden md:inline">/</span>
              <div className="hidden md:flex items-center gap-2 text-[7px] font-mono">
                <span className="text-[#10b981]/60">{companyBalance >= 1e6 ? `€${(companyBalance/1e6).toFixed(1)}M` : companyBalance >= 1e3 ? `€${(companyBalance/1e3).toFixed(0)}K` : `€${companyBalance}`}</span>
                <span className="text-white/[0.08]">|</span>
                <span className="text-[#ec4899]/50">{aegisPoints.toLocaleString()} AP</span>
                <button
                  onClick={() => setShowAPPurchase(true)}
                  className="text-[#ec4899]/40 hover:text-[#ec4899] transition-colors text-[8px] font-bold ml-0.5"
                  title="Buy AP"
                >+</button>
                <RewardedAdButton variant="compact" className="ml-0.5" />
                <span className="text-white/[0.08]">|</span>
                <span className="text-[#7c3aed]/50">{ceoExperience} XP</span>
                <span className="text-white/[0.08]">|</span>
                <span className="text-[#00e5ff]/50">ECFL F{flouLevel}</span>
                <span className="text-white/[0.08]">|</span>
                <GameDate />
                <button
                  onClick={() => setTaskManagerOpen(true)}
                  className="text-amber-400/40 hover:text-amber-400/80 transition-colors text-[8px]"
                  title="Task Manager"
                >
                  ⚙
                </button>
              </div>
            </div>

            {/* CENTER — Desktop tab nav */}
            <div className="hidden md:flex items-center gap-0">
              {[
                { key: 'overview', icon: '⊞', tKey: 'nav.overview' },
                { key: 'globe', icon: '◉', tKey: 'nav.globe' },
                { key: 'office', icon: '◈', tKey: 'nav.agency' },
                { key: 'exchange', icon: '⇄', tKey: 'nav.exchange' },
                { key: 'battlepass', icon: '★', tKey: 'nav.pass' },
              ].map(({ key, icon, tKey }) => {
                const label = t(tKey);
                return (
                <button
                  key={key}
                  onClick={() => setActiveApp(activeApp === key && key !== 'globe' ? 'globe' : key)}
                  className={`px-2.5 py-1 text-[7px] font-mono tracking-[0.15em] uppercase transition-all duration-200 flex items-center gap-1 ${
                    activeApp === key
                      ? 'text-tactical-cyan font-semibold'
                      : 'text-tactical-text/30 hover:text-tactical-text/55'
                  }`}
                >
                  <span className={`text-[8px] ${activeApp === key ? 'text-glow-cyan' : ''}`}>{icon}</span>
                  {label}
                </button>
              );})}
              <span className="text-white/[0.06] mx-0.5">|</span>
              <button
                onClick={() => setDailyMissionsOpen(true)}
                className="px-2.5 py-1 text-[7px] font-mono tracking-[0.15em] uppercase transition-all duration-200 flex items-center gap-1 text-[#10b981]/40 hover:text-[#10b981]/70"
                title="Daily Missions"
              >
                <span className="text-[8px]">◎</span>
                Daily
              </button>
              <button
                onClick={() => setAchievementsOpen(true)}
                className="px-2.5 py-1 text-[7px] font-mono tracking-[0.15em] uppercase transition-all duration-200 flex items-center gap-1 text-[#ec4899]/40 hover:text-[#ec4899]/70"
                title="Achievements"
              >
                <span className="text-[8px]">♦</span>
                Trophies
              </button>
              <span className="text-white/[0.06] mx-0.5">|</span>
              <button
                onClick={() => setActiveApp(activeApp === 'marketwire' ? 'globe' : 'marketwire')}
                className={`px-2.5 py-1 text-[7px] font-mono tracking-[0.15em] uppercase transition-all duration-200 flex items-center gap-1 ${
                  activeApp === 'marketwire'
                    ? 'text-[#f59e0b] font-semibold'
                    : 'text-[#f59e0b]/40 hover:text-[#f59e0b]/70'
                }`}
              >
                <span className={`text-[8px] ${activeApp === 'marketwire' ? 'text-glow-amber' : ''}`}>◆</span>
                Wire
              </button>
              <span className="text-white/[0.06] mx-0.5">|</span>
              <button
                onClick={() => { restoreCampaignSnapshot(); setGameMode(null); setActiveApp('globe'); }}
                className="px-2.5 py-1 text-[7px] font-mono tracking-[0.15em] uppercase text-[#a78bfa]/60 hover:text-[#a78bfa] transition-all duration-200 flex items-center gap-1 border border-[#a78bfa]/20 rounded hover:border-[#a78bfa]/40 hover:bg-[#a78bfa]/10"
              >
                <span className="text-[8px]">⬡</span>
                HUB
              </button>
            </div>

            {/* SEARCH — Inline search bar (desktop only) */}
            <div ref={searchRef} className="hidden md:flex relative">
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-all duration-200 ${
                searchFocused
                  ? 'border-[#00e5ff]/30 bg-[#0a0e18]/60'
                  : 'border-tactical-border/10 bg-transparent'
              }`}>
                <span className="text-tactical-text/20 text-[8px]">{'\u2315'}</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearchFocused(false);
                      setSearchQuery('');
                      e.target.blur();
                    }
                  }}
                  placeholder="Search..."
                  className="bg-transparent outline-none font-mono text-[8px] text-tactical-text/70 placeholder:text-tactical-text/20 w-[120px]"
                />
              </div>

              {/* Search Dropdown */}
              {searchFocused && searchQuery.trim() && (
                <div className="absolute top-full mt-1.5 right-0 w-[320px] bg-[#0a0e18]/95 backdrop-blur-xl border border-tactical-border/30 rounded-lg shadow-2xl overflow-hidden z-50">
                  {searchResults.length === 0 ? (
                    <div className="px-3 py-4 text-center font-mono text-[10px] text-tactical-text/30">
                      No results for "{searchQuery}"
                    </div>
                  ) : (
                    <>
                      {/* Group results by category */}
                      {['Tabs', 'Globe', 'Actions', 'Layers'].filter(cat =>
                        searchResults.some(r => r.category === cat)
                      ).map(cat => (
                        <div key={cat}>
                          <div className="px-3 pt-2 pb-1 text-tactical-text/30 text-[8px] tracking-[0.2em] uppercase font-mono">
                            {cat}
                          </div>
                          {searchResults.filter(r => r.category === cat).map((result, i) => (
                            <button
                              key={`${cat}-${i}`}
                              onClick={() => {
                                result.action();
                                setSearchQuery('');
                                setSearchFocused(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[#00e5ff]/[0.06] hover:border-l-2 hover:border-l-[#00e5ff]/40 border-l-2 border-l-transparent transition-all duration-150 cursor-pointer"
                            >
                              <span className="text-sm shrink-0 w-5 text-center">{result.icon}</span>
                              <div className="min-w-0">
                                <div className="font-mono text-[10px] text-tactical-text/80 truncate">{result.label}</div>
                                <div className="font-mono text-[8px] text-tactical-text/30 truncate">{result.desc}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT — DEV, COMMAND, and SIGN OUT buttons */}
            <div className="flex items-center gap-0.5">
              <CountrySelectorCompact />
              {/* Role chip — status indicator only. Visible for admins and
                  beta testers so they can see which tier they're on. */}
              {canUseDevTools && (
                <span
                  className={`px-1.5 py-0.5 font-mono text-[7px] tracking-[0.2em] uppercase rounded-sm border select-none ${
                    isAdmin
                      ? 'text-[#f59e0b]/80 border-[#f59e0b]/40 bg-[#f59e0b]/5'
                      : 'text-[#00e5ff]/70 border-[#00e5ff]/30 bg-[#00e5ff]/5'
                  }`}
                  title={isAdmin ? 'Admin — full privileges' : 'Beta tester — dev tools unlocked'}
                >
                  {isAdmin ? 'ADMIN' : 'BETA'}
                </span>
              )}
              {/* REG — regulatory review dashboard, admin-only. */}
              {isAdmin && (
                <button
                  onClick={() => setRegulatoryOpen(prev => !prev)}
                  className="px-1.5 py-0.5 font-mono text-[7px] text-tactical-text/25 cursor-pointer flex items-center gap-1 hover:text-[#8b6914]/80 transition-all"
                  title="Regulatory review dashboard (F3)"
                >
                  REG
                </button>
              )}
              {/* DEV — DevPanel, admin + beta tester only. */}
              {canUseDevTools && (
                <button
                  onClick={() => setDevOpen(prev => !prev)}
                  className="px-1.5 py-0.5 font-mono text-[7px] text-tactical-text/25 cursor-pointer flex items-center gap-1 hover:text-[#f59e0b]/60 transition-all"
                  title="Developer panel (F2)"
                >
                  DEV
                </button>
              )}
              <button
                onClick={() => setTerminalOpen(true)}
                className="px-1.5 py-0.5 font-mono text-[7px] text-tactical-text/25 cursor-pointer flex items-center gap-1 hover:text-[#00e5ff]/60 transition-all"
              >
                CMD
              </button>
              <button
                onClick={async () => {
                  // Restore campaign state before saving so we don't persist sandbox data
                  restoreCampaignSnapshot();
                  if (user) await saveGameStateNow(user.id, useEmpireStore.getState());
                  useAuthStore.getState().signOut();
                }}
                className="px-1.5 py-0.5 font-mono text-[7px] text-tactical-text/25 cursor-pointer flex items-center gap-1 hover:text-rose-400/60 transition-all"
              >
                EXIT
              </button>
            </div>
          </div>
        </div>

        {/* Toggle Handle */}
          <button
            onClick={() => setTopNavOpen(!topNavOpen)}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#060a12]/80 border border-t-0 border-tactical-border/10 px-3 py-px rounded-b text-tactical-text/15 hover:text-tactical-cyan/50 backdrop-blur-md transition-all text-[6px] tracking-[0.15em] uppercase cursor-pointer"
          >
            {topNavOpen ? '▲' : '▼'}
          </button>
        </div>

        {/* Mobile Navigation Bar (Fixed Bottom — Retractable) */}
        {/* Toggle handle is outside the sliding container so it stays visible */}
        <button
          onClick={() => setBottomNavOpen(o => !o)}
          className={`md:hidden fixed left-1/2 -translate-x-1/2 z-50 bg-[#030508]/95 border border-b-0 border-tactical-border/20 px-5 py-0.5 rounded-t-lg shadow-[0_-4px_20px_rgba(0,0,0,0.6)] text-tactical-text/30 hover:text-tactical-cyan hover:border-tactical-cyan/30 backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] text-[7px] tracking-[0.2em] uppercase cursor-pointer`}
          style={{ bottom: bottomNavOpen ? 'calc(env(safe-area-inset-bottom, 0px) + 74px)' : '20px' }}
        >
          {bottomNavOpen ? '▼ RETRACT' : '▲ DEPLOY'}
        </button>
        <div
          className={`md:hidden fixed left-0 right-0 z-50 bg-[#030508]/95 backdrop-blur-xl border-t border-tactical-border/15 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1.5 flex items-center justify-around w-full shadow-[0_-8px_30px_rgba(0,0,0,0.7)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${bottomNavOpen ? 'bottom-0' : '-bottom-16'}`}
          style={{
            paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
            paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
          }}
        >
          {[
            { key: 'overview', icon: '⊞', tKey: 'nav.overview' },
            { key: 'globe', icon: '◉', tKey: 'nav.globe' },
            { key: 'office', icon: '◈', tKey: 'nav.agency' },
            { key: 'exchange', icon: '⇄', tKey: 'nav.trade' },
            { key: 'marketwire', icon: '◆', tKey: 'nav.wire' },
            { key: 'battlepass', icon: '★', tKey: 'nav.pass' },
            { key: 'hub', icon: '⬡', tKey: 'nav.hub' },
          ].map(({ key, icon, tKey }) => {
            const label = t(tKey);
            return (
            <button
              key={key}
              onClick={() => { if (key === 'hub') { restoreCampaignSnapshot(); setGameMode(null); } else { setActiveApp(key); } }}
              className={`flex flex-col items-center justify-center w-[12%] py-1.5 rounded-lg transition-all duration-200 ${
                activeApp === key
                  ? 'text-tactical-cyan bg-tactical-cyan/8'
                  : 'text-tactical-text/35 hover:text-tactical-text/55'
              }`}
            >
              <span className={`text-xs mb-0.5 ${activeApp === key ? 'text-glow-cyan' : ''}`}>{icon}</span>
              <span className={`font-mono text-[6px] tracking-[0.1em] uppercase ${activeApp === key ? 'text-white font-semibold' : ''}`}>
                {label}
              </span>
            </button>
          );})}
        </div>
        </Suspense>
      </Shell>
    </div>
    </ErrorBoundary>
    <CookieConsent />
    </>
  );
}

export default App;
