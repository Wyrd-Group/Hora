import React, { useState, useEffect, useRef } from 'react';
import { TUTORIAL_SECTIONS, TUTORIAL_CATEGORIES, TutorialDetail } from './TutorialPage';
import TrainingCamp from './TrainingCamp';
import AccountHub from './AccountHub';
import SubstrateModeCard from './SubstrateModeCard';
import { useAuthStore, selectHasOffline } from '../../store/authStore';
import { TIER_CONFIG } from '../../data/subscriptionTiers';
import { useTranslation } from '../../lib/i18n';
import RitualBackdrop from '../shared/RitualBackdrop';
import { useCanAccessSubstrate } from '../../lib/featureFlags';

const MODES = [
  { key: 'play_online',    tLabel: 'onboarding.campaign',       tDesc: 'onboarding.campaignDesc',       icon: '\u25C9', color: '#00e5ff' },
  { key: 'play_offline',   tLabel: 'onboarding.offline',        tDesc: 'onboarding.offlineDesc',        icon: '\u2298', color: '#9CA3AF', premium: true },
  { key: 'pvp_quick',      tLabel: 'onboarding.quickMatch',     tDesc: 'onboarding.quickMatchDesc',     icon: '\u2694', color: '#ef4444' },
  { key: 'private_server', tLabel: 'onboarding.privateServer',  tDesc: 'onboarding.privateServerDesc',  icon: '\u2B21', color: '#a78bfa' },
  { key: 'learn',          tLabel: 'onboarding.academy',        tDesc: 'onboarding.academyDesc',        icon: '\u25C8', color: '#10b981' },
  { key: 'social',         tLabel: 'onboarding.social',         tDesc: 'onboarding.socialDesc',         icon: '\u25CE', color: '#f59e0b' },
  { key: 'lab',            tLabel: 'onboarding.lab',            tDesc: 'onboarding.labDesc',            icon: '\u2697', color: '#f97316', premium: true },
  { key: 'athena',         tLabel: 'onboarding.athena',         tDesc: 'onboarding.athenaDesc',         icon: '\u26A1', color: '#00e5ff' },
];

function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,229,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating gradient orbs */}
      <div
        className="absolute rounded-full blur-[120px]"
        style={{
          width: 420,
          height: 420,
          top: '10%',
          left: '15%',
          background: 'radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)',
          animation: 'orbDrift1 18s ease-in-out infinite',
        }}
      />
      <div
        className="absolute rounded-full blur-[100px]"
        style={{
          width: 340,
          height: 340,
          bottom: '15%',
          right: '10%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)',
          animation: 'orbDrift2 22s ease-in-out infinite',
        }}
      />
      <div
        className="absolute rounded-full blur-[90px]"
        style={{
          width: 260,
          height: 260,
          top: '50%',
          left: '55%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)',
          animation: 'orbDrift3 15s ease-in-out infinite',
        }}
      />

      {/* Scanline */}
      <div
        className="absolute left-0 right-0 h-px opacity-[0.06]"
        style={{
          background: 'linear-gradient(90deg, transparent, #00e5ff, transparent)',
          animation: 'scanline 8s linear infinite',
        }}
      />

      <style>{`
        @keyframes orbDrift1 {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(30px, -20px); }
          66% { transform: translate(-20px, 15px); }
        }
        @keyframes orbDrift2 {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(-25px, 25px); }
          66% { transform: translate(20px, -15px); }
        }
        @keyframes orbDrift3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-15px, -25px); }
        }
        @keyframes scanline {
          0% { top: -2%; }
          100% { top: 102%; }
        }
        @keyframes aegisGlow {
          0%, 100% { text-shadow: 0 0 20px rgba(0,229,255,0.3), 0 0 60px rgba(0,229,255,0.1); }
          50% { text-shadow: 0 0 30px rgba(0,229,255,0.5), 0 0 80px rgba(0,229,255,0.2); }
        }
      `}</style>
    </div>
  );
}

function ModeCard({ mode, onSelect, index, hasOffline }) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const locked = mode.premium && !hasOffline;

  return (
    <button
      onClick={() => {
        if (locked) return;
        onSelect(mode.key);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative flex flex-col items-start gap-3 rounded-lg border p-5 text-left transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
      style={{
        background: hovered ? 'rgba(10, 14, 24, 0.9)' : 'rgba(10, 14, 24, 0.8)',
        borderColor: hovered ? `${mode.color}44` : 'rgba(255,255,255,0.06)',
        boxShadow: hovered
          ? `0 0 24px ${mode.color}18, inset 0 1px 0 ${mode.color}12`
          : 'none',
        transform: hovered ? 'scale(1.02)' : 'scale(1)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        animationDelay: `${index * 60}ms`,
        opacity: locked ? 0.5 : 1,
        cursor: locked ? 'not-allowed' : 'pointer',
      }}
    >
      {/* Icon */}
      <span
        className="text-2xl leading-none"
        style={{ color: mode.color }}
      >
        {mode.icon}
      </span>
      {locked && (
        <span className="absolute top-2 right-2 text-[7px] font-bold tracking-[0.12em] uppercase px-1.5 py-0.5 rounded bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/25">
          SENTINEL+
        </span>
      )}

      {/* Title */}
      <span
        className="font-mono text-[11px] font-bold uppercase leading-none"
        style={{
          letterSpacing: '0.12em',
          color: hovered ? mode.color : '#E8E0D0',
          transition: 'color 0.3s',
        }}
      >
        {t(mode.tLabel)}
      </span>

      {/* Description */}
      <span
        className="font-mono text-[9px] leading-relaxed"
        style={{
          color: 'rgba(156, 163, 175, 0.7)',
          letterSpacing: '0.04em',
        }}
      >
        {t(mode.tDesc)}
      </span>

      {/* Bottom accent line on hover */}
      <div
        className="absolute bottom-0 left-4 right-4 h-px transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, transparent, ${mode.color}, transparent)`,
          opacity: hovered ? 0.5 : 0,
        }}
      />
    </button>
  );
}

