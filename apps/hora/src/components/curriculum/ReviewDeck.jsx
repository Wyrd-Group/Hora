/**
 * ReviewDeck — Daily spaced-repetition review of failed exam questions.
 *
 * Cards originate from ExamFlow seeding wrong answers. SM-2 schedules
 * each card for its next review; we surface whatever is due right now.
 *
 * Review flow:
 *   1. Player sees a prompt + 4 options (from original exam).
 *   2. Selects an answer — we compute quality from correctness +
 *      self-rated confidence (Hard / Good / Easy). Wrong = quality 2.
 *   3. Store records review, advances schedule, moves to next due card.
 *
 * When no cards are due, show an "all caught up" state with counts.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useSpacedRepetitionStore } from '../../store/spacedRepetitionStore';
import { useCardEconomyStore } from '../../store/cardEconomyStore';
import { getCourseById } from '../../data/courses';

const ACCENT = '#00e5ff';

function formatTimeUntil(ms) {
  if (ms <= 0) return 'due now';
  const days = Math.floor(ms / (24 * 3600 * 1000));
  const hours = Math.floor((ms % (24 * 3600 * 1000)) / (3600 * 1000));
  if (days > 0) return `in ${days}d`;
  if (hours > 0) return `in ${hours}h`;
  return 'in <1h';
}

export default function ReviewDeck() {
  const cardsById = useSpacedRepetitionStore(s => s.cards);
  const reviewStreak = useSpacedRepetitionStore(s => s.reviewStreak);
  const totalReviews = useSpacedRepetitionStore(s => s.totalReviews);
  const recordReview = useSpacedRepetitionStore(s => s.recordReview);
  const addAP = useCardEconomyStore(s => s.awardAegisPoints);

  const allSorted = useMemo(
    () => Object.values(cardsById).sort((a, b) => a.dueAt - b.dueAt),
    [cardsById],
  );
  const dueCards = useMemo(() => {
    const now = Date.now();
    return allSorted.filter(c => c.dueAt <= now);
  }, [allSorted]);
  const stats = useMemo(() => {
    const cards = Object.values(cardsById);
    const now = Date.now();
    return {
      total: cards.length,
      due: cards.filter(c => c.dueAt <= now).length,
      mastered: cards.filter(c => c.repetitions >= 4).length,
      struggling: cards.filter(c => c.lapses >= 2).length,
    };
  }, [cardsById]);

  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [reviewedThisSession, setReviewedThisSession] = useState(0);

  // Snapshot the due list once per session start so completing a card doesn't
  // jitter the queue (SM-2 pushes dueAt into the future, which would remove
  // the card we just answered).
  const sessionCards = useMemo(() => dueCards, [dueCards.length === 0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const queue = useMemo(() => [...sessionCards], [sessionCards.length]);

  const card = queue[cursor];

  useEffect(() => {
    setSelected(null);
    setRevealed(false);
  }, [cursor]);

  // ── No cards at all ─────────────────────────────────────────
  if (stats.total === 0) {
    return (
      <div className="p-6 md:p-10 text-center">
        <div className="text-5xl mb-3">🧠</div>
        <h2 className="text-lg font-mono font-bold text-tactical-text">No review cards yet</h2>
        <p className="text-[12px] font-mono text-tactical-text/60 mt-2 max-w-md mx-auto">
          Cards are seeded automatically when you get exam questions wrong.
          Spaced review turns those mistakes into long-term mastery.
        </p>
      </div>
    );
  }

  // ── No cards due right now ──────────────────────────────────
  if (queue.length === 0 || !card) {
    const next = allSorted.find(c => c.dueAt > Date.now());
    const wait = next ? next.dueAt - Date.now() : 0;
    return (
      <div className="p-6 md:p-10 max-w-2xl mx-auto">
        <HeaderStats stats={stats} streak={reviewStreak} total={totalReviews} sessionCount={reviewedThisSession} />
        <div className="mt-6 p-6 rounded-xl border border-[#10b981]/30 bg-[#10b981]/5 text-center">
          <div className="text-4xl mb-2">✓</div>
          <h2 className="text-lg font-mono font-bold text-tactical-text">Caught up</h2>
          <p className="text-[12px] font-mono text-tactical-text/60 mt-2">
            Nothing due for review right now.
            {next && <> Next card unlocks {formatTimeUntil(wait)}.</>}
          </p>
        </div>
        <CardList cards={allSorted} />
      </div>
    );
  }

  const course = getCourseById(card.courseId);
  const isCorrect = selected === card.correctIndex;

  const choose = (i) => {
    if (revealed) return;
    setSelected(i);
    setRevealed(true);
  };

  const grade = (quality) => {
    // If they picked the wrong answer, cap at quality 2 (lapsed) regardless of
    // self-reported confidence — avoids gaming the schedule.
    const clamped = isCorrect ? quality : 2;
    recordReview(card.id, clamped);
    if (isCorrect) addAP(5, `review:${card.courseId}`);
    setReviewedThisSession(n => n + 1);
    setCursor(i => i + 1);
  };

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <HeaderStats stats={stats} streak={reviewStreak} total={totalReviews} sessionCount={reviewedThisSession} />

      <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-mono tracking-widest text-tactical-text/40">
            {course?.band ? `${course.band} · ` : ''}{course?.title ?? 'Unknown course'}
          </div>
          <div className="text-[10px] font-mono text-tactical-text/30">
            {cursor + 1} / {queue.length} · reps {card.repetitions}
          </div>
        </div>

        <p className="text-sm font-mono font-bold text-tactical-text mb-4">{card.question}</p>

        <div className="space-y-2">
          {card.options.map((opt, i) => {
            let cls = 'border-white/[0.08] hover:bg-white/[0.04]';
            if (revealed && i === card.correctIndex) cls = 'border-[#10b981]/40 bg-[#10b981]/10';
            else if (revealed && i === selected) cls = 'border-[#ef4444]/40 bg-[#ef4444]/10';
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={revealed}
                className={`w-full text-left px-4 py-3 rounded-lg border text-[12px] font-mono text-tactical-text/80 transition-all ${cls}`}
              >
                <span className="text-tactical-text/30 mr-2">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className="mt-4 border-t border-white/[0.05] pt-4">
            {card.explanation && (
              <p className={`text-[11px] font-mono mb-3 ${isCorrect ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {isCorrect ? '✓ Correct. ' : '✗ Incorrect. '}{card.explanation}
              </p>
            )}
            <div className="text-[10px] font-mono tracking-widest text-tactical-text/40 mb-2">
              HOW WAS THAT?
            </div>
            <div className="grid grid-cols-3 gap-2">
              <GradeButton label="Hard" sub="short repeat" onClick={() => grade(3)} color="#f59e0b" disabled={!isCorrect} />
              <GradeButton label="Good" sub="normal" onClick={() => grade(4)} color={ACCENT} disabled={!isCorrect} />
              <GradeButton label="Easy" sub="long interval" onClick={() => grade(5)} color="#10b981" disabled={!isCorrect} />
            </div>
            {!isCorrect && (
              <button
                onClick={() => grade(2)}
                className="w-full mt-2 px-4 py-2 rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/5 text-[11px] font-mono text-[#ef4444] hover:bg-[#ef4444]/10 transition-all font-bold"
              >
                Continue → (card will re-appear tomorrow)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function HeaderStats({ stats, streak, total, sessionCount }) {
  return (
    <div className="rounded-xl border border-[#00e5ff]/20 bg-gradient-to-br from-[#00e5ff]/10 to-transparent p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-[#00e5ff]" />
        <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-tactical-text/60">
          DAILY REVIEW
        </h2>
      </div>
      <p className="text-[11px] font-mono text-tactical-text/50 mb-4">
        Questions you missed on exams resurface here on a spaced-repetition schedule (SM-2).
        Get them right enough times and they retire.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="DUE NOW"       value={stats.due} color="#f59e0b" />
        <Stat label="SESSION"       value={sessionCount} color="#00e5ff" />
        <Stat label="STREAK"        value={`${streak}d`} color="#ec4899" />
        <Stat label="MASTERED"      value={stats.mastered} color="#10b981" />
        <Stat label="TOTAL REVIEWS" value={total} color="#8b5cf6" />
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
      <div className="text-[8px] font-mono tracking-widest text-tactical-text/40">{label}</div>
      <div className="text-lg font-mono font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function GradeButton({ label, sub, onClick, color, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-2 rounded-lg border font-mono text-[11px] hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}
    >
      <div className="font-bold">{label}</div>
      <div className="text-[9px] opacity-60">{sub}</div>
    </button>
  );
}

function CardList({ cards }) {
  if (cards.length === 0) return null;
  return (
    <div className="mt-6">
      <h3 className="text-[11px] font-mono font-bold tracking-widest uppercase text-tactical-text/50 mb-2">
        UPCOMING ({cards.length})
      </h3>
      <div className="space-y-1 max-h-[320px] overflow-y-auto">
        {cards.map(c => {
          const course = getCourseById(c.courseId);
          const until = c.dueAt - Date.now();
          return (
            <div key={c.id} className="flex items-center justify-between text-[11px] font-mono px-3 py-2 rounded border border-white/[0.05] bg-white/[0.01]">
              <div className="truncate flex-1 mr-3">
                <span className="text-tactical-text/30 mr-2">{course?.band ?? '?'}</span>
                <span className="text-tactical-text/70">{c.question}</span>
              </div>
              <span className={until <= 0 ? 'text-[#f59e0b]' : 'text-tactical-text/40'}>
                {formatTimeUntil(until)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
