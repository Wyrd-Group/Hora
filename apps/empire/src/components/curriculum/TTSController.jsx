import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCurriculumStore } from '../../store/curriculumStore';

/**
 * TTSController — Web Speech API toggle with play/pause/stop.
 *
 * Props:
 *   text: string — plain text to read aloud
 */
export default function TTSController({ text }) {
  const { ttsActive, toggleTTS } = useCurriculumStore();
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const utterRef = useRef(null);

  // Check if Web Speech API is available
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
    utterRef.current = null;
  }, [supported]);

  const speak = useCallback(() => {
    if (!supported || !text) return;
    stop();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.pitch = 1;
    utter.volume = 1;

    // Try to pick a good English voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
      ?? voices.find(v => v.lang.startsWith('en'));
    if (preferred) utter.voice = preferred;

    utter.onend = () => {
      setSpeaking(false);
      setPaused(false);
      utterRef.current = null;
    };
    utter.onerror = () => {
      setSpeaking(false);
      setPaused(false);
      utterRef.current = null;
    };

    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
    setPaused(false);
  }, [supported, text, stop]);

  const pauseResume = useCallback(() => {
    if (!supported) return;
    if (paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  }, [supported, paused]);

  // Stop speaking when text changes or component unmounts
  useEffect(() => {
    return () => stop();
  }, [text, stop]);

  // Auto-start if TTS is active
  useEffect(() => {
    if (ttsActive && text && !speaking) {
      speak();
    } else if (!ttsActive && speaking) {
      stop();
    }
  }, [ttsActive, text]);

  if (!supported) return null;

  return (
    <div className="flex items-center gap-1.5">
      {/* TTS toggle */}
      <button
        onClick={() => {
          toggleTTS();
          if (!ttsActive && !speaking) speak();
          else if (ttsActive) stop();
        }}
        className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider transition-all border
          ${ttsActive
            ? 'bg-[#00e5ff]/15 text-[#00e5ff] border-[#00e5ff]/30'
            : 'bg-white/[0.04] text-tactical-text/40 border-white/[0.06] hover:bg-white/[0.06]'}`}
        title="Toggle text-to-speech"
      >
        🔊 TTS
      </button>

      {/* Play / Pause / Stop controls (only visible when speaking) */}
      {speaking && (
        <>
          <button
            onClick={pauseResume}
            className="w-6 h-6 rounded flex items-center justify-center text-[10px] bg-white/[0.06] text-tactical-text/60 hover:bg-white/[0.10] transition-all"
            title={paused ? 'Resume' : 'Pause'}
          >
            {paused ? '▶' : '⏸'}
          </button>
          <button
            onClick={stop}
            className="w-6 h-6 rounded flex items-center justify-center text-[10px] bg-white/[0.06] text-[#ef4444]/60 hover:bg-[#ef4444]/10 transition-all"
            title="Stop"
          >
            ⏹
          </button>
        </>
      )}
    </div>
  );
}