export default function OnboardingHub({ onSelectMode }) {
  const { t } = useTranslation();
  const tier = useAuthStore(s => s.subscriptionTier);
  const hasOffline = useAuthStore(selectHasOffline);
  const canAccessSubstrate = useCanAccessSubstrate();
  const [mounted, setMounted] = useState(false);
  const [openTutorial, setOpenTutorial] = useState(null);
  const [showTrainingCamp, setShowTrainingCamp] = useState(false);
  const [showAccountHub, setShowAccountHub] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const firstMinutesChecklist = [
    'Pick CAMPAIGN for persistent progression.',
    'Open GLOBE and inspect nearby finance/tech nodes.',
    'Acquire your first income-positive asset.',
    'Use ATHENA to ask: “What should I do next with €100k?”',
    'Watch HEAT and keep risk below critical thresholds.',
  ];

  // Show Account Hub
  if (showAccountHub) {
    return <AccountHub onBack={() => setShowAccountHub(false)} />;
  }

  // Show Training Camp if selected
  if (showTrainingCamp) {
    return <TrainingCamp onBack={() => setShowTrainingCamp(false)} />;
  }

  // Show tutorial detail page if one is selected
  if (openTutorial) {
    const section = TUTORIAL_SECTIONS.find(s => s.id === openTutorial);
    if (section) {
      return <TutorialDetail section={section} onBack={() => setOpenTutorial(null)} />;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center font-mono overflow-y-auto"
      style={{ background: '#060a12' }}
    >
      <RitualBackdrop density="subtle" />

      <div
        className="relative z-10 flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-8 transition-all duration-700 sm:px-6"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(12px)',
        }}
      >
        {/* Logo + Account */}
        <div className="flex flex-col items-center gap-2 relative w-full">
          {/* Account Hub button — top right */}
          <button
            onClick={() => setShowAccountHub(true)}
            className="absolute right-0 top-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all group"
            title="Account Settings"
          >
            <span className="text-sm text-white/30 group-hover:text-white/60 transition-colors">&#9881;</span>
            <span className="font-mono text-[8px] tracking-[0.12em] uppercase text-white/25 group-hover:text-white/50 transition-colors hidden sm:inline">
              {t('settings.account')}
            </span>
            <span
              className="text-[7px] font-bold tracking-[0.1em] uppercase px-1.5 py-0.5 rounded font-mono"
              style={{
                color: TIER_CONFIG[tier].color,
                background: `${TIER_CONFIG[tier].color}15`,
                border: `1px solid ${TIER_CONFIG[tier].color}30`,
              }}
            >
              {TIER_CONFIG[tier].icon} {TIER_CONFIG[tier].name}
            </span>
          </button>

          <h1
            className="font-mono text-4xl font-bold tracking-[0.28em] text-white sm:text-6xl"
            style={{
              animation: 'aegisGlow 4s ease-in-out infinite',
            }}
          >
            AEGIS
          </h1>
          <p
            className="font-mono text-[10px] uppercase text-center"
            style={{
              letterSpacing: '0.28em',
              color: 'rgba(0,229,255,0.45)',
            }}
          >
            Command Operations System
          </p>
          <p className="font-serif italic text-[13px] sm:text-[14px] text-center text-[#d5ddf6]/55 mt-1">
            Knowledge is the shield.
          </p>
        </div>

        {/* Training Camp Banner */}
        <button
          onClick={() => setShowTrainingCamp(true)}
          className="group relative w-full rounded-xl border overflow-hidden text-left transition-all duration-300 hover:scale-[1.01]"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(0,229,255,0.08) 50%, rgba(239,68,68,0.08) 100%)',
            borderColor: 'rgba(16,185,129,0.25)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(16,185,129,0.5)';
            e.currentTarget.style.boxShadow = '0 0 30px rgba(16,185,129,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(16,185,129,0.25)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(16,185,129,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative flex items-center gap-5 px-5 py-4 sm:py-5">
            <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center text-2xl sm:text-3xl"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}
            >
              ⚔
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-[11px] sm:text-xs font-bold tracking-[0.18em] uppercase text-[#10b981]">
                  {t('onboarding.trainingCamp')}
                </h3>
                <span className="text-[7px] font-bold tracking-[0.14em] uppercase px-1.5 py-0.5 rounded bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/20">
                  INTERACTIVE
                </span>
              </div>
              <p className="font-serif italic text-[11px] sm:text-[12px] text-white/65 leading-relaxed">
                Hands-on drills in a sandboxed replica. Fail, learn, succeed, repeat. Master every mechanic before risking real capital.
              </p>
            </div>
            <div className="flex-shrink-0 text-white/20 group-hover:text-[#10b981] transition-colors text-lg">
              →
            </div>
          </div>
        </button>

        {/* Tutorial + Modes */}
        <div className="grid w-full gap-4 lg:grid-cols-[1.2fr_1fr]">
          {/* Tutorial box */}
          <section
            className="rounded-xl border p-4 sm:p-5"
            style={{
              background: 'rgba(8,12,20,0.72)',
              borderColor: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(14px)',
            }}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase text-[#00e5ff]">
                New User Tutorial
              </h2>
              <span className="text-[8px] text-white/35 tracking-[0.14em] uppercase">Beta Onboarding</span>
            </div>

            <p className="text-[10px] text-white/60 leading-relaxed mb-4">
              Build cashflow, expand your network, and control risk. Start from the globe, acquire income-generating nodes,
              then use Athena to optimize your next move.
            </p>

            <div className="overflow-y-auto pr-1 mb-4" style={{ maxHeight: '50vh' }}>
              {TUTORIAL_CATEGORIES.map((cat) => {
                const sections = TUTORIAL_SECTIONS.filter(s => s.category === cat.key);
                if (sections.length === 0) return null;
                return (
                  <div key={cat.key} className="mb-4 last:mb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-px flex-1" style={{ background: `${cat.color}25` }} />
                      <span className="text-[8px] font-bold tracking-[0.18em] uppercase" style={{ color: cat.color }}>
                        {cat.label}
                      </span>
                      <div className="h-px flex-1" style={{ background: `${cat.color}25` }} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {sections.map((section) => (
                        <button
                          key={section.id}
                          onClick={() => setOpenTutorial(section.id)}
                          className="group rounded-lg border overflow-hidden text-left transition-all duration-200 cursor-pointer"
                          style={{
                            background: 'rgba(4,8,14,0.75)',
                            borderColor: 'rgba(255,255,255,0.08)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = `${section.color}40`;
                            e.currentTarget.style.boxShadow = `0 0 20px ${section.color}15`;
                            e.currentTarget.style.transform = 'scale(1.02)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          <div
                            className="h-20 sm:h-24 relative"
                            style={{ background: section.gradient }}
                          >
                            <div className="absolute inset-0 opacity-25"
                              style={{
                                backgroundImage:
                                  'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
                                backgroundSize: '18px 18px',
                              }}
                            />
                            <div className="absolute left-2 top-2 text-[7px] uppercase tracking-[0.14em] text-white/70">
                              {section.icon} {section.steps.length} steps
                            </div>
                            <div className="absolute right-2 top-2 text-[7px] uppercase tracking-[0.14em] text-white/0 group-hover:text-white/60 transition-colors">
                              Click to learn →
                            </div>
                          </div>
                          <div className="p-2.5">
                            <div className="text-[9px] font-bold tracking-[0.08em] text-white/85 mb-1">{section.title}</div>
                            <div className="text-[8px] leading-relaxed text-white/50">{section.summary}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg border p-3" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
              <div className="text-[9px] uppercase tracking-[0.16em] text-[#10b981] mb-2">First 5 Minutes</div>
              <ul className="space-y-1.5">
                {firstMinutesChecklist.map((item, idx) => (
                  <li key={item} className="text-[9px] text-white/65 leading-relaxed flex gap-2">
                    <span className="text-[#10b981]">{idx + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Mode grid */}
          <section
            className="rounded-xl border p-4 sm:p-5"
            style={{
              background: 'rgba(8,12,20,0.72)',
              borderColor: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(14px)',
            }}
          >
            <h2 className="text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase text-[#a78bfa] mb-3">
              Select Mode
            </h2>
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {MODES.map((mode, i) => (
                <ModeCard
                  key={mode.key}
                  mode={mode}
                  onSelect={onSelectMode}
                  index={i}
                  hasOffline={hasOffline}
                />
              ))}
              {/* Substrate — 9th mode. Gated behind VITE_SUBSTRATE_PUBLIC */}
              {/* env var (default false) OR user_metadata.substrate_tester. */}
              {/* See AEGIS_BUILD_SPEC.md §5.1 + lib/featureFlags.ts. */}
              <SubstrateModeCard
                index={MODES.length}
                onSelect={onSelectMode}
                disabled={!canAccessSubstrate}
              />
            </div>
          </section>
        </div>

        {/* Version footer */}
        <p
          className="font-mono text-[9px]"
          style={{
            color: 'rgba(156,163,175,0.25)',
            letterSpacing: '0.1em',
          }}
        >
          v3.14.19-alpha — Aegis
        </p>
      </div>
    </div>
  );
}
