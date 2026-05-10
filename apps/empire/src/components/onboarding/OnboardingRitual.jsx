/**
 * OnboardingRitual — the AEGIS first-time initiation flow.
 *
 * Six beats:
 *   0. Threshold     — gate the audio context, calm the room.
 *   1. Invocation    — colossal AEGIS wordmark + the gravity line.
 *   2. Transmission  — Athena's three lines, the shield is the click target.
 *   3. Inscription   — call-sign capture.
 *   4. The Oath      — three carved-reveal principles + accept.
 *   5. Entry         — addresses the operator by call sign, auto-advances.
 *
 * Atmosphere is composed from shared primitives:
 *   AegisShield, RitualBackdrop, RitualButton, useAudioDrone.
 *
 * Audio is pure Web Audio (no library). Master gain swells on Athena's third
 * line, on each oath principle, and on entry. Audio context only starts
 * after the user's "I am ready" click — browser autoplay policy compliance.
 *
 * onComplete signature:
 *   ({ callSign: string, skipped?: boolean }) => void
 *
 * The component renders fixed-position fullscreen at z-[100]; the parent
 * gate decides when to mount it.
 *
 * British English in copy. The Latin inscription EX · IGNORANTIA · CAPTIVITAS
 * and "Knowledge is the shield." are canonical.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import AegisShield from '../shared/AegisShield';
import RitualBackdrop from '../shared/RitualBackdrop';
import RitualButton from '../shared/RitualButton';
import { useAudioDrone } from '../../hooks/useAudioDrone';

// ── Beat order / labels ──────────────────────────────────────────────
const BEATS = ['threshold', 'invocation', 'athena', 'naming', 'oath', 'entry'];
const BEAT_LABELS = ['THRESHOLD', 'INVOCATION', 'TRANSMISSION', 'INSCRIPTION', 'THE OATH', 'ENTRY'];

const beatTransition = { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] };

// ── Reveal helpers ───────────────────────────────────────────────────

/**
 * React passes mixed text/expression children as an array; calling String()
 * on that array joins with commas. Flatten to a single string so .split(' ')
 * works correctly. (Filters out non-text children defensively.)
 */
function flattenChildren(children) {
  return React.Children
    .toArray(children)
    .filter((c) => typeof c === 'string' || typeof c === 'number')
    .join('');
}

function WordReveal({ children, delay = 0, className = '' }) {
  const words = flattenChildren(children).split(' ');
  return (
    <motion.span
      className={className}
      initial="hidden"
      animate="shown"
      variants={{
        shown: { transition: { staggerChildren: 0.10, delayChildren: delay } },
      }}
    >
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          className="inline-block mr-[0.25em]"
          variants={{
            hidden: { opacity: 0, y: 10, filter: 'blur(6px)' },
            shown:  { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7 } },
          }}
        >
          {w}
        </motion.span>
      ))}
    </motion.span>
  );
}

function CarvedReveal({ children, delay = 0, className = '' }) {
  const chars = flattenChildren(children).split('');
  return (
    <motion.span
      className={className}
      initial="hidden"
      animate="shown"
      variants={{
        shown: { transition: { staggerChildren: 0.025, delayChildren: delay } },
      }}
    >
      {chars.map((c, i) => (
        <motion.span
          key={i}
          className="inline-block"
          style={{ whiteSpace: c === ' ' ? 'pre' : 'normal' }}
          variants={{
            hidden: { opacity: 0, y: 4, filter: 'blur(3px)' },
            shown:  { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.45 } },
          }}
        >
          {c}
        </motion.span>
      ))}
    </motion.span>
  );
}

