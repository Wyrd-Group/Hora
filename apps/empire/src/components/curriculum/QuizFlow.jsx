import React, { useState } from 'react';

/**
 * QuizFlow — standalone multi-question quiz (used within TextbookReader or standalone).
 * Shows one question at a time with immediate feedback and explanations.
 *
 * Props:
 *   questions: QuizQuestion[]  — { id, question, options, correctIndex, explanation }
 *   onComplete: (score: number, total: number) => void
 *   title?: string
 */
export default function QuizFlow({ questions, onComplete, title }) {
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState([]); // track per-question correctness

  if (!questions?.length) return null;

  const q = questions[qIndex];
  const answered = selected !== null;

  const pick = (i) => {
    if (answered) return;
    setSelected(i);
    const correct = i === q.correctIndex;
    if (correct) setScore(s => s + 1);
    setAnswers(prev => [...prev, { idx: i, correct }]);
  };

  const advance = () => {
    if (qIndex + 1 >= questions.length) {
      const finalScore = score; // already updated
      setFinished(true);
      if (onComplete) onComplete(finalScore, questions.length);
    } else {
      setQIndex(qIndex + 1);
      setSelected(null);
    }
  };

  // ── Results screen ────────────────────────────────────────────
  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className={`text-5xl font-mono font-bold mb-2 ${pct >= 65 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
          {pct}%
        </div>
        <p className="text-xs font-mono text-tactical-text/50 mb-6">
          {score}/{questions.length} correct{title ? ` — ${title}` : ''}
        </p>

        <div className="w-full max-w-lg space-y-2 text-left max-h-64 overflow-y-auto">
          {questions.map((qq, i) => {
            const ok = answers[i]?.correct;
            return (
              <div
                key={qq.id}
                className={`border rounded-lg p-3 text-[11px] font-mono ${ok ? 'border-[#10b981]/25 bg-[#10b981]/5' : 'border-[#ef4444]/25 bg-[#ef4444]/5'}`}
              >
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
      </div>
    );
  }

  // ── Question screen ───────────────────────────────────────────
  return (
    <div className="flex flex-col p-6 max-w-2xl mx-auto w-full">
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-mono text-tactical-text/40 tracking-widest">
          {title && <span className="text-[#00e5ff]">{title} · </span>}
          QUESTION {qIndex + 1} OF {questions.length}
        </p>
        <p className="text-[10px] font-mono text-[#10b981]">{score} correct</p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 rounded-full bg-white/[0.06] mb-6 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#00e5ff] transition-all duration-500"
          style={{ width: `${((qIndex + (answered ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <p className="text-sm font-mono font-bold text-tactical-text mb-5">{q.question}</p>

      {/* Options */}
      <div className="space-y-2">
        {q.options.map((opt, i) => {
          let cls = 'border-white/[0.08] hover:bg-white/[0.04]';
          if (answered && i === q.correctIndex) cls = 'border-[#10b981]/40 bg-[#10b981]/10';
          else if (answered && i === selected) cls = 'border-[#ef4444]/40 bg-[#ef4444]/10';
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={answered}
              className={`w-full text-left px-4 py-3 rounded-lg border text-[12px] font-mono text-tactical-text/80 transition-all ${cls}`}
            >
              <span className="text-tactical-text/30 mr-2">{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          );
        })}
      </div>

      {/* Explanation + next */}
      {answered && (
        <div className="mt-4">
          {q.explanation && (
            <p className={`text-[11px] font-mono mb-3 ${selected === q.correctIndex ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
              {selected === q.correctIndex ? '✓ Correct! ' : '✗ Incorrect. '}
              {q.explanation}
            </p>
          )}
          <button
            onClick={advance}
            className="px-5 py-2 rounded-lg border border-[#00e5ff]/30 text-[11px] font-mono text-[#00e5ff] hover:bg-[#00e5ff]/10 transition-all font-bold"
          >
            {qIndex + 1 >= questions.length ? 'See Results' : 'Next Question →'}
          </button>
        </div>
      )}
    </div>
  );
}
