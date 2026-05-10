import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { STOCKS, CRYPTO, FOREX, COMMODITIES, BONDS, ALL_INSTRUMENTS } from '../../data/instruments';
import { useEmpireStore } from '../../store/empireStore';
import { loadMarketPrices, subscribeToMarket, executeTrade } from '../../lib/marketSync';
import RSIPanel from '../exchange/RSIPanel';
import MACDPanel from '../exchange/MACDPanel';
import IndicatorToggle from '../exchange/IndicatorToggle';
import { bollingerBands } from '../../lib/indicators';

import AthenaExchangePanel from '../exchange/AthenaExchangePanel';

const ExchangeOS = ({ isLabMode = false, onExitLab = () => {} }) => {
  const [activeTab, setActiveTab] = useState('stocks');
  const [showAthena, setShowAthena] = useState(false);
  const [chartMode, setChartMode] = useState('candle');
  const [selectedInst, setSelectedInst] = useState(STOCKS[0]);
  const [sharedPrices, setSharedPrices] = useState({});
  const [labMarketSim, setLabMarketSim] = useState(null);
  const [tradeQty, setTradeQty] = useState('');
  const [showIndicators, setShowIndicators] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [showBB, setShowBB] = useState(false);
  const [showDrawings, setShowDrawings] = useState(false);
  const [challengeOpen, setChallengeOpen] = useState(true);
  const [chartZoom, setChartZoom] = useState(1);
  const [chartPanX, setChartPanX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [crosshair, setCrosshair] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const chartRef = useRef(null);

  // Store connections (real account)
  const realCompanyBalance = useEmpireStore(s => s.companyBalance);
  const realPortfolio = useEmpireStore(s => s.portfolio);
  const realBuyInstrument = useEmpireStore(s => s.buyInstrument);
  const realSellInstrument = useEmpireStore(s => s.sellInstrument);
  const ticker = useEmpireStore(s => s.ticker);

  // Lab mode: use local simulated balance and portfolio instead of real store
  const [simBalance, setSimBalance] = useState(10_000);
  const [simPortfolio, setSimPortfolio] = useState({});

  const companyBalance = isLabMode ? simBalance : realCompanyBalance;
  const portfolio = isLabMode ? simPortfolio : realPortfolio;

  const buyInstrument = isLabMode
    ? (id, symbol, name, instrumentType, price, quantity) => {
        const cost = price * quantity;
        if (simBalance < cost || quantity <= 0) return;
        setSimBalance(prev => prev - cost);
        setSimPortfolio(prev => {
          const existing = prev[id];
          const totalQty = (existing?.quantity ?? 0) + quantity;
          const newAvgCost = existing
            ? (existing.avgCost * existing.quantity + cost) / totalQty
            : price;
          return { ...prev, [id]: { symbol, name, instrumentType, quantity: totalQty, avgCost: newAvgCost } };
        });
      }
    : realBuyInstrument;

  const sellInstrument = isLabMode
    ? (id, price, quantity) => {
        const pos = simPortfolio[id];
        if (!pos || pos.quantity < quantity || quantity <= 0) return;
        const revenue = price * quantity;
        setSimBalance(prev => prev + revenue);
        setSimPortfolio(prev => {
          const remaining = pos.quantity - quantity;
          if (remaining <= 0) {
            const { [id]: _, ...rest } = prev;
            return rest;
          }
          return { ...prev, [id]: { ...pos, quantity: remaining } };
        });
      }
    : realSellInstrument;

  // Gamification state
  const [traderXP, setTraderXP] = useState(1240);
  const [hotStreak, setHotStreak] = useState(3);
  const [dailyTrades, setDailyTrades] = useState(0);
  const [xpPopup, setXpPopup] = useState(null);
  const [winStreak, setWinStreak] = useState(5);

  // Trader rank helper
  const getTraderRank = (balance) => {
    if (balance >= 200000) return { title: 'Wall Street Wolf', icon: '\uD83D\uDC3A', glow: '#f59e0b', tier: 4 };
    if (balance >= 50000) return { title: 'Market Shark', icon: '\uD83E\uDD88', glow: '#7c3aed', tier: 3 };
    if (balance >= 10000) return { title: 'Day Trader', icon: '\uD83D\uDCC8', glow: '#10b981', tier: 2 };
    return { title: 'Street Vendor', icon: '\uD83C\uDFEA', glow: '#9CA3AF', tier: 1 };
  };

  const showXpGain = useCallback((amount) => {
    setXpPopup({ amount, id: Date.now() });
    setTraderXP(prev => prev + amount);
    setTimeout(() => setXpPopup(null), 1800);
  }, []);

  // Default trade quantities by asset type
  const getDefaultQty = (tab) => {
    const defaults = { stocks: 10, crypto: 1, forex: 100, commodities: 10, bonds: 5 };
    return defaults[tab] || 1;
  };

  const parsedQty = parseInt(tradeQty) || getDefaultQty(activeTab);

  // ── Shared market prices from Supabase (real mode) ──
  useEffect(() => {
    if (isLabMode) return;

    loadMarketPrices().then(prices => {
      setSharedPrices(prices);
    });

    const unsub = subscribeToMarket((prices) => {
      setSharedPrices(prices);
    });

    return () => unsub();
  }, [isLabMode]);

  // ── Local simulation for Lab mode only ──
  useEffect(() => {
    if (!isLabMode) return;

    const initialSim = {};
    ALL_INSTRUMENTS.forEach(inst => {
      const hist = [];
      let cur = inst.price * 0.98;
      for (let i = 0; i < 20; i++) {
        cur *= (1 + (Math.random() * 0.01 - 0.005));
        hist.push(cur);
      }
      hist[19] = inst.price;
      initialSim[inst.id] = { price: inst.price, change24h: inst.change24h || 0, history: hist };
    });
    setLabMarketSim(initialSim);

    const timer = setInterval(() => {
      setLabMarketSim(prev => {
        if (!prev) return prev;
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          const volatility = 0.003;
          const movement = 1 + (Math.random() * volatility * 2 - volatility);
          const newPrice = next[id].price * movement;
          const newHistory = [...next[id].history];
          newHistory.shift();
          newHistory.push(newPrice);
          next[id] = {
            price: newPrice,
            change24h: next[id].change24h + (movement > 1 ? 0.04 : -0.04),
            history: newHistory
          };
        });
        return next;
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [isLabMode]);

  // ── Build unified marketSim object for backward compatibility ──
  const marketSim = useMemo(() => {
    if (isLabMode) return labMarketSim;

    const sim = {};
    Object.values(sharedPrices).forEach((mp) => {
      sim[mp.instrument_id] = {
        price: mp.current_price,
        change24h: mp.change_24h,
        history: mp.history.length > 0 ? mp.history : [mp.current_price],
      };
    });
    // Fall back to static prices for any missing instruments
    ALL_INSTRUMENTS.forEach(inst => {
      if (!sim[inst.id]) {
        sim[inst.id] = { price: inst.price, change24h: inst.change24h || 0, history: [inst.price] };
      }
    });
    return sim;
  }, [isLabMode, labMarketSim, sharedPrices]);

  const handleTrade = useCallback((type) => {
    if (!selectedInst || !marketSim) return;
    const currentPrice = marketSim[selectedInst.id]?.price ?? selectedInst.price;
    const qty = parsedQty;

    if (type === 'buy') {
      const cost = currentPrice * qty;
      if (companyBalance < cost) return; // insufficient funds
      buyInstrument(selectedInst.id, selectedInst.symbol, selectedInst.name, activeTab, currentPrice, qty);
      if (!isLabMode) executeTrade(selectedInst.id, 'buy', qty, currentPrice);
      showXpGain(15);
      setDailyTrades(prev => Math.min(prev + 1, 3));
      setHotStreak(prev => prev + 1);
    } else {
      const pos = portfolio[selectedInst.id];
      if (!pos || pos.quantity < qty) return; // nothing to sell
      sellInstrument(selectedInst.id, currentPrice, qty);
      if (!isLabMode) executeTrade(selectedInst.id, 'sell', qty, currentPrice);
      showXpGain(10);
      setDailyTrades(prev => Math.min(prev + 1, 3));
    }
    setTradeQty('');
  }, [selectedInst, marketSim, parsedQty, companyBalance, activeTab, buyInstrument, sellInstrument, portfolio, showXpGain, isLabMode]);

  const rank = getTraderRank(companyBalance);

  useEffect(() => {
    if (activeTab === 'stocks') setSelectedInst(STOCKS[0]);
    if (activeTab === 'crypto') setSelectedInst(CRYPTO[0]);
    if (activeTab === 'forex') setSelectedInst(FOREX[0]);
    if (activeTab === 'commodities') setSelectedInst(COMMODITIES[0]);
    if (activeTab === 'bonds') setSelectedInst(BONDS[0]);
  }, [activeTab]);

  const activeList = activeTab === 'stocks' ? STOCKS :
                     activeTab === 'crypto' ? CRYPTO :
                     activeTab === 'forex' ? FOREX :
                     activeTab === 'commodities' ? COMMODITIES : BONDS;

  // Sort and filter the active list
  const displayList = useMemo(() => {
    let list = [...activeList];
    // Price filter
    const min = parseFloat(priceMin);
    const max = parseFloat(priceMax);
    if (!isNaN(min) || !isNaN(max)) {
      list = list.filter(inst => {
        const p = marketSim?.[inst.id]?.price ?? inst.price;
        if (!isNaN(min) && p < min) return false;
        if (!isNaN(max) && p > max) return false;
        return true;
      });
    }
    // Sort
    list.sort((a, b) => {
      const pA = marketSim?.[a.id]?.price ?? a.price;
      const pB = marketSim?.[b.id]?.price ?? b.price;
      const cA = marketSim?.[a.id]?.change24h ?? a.change24h ?? 0;
      const cB = marketSim?.[b.id]?.change24h ?? b.change24h ?? 0;
      switch (sortBy) {
        case 'price-asc': return pA - pB;
        case 'price-desc': return pB - pA;
        case 'change': return cB - cA;
        default: return a.name.localeCompare(b.name);
      }
    });
    return list;
  }, [activeList, sortBy, priceMin, priceMax, marketSim]);

  // Build a set of symbols for the active tab to filter ticker events
  const activeSymbols = useMemo(() => {
    const syms = new Set();
    activeList.forEach(inst => {
      syms.add(inst.symbol?.toUpperCase());
      if (inst.name) syms.add(inst.name.toUpperCase());
    });
    return syms;
  }, [activeList]);

  // Filter ticker events relevant to the active tab
  const filteredTicker = useMemo(() => {
    return ticker.filter(t => {
      if (t.type !== 'fx') return false;
      const upper = t.text.toUpperCase();
      for (const sym of activeSymbols) {
        if (sym && upper.includes(sym)) return true;
      }
      return false;
    });
  }, [ticker, activeSymbols]);

  const getTheme = (tab) => {
    const t = {
      stocks: { color: '#10b981', bgClass: 'bg-[#10b981]', textClass: 'text-[#10b981]', bgOpacity: 'bg-[#10b981]/10', borderClass: 'border-[#10b981]/50', chartStroke: '#00e5ff', qty: '100 Shares', title: 'Top Equities by Market Capitalization' },
      crypto: { color: '#f59e0b', bgClass: 'bg-[#f59e0b]', textClass: 'text-[#f59e0b]', bgOpacity: 'bg-[#f59e0b]/10', borderClass: 'border-[#f59e0b]/50', chartStroke: '#f59e0b', qty: '0.5 Coins', title: 'Top Crypto Assets by Volume' },
      forex: { color: '#7c3aed', bgClass: 'bg-[#7c3aed]', textClass: 'text-[#7c3aed]', bgOpacity: 'bg-[#7c3aed]/10', borderClass: 'border-[#7c3aed]/50', chartStroke: '#7c3aed', qty: '10 Lots', title: 'Top Currency Pairs by Volume' },
      commodities: { color: '#ec4899', bgClass: 'bg-[#ec4899]', textClass: 'text-[#ec4899]', bgOpacity: 'bg-[#ec4899]/10', borderClass: 'border-[#ec4899]/50', chartStroke: '#ec4899', qty: '50 Oz', title: 'Top Commodities by Volume' },
      bonds: { color: '#00e5ff', bgClass: 'bg-tactical-cyan', textClass: 'text-tactical-cyan', bgOpacity: 'bg-tactical-cyan/10', borderClass: 'border-tactical-cyan/50', chartStroke: '#00e5ff', qty: '10 Bonds', title: 'Global Sovereign & Corporate Bonds' }
    };
    return t[tab] || t.stocks;
  };
  
  const currentData = getTheme(activeTab);
  const simData = marketSim?.[selectedInst?.id] || { price: selectedInst?.price || 0, change24h: selectedInst?.change24h || 0, history: Array(20).fill(selectedInst?.price || 0) };
  
  const changeIsPositive = simData.change24h >= 0;
  const textChangeClass = changeIsPositive ? 'text-[#10b981]' : 'text-[#ef4444]';
  const bgChangeClass = changeIsPositive ? 'bg-[#10b981]/10' : 'bg-[#ef4444]/10';
  const changeColor = changeIsPositive ? '#10b981' : '#ef4444';
  const changeStr = (changeIsPositive ? '+' : '') + simData.change24h.toFixed(2) + '%';
  const displayPrice = activeTab === 'forex' ? simData.price.toFixed(4) : `€${simData.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  const assetName = selectedInst?.symbol ?? '';
  const pairName = activeTab === 'forex' ? (selectedInst?.symbol ?? '') : `${selectedInst?.symbol ?? ''} / EUR`;


  return (
    <div className={`fixed inset-0 z-20 backdrop-blur-xl bg-[#060a12]/95 flex flex-col items-center ${isLabMode ? 'pt-6 md:pt-10' : 'pt-24 md:pt-28'}`}>
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.08) 2px, rgba(255,255,255,0.08) 4px)',
      }} />
      {isLabMode && (
        <div className="w-full max-w-7xl px-4 lg:px-8 mb-4 shrink-0">
          <div className="bg-[#111827] border border-[#f59e0b]/50 rounded-xl p-3 flex flex-col sm:flex-row justify-between items-center sm:gap-2 gap-4 shadow-[0_0_20px_rgba(245,158,11,0.15)] flex-wrap">
             <div className="flex items-center gap-3">
                <span className="text-[#f59e0b] font-mono text-[9px] md:text-[10px] uppercase tracking-widest px-2 py-0.5 border border-[#f59e0b] rounded flex items-center gap-1"><span className="w-1.5 h-1.5 bg-[#f59e0b] rounded-full animate-pulse"></span> LAB SIMULATION</span>
                <span className="text-white font-mono text-xs md:text-sm font-bold">12:30:00 EST | Dec 26, 2024</span>
             </div>
             <div className="flex items-center gap-3 sm:mt-0 w-full sm:w-auto justify-between sm:justify-start">
                <div className="flex bg-[#060a12] border border-tactical-border/50 rounded overflow-hidden shadow-lg w-full sm:w-auto justify-center">
                   <button className="flex-1 sm:flex-none px-4 py-2.5 md:py-1.5 md:px-3 border-r border-tactical-border/30 hover:bg-[#1f2937] text-white">⏪</button>
                   <button className="flex-1 sm:flex-none px-4 py-2.5 md:py-1.5 md:px-3 border-r border-tactical-border/30 hover:bg-[#1f2937] text-white">⏸</button>
                   <button className="flex-1 sm:flex-none px-4 py-2.5 md:py-1.5 md:px-3 bg-[#f59e0b]/10 text-[#f59e0b] shadow-inner text-xs font-bold">▶ 1x</button>
                   <button className="flex-1 sm:flex-none px-4 py-2.5 md:py-1.5 md:px-3 border-l text-tactical-text/50 font-mono text-[10px] sm:text-xs border-tactical-border/30 hover:bg-[#1f2937] hover:text-white transition-colors">2x</button>
                   <button className="flex-1 sm:flex-none px-4 py-2.5 md:py-1.5 md:px-3 border-l text-tactical-text/50 font-mono text-[10px] sm:text-xs border-tactical-border/30 hover:bg-[#1f2937] hover:text-white transition-colors">5x</button>
                </div>
                <button onClick={onExitLab} className="ml-2 sm:ml-4 px-5 py-3 md:px-3 md:py-1.5 border border-[#ef4444]/50 bg-[#ef4444]/10 text-[#ef4444] rounded text-[10px] font-mono hover:bg-[#ef4444]/20 transition-colors uppercase tracking-widest font-bold whitespace-nowrap shadow-md">End Sim</button>
             </div>
          </div>
        </div>
      )}

      {/* Sub-Navigation Selector */}
      <div className="relative flex gap-1 p-1 bg-[#0a0f1a] rounded-lg border border-white/[0.06] max-w-full overflow-x-auto no-scrollbar md:mb-8 mb-4 shrink-0 w-[92%] md:w-auto">
        {[
          { id: 'portfolio', label: 'Holdings', icon: '\u25CE', accent: '#00e5ff' },
          { id: 'stocks', label: 'Equities', icon: '\u25C8', accent: '#10b981' },
          { id: 'crypto', label: 'Crypto', icon: '\u2B21', accent: '#f59e0b' },
          { id: 'forex', label: 'Forex', icon: '\u21C4', accent: '#7c3aed' },
          { id: 'commodities', label: 'Cmdty', icon: '\u25C6', accent: '#ec4899' },
          { id: 'bonds', label: 'Bonds', icon: '\u25A3', accent: '#00e5ff' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-3 sm:px-5 py-2 sm:py-2.5 rounded-md flex items-center gap-2 transition-all duration-300 font-mono text-xs whitespace-nowrap
              ${activeTab === tab.id
                ? 'bg-white/[0.06] text-white'
                : 'text-white/30 hover:text-white/60 hover:bg-white/[0.03]'
              }`}
            style={activeTab === tab.id ? { boxShadow: `inset 0 -2px 0 ${tab.accent}, 0 0 20px ${tab.accent}26` } : {}}
          >
            <span className={`text-sm transition-all duration-300 ${activeTab === tab.id ? 'drop-shadow-[0_0_6px_currentColor]' : 'opacity-40'}`}
              style={activeTab === tab.id ? { color: tab.accent } : {}}>
              {tab.icon}
            </span>
            <span className="font-bold text-[10px] sm:text-[11px] tracking-wide uppercase">{tab.label}</span>
            {activeTab === tab.id && (
              <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: tab.accent, boxShadow: `0 0 6px ${tab.accent}` }} />
            )}
          </button>
        ))}
      </div>

      {/* Daily Challenge Banner — retractable */}
      <div className="w-full max-w-7xl px-4 md:px-8 mb-2 shrink-0">
        <div className="relative bg-gradient-to-r from-[#f59e0b]/10 via-[#111827] to-[#10b981]/10 border border-[#f59e0b]/30 rounded-xl overflow-hidden">
          <button
            onClick={() => setChallengeOpen(prev => !prev)}
            className="w-full flex items-center justify-between px-3 py-2 z-10 relative"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{'\uD83C\uDFAF'}</span>
              <span className="text-white font-mono text-[10px] font-bold tracking-wide">DAILY CHALLENGE</span>
              {!challengeOpen && <span className="text-[#f59e0b] font-mono text-[9px] ml-1">{dailyTrades}/3</span>}
            </div>
            <span className="text-tactical-text/40 font-mono text-[8px] tracking-widest">{challengeOpen ? '\u25B2 HIDE' : '\u25BC SHOW'}</span>
          </button>
          {challengeOpen && (
            <div className="px-3 pb-2.5 flex items-center justify-between gap-3 z-10 relative">
              <span className="text-[#f59e0b] font-mono text-[9px]">Make 3 profitable trades today</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-[#060a12] rounded-full overflow-hidden border border-tactical-border/30">
                  <div className="h-full rounded-full transition-all duration-700 ease-out" style={{
                    width: `${(dailyTrades / 3) * 100}%`,
                    background: dailyTrades >= 3 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                    boxShadow: dailyTrades >= 3 ? '0 0 10px #10b981' : '0 0 8px #f59e0b'
                  }} />
                </div>
                <span className="text-white font-mono text-[9px] font-bold">{dailyTrades}/3</span>
                <span className={`font-mono text-[8px] font-bold px-1.5 py-0.5 rounded border ${dailyTrades >= 3 ? 'text-[#10b981] border-[#10b981]/50 bg-[#10b981]/10' : 'text-[#f59e0b] border-[#f59e0b]/30 bg-[#f59e0b]/10'}`}>
                  {dailyTrades >= 3 ? 'CLAIMED!' : '+100 XP'}
                </span>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#f59e0b]/5 to-[#10b981]/5 animate-pulse opacity-50 pointer-events-none" />
        </div>
      </div>

      {/* XP Popup Overlay */}
      {xpPopup && (
        <div key={xpPopup.id} className="fixed top-1/3 left-1/2 -translate-x-1/2 z-[100] pointer-events-none animate-bounce">
          <div className="bg-[#10b981]/20 border border-[#10b981]/60 rounded-xl px-6 py-3 backdrop-blur-xl shadow-[0_0_30px_rgba(16,185,129,0.4)]">
            <span className="text-[#10b981] font-mono text-2xl font-black tracking-widest drop-shadow-[0_0_10px_#10b981]">+{xpPopup.amount} XP</span>
          </div>
        </div>
      )}

      {/* Content Container */}
      <div className="w-full max-w-7xl flex-1 fade-in flex flex-col lg:flex-row gap-4 md:gap-6 px-4 md:px-8 pb-8 overflow-y-auto">
        
        {/* Left Hand Container (Dynamic Terminal) */}
        <div className="flex-1 h-auto lg:h-full lg:overflow-y-auto no-scrollbar pr-0 lg:pr-2">
          {['stocks', 'crypto', 'forex', 'commodities', 'bonds'].includes(activeTab) && (
            <div className="animate-fade-in flex flex-col w-full pb-8">
              {/* Mobile Overview (Fundly Aesthetic Only on Mobile) */}
              <div className="lg:hidden flex flex-col mb-8 px-2">
                 {/* Glass Credit Card */}
                 <div className="relative w-full rounded-[24px] overflow-hidden p-6 shadow-2xl border border-white/20 bg-[#161a29] backdrop-blur-3xl overflow-hidden mb-6">
                    {/* Liquid Gradients */}
                    <div className="absolute top-[-50px] left-[-30px] w-48 h-48 bg-[#f59e0b]/30 rounded-full blur-3xl mix-blend-screen"></div>
                    <div className="absolute bottom-[-30px] right-[-20px] w-40 h-40 bg-tactical-cyan/30 rounded-full blur-3xl mix-blend-screen"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[#ffffff]/5 blur-sm z-0"></div>

                    <div className="relative z-10 mt-4 md:mt-8">
                       <div className="text-tactical-text/80 font-mono text-xs md:text-sm mb-1 tracking-wider">Company Balance</div>
                       <div className="text-white font-mono text-3xl md:text-4xl font-bold tracking-tight mb-2">€{companyBalance.toLocaleString()}</div>
                       <div className="text-[#10b981] font-mono text-[10px] tracking-widest uppercase opacity-80">{Object.keys(portfolio).length} active positions</div>
                    </div>
                 </div>


                 {/* Live Market Feed from Ticker */}
                 <div className="px-2">
                    <div className="flex justify-between items-center mb-6">
                       <span className="text-white font-mono text-base font-bold tracking-wide">Live Market Feed</span>
                       <span className="text-tactical-text/50 font-mono text-[11px] uppercase tracking-widest">{filteredTicker.length} events</span>
                    </div>

                    <div className="flex flex-col gap-4 mb-5">
                       {filteredTicker.slice(0, 5).map(t => {
                         const isBuy = t.text.includes('BUY');
                         return (
                           <div key={t.id} className="flex justify-between items-center group cursor-pointer">
                              <div className="flex items-center gap-4">
                                 <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform ${isBuy ? 'bg-[#10b981]/20 border border-[#10b981]/40 text-[#10b981]' : 'bg-[#ef4444]/20 border border-[#ef4444]/40 text-[#ef4444]'}`}>
                                   {isBuy ? '\u25B2' : '\u25BC'}
                                 </div>
                                 <span className="text-white font-mono text-xs font-bold tracking-wide truncate max-w-[180px]">{t.text}</span>
                              </div>
                              <span className="text-tactical-text/40 font-mono text-[9px] shrink-0 ml-2">{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                           </div>
                         );
                       })}
                       {filteredTicker.length === 0 && (
                         <div className="text-tactical-text/30 font-mono text-xs text-center py-6">No market activity yet</div>
                       )}
                    </div>
                 </div>
              </div>

              {/* Desktop Overview Cards */}
              <div className="hidden lg:grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 md:mb-6">
                 {/* Balance Card */}
                 <div className="bg-[#0f141e] border border-tactical-border/30 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-tactical-text/50 font-mono text-[10px] uppercase">Company Balance</span>
                       <span className="text-tactical-text/50 font-mono text-[10px]">EUR</span>
                    </div>
                    <div className="text-white font-mono text-xl lg:text-2xl font-bold mb-4">€{companyBalance.toLocaleString()}</div>
                    <div className="w-full h-1 bg-tactical-border/30 rounded flex overflow-hidden mb-3">
                       <div className="h-full bg-[#10b981]" style={{ width: `${Math.min(100, Object.keys(portfolio).length * 25)}%` }}></div>
                       <div className="h-full bg-tactical-border/50" style={{ width: `${100 - Math.min(100, Object.keys(portfolio).length * 25)}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[8px] md:text-[9px] font-mono">
                       <span className="text-[#10b981]">{Object.keys(portfolio).length} positions</span>
                       <span className="text-tactical-text/50">{Object.values(portfolio).map(p => p.symbol).slice(0, 3).join(', ') || 'No holdings'}</span>
                    </div>
                 </div>
                 
                 {/* Top Gainers */}
                 <div className="bg-[#0f141e] border border-tactical-border/30 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                       <span className="text-tactical-text/50 font-mono text-[10px] uppercase">Top Gainers</span>
                       <span className="text-tactical-text/50 font-mono text-[10px] cursor-pointer hover:text-white">More {'>'}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2.5">
                       <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#10b981]"></span><span className="text-white font-mono text-[10px] tracking-widest">NVDA</span></div>
                       <span className="text-white font-mono text-[10px]">€125.40</span>
                       <span className="text-[#10b981] font-mono text-[10px]">+14.44%</span>
                    </div>
                    <div className="flex justify-between items-center mb-2.5">
                       <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span><span className="text-white font-mono text-[10px] tracking-widest">TSLA</span></div>
                       <span className="text-white font-mono text-[10px]">€210.15</span>
                       <span className="text-[#10b981] font-mono text-[10px]">+8.12%</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-tactical-cyan"></span><span className="text-white font-mono text-[10px] tracking-widest">PLTR</span></div>
                       <span className="text-white font-mono text-[10px]">€22.30</span>
                       <span className="text-[#10b981] font-mono text-[10px]">+6.93%</span>
                    </div>
                 </div>

                 {/* Watchlist / New */}
                 <div className="bg-[#0f141e] border border-tactical-border/30 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                       <span className="text-tactical-text/50 font-mono text-[10px] uppercase">Watchlist</span>
                       <span className="text-tactical-text/50 font-mono text-[10px] cursor-pointer hover:text-white">More {'>'}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2.5">
                       <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#ef4444]"></span><span className="text-white font-mono text-[10px] tracking-widest">AAPL</span></div>
                       <span className="text-white font-mono text-[10px]">€175.20</span>
                       <span className="text-[#ef4444] font-mono text-[10px]">-1.23%</span>
                    </div>
                    <div className="flex justify-between items-center mb-2.5">
                       <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#7c3aed]"></span><span className="text-white font-mono text-[10px] tracking-widest">MSFT</span></div>
                       <span className="text-white font-mono text-[10px]">€410.50</span>
                       <span className="text-[#ef4444] font-mono text-[10px]">-0.41%</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-tactical-border"></span><span className="text-white font-mono text-[10px] tracking-widest">META</span></div>
                       <span className="text-white font-mono text-[10px]">€495.10</span>
                       <span className="text-tactical-text/30 font-mono text-[10px]">0.00%</span>
                    </div>
                 </div>
              </div>

              {/* Chart Area */}
              <div data-chart-area className="w-full h-[40vh] md:h-[50vh] lg:h-[45vh] bg-[#0f141e] border border-tactical-border/30 rounded-xl mb-3 relative overflow-hidden flex flex-col p-3 md:p-4 shadow-xl">
                  {/* Row 1: Pair + Price */}
                  <div className="flex items-center justify-between z-10 w-full mb-1">
                    <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                       <div className="flex items-center gap-1.5 bg-[#111827] px-2 py-0.5 rounded border border-tactical-border/50">
                          <span className={`w-2 h-2 rounded-full ${currentData.bgClass}`}></span>
                          <span className="text-white font-mono text-xs md:text-sm font-bold tracking-widest">{pairName}</span>
                       </div>
                       <span className="text-white font-mono text-sm md:text-lg font-bold tracking-tight" style={{ textShadow: `0 0 12px ${currentData.color}40` }}>{displayPrice}</span>
                       {!isLabMode && <span className="ml-2 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[7px] font-bold rounded tracking-widest animate-pulse">LIVE</span>}
                       <span className={`${textChangeClass} font-mono text-[10px] md:text-xs font-bold ${bgChangeClass} px-1.5 py-0.5 rounded`} style={{ boxShadow: `0 0 8px ${changeColor}30` }}>{changeStr}</span>
                       {hotStreak >= 2 && (
                         <div className="hidden md:flex items-center gap-1 bg-gradient-to-r from-[#f59e0b]/20 to-[#ef4444]/10 border border-[#f59e0b]/40 rounded px-2 py-0.5" style={{ boxShadow: '0 0 12px rgba(245,158,11,0.2)' }}>
                           <span className="text-xs">{hotStreak >= 5 ? '\uD83D\uDD25' : '\u26A1'}</span>
                           <span className="text-[#f59e0b] font-mono text-[8px] font-black tracking-widest uppercase">{hotStreak}x</span>
                         </div>
                       )}
                    </div>
                    <div className="flex gap-0.5 bg-[#111827] p-0.5 rounded border border-tactical-border/30 shrink-0">
                      {['1D','7D','1M','3M','ALL'].map(tf => (
                        <button key={tf} className={`px-2 py-1 sm:px-2.5 rounded font-mono text-[9px] transition-colors ${tf === '7D' ? 'bg-tactical-cyan/10 text-tactical-cyan' : 'text-tactical-text/50 hover:text-white'}`}>{tf}</button>
                      ))}
                    </div>
                  </div>

                  {/* Company Info Strip */}
                  {selectedInst && (
                    <div className="w-full flex items-center gap-3 md:gap-4 z-10 border-t border-tactical-border/15 pt-1.5 pb-1 flex-wrap">
                      <span className="text-tactical-text/50 font-mono text-[9px]">{selectedInst.name}</span>
                      {selectedInst.sector && (
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-tactical-border/25 bg-tactical-border/5 text-tactical-text/50">{selectedInst.sector}</span>
                      )}
                      {selectedInst.marketCapB && (
                        <span className="text-tactical-text/40 font-mono text-[8px]">MCap: €{selectedInst.marketCapB}B</span>
                      )}
                      {portfolio[selectedInst.id] && (() => {
                        const pos = portfolio[selectedInst.id];
                        const currentPrice = simData.price;
                        const pnl = (currentPrice - pos.avgCost) * pos.quantity;
                        const pnlPct = ((currentPrice / pos.avgCost) - 1) * 100;
                        const isPos = pnl >= 0;
                        return (
                          <span className={`font-mono text-[8px] font-bold px-1.5 py-0.5 rounded ${isPos ? 'text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/25' : 'text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/25'}`}>
                            P&L: {isPos ? '+' : ''}€{Math.round(pnl).toLocaleString()} ({isPos ? '+' : ''}{pnlPct.toFixed(1)}%) · {pos.quantity} shares
                          </span>
                        );
                      })()}
                      <span className="text-tactical-text/30 font-mono text-[8px] hidden md:inline flex-1 text-right truncate max-w-xs">{selectedInst.description}</span>
                    </div>
                  )}

                  {/* Analytics & Chart Tools Bar */}
                  <div className="w-full flex items-center justify-between border-t border-tactical-border/20 pt-2 z-10">
                     <div className="flex items-center gap-2">
                        {/* Chart Type Toggles */}
                        <div className="flex bg-[#060a12] rounded overflow-hidden border border-tactical-border/30 shadow-inner">
                           <button 
                             onClick={() => setChartMode('line')}
                             className={`px-5 py-2.5 sm:px-3 sm:py-1 font-mono text-[10px] sm:text-[9px] uppercase tracking-widest transition-colors ${chartMode === 'line' ? 'bg-[#1f2937] text-white' : 'text-tactical-text/50 hover:bg-[#111827] hover:text-white'}`}>
                              Line
                           </button>
                           <button 
                             onClick={() => setChartMode('candle')}
                             className={`px-5 py-2.5 sm:px-3 sm:py-1 font-mono text-[10px] sm:text-[9px] uppercase tracking-widest transition-colors ${chartMode === 'candle' ? 'bg-[#1f2937] text-white border-l border-tactical-border/30' : 'text-tactical-text/50 hover:bg-[#111827] hover:text-white border-l border-tactical-border/30'}`}>
                              Candles
                           </button>
                        </div>
                        {/* Indicators toggle bar */}
                        <IndicatorToggle
                          indicators={{
                            sma: showIndicators,
                            ema: showIndicators,
                            bb: showBB,
                            rsi: showRSI,
                            macd: showMACD,
                          }}
                          onToggle={(key) => {
                            if (key === 'sma' || key === 'ema') setShowIndicators(prev => !prev);
                            else if (key === 'bb') setShowBB(prev => !prev);
                            else if (key === 'rsi') setShowRSI(prev => !prev);
                            else if (key === 'macd') setShowMACD(prev => !prev);
                          }}
                        />
                        {/* Drawings toggle */}
                        <button
                          onClick={() => setShowDrawings(prev => !prev)}
                          className={`px-5 py-2.5 sm:px-3 sm:py-1 font-mono text-[10px] sm:text-[9px] uppercase tracking-widest hidden sm:flex items-center gap-1.5 border rounded transition-colors ${
                            showDrawings
                              ? 'border-[#f59e0b] bg-[#f59e0b]/15 text-[#f59e0b]'
                              : 'border-dashed border-[#f59e0b]/40 bg-transparent text-[#f59e0b] hover:bg-[#f59e0b]/10'
                          }`}>
                           <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                           Drawings
                        </button>
                     </div>
                     <div className="flex items-center gap-3">
                       {/* Indicator legends */}
                       {showIndicators && (
                         <div className="hidden sm:flex items-center gap-2">
                           <span className="flex items-center gap-1"><span className="w-3 h-px bg-[#f59e0b]"></span><span className="text-[#f59e0b] font-mono text-[7px]">SMA5</span></span>
                           <span className="flex items-center gap-1"><span className="w-3 h-px bg-[#7c3aed]"></span><span className="text-[#7c3aed] font-mono text-[7px]">EMA8</span></span>
                         </div>
                       )}
                       {showDrawings && (
                         <span className="hidden sm:flex items-center gap-1"><span className="w-3 h-px bg-[#00e5ff] border-dashed"></span><span className="text-[#00e5ff] font-mono text-[7px]">TREND</span></span>
                       )}
                       <span className="text-[#10b981] font-mono text-[8px] md:text-[9px] uppercase tracking-widest flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-pulse shadow-[0_0_5px_#10b981]"></span> Live
                       </span>
                     </div>
                  </div>

                  <div
                    ref={chartRef}
                    className="flex-1 flex items-center justify-center border border-tactical-border/10 rounded-lg bg-[#060a12]/50 mt-3 relative overflow-hidden cursor-crosshair select-none"
                    onWheel={(e) => {
                      e.preventDefault();
                      setChartZoom(prev => Math.max(0.5, Math.min(4, prev + (e.deltaY < 0 ? 0.15 : -0.15))));
                    }}
                    onMouseDown={(e) => {
                      setIsDragging(true);
                      setDragStartX(e.clientX - chartPanX);
                    }}
                    onMouseMove={(e) => {
                      if (isDragging) {
                        setChartPanX(e.clientX - dragStartX);
                      }
                      // Crosshair
                      const rect = chartRef.current?.getBoundingClientRect();
                      if (rect) {
                        const x = (e.clientX - rect.left) / rect.width;
                        const y = (e.clientY - rect.top) / rect.height;
                        if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
                          const idx = Math.round(x * 19);
                          setCrosshair({ x, y, idx: Math.max(0, Math.min(19, idx)) });
                        }
                      }
                    }}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseLeave={() => { setIsDragging(false); setCrosshair(null); }}
                    onTouchStart={(e) => {
                      if (e.touches.length === 1) {
                        setIsDragging(true);
                        setDragStartX(e.touches[0].clientX - chartPanX);
                      }
                    }}
                    onTouchMove={(e) => {
                      if (isDragging && e.touches.length === 1) {
                        setChartPanX(e.touches[0].clientX - dragStartX);
                      }
                      // Pinch zoom
                      if (e.touches.length === 2) {
                        const dist = Math.hypot(
                          e.touches[0].clientX - e.touches[1].clientX,
                          e.touches[0].clientY - e.touches[1].clientY
                        );
                        if (chartRef.current._lastPinch) {
                          const delta = dist - chartRef.current._lastPinch;
                          setChartZoom(prev => Math.max(0.5, Math.min(4, prev + delta * 0.005)));
                        }
                        chartRef.current._lastPinch = dist;
                      }
                    }}
                    onTouchEnd={() => { setIsDragging(false); if (chartRef.current) chartRef.current._lastPinch = null; }}
                  >
                      {/* Zoom controls */}
                      <div className="absolute top-2 right-2 z-20 flex flex-col gap-1">
                        <button onClick={() => setChartZoom(prev => Math.min(4, prev + 0.3))} className="w-7 h-7 bg-[#111827]/90 border border-tactical-border/40 rounded text-white font-mono text-sm hover:bg-[#1f2937] hover:border-tactical-cyan/50 transition-colors flex items-center justify-center backdrop-blur">+</button>
                        <button onClick={() => setChartZoom(prev => Math.max(0.5, prev - 0.3))} className="w-7 h-7 bg-[#111827]/90 border border-tactical-border/40 rounded text-white font-mono text-sm hover:bg-[#1f2937] hover:border-tactical-cyan/50 transition-colors flex items-center justify-center backdrop-blur">−</button>
                        <button onClick={() => { setChartZoom(1); setChartPanX(0); }} className="w-7 h-7 bg-[#111827]/90 border border-tactical-border/40 rounded text-tactical-text/50 font-mono text-[8px] hover:bg-[#1f2937] hover:text-white transition-colors flex items-center justify-center backdrop-blur">⟲</button>
                      </div>
                      {/* Zoom level indicator */}
                      {chartZoom !== 1 && (
                        <div className="absolute top-2 left-2 z-20 bg-[#111827]/80 border border-tactical-border/30 rounded px-2 py-0.5 text-tactical-text/50 font-mono text-[9px] backdrop-blur">{chartZoom.toFixed(1)}x</div>
                      )}
                      {(() => {
                        const W = 800, H = 400;
                        const pad = { top: 30, right: 90, bottom: 40, left: 60 };
                        const hist = simData.history;
                        const min = Math.min(...hist) * 0.998;
                        const max = Math.max(...hist) * 1.002;
                        const range = max - min || 1;

                        const toX = (i) => pad.left + (i / 19) * (W - pad.left - pad.right);
                        const toY = (val) => pad.top + (1 - (val - min) / range) * (H - pad.top - pad.bottom);

                        const points = hist.map((val, i) => `${toX(i)},${toY(val)}`);
                        const pathData = `M ${points.join(' L ')}`;
                        const areaData = `M ${toX(0)},${H - pad.bottom} L ${points.join(' L ')} L ${toX(19)},${H - pad.bottom} Z`;
                        const lastY = toY(hist[19]);

                        // SMA
                        const smaPoints = hist.map((_, i) => {
                          const w = 5, start = Math.max(0, i - w + 1);
                          const avg = hist.slice(start, i + 1).reduce((a, b) => a + b, 0) / (i - start + 1);
                          return `${toX(i)},${toY(avg)}`;
                        });
                        const smaPath = `M ${smaPoints.join(' L ')}`;

                        // EMA
                        const emaPts = [];
                        let ema = hist[0];
                        const k = 2 / (8 + 1);
                        for (let i = 0; i < hist.length; i++) {
                          ema = hist[i] * k + ema * (1 - k);
                          emaPts.push(`${toX(i)},${toY(ema)}`);
                        }
                        const emaPath = `M ${emaPts.join(' L ')}`;

                        // Price axis labels (5 levels)
                        const priceLabels = Array.from({ length: 5 }, (_, i) => {
                          const val = min + (range * i) / 4;
                          return { val, y: toY(val) };
                        });

                        // Crosshair tooltip data
                        const chData = crosshair ? {
                          price: hist[crosshair.idx],
                          x: toX(crosshair.idx),
                          y: toY(hist[crosshair.idx]),
                        } : null;

                        const zoomTransform = `translate(${chartPanX * 0.5}, 0) scale(${chartZoom})`;
                        const zoomOrigin = `${W / 2}px ${H / 2}px`;

                        return (
                          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
                            <defs>
                              <linearGradient id="chartGradientLg" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor={currentData.chartStroke} stopOpacity="0.25" />
                                <stop offset="100%" stopColor={currentData.chartStroke} stopOpacity="0.02" />
                              </linearGradient>
                            </defs>

                            {/* Grid lines */}
                            {priceLabels.map((pl, i) => (
                              <g key={`grid-${i}`}>
                                <line x1={pad.left} y1={pl.y} x2={W - pad.right} y2={pl.y} stroke="#1e2532" strokeWidth="0.5" strokeDasharray="4,4" />
                                <text x={pad.left - 8} y={pl.y + 4} fill="#6b7280" fontSize="10" textAnchor="end" fontFamily="monospace">
                                  {activeTab === 'forex' ? pl.val.toFixed(4) : `€${pl.val.toFixed(pl.val > 100 ? 0 : 2)}`}
                                </text>
                              </g>
                            ))}

                            {/* Chart content group — zoom/pan applied */}
                            <g style={{ transformOrigin: zoomOrigin, transform: zoomTransform }}>
                              {chartMode === 'candle' ? (
                                <>
                                  {/* Volume bars */}
                                  {showIndicators && hist.slice(1).map((val, i) => {
                                    const vol = Math.random() * 30 + 5;
                                    return <rect key={`v${i}`} x={toX(i + 1) - 6} y={H - pad.bottom - vol} width="12" height={vol} fill={val >= hist[i] ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'} rx="1" />;
                                  })}
                                  {/* Candlesticks */}
                                  {hist.slice(1).map((val, i) => {
                                    const prev = hist[i];
                                    const up = val >= prev;
                                    const cx = toX(i + 1);
                                    const yO = toY(prev);
                                    const yC = toY(val);
                                    const yH = Math.min(yO, yC) - Math.random() * 15;
                                    const yL = Math.max(yO, yC) + Math.random() * 15;
                                    const color = up ? '#10b981' : '#ef4444';
                                    const bodyW = Math.max((W - pad.left - pad.right) / 25, 8);
                                    return (
                                      <g key={i}>
                                        <line x1={cx} y1={yH} x2={cx} y2={yL} stroke={color} strokeWidth="1.5" />
                                        <rect x={cx - bodyW / 2} y={Math.min(yO, yC)} width={bodyW} height={Math.max(Math.abs(yO - yC), 3)} fill={color} rx="1" />
                                      </g>
                                    );
                                  })}
                                </>
                              ) : (
                                <>
                                  <path d={areaData} fill="url(#chartGradientLg)" />
                                  <path d={pathData} stroke={currentData.chartStroke} strokeWidth="2.5" fill="none" strokeLinejoin="round" />
                                </>
                              )}

                              {/* SMA + EMA overlays */}
                              {showIndicators && <path d={smaPath} stroke="#f59e0b" strokeWidth="1.5" fill="none" opacity="0.7" strokeLinejoin="round" />}
                              {showIndicators && <path d={emaPath} stroke="#7c3aed" strokeWidth="1.5" fill="none" opacity="0.7" strokeLinejoin="round" />}

                              {/* Trendline drawing */}
                              {showDrawings && <path d={`M ${toX(0)},${toY(hist[0])} L ${toX(19)},${lastY}`} stroke="#00e5ff" strokeWidth="1.5" fill="none" opacity="0.5" strokeDasharray="6,4" />}
                              {showDrawings && <>
                                <line x1={pad.left} y1={lastY} x2={W - pad.right} y2={lastY} stroke="#00e5ff" strokeWidth="0.5" opacity="0.3" strokeDasharray="4,4" />
                                <line x1={toX(18)} y1={pad.top} x2={toX(18)} y2={H - pad.bottom} stroke="#00e5ff" strokeWidth="0.5" opacity="0.3" strokeDasharray="4,4" />
                              </>}

                              {/* Current price dot + label */}
                              <circle cx={toX(19)} cy={lastY} r="5" fill="white" className="animate-pulse" />
                              <circle cx={toX(19)} cy={lastY} r="3" fill={currentData.chartStroke} />
                            </g>

                            {/* Price label on right axis — outside zoom group */}
                            <rect x={W - pad.right + 6} y={lastY - 14} width="78" height="28" fill="#111827" stroke={currentData.chartStroke} strokeWidth="1" rx="4" />
                            <text x={W - pad.right + 14} y={lastY - 1} fill="white" fontSize="12" fontFamily="monospace" fontWeight="bold">{displayPrice}</text>
                            <text x={W - pad.right + 14} y={lastY + 11} fill={changeColor} fontSize="9" fontFamily="monospace">{changeStr}</text>

                            {/* Crosshair overlay */}
                            {chData && (
                              <>
                                <line x1={chData.x} y1={pad.top} x2={chData.x} y2={H - pad.bottom} stroke="#ffffff30" strokeWidth="0.5" strokeDasharray="3,3" />
                                <line x1={pad.left} y1={chData.y} x2={W - pad.right} y2={chData.y} stroke="#ffffff30" strokeWidth="0.5" strokeDasharray="3,3" />
                                <circle cx={chData.x} cy={chData.y} r="4" fill="none" stroke="white" strokeWidth="1.5" />
                                <rect x={chData.x + 8} y={chData.y - 22} width="90" height="22" fill="#111827" stroke="#ffffff30" strokeWidth="0.5" rx="3" />
                                <text x={chData.x + 14} y={chData.y - 8} fill="white" fontSize="11" fontFamily="monospace" fontWeight="bold">
                                  {activeTab === 'forex' ? chData.price.toFixed(4) : `€${chData.price.toFixed(2)}`}
                                </text>
                              </>
                            )}
                          </svg>
                        );
                      })()}
                  </div>

                  {/* RSI Sub-panel */}
                  {showRSI && (
                    <div className="mt-1">
                      <RSIPanel priceHistory={simData.history || []} width={chartRef.current?.offsetWidth || 600} />
                    </div>
                  )}

                  {/* MACD Sub-panel */}
                  {showMACD && (
                    <div className="mt-1">
                      <MACDPanel priceHistory={simData.history || []} width={chartRef.current?.offsetWidth || 600} />
                    </div>
                  )}
              </div>

              {/* Action Bar — compact */}
              <div className="flex gap-2 mb-3 items-center">
                 <button
                   onClick={() => handleTrade('buy')}
                   className="flex-1 py-2 md:py-2.5 rounded-lg font-mono text-xs font-bold tracking-widest transition-all duration-200 hover:brightness-125 active:scale-[0.98] relative overflow-hidden"
                   style={{
                     background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(52,211,153,0.2))',
                     border: '1px solid rgba(16,185,129,0.4)',
                     color: '#10b981'
                   }}>
                   <span className="flex items-center justify-center gap-1.5">
                     <span>{'\u25B2'}</span> BUY {assetName}
                     {portfolio[selectedInst?.id] && <span className="text-[8px] opacity-50">({portfolio[selectedInst.id].quantity})</span>}
                   </span>
                 </button>
                 <div className="w-28 shrink-0 flex flex-col items-center gap-0.5">
                    <input
                      type="number"
                      min="1"
                      value={tradeQty}
                      onChange={(e) => setTradeQty(e.target.value)}
                      placeholder={String(getDefaultQty(activeTab))}
                      className="bg-[#0f141e] border border-tactical-border/40 rounded-lg w-full text-center py-2 md:py-2.5 text-white font-mono text-xs outline-none focus:border-tactical-cyan transition-colors"
                    />
                    <span className="text-tactical-text/30 font-mono text-[8px]">
                      €{((marketSim?.[selectedInst?.id]?.price ?? selectedInst?.price ?? 0) * parsedQty).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                 </div>
                 <button
                   onClick={() => handleTrade('sell')}
                   className="flex-1 py-2 md:py-2.5 rounded-lg font-mono text-xs font-bold tracking-widest transition-all duration-200 hover:brightness-125 active:scale-[0.98] relative overflow-hidden"
                   style={{
                     background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(248,113,113,0.2))',
                     border: '1px solid rgba(239,68,68,0.4)',
                     color: '#ef4444'
                   }}>
                   <span className="flex items-center justify-center gap-1.5">
                     <span>{'\u25BC'}</span> SELL {assetName}
                     {portfolio[selectedInst?.id] && <span className="text-[8px] opacity-50">({portfolio[selectedInst.id].quantity})</span>}
                   </span>
                 </button>
              </div>

              {/* Bottom Table: Market Overview */}
              <div className="flex flex-col border border-tactical-border/30 rounded-xl bg-[#0f141e] overflow-hidden shadow-xl">
                 <div className="p-4 border-b border-tactical-border/30 pb-3">
                    <h3 className="text-white font-mono text-sm md:text-base font-bold opacity-90 tracking-wide">{currentData.title}</h3>
                 </div>

                 {/* Sort & Filter Bar */}
                 <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-tactical-border/20 bg-black/30">
                    <label className="text-tactical-text/50 font-mono text-[9px] uppercase tracking-widest shrink-0">Sort</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-[#0a0f1a] border border-tactical-border/40 text-white font-mono text-[10px] rounded px-2 py-1 outline-none focus:border-[#00e5ff]/60 cursor-pointer"
                    >
                      <option value="name">Name (A-Z)</option>
                      <option value="price-asc">Price (Low → High)</option>
                      <option value="price-desc">Price (High → Low)</option>
                      <option value="change">Change (Best → Worst)</option>
                    </select>

                    <span className="w-px h-4 bg-tactical-border/30 mx-1 hidden sm:block" />

                    <label className="text-tactical-text/50 font-mono text-[9px] uppercase tracking-widest shrink-0">Price</label>
                    <input
                      type="number"
                      placeholder="Min"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      className="bg-[#0a0f1a] border border-tactical-border/40 text-white font-mono text-[10px] rounded px-2 py-1 w-20 outline-none focus:border-[#00e5ff]/60 placeholder:text-tactical-text/30"
                    />
                    <span className="text-tactical-text/30 font-mono text-[9px]">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      className="bg-[#0a0f1a] border border-tactical-border/40 text-white font-mono text-[10px] rounded px-2 py-1 w-20 outline-none focus:border-[#00e5ff]/60 placeholder:text-tactical-text/30"
                    />
                    {(priceMin || priceMax || sortBy !== 'name') && (
                      <button
                        onClick={() => { setSortBy('name'); setPriceMin(''); setPriceMax(''); }}
                        className="text-[#00e5ff] font-mono text-[9px] hover:text-white transition-colors ml-1"
                      >
                        RESET
                      </button>
                    )}
                    <span className="ml-auto text-tactical-text/30 font-mono text-[9px]">{displayList.length} results</span>
                 </div>

                 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 p-3 px-4 border-b border-tactical-border/20 text-tactical-text/50 font-mono text-[9px] md:text-[10px] uppercase tracking-widest bg-black/20">
                    <span>Name</span>
                    <span className="text-right">Price</span>
                    <span className="text-right hidden sm:block">24h Change</span>
                    <span className="text-right hidden md:block">Market Cap</span>
                    <span className="text-right">Action</span>
                 </div>
                 <div className="flex flex-col">
                    {displayList.slice(0, 8).map((inst) => {
                       const localSim = marketSim?.[inst.id] || inst;
                       const isPos = localSim.change24h >= 0;
                       const isTrending = Math.abs(localSim.change24h) > 5;
                       const isSelected = selectedInst?.id === inst.id;
                       const held = portfolio[inst.id];
                       return (
                         <div key={inst.id}
                           onClick={() => setSelectedInst(inst)}
                           className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 p-3 px-4 items-center border-b border-tactical-border/10 transition-colors cursor-pointer group ${
                             isSelected
                               ? 'bg-tactical-cyan/8 border-l-2 border-l-tactical-cyan'
                               : isTrending ? 'bg-[#f59e0b]/[0.03] hover:bg-tactical-cyan/5' : 'hover:bg-tactical-cyan/5'
                           }`}>
                           <div className="flex items-center gap-2">
                             <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isSelected ? 'bg-tactical-cyan/20 text-tactical-cyan' : `${currentData.bgOpacity} ${currentData.textClass}`}`}>{inst.symbol.charAt(0)}</span>
                             <div className="flex flex-col">
                               <span className="text-white font-mono text-xs md:text-sm font-bold flex items-center gap-1.5">
                                 {inst.symbol}
                                 {isTrending && (
                                   <span className="flex items-center gap-0.5 bg-[#f59e0b]/15 border border-[#f59e0b]/30 rounded px-1 py-px text-[#f59e0b] font-mono text-[7px] font-black tracking-widest">
                                     {'\uD83D\uDD25'}
                                   </span>
                                 )}
                                 {held && <span className="text-[7px] font-mono text-tactical-cyan/60 bg-tactical-cyan/10 px-1 py-px rounded">{held.quantity} held</span>}
                               </span>
                               <span className="text-tactical-text/40 font-normal text-[9px] truncate max-w-[120px] hidden lg:block">{inst.name}</span>
                             </div>
                           </div>
                           <span className="text-white font-mono text-xs md:text-sm text-right">{activeTab === 'forex' ? localSim.price.toFixed(4) : `€${localSim.price.toLocaleString(undefined, {minimumFractionDigits: 2})}`}</span>
                           <span className={`${isPos ? 'text-[#10b981]' : 'text-[#ef4444]'} font-mono text-xs text-right hidden sm:block`}>{(isPos ? '+' : '') + localSim.change24h.toFixed(2)}%</span>
                           <span className="text-white font-mono text-xs text-right opacity-80 hidden md:block">{inst.marketCap ? `€${inst.marketCap}B` : '-'}</span>
                           <div className="text-right">
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setSelectedInst(inst);
                                 // Scroll to chart area
                                 document.querySelector('[data-chart-area]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                               }}
                               className={`px-3 md:px-4 py-1.5 rounded text-[9px] font-mono font-bold transition-all ${
                                 isSelected
                                   ? 'bg-tactical-cyan text-black'
                                   : 'bg-tactical-cyan/10 border border-tactical-cyan/30 text-tactical-cyan hover:bg-tactical-cyan hover:text-black'
                               }`}>
                               {isSelected ? '\u2713 Active' : 'Select'}
                             </button>
                           </div>
                         </div>
                       );
                    })}
                 </div>
              </div>
            </div>
          )}



        {/* MOCKUPS FOR PORTFOLIO */}
        {activeTab === 'portfolio' && (
          <div className="animate-fade-in mx-auto mt-4 md:mt-8 w-full max-w-5xl px-4 lg:px-8">

            {/* Trader Rank + Win Streak Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Trader Rank Card */}
              <div className="bg-[#111827] rounded-xl border p-4 relative overflow-hidden" style={{ borderColor: `${rank.glow}50`, boxShadow: `0 0 25px ${rank.glow}15` }}>
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: rank.glow }} />
                <div className="text-tactical-text/50 font-mono text-[9px] uppercase tracking-widest mb-2">Trader Rank</div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{rank.icon}</span>
                  <div>
                    <div className="font-mono text-lg font-black tracking-wide" style={{ color: rank.glow, textShadow: `0 0 15px ${rank.glow}60` }}>{rank.title}</div>
                    <div className="text-tactical-text/50 font-mono text-[9px]">TIER {rank.tier} / 4</div>
                  </div>
                </div>
                <div className="mt-3 w-full h-1.5 bg-[#060a12] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(rank.tier / 4) * 100}%`, background: `linear-gradient(90deg, ${rank.glow}, ${rank.glow}80)`, boxShadow: `0 0 8px ${rank.glow}` }} />
                </div>
              </div>

              {/* Win Streak Card */}
              <div className="bg-[#111827] rounded-xl border border-[#f59e0b]/30 p-4 relative overflow-hidden" style={{ boxShadow: winStreak >= 3 ? '0 0 20px rgba(245,158,11,0.1)' : 'none' }}>
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-[#f59e0b]/10 blur-2xl pointer-events-none" />
                <div className="text-tactical-text/50 font-mono text-[9px] uppercase tracking-widest mb-2">Daily P&L Streak</div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{winStreak >= 3 ? '\uD83D\uDD25' : '\u26A1'}</span>
                  <span className="text-[#f59e0b] font-mono text-2xl font-black" style={{ textShadow: winStreak >= 3 ? '0 0 15px rgba(245,158,11,0.5)' : 'none' }}>{winStreak}-DAY</span>
                  <span className="text-[#f59e0b] font-mono text-sm font-bold tracking-widest">WIN STREAK</span>
                </div>
                <div className="flex gap-1 mt-3">
                  {[1,2,3,4,5].map(d => (
                    <div key={d} className={`flex-1 h-1.5 rounded-full transition-all ${d <= winStreak ? 'bg-[#f59e0b]' : 'bg-tactical-border/30'}`} style={d <= winStreak ? { boxShadow: '0 0 6px rgba(245,158,11,0.4)' } : {}} />
                  ))}
                </div>
              </div>

              {/* XP Progress Card */}
              <div className="bg-[#111827] rounded-xl border border-[#7c3aed]/30 p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-[#7c3aed]/10 blur-2xl pointer-events-none" />
                <div className="text-tactical-text/50 font-mono text-[9px] uppercase tracking-widest mb-2">Total XP</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[#7c3aed] font-mono text-2xl font-black" style={{ textShadow: '0 0 12px rgba(124,58,237,0.4)' }}>{traderXP.toLocaleString()}</span>
                  <span className="text-[#7c3aed]/60 font-mono text-xs font-bold">XP</span>
                </div>
                <div className="text-tactical-text/40 font-mono text-[9px] mt-1">Next milestone: {Math.ceil(traderXP / 500) * 500} XP</div>
                <div className="mt-2 w-full h-1.5 bg-[#060a12] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#7c3aed]" style={{ width: `${(traderXP % 500) / 500 * 100}%`, boxShadow: '0 0 8px #7c3aed' }} />
                </div>
              </div>
            </div>

            <h2 className="text-white font-mono text-lg md:text-xl mb-4 border-b border-tactical-border pb-2">Active Holdings</h2>
            {Object.keys(portfolio).length === 0 ? (
              <div className="text-center py-12 text-tactical-text/30 font-mono text-sm">
                <span className="text-3xl block mb-3 opacity-30">{'\uD83D\uDCC9'}</span>
                No active positions — start trading to build your portfolio!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(portfolio).map(([id, pos]) => {
                  const currentPrice = marketSim?.[id]?.price ?? pos.avgCost;
                  const totalValue = currentPrice * pos.quantity;
                  const pnl = (currentPrice - pos.avgCost) * pos.quantity;
                  const isPos = pnl >= 0;
                  return (
                    <div key={id} className={`bg-[#111827] rounded-xl border p-4 mb-3 flex flex-col shadow-[0_0_15px_${isPos ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}] relative overflow-hidden`}
                      style={{ borderColor: isPos ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)' }}>
                      <div className="flex items-center">
                        <div className={`flex-1 border-l-[3px] pl-3`} style={{ borderLeftColor: isPos ? '#10b981' : '#ef4444' }}>
                          <div className="flex items-baseline gap-2">
                            <div className="text-white font-mono font-bold text-lg md:text-xl">{pos.symbol}</div>
                            <div className="text-tactical-text/50 font-mono text-[9px] uppercase">{pos.name}</div>
                          </div>
                          <div className="text-tactical-text/70 font-mono text-[10px] mt-1 bg-black/40 inline-block px-2 py-0.5 rounded">
                            QTY: <span className="text-white">{pos.quantity}</span> · AVG: <span className="text-white">€{pos.avgCost.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="text-right z-10 pl-4">
                          <div className="text-tactical-text/50 font-mono text-[9px] mb-1">TOTAL VALUE</div>
                          <div className="text-white font-mono text-lg md:text-xl font-bold">€{totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                          <div className="flex items-center justify-end gap-2 mt-1">
                            <span className={`${isPos ? 'text-[#10b981]' : 'text-[#ef4444]'} font-mono text-[10px] md:text-xs font-bold flex items-center gap-1`}>
                              <span className="text-[10px]">{isPos ? '\u25B2' : '\u25BC'}</span> {isPos ? '+' : ''}€{Math.round(pnl).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3 pt-2 border-t border-tactical-border/15">
                        <button
                          onClick={() => { sellInstrument(id, currentPrice, Math.min(10, pos.quantity)); }}
                          className="flex-1 py-1.5 rounded-md font-mono text-[10px] font-bold tracking-wider text-[#ef4444] border border-[#ef4444]/30 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 transition-colors"
                        >
                          SELL 10
                        </button>
                        <button
                          onClick={() => { sellInstrument(id, currentPrice, Math.floor(pos.quantity / 2)); }}
                          className="flex-1 py-1.5 rounded-md font-mono text-[10px] font-bold tracking-wider text-[#ef4444] border border-[#ef4444]/30 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 transition-colors"
                        >
                          SELL 50%
                        </button>
                        <button
                          onClick={() => { sellInstrument(id, currentPrice, pos.quantity); }}
                          className="flex-1 py-1.5 rounded-md font-mono text-[10px] font-bold tracking-wider text-white border border-[#ef4444]/50 bg-[#ef4444]/20 hover:bg-[#ef4444]/30 transition-colors"
                        >
                          SELL ALL
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}



          {/* Athena AI Analysis Toggle */}
          {['stocks', 'crypto', 'forex', 'commodities', 'bonds'].includes(activeTab) && (
            <div className="w-full mt-4">
              <button
                onClick={() => setShowAthena(prev => !prev)}
                className={`w-full py-2.5 rounded-lg font-mono text-[10px] tracking-widest uppercase font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                  showAthena
                    ? 'bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30 shadow-[0_0_15px_rgba(167,139,250,0.1)]'
                    : 'bg-tactical-bg/60 text-tactical-text/40 border border-tactical-border/20 hover:text-[#a78bfa] hover:border-[#a78bfa]/20'
                }`}
              >
                <span>🔮</span>
                <span>{showAthena ? 'HIDE ATHENA ANALYSIS' : 'ATHENA AI ANALYSIS'}</span>
                <span className="text-[7px] ml-1 px-1.5 py-0.5 rounded bg-[#a78bfa]/10 text-[#a78bfa]/60">
                  {showAthena ? '▲' : '▼'}
                </span>
              </button>
              {showAthena && simData?.history && (
                <div className="mt-3">
                  <AthenaExchangePanel
                    symbol={selectedInst?.symbol || 'UNKNOWN'}
                    prices={simData.history}
                    onClose={() => setShowAthena(false)}
                  />
                </div>
              )}
            </div>
          )}

        </div> {/* End of Left Hand Container */}

        {/* Right Side: News + Trade Feed Terminal */}
        <div className="w-full lg:w-[340px] xl:w-[400px] flex flex-col shrink-0 mt-6 lg:mt-0 pb-8 gap-4">
           {/* Live News Terminal */}
           <div className="bg-[#111827] border border-tactical-border/50 rounded-xl p-5 relative overflow-hidden flex flex-col flex-1">
              <div className="absolute top-0 right-0 px-2.5 py-1 bg-[#ef4444] text-black font-bold text-[8px] uppercase tracking-widest flex items-center gap-2 rounded-bl-lg">
                 <div className="w-1.5 h-1.5 bg-black rounded-full animate-pulse"></div>
                 LIVE TERMINAL FEED
              </div>
              <h3 className="text-white font-mono text-base font-bold mb-1 mt-3">Quantico Network</h3>
              <p className="text-[#a78bfa] text-[9px] font-mono mb-4 uppercase tracking-widest">Neural matrix updates every 60 min.</p>

              <div className="flex flex-col gap-3 overflow-y-auto pb-2 flex-1 pr-1" style={{ scrollbarWidth: 'thin' }}>
                 <div className="border border-tactical-border/30 rounded-lg p-4 bg-black/40 border-l-[3px] border-l-[#ef4444] hover:bg-black/60 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[#ef4444] font-bold text-[9px] tracking-widest animate-pulse">BREAKING EVENT</span>
                       <span className="text-tactical-text/40 text-[8px]">14 mins ago</span>
                    </div>
                    <p className="text-white text-sm font-mono mb-2 leading-relaxed">SEC approves emergency rate cut of 50bps ahead of expected schedule.</p>
                    <div className="flex gap-2 flex-wrap mt-2">
                       <span className="bg-[#10b981]/10 text-[#10b981] px-2 py-0.5 rounded text-[9px] font-bold">$BTC +8.4%</span>
                       <span className="bg-[#ef4444]/10 text-[#ef4444] px-2 py-0.5 rounded text-[9px] font-bold">US/YIELD -3.2%</span>
                    </div>
                 </div>

                 <div className="border border-tactical-border/30 rounded-lg p-4 bg-black/40 border-l-[3px] border-l-[#10b981] hover:bg-black/60 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[#10b981] font-bold text-[9px] tracking-widest">TECH UPDATE</span>
                       <span className="text-tactical-text/40 text-[8px]">45 mins ago</span>
                    </div>
                    <p className="text-white text-sm font-mono mb-2 leading-relaxed">Major breakthrough in quantum encryption standard approved.</p>
                    <div className="flex gap-2 mt-2">
                       <span className="bg-[#10b981]/10 text-[#10b981] px-2 py-0.5 rounded text-[9px] font-bold">TECH +2.1%</span>
                    </div>
                 </div>

                 <div className="border border-tactical-border/30 rounded-lg p-4 bg-black/40 border-l-[3px] border-l-[#f59e0b] hover:bg-black/60 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[#f59e0b] font-bold text-[9px] tracking-widest">MACRO WARNING</span>
                       <span className="text-tactical-text/40 text-[8px]">2 hours ago</span>
                    </div>
                    <p className="text-white text-sm font-mono mb-2 leading-relaxed">European logistics strike halts completely. Port authorities demand 10B stimulus.</p>
                    <div className="flex gap-2 flex-wrap mt-2">
                       <span className="bg-[#ef4444]/10 text-[#ef4444] px-2 py-0.5 rounded text-[9px] font-bold">E-COMMERCE -4.5%</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* Recent Trade Activity */}
           <div className="bg-[#111827] border border-tactical-border/50 rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-2.5 py-1 bg-[#10b981] text-black font-bold text-[8px] uppercase tracking-widest flex items-center gap-2 rounded-bl-lg">
                 TRADE LOG
              </div>
              <h3 className="text-white font-mono text-base font-bold mb-3 mt-2">Live Market Feed</h3>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {filteredTicker.slice(0, 8).map(t => {
                  const isBuy = t.text.includes('BUY');
                  return (
                    <div key={t.id} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${isBuy ? 'border-[#10b981]/20 bg-[#10b981]/5 hover:bg-[#10b981]/10' : 'border-[#ef4444]/20 bg-[#ef4444]/5 hover:bg-[#ef4444]/10'}`}>
                      <span className={`text-xs font-bold ${isBuy ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{isBuy ? '\u25B2' : '\u25BC'}</span>
                      <span className="text-white font-mono text-[10px] flex-1 truncate">{t.text.replace('TRADE: ', '')}</span>
                      <span className="text-tactical-text/30 font-mono text-[8px] shrink-0">{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  );
                })}
                {filteredTicker.length === 0 && (
                  <div className="text-tactical-text/30 font-mono text-[10px] text-center py-4">No market activity yet</div>
                )}
              </div>
           </div>
        </div>



      </div>
    </div>
  );
};

export default ExchangeOS;