// ── HUD frame (corner brackets, rails, micro-text) ───────────────────
function HudFrame({ beatLabel = 'INVOCATION', beatIndex = 0, callSign = '' }) {
  const ts = useMemo(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
    // beatIndex is intentionally part of the deps so the timestamp re-snaps per beat
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beatIndex]);

  return (
    <>
      <div className="ritual-bracket ritual-bracket-tl" />
      <div className="ritual-bracket ritual-bracket-tr" />
      <div className="ritual-bracket ritual-bracket-bl" />
      <div className="ritual-bracket ritual-bracket-br" />
      <div className="ritual-rail-h-top" />
      <div className="ritual-rail-h-bot" />
      <div className="ritual-rail-v-l" />
      <div className="ritual-rail-v-r" />

      <div className="ritual-hud-tl flex items-center gap-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 pulse-dot" />
        AEGIS · ATHENA ONLINE
      </div>
      <div className="ritual-hud-tr">{ts}</div>
      <div className="ritual-hud-bl">
        PHASE {String(beatIndex + 1).padStart(2, '0')} / 06 · {beatLabel}
      </div>
      <div className="ritual-hud-br">
        {callSign ? `OPERATOR // ${callSign.toUpperCase()}` : 'OPERATOR // —'}
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// Beat 0 — Threshold (audio gate)
// ════════════════════════════════════════════════════════════════════
function BeatThreshold({ onContinue }) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={beatTransition}
    >
      <motion.div
        className="font-mono uppercase text-[11px] tracking-[0.55em] text-cyan-300/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 1.2 }}
      >
        — Threshold —
      </motion.div>

      <motion.div
        className="mt-10 font-serif italic text-[#d5ddf6]/85 text-[20px] sm:text-[22px] max-w-md text-center leading-relaxed"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 1.0 }}
      >
        Stand still. Lower the room. Put your phone face-down.
      </motion.div>

      <motion.div
        className="mt-2 font-serif italic text-white/40 text-[15px] max-w-md text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.6, duration: 1.0 }}
      >
        What follows takes ninety seconds.
      </motion.div>

      <motion.div
        className="mt-16"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 4.0, duration: 0.8 }}
      >
        <RitualButton onClick={onContinue} testId="cta-begin" big>
          I am ready
        </RitualButton>
      </motion.div>

      <motion.div
        className="mt-6 font-mono uppercase text-[9px] tracking-[0.35em] text-white/25"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 5.0, duration: 0.6 }}
      >
        sound recommended
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Beat 1 — Invocation
// ════════════════════════════════════════════════════════════════════
function BeatInvocation({ onContinue }) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={beatTransition}
    >
      {/* sigil mark above wordmark */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-2"
      >
        <AegisShield size={120} withWordmark={false} />
      </motion.div>

      {/* AEGIS — colossal */}
      <motion.div
        className="ritual-wordmark font-mono font-light tracking-[0.42em] select-none"
        style={{ fontSize: 'clamp(80px, 14vw, 200px)', lineHeight: 1 }}
        initial={{ opacity: 0, letterSpacing: '0.95em', filter: 'blur(14px)' }}
        animate={{ opacity: 1, letterSpacing: '0.42em', filter: 'blur(0px)' }}
        transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
      >
        AEGIS
      </motion.div>

      <motion.div
        className="mt-10 h-px w-40 bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: 3.2, duration: 1.0 }}
      />

      {/* Gravity line */}
      <div className="mt-10 max-w-md text-center font-serif italic text-[18px] sm:text-[20px] leading-relaxed text-[#d5ddf6]/90">
        <WordReveal delay={4.0}>
          What you are about to learn cannot be unlearned.
        </WordReveal>
      </div>

      {/* Tagline — earned, arrives last */}
      <motion.div
        className="mt-12 font-mono uppercase text-[12px] tracking-[0.4em] text-cyan-300"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 7.6, duration: 1.0 }}
      >
        Knowledge is the shield.
      </motion.div>

      <motion.div
        className="mt-16"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 9.0, duration: 0.7 }}
      >
        <RitualButton onClick={onContinue} testId="cta-continue">
          Continue
        </RitualButton>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Beat 2 — Transmission (the shield is the click target)
