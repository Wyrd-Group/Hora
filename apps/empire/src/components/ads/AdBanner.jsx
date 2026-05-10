import React, { useEffect, useRef, useState } from 'react';
import { useAdStore, BANNER_ADS, BANNER_ROTATE_MS } from '../../store/adStore';
import { useAuthStore, selectIsAdFree } from '../../store/authStore';
import { useTranslation } from '../../lib/i18n';
import { isNativeAds } from '../../lib/admobBridge';

/**
 * AdBanner — Subtle, persistent banner ad at the bottom of the screen.
 * Rotates every 15 seconds. Designed to blend with the tactical UI.
 * Sits just above the mobile nav bar (or at the very bottom on desktop).
 *
 * Height: 28px desktop / 36px mobile — minimal intrusion.
 */
const AdBanner = () => {
  const { t } = useTranslation();
  const adFree = useAuthStore(selectIsAdFree);
  const { currentBannerIndex, rotateBanner } = useAdStore();
  const [transitioning, setTransitioning] = useState(false);
  const intervalRef = useRef(null);

  // Rotate banner every 15 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => {
        rotateBanner();
        setTransitioning(false);
      }, 300); // Fade transition duration
    }, BANNER_ROTATE_MS);

    return () => clearInterval(intervalRef.current);
  }, [rotateBanner]);

  const ad = BANNER_ADS[currentBannerIndex % BANNER_ADS.length];
  // On native, AdMob SDK renders its own banner — hide the simulated one
  if (adFree || !ad || isNativeAds) return null;

  return (
    <div
      className="fixed left-0 right-0 z-[25] md:z-[25] max-md:z-[35] flex items-center justify-center transition-all duration-500 md:bottom-0 max-md:top-0 max-md:bottom-auto"
      style={{
        height: '28px',
      }}
    >
      {/* Banner container — glassmorphism matching tactical UI */}
      <div
        className={`
          flex items-center justify-center gap-2 px-4 h-full w-full
          bg-[#060a12]/85 backdrop-blur-md
          border-t border-white/[0.04]
          transition-opacity duration-300
          ${transitioning ? 'opacity-0' : 'opacity-100'}
        `}
      >
        {/* Sponsored tag */}
        <span className="font-mono text-[6px] tracking-[0.2em] uppercase text-white/15 shrink-0">
          {t('ads.sponsored')}
        </span>
        <span className="text-white/[0.06] text-[8px]">|</span>

        {/* Ad content */}
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span
            className="text-[9px] shrink-0"
            style={{ color: `${ad.color}88` }}
          >
            {ad.icon}
          </span>
          <span
            className="font-mono text-[8px] font-semibold tracking-wider shrink-0"
            style={{ color: `${ad.color}99` }}
          >
            {ad.brand}
          </span>
          <span className="font-mono text-[7px] text-white/20 truncate hidden sm:inline">
            {ad.tagline}
          </span>
        </div>

        {/* CTA */}
        <button
          className="shrink-0 px-2 py-0.5 rounded font-mono text-[6px] tracking-[0.15em] uppercase transition-all hover:brightness-150"
          style={{
            color: `${ad.color}aa`,
            border: `1px solid ${ad.color}22`,
            background: `${ad.color}08`,
          }}
        >
          {t('ads.learnMore')}
        </button>
      </div>
    </div>
  );
};

export default AdBanner;
