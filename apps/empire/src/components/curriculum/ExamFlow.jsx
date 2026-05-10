import React, { useState, useEffect, useRef } from 'react';
import { useCurriculumStore } from '../../store/curriculumStore';
import { useSpacedRepetitionStore } from '../../store/spacedRepetitionStore';

/**
 * ExamFlow — Timed exam with passing threshold, question counter, grades, and rich results.
 *
 * Props:
 *   exam: Exam          — { id, title, passingScore, timeLimit?, questions }
 *   courseId: string
 *   courseName: string
 *   band?: string       — ECFL band (F1-F6)
 *   onExit: () => void
 */
export default function ExamFlow({ exam, courseId, courseName, band, onExit }) {
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState([]);       // selected index per question
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(exam.timeLimit ?? null);
  const [startTime] = useState(Date.now());
  const timerRef = useRef(null);

  const { recordExamResult } = useCurriculumStore();

  const questions = exam.questions;
  const q = questions[qIndex];
  const hasAnswered = answers.length > qIndex;

  // Grade helper (mirrors store logic for display)
  const getGrade = (pct) => {
    if (pct >= 97) return 'A+';
    if (pct >= 93) return 'A';
    if (pct >= 90) return 'A-';
    if (pct >= 87) return 'B+';
    if (pct >= 83) return 'B';
    if (pct >= 80) return 'B-';
    if (pct >= 77) return 'C+';
    if (pct >= 73) return 'C';
    if (pct >= 70) return 'C-';
    if (pct >= 65) return 'D';
    return 'F';
  };

  const getDistinction = (pct) => {
    if (pct >= 90) return 'HIGH DISTINCTION';
    if (pct >= 80) return 'DISTINCTION';
    if (pct >= 70) return 'MERIT';
    return 'PASS';
  };

  // ── Timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft === null || finished) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          finishExam(answers);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [finished]);

  const finishExam = (finalAnswers) => {
    if (finished) return;
    const correctCount = finalAnswers.reduce(
      (s, a, i) => s + (a === questions[i]?.correctIndex ? 1 : 0), 0
    );
    const pct = Math.round((correctCount / questions.length) * 100);
    const timeTaken = Math.round((Date.now() - startTime) / 1000);
    recordExamResult(courseId, pct, exam.passingScore, {
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      timeTaken,
      timeAllowed: exam.timeLimit,
      band: band ?? undefined,
      courseName,
    });
    // Seed spaced-repetition cards for every question the player got wrong.
    // Cards are also seeded for unanswered questions (timeout or skipped).
    const seedCard = useSpacedRepetitionStore.getState().seedCard;
    questions.forEach((qq, i) => {
      if (finalAnswers[i] !== qq.correctIndex) {
        seedCard({
          courseId,
          questionId: qq.id,
          question: qq.question,
          options: qq.options,
          correctIndex: qq.correctIndex,
          explanation: qq.explanation,
        });
      }
    });
    setFinished(true);
    clearInterval(timerRef.current);
  };

  const selectAnswer = (idx) => {
    if (hasAnswered) return;
    const next = [...answers, idx];
    setAnswers(next);
    if (next.length >= questions.length) {
      finishExam(next);
    }
  };

  const advance = () => setQIndex(i => Math.min(i + 1, questions.length - 1));

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ── Results ───────────────────────────────────────────────────
  if (finished) {
    const correctCount = answers.reduce((s, a, i) => s + (a === questions[i]?.correctIndex ? 1 : 0), 0);
    const pct = Math.round((correctCount / questions.length) * 100);
    const passed = pct >= exam.passingScore;
    const grade = getGrade(pct);
    const distinction = passed ? getDistinction(pct) : null;
    const timeTaken = Math.round((Date.now() - startTime) / 1000);
    const bandColors = { F1: '#10b981', F2: '#f59e0b', F3: '#ef4444', F4: '#8b5cf6', F5: '#3b82f6', F6: '#ec4899' };
    const accentColor = bandColors[band] ?? '#00e5ff';
    const bandMultiplier = { F1: 1, F2: 1.5, F3: 2, F4: 3, F5: 4, F6: 5 };
    const mult = bandMultiplier[band] ?? 1;

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center overflow-y-auto">
        {/* Score + Grade */}
        <div className="relative mb-2">
          <div className={`text-7xl font-mono font-bold ${passed ? '' : 'text-[#ef4444]'}`}
            style={passed ? { color: accentColor } : {}}>
            {pct}%
          </div>
          {passed && (
            <div className="absolute -top-2 -right-8 text-3xl font-mono font-bold rotate-12"
              style={{ color: accentColor, opacity: 0.3 }}>
              {grade}
            </div>
          )}
        </div>

        {/* Pass/Fail + Distinction */}
        <div className={`text-sm font-mono font-bold uppercase tracking-widest mb-1 ${passed ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
          {passed ? '✓ PASSED' : '✗ FAILED'}
        </div>
        {passed && distinction && (
          <div className="text-[10px] font-mono font-bold tracking-[0.2em] mb-2 px-3 py-1 rounded-full border"
            style={{ color: accentColor, borderColor: `${accentColor}40`, backgroundColor: `${accentColor}10` }}>
            {distinction}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 text-tactical-text/40 font-mono text-[10px] mb-1">
          <span>{correctCount}/{questions.length} correct</span>
          <span>•</span>
          <span>Grade: <span className="text-tactical-text/70 font-bold">{grade}</span></span>
          <span>•</span>
          <span>{Math.floor(timeTaken / 60)}m {timeTaken % 60}s</span>
        </div>

        <div className="text-tactical-text/30 font-mono text-[10px] mb-4">
          {band && <span className="mr-2" style={{ color: accentColor }}>{band}</span>}
          {courseName} — Passing score: {exam.passingScore}%
        </div>

        {/* Certificate card (if passed) */}
        {passed && (
          <div className="w-full max-w-md rounded-xl border p-5 mb-5 relative overflow-hidden"
            style={{ borderColor: `${accentColor}30`, backgroundColor: `${accentColor}05` }}>
            <div className="absolute top-0 right-0 w-24 h-24 opacity-10"
              style={{ background: `radial-gradient(circle at top right, ${accentColor}, transparent 70%)` }} />
            <div className="absolute bottom-0 left-0 w-16 h-16 opacity-5"
              style={{ background: `radial-gradient(circle at bottom left, ${accentColor}, transparent 70%)` }} />

            <div className="text-[8px] font-mono tracking-[0.3em] text-tactical-text/30 mb-2">ECFL CERTIFICATION</div>
            <div className="text-sm font-mono font-bold text-tactical-text mb-1">{courseName}</div>
            <div className="flex items-center gap-3 mb-3">
              {band && (
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded"
                  style={{ color: accentColor, backgroundColor: `${accentColor}15`, border: `1px solid ${accentColor}30` }}>
                  {band}
                </span>
              )}
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded"
                style={{ color: accentColor, backgroundColor: `${accentColor}15`, border: `1px solid ${accentColor}30` }}>
                GRADE {grade}
              </span>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded"
                style={{ color: accentColor, backgroundColor: `${accentColor}15`, border: `1px solid ${accentColor}30` }}>
                {distinction}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[8px] font-mono text-tactical-text/30 tracking-widest">SCORE</div>
                <div className="text-sm font-mono font-bold" style={{ color: accentColor }}>{pct}%</div>
              </div>
              <div>
                <div className="text-[8px] font-mono text-tactical-text/30 tracking-widest">CORRECT</div>
                <div className="text-sm font-mono font-bold text-tactical-text/70">{correctCount}/{questions.length}</div>
              </div>
              <div>
                <div className="text-[8px] font-mono text-tactical-text/30 tracking-widest">TIME</div>
                <div className="text-sm font-mono font-bold text-tactical-text/70">{Math.floor(timeTaken / 60)}:{(timeTaken % 60).toString().padStart(2, '0')}</div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t flex items-center gap-1" style={{ borderColor: `${accentColor}15` }}>
              <span className="text-[#10b981] text-[10px]">✓</span>
              <span className="text-[10px] font-mono text-[#10b981] font-bold">CERTIFIED</span>
              <span className="text-[10px] font-mono text-tactical-text/20 ml-auto">+{Math.round(100 * mult)} AP · +{Math.round(50 * mult)} BP-XP</span>
            </div>
          </div>
        )}

        {/* Review answers */}
        <div className="w-full max-w-lg flex flex-col gap-2 mb-6 text-left max-h-52 overflow-y-auto">
          {questions.map((qq, i) => {
            const ok = answers[i] === qq.correctIndex;
            return (
              <div key={qq.id} className={`border rounded-lg p-3 text-xs font-mono ${ok ? 'border-[#10b981]/25 bg-[#10b981]/5' : 'border-[#ef4444]/25 bg-[#ef4444]/5'}`}>
                <div className="flex gap-2 items-start">
                  <span className={ok ? 'text-[#10b981]' : 'text-[#ef4444]'}>{ok ? '✓' : '✗'}</span>
                  <span className="text-tactical-text/80">{qq.question}</span>
                </div>
                {!ok && qq.explanation && (
                  <p className="text-tactical-text/40 mt-1 ml-4">→ {qq.options[qq.correctIndex]} — {qq.explanation}</p>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={onExit}
          className="px-6 py-2.5 border border-[#00e5ff]/40 text-[#00e5ff] font-mono text-xs rounded-lg hover:bg-[#00e5ff]/10 transition-all font-bold tracking-widest"
        >
          RETURN
        </button>
      </div>
    );
  }

  // ── Question ──────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col p-6 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[#f59e0b] text-[10px] font-mono tracking-widest">{courseName}</p>
          <p className="text-tactical-text/40 text-[10px] font-mono mt-0.5">
            Question {qIndex + 1} of {questions.length}
          </p>
        </div>
        {timeLeft !== null && (
          <div className={`font-mono text-sm font-bold ${timeLeft < 30 ? 'text-[#ef4444] animate-pulse' : 'text-tactical-text/60'}`}>
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 rounded-full bg-white/[0.06] mb-6 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#f59e0b] transition-all duration-500"
          style={{ width: `${((qIndex + (hasAnswered ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <p className="text-sm font-mono font-bold text-tactical-text mb-5">{q.question}</p>

      {/* Options */}
      <div className="space-y-2 mb-6">
        {q.options.map((opt, i) => {
          let cls = 'border-white/[0.08] hover:bg-white/[0.04]';
          if (hasAnswered && i === q.correctIndex) cls = 'border-[#10b981]/40 bg-[#10b981]/10';
          else if (hasAnswered && i === answers[qIndex]) cls = 'border-[#ef4444]/40 bg-[#ef4444]/10';
          return (
            <button
              key={i}
              onClick={() => selectAnswer(i)}
              disabled={hasAnswered}
              className={`w-full text-left px-4 py-3 rounded-lg border text-[12px] font-mono text-tactical-text/80 transition-all ${cls}`}
            >
              <span className="text-tactical-text/30 mr-2">{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          );
        })}
      </div>

      {/* Next button */}
      {hasAnswered && (
        <div className="mt-2">
          {q.explanation && (
            <p className={`text-[11px] font-mono mb-3 ${answers[qIndex] === q.correctIndex ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
              {answers[qIndex] === q.correctIndex ? '✓ Correct! ' : '✗ Incorrect. '}
              {q.explanation}
            </p>
          )}
          {qIndex + 1 < questions.length && (
            <button
              onClick={advance}
              className="px-5 py-2 rounded-lg border border-[#f59e0b]/30 text-[11px] font-mono text-[#f59e0b] hover:bg-[#f59e0b]/10 transition-all font-bold"
            >
              Next Question →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