// ════════════════════════════════════════════════════════════════════
function BeatAthena({ onContinue, audio }) {
  // Swell on Athena's third line ("I am handing it to you.")
  useEffect(() => {
    const id = setTimeout(() => audio.swell(2.2, 0.32), 4400);
    return () => clearTimeout(id);
  }, [audio]);

  return (
    <motion.div
      className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2 items-center px-8 lg:px-24 gap-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={beatTransition}
    >
      {/* Left — text */}
      <div className="flex flex-col items-start lg:items-end lg:pr-8 max-w-xl ml-auto">
        <motion.div
          className="font-mono uppercase text-[10px] tracking-[0.55em] text-cyan-300/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          — Transmission —
        </motion.div>

        <div className="mt-10 font-serif italic text-[26px] sm:text-[30px] leading-[1.4] text-[#d5ddf6]">
          <WordReveal delay={1.0}>I am Athena.</WordReveal>
        </div>
        <div className="mt-6 font-serif italic text-[22px] sm:text-[26px] leading-[1.45] text-[#d5ddf6]/80">
          <WordReveal delay={2.6}>I have carried this shield before.</WordReveal>
        </div>
        <div className="mt-6 font-serif italic text-[22px] sm:text-[26px] leading-[1.45] text-cyan-300">
          <WordReveal delay={4.4}>I am handing it to you.</WordReveal>
        </div>
      </div>

      {/* Right — the shield itself, clickable */}
      <div className="flex flex-col items-center lg:items-start gap-4 relative">
        <motion.button
          type="button"
          data-testid="cta-take"
          onClick={onContinue}
          initial={{ opacity: 0, scale: 0.85, filter: 'blur(20px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ delay: 3.8, duration: 2.4, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="relative group rounded-full p-2 cursor-pointer focus:outline-none"
          aria-label="Take the shield"
        >
          <div className="breathe transition-[filter] duration-500 group-hover:[filter:drop-shadow(0_0_60px_rgba(0,229,255,0.65))]">
            <AegisShield size={460} />
          </div>

          {/* Pulsing summon ring — appears after Athena's third line */}
          <motion.span
            aria-hidden="true"
            className="absolute inset-2 rounded-full border border-cyan-300/0 pointer-events-none"
            initial={{ opacity: 0, scale: 1 }}
            animate={{
              opacity: [0, 0.55, 0],
              scale: [1, 1.06, 1.12],
              borderColor: ['rgba(0,229,255,0)', 'rgba(0,229,255,0.45)', 'rgba(0,229,255,0)'],
            }}
            transition={{ delay: 6.4, duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
          />
          {/* Second offset ring for depth */}
          <motion.span
            aria-hidden="true"
            className="absolute inset-2 rounded-full border border-cyan-300/0 pointer-events-none"
            initial={{ opacity: 0, scale: 1 }}
            animate={{
              opacity: [0, 0.35, 0],
              scale: [1, 1.10, 1.18],
              borderColor: ['rgba(0,229,255,0)', 'rgba(0,229,255,0.30)', 'rgba(0,229,255,0)'],
            }}
            transition={{ delay: 7.2, duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
          />
        </motion.button>

        <motion.div
          className="font-mono uppercase text-[10px] tracking-[0.5em] text-cyan-300/70 mt-2 select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 7.0, duration: 1.0 }}
        >
          ⟢ Take the shield ⟣
        </motion.div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Beat 3 — Inscription (call sign capture)
// ════════════════════════════════════════════════════════════════════
function BeatNaming({ onContinue }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 1400);
    return () => clearTimeout(id);
  }, []);

  const trimmed = name.trim();
  const valid = trimmed.length >= 2 && trimmed.length <= 24;

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={beatTransition}
    >
      <div className="text-center max-w-xl w-full">
        <motion.div
          className="font-mono uppercase text-[10px] tracking-[0.55em] text-cyan-300/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          — Inscription —
        </motion.div>

        <div className="mt-10 font-serif italic text-[22px] sm:text-[24px] leading-relaxed text-[#d5ddf6]/90">
          <WordReveal delay={0.9}>What name will the system know you by?</WordReveal>
        </div>

        <motion.div
          className="mt-14 relative"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.6, duration: 0.8 }}
        >
          {/* engraved frame */}
          <div className="absolute -inset-x-6 inset-y-0 border-y border-cyan-400/30 pointer-events-none" />
          <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-px h-12 bg-cyan-400/30" />
          <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-px h-12 bg-cyan-400/30" />
          <input
            ref={inputRef}
            type="text"
            data-testid="callsign-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && valid) onContinue(trimmed);
            }}
            placeholder="——"
            maxLength={24}
            className="w-full bg-transparent border-none focus:outline-none text-center font-mono uppercase tracking-[0.5em] text-[26px] text-cyan-200 placeholder:text-white/15 py-5"
            autoComplete="off"
            spellCheck={false}
          />
        </motion.div>

        <motion.div
          className="mt-4 font-mono text-[10px] tracking-[0.35em] uppercase text-white/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.4, duration: 0.6 }}
        >
          2 – 24 characters · This is what Athena will call you.
        </motion.div>
      </div>

      <motion.div
        className="mt-16"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 4.0, duration: 0.7 }}
      >
        <RitualButton testId="cta-inscribe" disabled={!valid} onClick={() => onContinue(trimmed)}>
          Inscribe
        </RitualButton>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Beat 4 — The Oath
