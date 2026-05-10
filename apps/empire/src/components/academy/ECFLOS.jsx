import { useState } from 'react';
import { COURSES_BY_BAND } from '../../data/courses';


const BAND_COLORS = {
  'tactical-green': { hex: '#00ff88', border: 'border-green-500/40', text: 'text-green-400',  bg: 'bg-green-500' },
  'tactical-cyan':  { hex: '#00e5ff', border: 'border-cyan-400/40',  text: 'text-tactical-cyan', bg: 'bg-tactical-cyan' },
  'tactical-amber': { hex: '#f59e0b', border: 'border-amber-400/40', text: 'text-amber-400', bg: 'bg-amber-400' },
};

export default function ECFLOS() {
  const [activeExam, setActiveExam] = useState(null);  // { module, qIndex, answers, finished }

  const bands = [
    { band: 'F1', label: 'FUNDAMENTALS', pts: 1000, earned: 1000, done: true,  color: 'tactical-green' },
    { band: 'F2', label: 'PRACTITIONER', pts: 2500, earned: 1340, done: false, color: 'tactical-cyan',  active: true },
    { band: 'F3', label: 'ADVANCED',     pts: 5000, earned: 0,    done: false, color: 'tactical-amber', locked: true },
    { band: 'F4', label: 'QUANTITATIVE', pts: 8000, earned: 0,    done: false, color: 'text-violet-400', locked: true },
    { band: 'F5', label: 'INSTITUTIONAL', pts: 12000, earned: 0,  done: false, color: 'text-blue-400',  locked: true },
    { band: 'F6', label: 'FRONTIER',     pts: 18000, earned: 0,   done: false, color: 'text-pink-400',  locked: true },
  ];

  const certs = [
    { title: 'Market Microstructure', pts: 300, date: '2026-01-15', grade: 'A'  },
    { title: 'Options Pricing Basics', pts: 250, date: '2026-02-01', grade: 'A-' },
    { title: 'Risk Fundamentals',      pts: 200, date: '2026-02-20', grade: 'B+' },
    { title: 'Factor Model Theory',    pts: 290, date: '2026-03-10', grade: 'A'  },
  ];

  const startExam = (module) => {
    setActiveExam({ module, qIndex: 0, answers: [], finished: false });
  };

  const selectAnswer = (answerIdx) => {
    if (!activeExam || activeExam.finished) return;
    const newAnswers = [...activeExam.answers, answerIdx];
    const isLast = activeExam.qIndex >= activeExam.module.examQuestions.length - 1;
    setActiveExam({ ...activeExam, answers: newAnswers, qIndex: isLast ? activeExam.qIndex : activeExam.qIndex + 1, finished: isLast });
  };

  const exitExam = () => setActiveExam(null);

  // ── Exam UI ────────────────────────────────────────────────────────────────
  if (activeExam) {
    const { module, qIndex, answers, finished } = activeExam;
    const questions = module.examQuestions;
    const q = questions[qIndex];

    if (finished) {
      const score = answers.reduce((s, ans, i) => s + (ans === questions[i].correct ? 1 : 0), 0);
      const pct = Math.round((score / questions.length) * 100);
      const passed = pct >= 70;
      return (
        <div className="fixed inset-0 pt-16 z-20 backdrop-blur-xl bg-[#060a12]/90 flex items-center justify-center p-8">
          <div className="w-full max-w-xl bg-black/60 border border-tactical-border/50 rounded-2xl p-8 flex flex-col items-center text-center">
            <div className={`text-6xl font-mono font-bold mb-2 ${passed ? 'text-tactical-cyan' : 'text-[#ef4444]'}`}>{pct}%</div>
            <div className={`text-lg font-mono font-bold mb-1 ${passed ? 'text-tactical-green' : 'text-[#ef4444]'}`}>{passed ? '✓ PASSED' : '✗ FAILED'}</div>
            <div className="text-tactical-text/60 font-mono text-sm mb-6">{score} / {questions.length} correct — {module.title} Exam</div>

            <div className="w-full flex flex-col gap-3 mb-6 text-left max-h-64 overflow-y-auto pr-1">
              {questions.map((qq, i) => {
                const isCorrect = answers[i] === qq.correct;
                return (
                  <div key={qq.id} className={`border rounded-lg p-3 ${isCorrect ? 'border-tactical-green/30 bg-tactical-green/5' : 'border-[#ef4444]/30 bg-[#ef4444]/5'}`}>
                    <div className="flex items-start gap-2 mb-1">
                      <span className={`text-[10px] font-mono font-bold ${isCorrect ? 'text-tactical-green' : 'text-[#ef4444]'}`}>{isCorrect ? '✓' : '✗'}</span>
                      <p className="text-tactical-text text-xs font-mono">{qq.question}</p>
                    </div>
                    {!isCorrect && (
                      <p className="text-tactical-text/60 text-[10px] font-mono ml-4">Correct: {qq.options[qq.correct]} — {qq.explanation}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {passed && (
              <div className="border border-tactical-green/30 bg-tactical-green/10 rounded-xl p-4 mb-6 w-full">
                <p className="text-tactical-green font-mono text-xs font-bold">+{Math.round(pct * 2.5)} pts awarded to {module.band} score</p>
              </div>
            )}
            <button onClick={exitExam} className="px-6 py-2 border border-tactical-cyan/50 text-tactical-cyan font-mono text-sm rounded hover:bg-tactical-cyan hover:text-black transition-all font-bold">Return to ECFL</button>
          </div>
        </div>
      );
    }

    const hasAnswered = answers.length > qIndex;
    return (
      <div className="fixed inset-0 pt-16 z-20 backdrop-blur-xl bg-[#060a12]/90 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-2xl bg-black/60 border border-tactical-border/50 rounded-2xl p-6 md:p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-tactical-cyan text-[10px] font-mono tracking-widest mb-1">{module.band} — {module.title}</p>
              <p className="text-tactical-muted text-[10px] font-mono">Question {qIndex + 1} of {questions.length}</p>
            </div>
            <button onClick={exitExam} className="px-3 py-1 text-[10px] font-mono border border-tactical-border/50 text-tactical-text/50 rounded hover:border-[#ef4444]/50 hover:text-[#ef4444] transition-all">Exit Exam</button>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 bg-tactical-border/30 rounded-full mb-6">
            <div className="h-full bg-tactical-cyan rounded-full transition-all" style={{ width: `${((qIndex + 1) / questions.length) * 100}%` }} />
          </div>

          {/* Question */}
          <p className="text-white font-mono text-sm md:text-base leading-relaxed mb-6">{q.question}</p>

          {/* Options */}
          <div className="flex flex-col gap-3">
            {q.options.map((opt, idx) => {
              let style = 'border-tactical-border/40 text-tactical-text hover:border-tactical-cyan/40 hover:text-tactical-cyan cursor-pointer';
              if (hasAnswered) {
                if (idx === q.correct) style = 'border-tactical-green/60 bg-tactical-green/10 text-tactical-green cursor-default';
                else if (idx === answers[qIndex]) style = 'border-[#ef4444]/60 bg-[#ef4444]/10 text-[#ef4444] cursor-default';
                else style = 'border-tactical-border/20 text-tactical-text/30 cursor-default opacity-50';
              }
              return (
                <div key={idx} onClick={() => !hasAnswered && selectAnswer(idx)}
                  className={`border rounded-xl p-4 font-mono text-sm transition-all ${style}`}>
                  <span className="text-tactical-text/40 mr-3 text-[10px]">{String.fromCharCode(65 + idx)}.</span>{opt}
                </div>
              );
            })}
          </div>

          {/* Explanation after answering */}
          {hasAnswered && (
            <div className="mt-4 border border-tactical-border/30 bg-black/40 rounded-xl p-4">
              <p className="text-tactical-text/50 text-[10px] font-mono uppercase tracking-widest mb-1">Explanation</p>
              <p className="text-tactical-text text-xs font-mono leading-relaxed">{q.explanation}</p>
              {qIndex < questions.length - 1 && (
                <button onClick={() => setActiveExam({ ...activeExam, qIndex: qIndex + 1 })}
                  className="mt-3 px-4 py-1.5 bg-tactical-cyan/10 border border-tactical-cyan/30 text-tactical-cyan font-mono text-xs rounded hover:bg-tactical-cyan hover:text-black transition-all font-bold">
                  Next Question →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main ECFL view ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 pt-16 z-20 backdrop-blur-xl bg-[#060a12]/80 flex p-4 md:p-8">
      <div className="flex w-full h-full gap-4 overflow-hidden">

        {/* Left: Band progress */}
        <div className="w-64 lg:w-72 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
          {bands.map(b => {
            const bc = BAND_COLORS[b.color] || BAND_COLORS['tactical-cyan'];
            const pct = Math.min(100, (b.earned / b.pts) * 100);
            return (
              <div key={b.band} className={`border bg-black/40 rounded-xl p-4 ${b.active ? 'border-tactical-cyan/40' : 'border-tactical-border/30'} ${b.locked ? 'opacity-40' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${bc.border} border flex items-center justify-center`} style={{ background: 'rgba(0,0,0,0.4)' }}>
                      <span className={`${bc.text} text-xs font-mono font-bold`}>{b.band}</span>
                    </div>
                    <div>
                      <p className="text-tactical-bright text-xs font-mono font-semibold">{b.label}</p>
                      {b.active && <p className="text-tactical-cyan text-[10px] font-mono">CURRENT BAND</p>}
                      {b.locked && <p className="text-tactical-text/30 text-[10px] font-mono">LOCKED</p>}
                    </div>
                  </div>
                  {b.done && <span className="text-green-400 text-[10px] font-mono">✓ CERTIFIED</span>}
                </div>
                <div className="w-full h-1 bg-tactical-border/30 rounded-full mb-1">
                  <div className={`h-full ${bc.bg} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-tactical-muted">{b.earned.toLocaleString()} pts</span>
                  <span className={bc.text}>{b.pts.toLocaleString()} pts</span>
                </div>
                {/* Module count from real data */}
                {COURSES_BY_BAND[b.band] && (
                  <p className="text-tactical-text/30 text-[9px] font-mono mt-2">{COURSES_BY_BAND[b.band].length} modules · {COURSES_BY_BAND[b.band].reduce((s, m) => s + m.lessons.length, 0)} lessons</p>
                )}
              </div>
            );
          })}

          <div className="border border-tactical-border/50 bg-black/40 rounded-xl p-4 flex-1">
            <p className="text-tactical-cyan text-xs font-mono tracking-widest mb-3">TOTAL SCORE</p>
            <p className="text-tactical-bright text-2xl font-mono font-bold">2,340 <span className="text-tactical-muted text-sm">pts</span></p>
            <p className="text-tactical-text/50 text-xs font-mono mt-1">Rank #142 globally</p>
          </div>
        </div>

        {/* Right: Certs + Exams */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">

          {/* Earned certifications */}
          <div className="border border-tactical-border/50 bg-black/40 rounded-xl p-5 flex-shrink-0">
            <p className="text-tactical-cyan text-xs font-mono tracking-widest mb-3">EARNED CERTIFICATIONS</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {certs.map(c => (
                <div key={c.title} className="border border-tactical-border/40 bg-black/30 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg border border-green-500/30 flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,255,136,0.06)' }}>
                    <span className="text-green-400 text-xs font-mono font-bold">{c.grade}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-tactical-bright text-xs font-mono font-medium truncate">{c.title}</p>
                    <p className="text-tactical-muted text-[10px] font-mono">{c.date} · +{c.pts} pts</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming exams — from real F2 course data */}
          <div className="border border-tactical-border/50 bg-black/40 rounded-xl p-5 flex-1 overflow-y-auto">
            <p className="text-tactical-cyan text-xs font-mono tracking-widest mb-3">UPCOMING EXAMS — F2 PRACTITIONER</p>
            {(COURSES_BY_BAND.F2 ?? []).map((module, i) => (
              <div key={module.id} className="flex items-center justify-between py-3 border-b border-tactical-border/20 group hover:bg-black/20 px-2 -mx-2 rounded transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded border border-tactical-border/50 flex items-center justify-center text-tactical-muted text-[10px] font-mono shrink-0">{i + 1}</div>
                  <div>
                    <p className="text-tactical-text text-xs font-mono group-hover:text-tactical-cyan transition-colors">{module.title} Exam</p>
                    <p className="text-tactical-muted text-[10px] font-mono">
                      {module.band} Certification · {module.examQuestions.length} questions · {module.lessons.length} lesson prep
                    </p>
                  </div>
                </div>
                <button onClick={() => startExam(module)}
                  className="px-3 py-1 text-[10px] font-mono rounded border border-tactical-cyan/30 text-tactical-cyan hover:bg-tactical-cyan hover:text-black transition-all font-bold whitespace-nowrap ml-2">
                  START
                </button>
              </div>
            ))}

            <p className="text-tactical-cyan text-xs font-mono tracking-widest mb-3 mt-5">COMPLETED — F1 FUNDAMENTALS</p>
            {(COURSES_BY_BAND.F1 ?? []).map((module, i) => (
              <div key={module.id} className="flex items-center justify-between py-3 border-b border-tactical-border/20 opacity-60 px-2 -mx-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded border border-green-500/40 flex items-center justify-center text-green-400 text-[10px] font-mono shrink-0">✓</div>
                  <div>
                    <p className="text-tactical-text text-xs font-mono line-through opacity-60">{module.title} Exam</p>
                    <p className="text-tactical-muted text-[10px] font-mono">{module.band} · Completed 2026-01 — {module.examQuestions.length} questions</p>
                  </div>
                </div>
                <span className="text-green-400 text-[10px] font-mono whitespace-nowrap ml-2">PASSED</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
