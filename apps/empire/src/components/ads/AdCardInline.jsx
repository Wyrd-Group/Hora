import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BANNER_ADS } from '../../store/adStore';
import { useAuthStore, selectIsAdFree } from '../../store/authStore';
import { useTranslation } from '../../lib/i18n';

/**
 * AdCardInline — Grid-native ad card that blends into ClickableSection / StatCard grids.
 * Rotates through branded ads every 20s with crossfade. Matches tactical UI card styling exactly.
 * Self-suppresses for ad-free subscription tiers (returns null).
 *
 * Props:
 *  - variant: 'stat' (StatCard size) | 'section' (ClickableSection size) | 'wide' (col-span-2)
 *  - className: additional classes
 *  - color: override accent color
 */

// Shuffle + pick a random starting ad
const pickAd = (excludeId) => {
  const pool = excludeId ? BANNER_ADS.filter(a => a.id !== excludeId) : BANNER_ADS;
  return pool[Math.floor(Math.random() * pool.length)];
};

const AD_ROTATE_INTERVAL = 15_000;

const AdCardInline = ({ variant = 'section', className = '' }) => {
  const { t } = useTranslation();
  const adFree = useAuthStore(selectIsAdFree);
  const [ad, setAd] = useState(() => pickAd());
  const [fading, setFading] = useState(false);
  const timerRef = useRef(null);

  const rotate = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setAd(prev => pickAd(prev.id));
      setFading(false);
    }, 300);
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(rotate, AD_ROTATE_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [rotate]);

  // Ad-free tiers: suppress entirely
  if (adFree) return null;

  // ── StatCard variant: compact, matches StatCard dimensions ──
  if (variant === 'stat') {
    return (
      <div className={`bg-[#0d1420] border border-tactical-border/30 rounded-lg p-3 transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'} ${className}`}>
        <div className="text-[7px] text-tactical-text/35 uppercase tracking-[0.2em] font-mono mb-1 flex items-center gap-1">
          <span className="opacity-40">▸</span> {t('ads.sponsored')}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold font-mono shrink-0"
            style={{ backgroundColor: `${ad.color}15`, color: ad.color, border: `1px solid ${ad.color}25` }}
          >
            {ad.icon}
          </span>
          <div className="min-w-0">
            <div className="text-[10px] font-bold font-mono truncate" style={{ color: ad.color }}>{ad.brand}</div>
            <div className="text-[7px] text-tactical-text/40 font-mono truncate">{ad.tagline}</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Wide variant: col-span-2 horizontal layout ──
  if (variant === 'wide') {
    return (
      <div className={`bg-[#0b1018] border border-tactical-border/30 rounded-xl p-4 col-span-2 transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'} ${className}`}>
        <div className="text-[7px] text-tactical-text/35 uppercase tracking-[0.15em] font-mono mb-2 flex items-center gap-1">
          <span className="opacity-40">▸</span> {t('ads.sponsored')}
        </div>
        <div className="flex items-center gap-4">
          <span
            className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold font-mono shrink-0"
            style={{ backgroundColor: `${ad.color}12`, color: ad.color, border: `1px solid ${ad.color}25` }}
          >
            {ad.icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold font-mono" style={{ color: ad.color }}>{ad.brand}</div>
            <div className="text-[9px] text-tactical-text/45 font-mono mt-0.5">{ad.tagline}</div>
          </div>
          <div
            className="px-3 py-1.5 rounded text-[7px] font-mono uppercase tracking-widest shrink-0"
            style={{ color: ad.color, backgroundColor: `${ad.color}10`, border: `1px solid ${ad.color}25` }}
          >
            {t('ads.learnMore')}
          </div>
        </div>
      </div>
    );
  }

  // ── Section variant (default): matches ClickableSection size ──
  return (
    <div className={`bg-[#0b1018] border border-tactical-border/30 rounded-xl p-4 transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'} ${className}`}>
      <div className="text-[7px] text-tactical-text/35 uppercase tracking-[0.15em] font-mono mb-2.5 flex items-center gap-1">
        <span className="opacity-40">▸</span> {t('ads.sponsored')}
      </div>
      <div className="flex flex-col items-center text-center">
        <span
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold font-mono mb-2"
          style={{ backgroundColor: `${ad.color}12`, color: ad.color, border: `1px solid ${ad.color}25` }}
        >
          {ad.icon}
        </span>
        <div className="text-[11px] font-bold font-mono mb-0.5" style={{ color: ad.color }}>{ad.brand}</div>
        <div className="text-[8px] text-tactical-text/40 font-mono">{ad.tagline}</div>
        <div
          className="mt-3 px-3 py-1 rounded text-[7px] font-mono uppercase tracking-widest"
          style={{ color: ad.color, backgroundColor: `${ad.color}10`, border: `1px solid ${ad.color}25` }}
        >
          {t('ads.learnMore')}
        </div>
      </div>
    </div>
  );
};

export default AdCardInline;
