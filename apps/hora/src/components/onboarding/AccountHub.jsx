import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useEmpireStore } from '../../store/empireStore';
import { useCurriculumStore } from '../../store/curriculumStore';
import { useCardEconomyStore } from '../../store/cardEconomyStore';
import { TIER_CONFIG, TIER_FEATURES } from '../../data/subscriptionTiers';
import APPurchaseModal from '../economy/APPurchaseModal';
import { usePerformanceStore, PRESETS } from '../../store/performanceStore';
import { useI18nStore, useTranslation, LANGUAGES } from '../../lib/i18n';
import PrivacyPolicy from '../legal/PrivacyPolicy';
import TermsOfService from '../legal/TermsOfService';
import FinancialDisclaimer from '../legal/FinancialDisclaimer';
import DeleteAccountDialog from './DeleteAccountDialog';

const TABS = [
  { key: 'profile',     tKey: 'settings.profile',     icon: '\u25C9' },
  { key: 'ecfl',        tKey: 'settings.ecfl',         icon: '\u25C8' },
  { key: 'membership',  tKey: 'settings.membership',   icon: '\u2605' },
  { key: 'security',    tKey: 'settings.security',     icon: '\u26BF' },
  { key: 'preferences', tKey: 'settings.preferences',  icon: '\u2699' },
  { key: 'performance', tKey: 'settings.performance',  icon: '\u26A1' },
  { key: 'economy',     tKey: 'settings.economy',      icon: '\u00A4' },
  { key: 'billing',     tKey: 'settings.billing',      icon: '\u25A3' },
];

// ── Profile Tab ──────────────────────────────────────────────────
function ProfileTab() {
  const user = useAuthStore(s => s.user);
  const guestMode = useAuthStore(s => s.guestMode);
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Operator';

  return (
    <div className="space-y-4">
      <SectionHeader title="Profile" />
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 space-y-3">
        {guestMode ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-2 opacity-30">&#9670;</div>
            <p className="text-sm text-white/50">Guest Mode</p>
            <p className="text-[10px] text-white/30 mt-1">Sign up to save your progress across devices</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-[#00e5ff]/10 border border-[#00e5ff]/20 flex items-center justify-center text-xl text-[#00e5ff]/60">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-bold text-white/80">{displayName}</div>
                <div className="text-[10px] text-white/30">{user?.email}</div>
              </div>
            </div>
            <InfoRow label="User ID" value={user?.id?.slice(0, 8) + '...'} />
            <InfoRow label="Created" value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'} />
          </>
        )}
      </div>
    </div>
  );
}

