/**
 * OnboardingShortIntro — the silent five-second cold-open splash that
 * fronts every entry into the application.
 *
 * Doubles as the loading state: while the auth listener resolves the
 * session in the background, this scene fills the screen so the visitor
 * never sees a bare spinner. It also serves as the bridge between any
 * two surfaces (anonymous → AuthScreen, authed → OnboardingHub, etc.).
 *
 * Beats:
 *   0.0 – 1.6s  AEGIS wordmark resolves with cyan glow and glint sweep
 *   1.5 – 2.4s  "Knowledge is the shield." tagline fades in
 *   2.6 – 3.6s  "Welcome back, [callSign]." (only when callSign provided)
 *   5.0s        onComplete() fires
 *
 * Skip control surfaces at 1.5s and fires onComplete immediately.
 *
 * Atmosphere reuses RitualBackdrop at "subtle" density so this short
 * splash sits a notch below the full ritual's intensity — sober, not
 * ceremonial. No audio: only the long ritual carries the drone.
 *
 * British English in copy.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import AegisShield from '../shared/AegisShield';
import RitualBackdrop from '../shared/RitualBackdrop';

const TOTAL_MS = 5000;
const SKIP_REVEAL_MS = 1500;

export default function OnboardingShortIntro({ onComplete = () => {}, callSign = null }) {
  const [skipVisible, setSkipVisible] = useState(false);

  // Auto-advance after the full sequence has played.
  useEffect(() => {
    const finish = setTimeout(onComplete, TOTAL_MS);
    const showSkip = setTimeout(() => setSkipVisible(true), SKIP_REVEAL_MS);
    return () => {
      clearTimeout(finish);
      clearTimeout(showSkip);
    };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden bg-[#050810] text-[#d5ddf6] select-none"
      role="status"
      aria-live="polite"
      aria-label="AEGIS opening"
    >
      <RitualBackdrop density="subtle" />

      {/* Skip control — appears at 1.5s */}
      {skipVisible && (
        <motion.button
          type="button"
          onClick={onComplete}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="absolute z-20 font-mono uppercase text-[10px] tracking-[0.4em] text-white/30 hover:text-white/80 transition-colors"
          style={{ top: 32, right: 36 }}
          data-testid="short-intro-skip"
          aria-label="Skip intro"
        >
          Skip →
        </motion.button>
      )}

      <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
        {/* sigil — small, sits above the wordmark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="mb-3"
        >
          <AegisShield size={84} withWordmark={false} />
        </motion.div>

        {/* AEGIS wordmark — slightly smaller than the ritual's invocation */}
        <motion.div
          className="ritual-wordmark font-mono font-light tracking-[0.42em] select-none"
          style={{ fontSize: 'clamp(60px, 10vw, 140px)', lineHeight: 1 }}
          initial={{ opacity: 0, letterSpacing: '0.85em', filter: 'blur(10px)' }}
          animate={{ opacity: 1, letterSpacing: '0.42em', filter: 'blur(0px)' }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        >
          AEGIS
        </motion.div>

        {/* hairline — gives the tagline a place to land */}
        <motion.div
          className="mt-7 h-px w-32 bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.7 }}
        />

        {/* Tagline */}
        <motion.div
          className="mt-7 font-mono uppercase tracking-[0.4em] text-cyan-300/80 text-[12px]"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.9 }}
        >
          Knowledge is the shield.
        </motion.div>

        {/* Personal greeting — only when we have a name */}
        {callSign && (
          <motion.div
            className="mt-9 font-serif italic text-[#d5ddf6]/70 text-[18px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.6, duration: 1.0 }}
          >
            Welcome back, {callSign}.
          </motion.div>
        )}
      </div>
    </div>
  );
}
