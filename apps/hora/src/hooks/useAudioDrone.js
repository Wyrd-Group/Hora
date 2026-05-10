/**
 * useAudioDrone — Web Audio drone hook for the AEGIS onboarding ritual.
 *
 * No library. Builds a quiet sub-bass field from:
 *   - 50 Hz sine sub
 *   - C2 root (65.41 Hz)
 *   - G2 fifth (98 Hz)
 *   - Filtered breathy noise
 *
 * Master gain is parked at 0; `start()` ramps to 0.40 over 3.5s.
 * `swell(durationS, amount)` briefly bumps to `amount` then ramps back.
 * `stop()` ramps to 0 and closes the AudioContext.
 *
 * The hook is safe to construct on every render — internal refs guard
 * against double-start. It cleans itself up on unmount.
 */

import { useEffect, useRef } from 'react';

export function useAudioDrone() {
  const ctxRef = useRef(null);
  const nodesRef = useRef(null);

  const start = () => {
    if (ctxRef.current) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();

      // master gain — extremely quiet, parked at zero until ramp
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      // low-pass to soften everything
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 700;
      lp.Q.value = 0.4;
      lp.connect(master);

      // sub rumble — 50 Hz sine
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.value = 50;
      const subG = ctx.createGain();
      subG.gain.value = 0.65;
      sub.connect(subG);
      subG.connect(lp);
      sub.start();

      // root tone — C2
      const root = ctx.createOscillator();
      root.type = 'sine';
      root.frequency.value = 65.41;
      const rootG = ctx.createGain();
      rootG.gain.value = 0.45;
      root.connect(rootG);
      rootG.connect(lp);
      root.start();

      // fifth — G2
      const fifth = ctx.createOscillator();
      fifth.type = 'sine';
      fifth.frequency.value = 98.00;
      const fifthG = ctx.createGain();
      fifthG.gain.value = 0.22;
      fifth.connect(fifthG);
      fifthG.connect(lp);
      fifth.start();

      // breathy noise — gentle whoosh under it all
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.value = 220;
      const noiseG = ctx.createGain();
      noiseG.gain.value = 0.09;
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseG);
      noiseG.connect(lp);
      noise.start();

      // ramp the master in over 3.5s
      master.gain.linearRampToValueAtTime(0.40, ctx.currentTime + 3.5);

      ctxRef.current = ctx;
      nodesRef.current = { master, oscs: [sub, root, fifth], noise };
    } catch (e) {
      // audio is optional — never block the ritual on failure
    }
  };

  const stop = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    try {
      const m = nodesRef.current?.master;
      if (m) m.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      setTimeout(() => {
        try { ctx.close(); } catch { /* noop */ }
      }, 800);
    } catch {
      /* noop */
    }
    ctxRef.current = null;
    nodesRef.current = null;
  };

  const swell = (durationS = 1.5, amount = 0.62) => {
    const ctx = ctxRef.current;
    const m = nodesRef.current?.master;
    if (!ctx || !m) return;
    const t = ctx.currentTime;
    m.gain.cancelScheduledValues(t);
    m.gain.setValueAtTime(m.gain.value, t);
    m.gain.linearRampToValueAtTime(amount, t + 0.05);
    m.gain.linearRampToValueAtTime(0.40, t + durationS);
  };

  // Tear down audio if the host component unmounts
  useEffect(() => () => stop(), []);

  return { start, stop, swell };
}

export default useAudioDrone;
