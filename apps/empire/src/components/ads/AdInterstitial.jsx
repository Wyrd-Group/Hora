import React, { useEffect, useRef, useState } from 'react';
import { useAdStore, INTERSTITIAL_ADS } from '../../store/adStore';
import { useAuthStore, selectIsAdFree } from '../../store/authStore';
import { useFocusStore } from '../../store/focusStore';
import { useTranslation } from '../../lib/i18n';
import { isNativeAds } from '../../lib/admobBridge';

/**
 * AdInterstitial — Full-screen interstitial ad overlay.
 * Triggers every 20 minutes of cumulative usage (cross-session).
 * 30 seconds total, skippable after 10 seconds.
 * NEVER shown during academy/course area or when focus mode is active.
 */
const AdInterstitial = ({ activeApp }) => {
  const { t } = useTranslation();
  const adFree = useAuthStore(selectIsAdFree);
  const focusRunning = useFocusStore(s => s.isRunning);
  const {
    showInterstitial, interstitialSkippable, interstitialSecondsLeft,
    tickInterstitial, dismissInterstitial,
  } = useAdStore();

  // Suppress interstitials in academy and focus mode
  const inAcademy = activeApp === 'learn';
  const suppressed = inAcademy || focusRunning;

  const timerRef = useRef(null);
  const [adIndex] = useState(() => Math.floor(Math.random() * INTERSTITIAL_ADS.length));

  // Auto-dismiss if an interstitial triggered while entering academy/focus
  useEffect(() => {
    if (suppressed && showInterstitial) {
      dismissInterstitial();
    }
  }, [suppressed, showInterstitial, dismissInterstitial]);

  // Countdown timer
  useEffect(() => {
    if (!showInterstitial || suppressed) return;

    timerRef.current = setInterval(() => {
      tickInterstitial();
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [showInterstitial, tickInterstitial, suppressed]);

  // On native, AdMob SDK handles interstitials natively
  if (adFree || !showInterstitial || suppressed || isNativeAds) return null;

  const ad = INTERSTITIAL_ADS[adIndex % INTERSTITIAL_ADS.length];
  const progressPct = ((30 - interstitialSecondsLeft) / 30) * 100;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#030508]/97 backdrop-blur-xl">
      {/* CRT scanline effect — matches game UI */}
      <div
        className="absolute inset-0 pointer-events-none z-10 opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.03) 1px, rgba(255,255,255,0.03) 2px)',
        }}
      />

      {/* Top progress bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/[0.03]">
        <div
          className="h-full transition-all duration-1000 ease-linear"
          style={{
            width: `${progressPct}%`,
            background: `linear-gradient(90deg, ${ad.color}66, ${ad.color})`,
          }}
        />
      </div>

      {/* SPONSORED tag + timer */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[7px] tracking-[0.3em] uppercase text-white/15">
            {t('ads.intelligenceBriefing')}
          </span>
        </div>

        {/* Skip / Timer */}
        <div>
          {interstitialSkippable ? (
            <button
              onClick={dismissInterstitial}
              className="px-3 py-1 rounded border border-white/10 bg-white/5 hover:bg-white/10 font-mono text-[8px] tracking-[0.15em] uppercase text-white/50 hover:text-white transition-all"
            >
              {t('ads.skip')} ✕
            </button>
          ) : (
            <span className="font-mono text-[9px] text-white/20 tabular-nums">
              {t('ads.skipIn', { seconds: Math.max(0, 10 - (30 - interstitialSecondsLeft)) })}
            </span>
          )}
        </div>
      </div>

      {/* Ad Content — styled as intelligence briefing */}
      <div className="relative z-20 w-[90vw] max-w-[520px]">
        {/* Brand accent line */}
        <div
          className="h-[2px] w-16 mb-6 rounded-full"
          style={{ background: ad.color }}
        />

        {/* Brand logo area */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-mono text-lg"
            style={{
              background: `${ad.color}15`,
              border: `1px solid ${ad.color}30`,
              color: ad.color,
            }}
          >
            {ad.brand.charAt(0)}
          </div>
          <div>
            <div
              className="font-mono text-[9px] tracking-[0.2em] uppercase font-semibold"
              style={{ color: `${ad.color}cc` }}
            >
              {ad.brand}
            </div>
            <div className="font-mono text-[7px] text-white/20 tracking-wider">
              PARTNER BRIEFING
            </div>
          </div>
        </div>

        {/* Headline */}
        <h2 className="text-2xl md:text-3xl font-bold text-white/90 leading-tight mb-4 tracking-tight">
          {ad.headline}
        </h2>

        {/* Body text */}
        <p className="font-mono text-[11px] text-white/40 leading-relaxed mb-8 max-w-[400px]">
          {ad.body}
        </p>

        {/* CTA button */}
        <button
          className="px-6 py-2.5 rounded-lg font-mono text-[9px] tracking-[0.15em] uppercase transition-all hover:brightness-125"
          style={{
            background: `${ad.color}20`,
            border: `1px solid ${ad.color}40`,
            color: ad.color,
          }}
        >
          {t('ads.learnMore')}
        </button>

        {/* Timer display */}
        <div className="mt-8 flex items-center gap-2">
          <div className="flex-1 h-[1px] bg-white/[0.04]" />
          <span className="font-mono text-[8px] text-white/15 tabular-nums">
            {interstitialSecondsLeft}s {t('time.remaining')}
          </span>
          <div className="flex-1 h-[1px] bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
};

export default AdInterstitial;
