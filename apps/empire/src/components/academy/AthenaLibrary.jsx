import React, { useState, useRef, useEffect, useCallback } from 'react';
import CurriculumShell from '../curriculum/CurriculumShell';
import { useAuthStore, selectHasAcademyAthena } from '../../store/authStore';
import { TIER_CONFIG } from '../../data/subscriptionTiers';

// ── Mock Athena responses ───────────────────────────────────────
const MOCK_RESPONSES = [
  "That's a great question. Let me break it down for you...",
  "Based on your current ECFL progress, I'd recommend focusing on the fundamentals first before tackling derivatives.",
  "This concept connects directly to what you covered in your last lesson. Think of it as the inverse relationship between risk and return.",
  "Good instinct asking about that. In practice, institutional traders approach this by layering positions across multiple timeframes.",
  "The short answer is yes -- but the nuance matters. Let me walk you through the key factors...",
  "That topic is covered in depth in Module 3. Would you like me to pull up the relevant section?",
  "From an ECFL certification perspective, you'll want to understand both the theoretical framework and the practical application.",
  "Interesting question. The market microstructure behind that is more complex than most textbooks suggest.",
];

let responseIndex = 0;
function getNextMockResponse() {
  const resp = MOCK_RESPONSES[responseIndex % MOCK_RESPONSES.length];
  responseIndex++;
  return resp;
}

// ── AthenaLibrary ───────────────────────────────────────────────
export default function AthenaLibrary({ onBack }) {
  const hasAcademyAthena = useAuthStore(selectHasAcademyAthena);

  const [messages, setMessages] = useState([
    {
      role: 'athena',
      text: "Welcome to the library. I'm Athena, your AI learning assistant. Ask me anything about your courses, financial concepts, or ECFL certification.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const containerRef = useRef(null);

  // ── Resizable split ──
  const [splitPercent, setSplitPercent] = useState(70); // left panel %
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.min(85, Math.max(40, pct)));
    };
    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: 'athena', text: getNextMockResponse() },
      ]);
      setIsTyping(false);
    }, 1000);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="fixed inset-0 z-30 bg-[#060a12] flex flex-col font-mono">
      {/* ── Top Bar ──────────────────────────────────────────── */}
      <div className="h-10 flex-shrink-0 flex items-center justify-between px-4 border-b border-emerald-900/30 bg-[#060a12]/95 backdrop-blur-md">
        {/* Left: Back */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-400 transition-colors tracking-wide"
        >
          <span className="text-sm">&larr;</span>
          BACK TO HUB
        </button>

        {/* Center: Title */}
        <span className="text-xs font-bold tracking-wider text-[#10b981]">
          ATHENA DIGITAL LIBRARY
        </span>

        {/* Right: ECFL Badge */}
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider rounded border border-emerald-700/40 bg-emerald-900/20 text-emerald-400">
            ECFL
          </span>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden" ref={containerRef}>
        {/* Left: Curriculum — always accessible */}
        <div className="overflow-y-auto" style={{ width: `${splitPercent}%` }}>
          <CurriculumShell />
        </div>

        {/* ── Drag Handle ── */}
        <div
          onMouseDown={handleMouseDown}
          className="w-1 shrink-0 cursor-col-resize bg-emerald-900/20 hover:bg-emerald-500/30 active:bg-emerald-400/40 transition-colors relative group"
        >
          <div className="absolute inset-y-0 -left-1 -right-1" /> {/* wider hit area */}
        </div>

        {/* Right: Athena Chat Panel */}
        <div className="flex flex-col bg-[#0a0f1a]/80 backdrop-blur-md relative" style={{ width: `${100 - splitPercent}%` }}>
          {/* Locked overlay for tier 0/1 — only covers the chat panel */}
          {!hasAcademyAthena && (
            <div className="absolute inset-0 z-40 bg-[#060a12]/90 backdrop-blur-md flex flex-col items-center justify-center gap-4 px-4">
              <div className="text-3xl opacity-40">&#9670;</div>
              <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-white/70 text-center">Athena Locked</h2>
              <p className="text-[10px] text-white/40 text-center leading-relaxed">
                Upgrade to AEGIS {TIER_CONFIG[2].name} or higher to unlock AI-assisted learning.
              </p>
              <div className="flex flex-col gap-2 mt-1">
                <div className="px-3 py-1.5 rounded-lg border text-[9px] font-bold tracking-wider uppercase text-center"
                  style={{ color: TIER_CONFIG[2].color, borderColor: `${TIER_CONFIG[2].color}40`, background: `${TIER_CONFIG[2].color}10` }}>
                  {TIER_CONFIG[2].icon} {TIER_CONFIG[2].name} — {TIER_CONFIG[2].price}
                </div>
                <div className="px-3 py-1.5 rounded-lg border text-[9px] font-bold tracking-wider uppercase text-center"
                  style={{ color: TIER_CONFIG[3].color, borderColor: `${TIER_CONFIG[3].color}40`, background: `${TIER_CONFIG[3].color}10` }}>
                  {TIER_CONFIG[3].icon} {TIER_CONFIG[3].name} — {TIER_CONFIG[3].price}
                </div>
              </div>
            </div>
          )}
          {/* Chat Header */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-emerald-900/30">
            <div className="flex items-center gap-2">
              <span className="text-[#10b981] text-lg">&loz;</span>
              <span className="text-sm font-bold tracking-wider text-[#10b981]">
                ATHENA
              </span>
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5 tracking-wide">
              Your AI Learning Assistant
            </p>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed ${
                    msg.role === 'athena'
                      ? 'bg-emerald-900/20 border border-emerald-800/30 text-gray-300'
                      : 'bg-gray-800/60 border border-gray-700/30 text-gray-200'
                  }`}
                >
                  {msg.role === 'athena' && (
                    <span className="text-[#10b981] text-[10px] font-bold tracking-wider block mb-1">
                      ATHENA
                    </span>
                  )}
                  {msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-[85%] px-3 py-2 rounded-lg text-xs bg-emerald-900/20 border border-emerald-800/30 text-gray-500">
                  <span className="text-[#10b981] text-[10px] font-bold tracking-wider block mb-1">
                    ATHENA
                  </span>
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="flex-shrink-0 p-3 border-t border-emerald-900/30">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Athena..."
                className="flex-1 bg-[#0d1117] border border-gray-700/40 rounded px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-700/60 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="px-3 py-2 bg-emerald-900/40 border border-emerald-700/40 rounded text-xs text-emerald-400 hover:bg-emerald-800/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors tracking-wider"
              >
                SEND
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
