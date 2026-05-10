/**
 * TreasuryHome — Hora's heart screen.
 *
 * The whole core loop in one place (per docs/GAME_DESIGN.md §1):
 *   - Vault orb showing accrued gold
 *   - Tap to collect → coin burst + counter rolls up + haptic
 *   - Upgrade button → spend total to raise rate + cap
 *   - Oracle bubble surfaces contextual tips
 *
 * Per docs/VISUAL_DIRECTION.md.
 */
import { useEffect, useRef, useState } from 'react';
import HoraOrb from '../components/shared/HoraOrb';
import JuicyButton from '../components/shared/JuicyButton';
import CoinBurst from '../components/shared/CoinBurst';
import OracleBubble from '../components/shared/OracleBubble';
import { useTreasuryStore } from '../store/treasuryStore';
import { fireHaptic } from '../hooks/useHaptic';

/** UI tick frequency for the accrued counter (Hz). */
const UI_TICK_MS = 250;

export default function TreasuryHome() {
  const { total, level, ratePerSec, cap, upgradeCost, accruedSince, collect, upgrade } =
    useTreasuryStore();

  // ── visual ticker — re-renders 4×/s so the accrued counter ticks up
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), UI_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const accrued = Math.floor(accruedSince(now));
  const atCap = accrued >= cap();
  const canUpgrade = total >= upgradeCost();

  // ── coin-burst retrigger key
  const [burstKey, setBurstKey] = useState(0);
  const [bumpScale, setBumpScale] = useState(false);

  // ── Oracle bubble — contextual nudges
  const [oracleMsg, setOracleMsg] = useState<string | undefined>();
  const lastNudgeRef = useRef<string>('');

  useEffect(() => {
    let nextMsg: string | undefined;
    if (total === 0 && accrued >= 5) {
      nextMsg = 'Tap the hourglass to collect your gold!';
    } else if (atCap) {
      nextMsg = 'Treasury is full — collect now!';
    } else if (canUpgrade && level === 1) {
      nextMsg = 'You can afford an upgrade. Try it!';
    }
    if (nextMsg && nextMsg !== lastNudgeRef.current) {
      lastNudgeRef.current = nextMsg;
      setOracleMsg(nextMsg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, accrued, atCap, canUpgrade, level]);

  const oracleTone: 'tip' | 'cheer' | 'warning' =
    atCap ? 'warning' : canUpgrade ? 'cheer' : 'tip';

  // ── handlers
  const handleCollect = async () => {
    const amount = collect();
    if (amount > 0) {
      setBurstKey((k) => k + 1);
      setBumpScale(true);
      window.setTimeout(() => setBumpScale(false), 220);
      void fireHaptic(amount >= cap() * 0.8 ? 'heavy' : 'medium');
    } else {
      void fireHaptic('light');
    }
  };

  const handleUpgrade = async () => {
    if (upgrade()) {
      void fireHaptic('success');
      lastNudgeRef.current = '';
      setOracleMsg(`Level ${level + 1}! Income up.`);
    } else {
      void fireHaptic('warning');
    }
  };

  return (
    <div className="relative h-full w-full pt-10 pb-2 px-6 flex flex-col items-center">
      {/* ── Top counter row — total gold (wallet) + level ─────────── */}
      <div className="w-full flex items-center justify-between mb-6">
        <div className="flex flex-col items-start">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(26,21,48,0.5)', fontFamily: 'Fredoka, system-ui, sans-serif' }}>
            Total gold
          </span>
          <span className="hora-counter text-2xl mt-0.5" style={{ color: '#1A1530' }}>
            {total.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(26,21,48,0.5)', fontFamily: 'Fredoka, system-ui, sans-serif' }}>
            Collector
          </span>
          <span className="hora-counter text-2xl mt-0.5" style={{ color: '#7C5CFF' }}>
            L{level}
          </span>
        </div>
      </div>

      {/* ── Vault orb (tap target) ────────────────────────────────── */}
      <div className="relative mt-2 mb-6">
        <button
          type="button"
          onClick={handleCollect}
          aria-label="Collect treasury gold"
          className="relative outline-none focus-visible:ring-4 rounded-full transition-transform"
          style={{
            transform: bumpScale ? 'scale(0.94)' : 'scale(1)',
            transition: 'transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <HoraOrb size={220} animated />
          {/* Accrued counter overlaid */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="hora-counter text-4xl drop-shadow-lg" style={{
              color: '#FFFFFF',
              textShadow: '0 2px 6px rgba(0,0,0,0.4)',
              fontWeight: 700,
            }}>
              {accrued.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{
              color: 'rgba(255,255,255,0.85)',
              textShadow: '0 1px 3px rgba(0,0,0,0.3)',
              fontFamily: 'Fredoka, system-ui, sans-serif',
            }}>
              {atCap ? 'Full' : `/ ${cap().toLocaleString()}`}
            </span>
          </div>
          {/* Coin burst on tap */}
          {burstKey > 0 && <CoinBurst key={burstKey} count={14} />}
        </button>
      </div>

      {/* ── Rate readout ─────────────────────────────────────────── */}
      <p className="text-xs mb-5" style={{ color: 'rgba(26,21,48,0.55)', fontFamily: 'Nunito, system-ui, sans-serif' }}>
        Earning <strong style={{ color: '#1FCDB8' }}>{ratePerSec().toFixed(1)} gold/sec</strong>
      </p>

      {/* ── Tap-to-collect primary CTA ───────────────────────────── */}
      <JuicyButton
        size="lg"
        variant="primary"
        fullWidth
        onClick={handleCollect}
        disabled={accrued === 0}
        style={{ maxWidth: 360 }}
      >
        {accrued > 0 ? `Collect +${accrued.toLocaleString()}` : 'Waiting for gold…'}
      </JuicyButton>

      {/* ── Upgrade button ───────────────────────────────────────── */}
      <div className="mt-3 w-full max-w-sm">
        <JuicyButton
          size="md"
          variant="secondary"
          fullWidth
          onClick={handleUpgrade}
          disabled={!canUpgrade}
        >
          Upgrade · {upgradeCost().toLocaleString()} gold
        </JuicyButton>
        <p className="text-[10px] text-center mt-2" style={{ color: 'rgba(26,21,48,0.4)', fontFamily: 'Nunito, system-ui, sans-serif' }}>
          Next level: <strong>{(ratePerSec() * 1.5).toFixed(1)}/sec</strong> · cap <strong>{Math.round(cap() * 1.5).toLocaleString()}</strong>
        </p>
      </div>

      {/* ── Oracle bubble ────────────────────────────────────────── */}
      <OracleBubble message={oracleMsg} tone={oracleTone} autoHideMs={5000} />
    </div>
  );
}