// ════════════════════════════════════════════════════════════════════
const OATH_PRINCIPLES = [
  'I will read the system before I trust it.',
  'I will not mistake hype for understanding.',
  'I will treat ignorance as exposure.',
];

function BeatOath({ onContinue, audio }) {
  // Swell once per principle as it lands
  useEffect(() => {
    const t1 = setTimeout(() => audio.swell(1.2, 0.30), 1400);
    const t2 = setTimeout(() => audio.swell(1.2, 0.30), 4200);
    const t3 = setTimeout(() => audio.swell(1.2, 0.30), 7000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [audio]);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={beatTransition}
    >
      <div className="w-full max-w-3xl">
        {/* Top ornamental rule */}
        <motion.div
          className="flex items-center justify-center gap-6 mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.9 }}
        >
          <div className="h-px w-24 bg-cyan-400/40" />
          <div className="text-cyan-300 text-[10px] tracking-[0.65em] font-mono uppercase">— The Oath —</div>
          <div className="h-px w-24 bg-cyan-400/40" />
        </motion.div>

        {/* small shield mark */}
        <motion.div
          className="flex justify-center mt-6"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 0.9, scale: 1 }}
          transition={{ delay: 0.6, duration: 1.4 }}
        >
          <AegisShield size={64} withWordmark={false} glowing={false} />
        </motion.div>

        <motion.div
          className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.0, duration: 1.2 }}
        />

        {/* principles */}
        <ol className="mt-12 space-y-10 list-none">
          {OATH_PRINCIPLES.map((line, i) => (
            <motion.li
              key={i}
              className="grid grid-cols-[auto_2px_1fr] items-start gap-7 text-left"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.4 + i * 2.6, duration: 1.0 }}
            >
              <div className="font-mono text-[14px] tracking-[0.3em] text-cyan-300/80 pt-2 select-none whitespace-nowrap">
                {String(i + 1).padStart(2, '0')}
              </div>
              <motion.div
                className="bg-cyan-400/60 self-stretch"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 1.6 + i * 2.6, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: 'top' }}
              />
              <div className="font-serif text-[22px] sm:text-[26px] leading-[1.45] text-[#e8eef9]">
                <CarvedReveal delay={1.9 + i * 2.6}>{line}</CarvedReveal>
              </div>
            </motion.li>
          ))}
        </ol>

        <motion.div
          className="mt-16 h-px w-full bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 9.0, duration: 1.0 }}
        />

        <motion.div
          className="mt-12 flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 9.6, duration: 0.8 }}
        >
          <div className="font-mono uppercase text-[9px] tracking-[0.4em] text-white/35">
            Bind these to your name
          </div>
          <RitualButton onClick={onContinue} testId="cta-accept" big>
            I accept
          </RitualButton>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Beat 5 — Entry