// ── ECFL Tab ─────────────────────────────────────────────────────
function ECFLTab() {
  const ecflScore = useEmpireStore(s => s.ecflScore);
  const flouLevel = useEmpireStore(s => s.flouLevel);
  const completedLessons = useEmpireStore(s => s.completedLessons);
  const passedExams = useEmpireStore(s => s.passedExams);
  const ceoExperience = useEmpireStore(s => s.ceoExperience);
  const ecflBand = useCurriculumStore(s => s.ecflBand);
  const certificates = useCurriculumStore(s => s.certificates);

  const bandColors = { F1: '#10b981', F2: '#f59e0b', F3: '#ef4444', F4: '#8b5cf6', F5: '#3b82f6', F6: '#ec4899' };
  const bandColor = bandColors[ecflBand] || '#9CA3AF';

  return (
    <div className="space-y-4">
      <SectionHeader title="ECFL & Certifications" />

      {/* ECFL Band Card */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: bandColor }}>
              ECFL Band
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ color: bandColor, background: `${bandColor}15`, border: `1px solid ${bandColor}30` }}>
              {ecflBand || 'Unrated'}
            </span>
          </div>
          <span className="text-[10px] text-white/30 font-mono">Level {flouLevel}/10</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, flouLevel * 10)}%`, background: bandColor }} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MiniStat label="ECFL Score" value={ecflScore} color={bandColor} />
          <MiniStat label="CEO XP" value={ceoExperience} color="#7c3aed" />
          <MiniStat label="Lessons" value={completedLessons?.length || 0} color="#00e5ff" />
          <MiniStat label="Exams Passed" value={passedExams?.length || 0} color="#10b981" />
        </div>
      </div>

      {/* Certificates */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
        <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40 mb-2">
          Certificates ({certificates.length})
        </div>
        {certificates.length === 0 ? (
          <p className="text-[10px] text-white/20">No certificates earned yet. Complete ECFL exams to earn certifications.</p>
        ) : (
          <div className="space-y-2">
            {certificates.map((cert, i) => {
              const cColor = bandColors[cert.band] ?? '#10b981';
              return (
                <div key={cert.id ?? i} className="flex items-center gap-2 text-[10px] py-1 border-b border-white/[0.03] last:border-0">
                  <span style={{ color: cColor }}>✓</span>
                  <span className="text-white/60 flex-1 truncate">{cert.courseName || cert.courseId}</span>
                  {cert.band && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{ color: cColor, backgroundColor: `${cColor}10`, border: `1px solid ${cColor}20` }}>
                      {cert.band}
                    </span>
                  )}
                  {cert.grade && (
                    <span className="text-[8px] font-bold text-white/40">{cert.grade}</span>
                  )}
                  {cert.score != null && (
                    <span className="text-[8px] font-mono" style={{ color: cColor }}>{cert.score}%</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Membership Tab ───────────────────────────────────────────────
function MembershipTab() {
  const tier = useAuthStore(s => s.subscriptionTier);
  const setTier = useAuthStore(s => s.setSubscriptionTier);
  const config = TIER_CONFIG[tier];

  return (
    <div className="space-y-4">
      <SectionHeader title="Membership" />

      {/* Current tier */}
      <div className="rounded-lg p-4 border" style={{ borderColor: `${config.color}30`, background: `${config.color}08` }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{config.icon}</span>
          <span className="text-sm font-bold tracking-[0.15em] uppercase" style={{ color: config.color }}>
            AEGIS {config.name}
          </span>
        </div>
        <span className="text-[10px] text-white/40">{config.price}</span>
      </div>

      {/* Feature comparison grid */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-5 text-center border-b border-white/[0.06]">
          <div className="p-2 text-[8px] text-white/30 tracking-wider uppercase">Feature</div>
          {Object.values(TIER_CONFIG).map(t => (
            <div key={t.name} className="p-2 text-[8px] font-bold tracking-wider uppercase" style={{ color: t.color }}>
              {t.icon} {t.name}
            </div>
          ))}
        </div>

        {/* Feature rows */}
        {TIER_FEATURES.map(feat => (
          <div key={feat.key} className="grid grid-cols-5 text-center border-b border-white/[0.03] last:border-b-0">
            <div className="p-2 text-[9px] text-white/50 text-left">{feat.label}</div>
            {Object.values(TIER_CONFIG).map(t => (
              <div key={t.name} className="p-2 text-[10px]">
                {t[feat.key] ? (
                  <span className="text-[#10b981]">&#10003;</span>
                ) : (
                  <span className="text-white/15">&#10005;</span>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Price row */}
        <div className="grid grid-cols-5 text-center bg-white/[0.02]">
          <div className="p-2 text-[9px] text-white/50 text-left">Price</div>
          {Object.values(TIER_CONFIG).map(t => (
            <div key={t.name} className="p-2 text-[10px] font-bold" style={{ color: t.color }}>
              {t.price}
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade / change buttons */}
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(TIER_CONFIG).map(([k, t]) => {
          const tierNum = Number(k);
          const isCurrent = tierNum === tier;
          return (
            <button
              key={k}
              onClick={() => {
                // Stripe payment integration deferred to post-beta monetization milestone
                setTier(tierNum);
              }}
              disabled={isCurrent}
              className="py-2 rounded border text-[9px] font-bold tracking-wider uppercase transition-all"
              style={{
                color: isCurrent ? t.color : `${t.color}80`,
                borderColor: isCurrent ? `${t.color}60` : `${t.color}20`,
                background: isCurrent ? `${t.color}15` : 'transparent',
                cursor: isCurrent ? 'default' : 'pointer',
              }}
            >
              {isCurrent ? 'Current' : tierNum > tier ? 'Upgrade' : 'Switch'}
            </button>
          );
        })}
      </div>

      <p className="text-[8px] text-white/15 text-center tracking-wider">
        {import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
          ? 'Secure payments via Stripe. Cancel anytime from this panel.'
          : 'Tier changes are instant during alpha testing.'}
      </p>
    </div>
  );
}

// ── Security Tab ─────────────────────────────────────────────────
function SecurityTab() {
  const user = useAuthStore(s => s.user);
  const signOut = useAuthStore(s => s.signOut);
  const updatePassword = useAuthStore(s => s.updatePassword);
  const submitting = useAuthStore(s => s.submitting);
  const error = useAuthStore(s => s.error);
  const guestMode = useAuthStore(s => s.guestMode);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleChangePassword = async () => {
    if (newPw.length < 6) { setPwMsg('Minimum 6 characters'); return; }
    if (newPw !== confirmPw) { setPwMsg('Passwords do not match'); return; }
    const ok = await updatePassword(newPw);
    setPwMsg(ok ? 'Password updated.' : 'Failed to update password.');
    if (ok) { setNewPw(''); setConfirmPw(''); }
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Security" />

      {!guestMode && user && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 space-y-3">
          <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40 mb-2">Change Password</div>
          <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password"
            className="w-full bg-black/40 border border-white/[0.08] rounded px-3 py-2 text-xs text-white/70 placeholder-white/20 outline-none focus:border-[#00e5ff]/40" />
          <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirm password"
            className="w-full bg-black/40 border border-white/[0.08] rounded px-3 py-2 text-xs text-white/70 placeholder-white/20 outline-none focus:border-[#00e5ff]/40" />
          {pwMsg && <p className="text-[10px] text-[#f59e0b]">{pwMsg}</p>}
          {error && <p className="text-[10px] text-rose-400">{error}</p>}
          <button onClick={handleChangePassword} disabled={submitting}
            className="w-full py-2 rounded border border-[#00e5ff]/30 bg-[#00e5ff]/10 text-[#00e5ff] text-[10px] font-bold tracking-wider uppercase hover:bg-[#00e5ff]/20 transition-all">
            {submitting ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      )}

      {/* Session Info */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 space-y-2">
        <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40 mb-1">Session</div>
        <InfoRow label="Mode" value={guestMode ? 'Guest' : 'Authenticated'} />
        {user && <InfoRow label="Email" value={user.email} />}
      </div>

      {/* Sign Out */}
      <button onClick={signOut}
        className="w-full py-2.5 rounded border border-rose-500/30 bg-rose-500/5 text-rose-400 text-[10px] font-bold tracking-wider uppercase hover:bg-rose-500/15 transition-all">
        Sign Out
      </button>

      {/* Delete Account (authenticated only) */}
      {!guestMode && user && (
        <>
          <div className="pt-4 mt-2 border-t border-white/[0.06]">
            <div className="text-[9px] tracking-[0.2em] uppercase text-rose-400/60 font-bold mb-2">
              Danger Zone
            </div>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="w-full py-2.5 rounded border border-rose-500/40 bg-rose-500/[0.08] text-rose-400 text-[10px] font-bold tracking-wider uppercase hover:bg-rose-500/15 transition-all"
            >
              Delete Account
            </button>
            <p className="text-[8px] text-white/25 mt-2 leading-relaxed">
              Permanently removes your account and all associated data. This cannot be undone.
            </p>
          </div>
          {showDeleteDialog && (
            <DeleteAccountDialog onClose={() => setShowDeleteDialog(false)} />
          )}
        </>
      )}
    </div>
  );
}

// ── Preferences Tab ──────────────────────────────────────────────
function PreferencesTab() {
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aegis-preferences') || '{}'); }
    catch { return {}; }
  });
  const currentLang = useI18nStore(s => s.language);
  const setLanguage = useI18nStore(s => s.setLanguage);

  // Apply saved preferences on mount
  useEffect(() => {
    if (prefs.fontSize) document.documentElement.style.fontSize = `${prefs.fontSize}px`;
    if (prefs.reducedMotion) document.documentElement.classList.add('reduce-motion');
    if (prefs.highContrast) document.documentElement.classList.add('high-contrast');
  }, []);

  const update = (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem('aegis-preferences', JSON.stringify(next));

    // Apply preferences to document immediately
    if (key === 'fontSize') {
      document.documentElement.style.fontSize = `${value}px`;
    }
    if (key === 'reducedMotion') {
      document.documentElement.classList.toggle('reduce-motion', value);
    }
    if (key === 'highContrast') {
      document.documentElement.classList.toggle('high-contrast', value);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Language & Accessibility" />

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 space-y-3">
        {/* Language */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/50">Language</span>
          <select
            value={currentLang}
            onChange={e => setLanguage(e.target.value)}
            className="bg-black/40 border border-white/[0.08] rounded px-2 py-1 text-[10px] text-white/70 outline-none cursor-pointer max-w-[160px]"
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.nativeLabel} ({l.label})</option>
            ))}
          </select>
        </div>

        {/* Font Size */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/50">Font Size</span>
          <div className="flex items-center gap-2">
            <input type="range" min="10" max="16" value={prefs.fontSize || 12}
              onChange={e => update('fontSize', Number(e.target.value))}
              className="w-20 accent-[#00e5ff]" />
            <span className="text-[10px] text-white/30 w-6 text-right">{prefs.fontSize || 12}px</span>
          </div>
        </div>

        {/* Reduced Motion */}
        <ToggleRow label="Reduced Motion" value={!!prefs.reducedMotion} onChange={v => update('reducedMotion', v)} />

        {/* High Contrast */}
        <ToggleRow label="High Contrast" value={!!prefs.highContrast} onChange={v => update('highContrast', v)} />
      </div>
    </div>
  );
}

// ── Performance Tab ──────────────────────────────────────────────
function PerformanceTab() {
  const store = usePerformanceStore();
  const { activePreset, applyPreset, setSetting } = store;

  const presetList = [
    { key: 'low',    label: 'LOW',    desc: 'Budget phones, slow connections',   color: '#9CA3AF' },
    { key: 'medium', label: 'MEDIUM', desc: 'Mid-range phones, tablets',          color: '#00e5ff' },
    { key: 'high',   label: 'HIGH',   desc: 'Modern phones, laptops',             color: '#a78bfa' },
    { key: 'ultra',  label: 'ULTRA',  desc: 'Desktop, high-end devices',          color: '#f59e0b' },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader title="Performance Settings" />

      {/* Presets */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 space-y-3">
        <div className="text-[10px] text-white/40 font-bold tracking-[0.15em] uppercase mb-2">Quick Presets</div>
        <div className="grid grid-cols-4 gap-2">
          {presetList.map(p => (
            <button key={p.key} onClick={() => applyPreset(p.key)}
              className={`py-2 px-1 rounded border text-center transition-all ${
                activePreset === p.key
                  ? 'border-white/20 bg-white/[0.06]'
                  : 'border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.04]'
              }`}
            >
              <div className="text-[10px] font-bold tracking-wider" style={{ color: p.color }}>{p.label}</div>
              <div className="text-[7px] text-white/30 mt-0.5">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Graphics */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 space-y-3">
        <div className="text-[10px] text-white/40 font-bold tracking-[0.15em] uppercase mb-2">Graphics</div>

        {/* Map Mode */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] text-white/50">Map Rendering</span>
            <div className="text-[7px] text-white/25">3D uses WebGL (GPU heavy) · 2D is lightweight</div>
          </div>
          <div className="flex gap-1">
            {['3d', '2d'].map(mode => (
              <button key={mode} onClick={() => setSetting('mapMode', mode)}
                className={`px-3 py-1 rounded text-[9px] font-bold tracking-wider uppercase transition-all ${
                  store.mapMode === mode
                    ? 'bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/30'
                    : 'bg-white/[0.03] text-white/30 border border-white/[0.06] hover:bg-white/[0.06]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <ToggleRow label="Particle Effects" value={store.particleEffects} onChange={v => setSetting('particleEffects', v)} />
        <ToggleRow label="Animations" value={store.animationsEnabled} onChange={v => setSetting('animationsEnabled', v)} />
        <ToggleRow label="Backdrop Blur" value={store.backdropBlur} onChange={v => setSetting('backdropBlur', v)} />
        <ToggleRow label="Vehicle Traffic on Map" value={store.trafficSimulation} onChange={v => setSetting('trafficSimulation', v)} />
      </div>

      {/* Simulation */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 space-y-3">
        <div className="text-[10px] text-white/40 font-bold tracking-[0.15em] uppercase mb-2">Simulation</div>

        {/* Monte Carlo Iterations */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div>
              <span className="text-[10px] text-white/50">Prediction Accuracy</span>
              <div className="text-[7px] text-white/25">Monte Carlo paths — more = better predictions, more CPU</div>
            </div>
            <span className="text-[10px] font-mono text-[#00e5ff]/70">{store.monteCarloIterations}</span>
          </div>
          <input type="range" min="100" max="2000" step="100" value={store.monteCarloIterations}
            onChange={e => setSetting('monteCarloIterations', Number(e.target.value))}
            className="w-full accent-[#00e5ff] h-1" />
          <div className="flex justify-between text-[7px] text-white/20 mt-0.5">
            <span>100 (fast)</span>
            <span>2000 (precise)</span>
          </div>
        </div>

        {/* Chart Candles */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div>
              <span className="text-[10px] text-white/50">Chart Detail</span>
              <div className="text-[7px] text-white/25">Max OHLC candles rendered on charts</div>
            </div>
            <span className="text-[10px] font-mono text-[#a78bfa]/70">{store.maxChartCandles}</span>
          </div>
          <input type="range" min="50" max="500" step="50" value={store.maxChartCandles}
            onChange={e => setSetting('maxChartCandles', Number(e.target.value))}
            className="w-full accent-[#a78bfa] h-1" />
          <div className="flex justify-between text-[7px] text-white/20 mt-0.5">
            <span>50 (fast)</span>
            <span>500 (detailed)</span>
          </div>
        </div>
      </div>

      {/* Device Info */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 space-y-2">
        <div className="text-[10px] text-white/40 font-bold tracking-[0.15em] uppercase mb-2">Your Device</div>
        <InfoRow label="CPU Cores" value={navigator.hardwareConcurrency || '?'} />
        <InfoRow label="RAM" value={navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'Unknown'} />
        <InfoRow label="GPU" value={(() => {
          try {
            const gl = document.createElement('canvas').getContext('webgl');
            const ext = gl?.getExtension('WEBGL_debug_renderer_info');
            return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL).split('/')[0].trim() : 'WebGL supported';
          } catch { return 'Unknown'; }
        })()} />
        <InfoRow label="Screen" value={`${screen.width}×${screen.height} @${devicePixelRatio}x`} />
        <InfoRow label="Platform" value={/Android/i.test(navigator.userAgent) ? 'Android' : /iPhone|iPad/i.test(navigator.userAgent) ? 'iOS' : 'Desktop'} />
      </div>
    </div>
  );
}

// ── Economy Tab ──────────────────────────────────────────────────
function EconomyTab() {
  const aegisPoints = useCardEconomyStore(s => s.aegisPoints);
  const [showAPModal, setShowAPModal] = useState(false);

  return (
    <div className="space-y-4">
      <SectionHeader title="Economy & Tokens" />

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#ec4899]/60">Aegis Points</div>
            <div className="text-2xl font-black text-[#ec4899] mt-1">{aegisPoints.toLocaleString()} <span className="text-sm font-normal text-[#ec4899]/50">AP</span></div>
          </div>
          <button onClick={() => setShowAPModal(true)}
            className="px-4 py-2 rounded border border-[#ec4899]/30 bg-[#ec4899]/10 text-[#ec4899] text-[10px] font-bold tracking-wider uppercase hover:bg-[#ec4899]/20 transition-all">
            Buy AP
          </button>
        </div>
      </div>

      {showAPModal && <APPurchaseModal onClose={() => setShowAPModal(false)} />}
    </div>
  );
}

// ── Billing Tab ──────────────────────────────────────────────────
function BillingTab() {
  const tier = useAuthStore(s => s.subscriptionTier);
  const config = TIER_CONFIG[tier];

  return (
    <div className="space-y-4">
      <SectionHeader title="Billing & Payment" />

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 space-y-3">
        <InfoRow label="Current Plan" value={`AEGIS ${config.name}`} />
        <InfoRow label="Monthly Cost" value={config.price} />
        <InfoRow label="Payment Method" value="None configured" />
        <InfoRow label="Next Billing" value="N/A" />
      </div>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
        <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40 mb-2">Transaction History</div>
        <p className="text-[10px] text-white/20">No transactions yet.</p>
      </div>

      <p className="text-[8px] text-white/15 text-center tracking-wider">
        {import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
          ? 'All purchases are processed securely by Stripe.'
          : 'Alpha build — purchases are simulated.'}
      </p>
    </div>
  );
}

// ── Shared Components ────────────────────────────────────────────
function SectionHeader({ title }) {
  return <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#00e5ff]/70">{title}</h3>;
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-white/40">{label}</span>
      <span className="text-[10px] text-white/60 font-mono">{value}</span>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className="bg-black/30 rounded p-2">
      <div className="text-[8px] uppercase tracking-wider text-white/30">{label}</div>
      <div className="text-sm font-bold font-mono" style={{ color }}>{value}</div>
    </div>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-white/50">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-8 h-4 rounded-full transition-all relative ${value ? 'bg-[#00e5ff]/30' : 'bg-white/10'}`}
      >
        <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${value ? 'left-4 bg-[#00e5ff]' : 'left-0.5 bg-white/30'}`} />
      </button>
    </div>
  );
}

// ── Tab Content Map ──────────────────────────────────────────────
const TAB_COMPONENTS = {
  profile: ProfileTab,
  ecfl: ECFLTab,
  membership: MembershipTab,
  security: SecurityTab,
  preferences: PreferencesTab,
  performance: PerformanceTab,
  economy: EconomyTab,
  billing: BillingTab,
};

// ── Main AccountHub ──────────────────────────────────────────────
export default function AccountHub({ onBack }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [legalModal, setLegalModal] = useState(null); // 'privacy' | 'tos' | 'disclaimer' | null
  const tier = useAuthStore(s => s.subscriptionTier);
  const config = TIER_CONFIG[tier];
  const TabContent = TAB_COMPONENTS[activeTab] || ProfileTab;
  const { t } = useTranslation();

  // ESC to close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onBack?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onBack]);

  return (
    <div className="fixed inset-0 z-50 flex font-mono" style={{ background: '#060a12' }}>
      {/* ── Left Sidebar ─────────────────────────────────────── */}
      <div className="w-52 flex-shrink-0 border-r border-white/[0.06] bg-[#070c14] flex flex-col">
        {/* Header */}
        <div className="px-4 pt-5 pb-4">
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 transition-colors tracking-wider uppercase mb-4">
            <span>&larr;</span> Back
          </button>
          <h2 className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/50">Account</h2>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{ color: config.color, background: `${config.color}15`, border: `1px solid ${config.color}25` }}>
              {config.icon} {config.name}
            </span>
          </div>
        </div>

        {/* Tab navigation */}
        <nav className="flex-1 px-2 space-y-0.5">
          {TABS.map(tab => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full text-left px-3 py-2 rounded text-[10px] tracking-wider uppercase transition-all flex items-center gap-2 ${
                  active
                    ? 'bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20'
                    : 'text-white/30 hover:text-white/50 hover:bg-white/[0.03] border border-transparent'
                }`}
              >
                <span className="text-sm w-4 text-center opacity-60">{tab.icon}</span>
                {t(tab.tKey)}
              </button>
            );
          })}
        </nav>

        {/* Legal links + version footer */}
        <div className="px-4 py-3 space-y-2">
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setLegalModal('privacy')}
              className="text-left text-[8px] text-white/25 hover:text-white/50 tracking-wider uppercase transition-colors"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setLegalModal('tos')}
              className="text-left text-[8px] text-white/25 hover:text-white/50 tracking-wider uppercase transition-colors"
            >
              Terms of Service
            </button>
            <button
              onClick={() => setLegalModal('disclaimer')}
              className="text-left text-[8px] text-white/25 hover:text-white/50 tracking-wider uppercase transition-colors"
            >
              Financial Disclaimer
            </button>
          </div>
          <span className="block text-[8px] text-white/10 tracking-wider">v3.14.19-alpha</span>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-6 py-8">
          <TabContent />
        </div>
      </div>

      {/* Legal modals */}
      {legalModal === 'privacy' && <PrivacyPolicy onClose={() => setLegalModal(null)} />}
      {legalModal === 'tos' && <TermsOfService onClose={() => setLegalModal(null)} />}
      {legalModal === 'disclaimer' && <FinancialDisclaimer onClose={() => setLegalModal(null)} />}
    </div>
  );
}