// ════════════════════════════════════════════════════════════════════
function BeatEntry({ onContinue, callSign, audio }) {
  useEffect(() => {
    audio.swell(3.0, 0.36);
    const id = setTimeout(onContinue, 5200);
    return () => clearTimeout(id);
  }, [onContinue, audio]);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={beatTransition}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 1.6 }}
      >
        <AegisShield size={180} />
      </motion.div>

      <div className="mt-10 text-center max-w-xl">
        <div className="font-serif italic text-[26px] sm:text-[30px] leading-[1.4] text-[#d5ddf6]">
          <WordReveal delay={0.6}>The world is open, {callSign || 'Operator'}.</WordReveal>
        </div>
        <div className="mt-4 font-serif italic text-[22px] sm:text-[26px] leading-[1.45] text-cyan-300">
          <WordReveal delay={2.4}>Read it carefully.</WordReveal>
        </div>
      </div>

      <motion.button
        type="button"
        onClick={onContinue}
        data-testid="cta-enter"
        className="mt-14 font-mono uppercase text-[10px] tracking-[0.45em] text-white/40 hover:text-white/90 transition-colors"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.6, duration: 0.7 }}
      >
        Enter →
      </motion.button>
    </motion.div>
  );
}

// ── Skip control ─────────────────────────────────────────────────────
function SkipControl({ onSkip }) {
  return (
    <button
      type="button"
      onClick={onSkip}
      className="absolute z-20 font-mono uppercase text-[10px] tracking-[0.4em] text-white/30 hover:text-white/80 transition-colors"
      style={{ top: 90, right: 80 }}
      data-testid="skip"
      aria-label="Skip ritual onboarding"
    >
      Skip ritual →
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// Root component
// ════════════════════════════════════════════════════════════════════
export default function OnboardingRitual({ onComplete = () => {} }) {
  const [beatIndex, setBeatIndex] = useState(0);
  const [callSign, setCallSign] = useState('');
  const audio = useAudioDrone();

  const advance = () => setBeatIndex((i) => Math.min(i + 1, BEATS.length - 1));
  const finish = () => {
    audio.stop();
    onComplete({ callSign });
  };
  const skip = () => {
    audio.stop();
    onComplete({ callSign: callSign || 'Operator', skipped: true });
  };

  const beat = BEATS[beatIndex];

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden bg-[#050810] text-[#d5ddf6] select-none"
      role="dialog"
      aria-modal="true"
      aria-label="AEGIS onboarding ritual"
    >
      <RitualBackdrop density="full" />
      <HudFrame
        beatLabel={BEAT_LABELS[beatIndex]}
        beatIndex={beatIndex}
        callSign={callSign}
      />
      {beatIndex > 0 && <SkipControl onSkip={skip} />}

      <AnimatePresence mode="wait">
        {beat === 'threshold' && (
          <BeatThreshold
            key="threshold"
            onContinue={() => { audio.start(); advance(); }}
          />
        )}
        {beat === 'invocation' && (
          <BeatInvocation key="invocation" onContinue={advance} />
        )}
        {beat === 'athena' && (
          <BeatAthena key="athena" onContinue={advance} audio={audio} />
        )}
        {beat === 'naming' && (
          <BeatNaming
            key="naming"
            onContinue={(name) => { setCallSign(name); advance(); }}
          />
        )}
        {beat === 'oath' && (
          <BeatOath key="oath" onContinue={advance} audio={audio} />
        )}
        {beat === 'entry' && (
          <BeatEntry
            key="entry"
            onContinue={finish}
            callSign={callSign}
            audio={audio}
          />
        )}
      </AnimatePresence>

      {/* Progress dots */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
        {BEATS.map((b, i) => (
          <span
            key={b}
            className={`h-[2px] transition-all duration-700 ${
              i === beatIndex
                ? 'w-10 bg-cyan-400'
                : i < beatIndex
                ? 'w-3 bg-cyan-400/40'
                : 'w-3 bg-white/10'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
