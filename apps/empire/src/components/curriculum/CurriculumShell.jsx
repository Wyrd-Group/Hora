import React, { useState, useMemo, Suspense, lazy } from 'react';
import { useCurriculumStore } from '../../store/curriculumStore';
import { courses, getCourseById } from '../../data/courses';
import { useFoundationsStore } from '../../store/foundationsStore';
import { FOUNDATION_UNLOCKS } from '../../lib/foundationsUnlocks';
import { useSpacedRepetitionStore } from '../../store/spacedRepetitionStore';
import { usePersonalFinanceStore } from '../../store/personalFinanceStore';
import { useEmpireStore } from '../../store/empireStore';

// Lazy-load every heavy child — each becomes its own chunk.
// The lesson-content modules (~19k lines across 4 files) used to ship in
// the main curriculum chunk; now they're pulled in only when TextbookReader
// or ExamFlow is mounted, via dynamic imports inside those components or
// the lesson-content loader.
const TextbookReader    = lazy(() => import('./TextbookReader'));
const ExamFlow          = lazy(() => import('./ExamFlow'));
const GlossaryPanel     = lazy(() => import('./GlossaryPanel'));
const NotebookPanel     = lazy(() => import('./NotebookPanel'));
const CertificateViewer = lazy(() => import('./CertificateViewer'));
const ReviewDeck        = lazy(() => import('./ReviewDeck'));
const PracticeHub       = lazy(() => import('../foundations/panels'));

// Minimal loading fallback — matches the dark shell palette so it doesn't
// flash a bright div during the dynamic import.
function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-[10px] font-mono tracking-widest text-tactical-text/40">LOADING…</div>
    </div>
  );
}

// ── Tab definitions ─────────────────────────────────────────────
const TABS = [
  { id: 'foundations',  label: 'FOUNDATIONS',   icon: '🏛️' },
  { id: 'practice',     label: 'PRACTICE',      icon: '🧰' },
  { id: 'review',       label: 'REVIEW',        icon: '🔁' },
  { id: 'courses',      label: 'ECFL',          icon: '📚' },
  { id: 'notebook',     label: 'NOTEBOOK',      icon: '📝' },
  { id: 'ecflExams',    label: 'ECFL EXAMS',    icon: '🎓' },
  { id: 'certificates', label: 'CERTIFICATES',  icon: '🏆' },
  { id: 'glossary',     label: 'GLOSSARY',      icon: '📖' },
];

// ── Band colours ────────────────────────────────────────────────
const bandColor = { F0: '#00e5ff', F1: '#10b981', F2: '#f59e0b', F3: '#ef4444', F4: '#8b5cf6', F5: '#3b82f6', F6: '#ec4899' };
const bandLabel = { F0: 'Financial Literacy', F1: 'Financial Awareness', F2: 'Financial Foundation', F3: 'Financial Proficiency', F4: 'Quantitative Finance', F5: 'Institutional Strategy', F6: 'Frontier Markets & Innovation' };

// Lesson content is resolved inside TextbookReader via the dynamic loader in
// src/lib/curriculum/lessonContent.ts — this keeps the main shell chunk
// small and only pays the ~19k-line lesson-content cost when a learner
// actually opens a lesson.

// ── Progress bar ────────────────────────────────────────────────
function ProgressBar({ pct, color = '#00e5ff' }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ── Course card ─────────────────────────────────────────────────
function CourseCard({ course, pct, onSelect }) {
  const color = bandColor[course.band] ?? '#00e5ff';
  return (
    <button
      onClick={() => onSelect(course.id)}
      className="group text-left w-full rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-all p-4"
    >
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">{course.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {course.band && (
              <span
                className="text-[9px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded"
                style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
              >
                {course.band}
              </span>
            )}
            <h3 className="text-sm font-mono font-bold text-tactical-text truncate">{course.title}</h3>
          </div>
          <p className="text-[11px] font-mono text-tactical-text/40 line-clamp-2">{course.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ProgressBar pct={pct} color={color} />
        <span className="text-[10px] font-mono text-tactical-text/50 shrink-0">{pct}%</span>
      </div>
      <div className="mt-2 text-[10px] font-mono text-tactical-text/30">
        {course.lessons.length} lessons{course.exam ? ' · Final exam' : ''}
      </div>
    </button>
  );
}

// ── Course list (grouped by band) ───────────────────────────────
function CourseList({ onSelect }) {
  const { completedLessons, getCompletionPercent } = useCurriculumStore();
  const grouped = useMemo(() => {
    const map = {};
    for (const c of courses) {
      const band = c.band ?? 'Other';
      if (!map[band]) map[band] = [];
      map[band].push(c);
    }
    return map;
  }, []);

  const bandOrder = ['F0', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'Other'];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
      {bandOrder.filter(b => grouped[b]).map(band => (
        <div key={band}>
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: bandColor[band] ?? '#888' }}
            />
            <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-tactical-text/60">
              {bandLabel[band] ?? band}
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {grouped[band].map(c => (
              <CourseCard
                key={c.id}
                course={c}
                pct={getCompletionPercent(c.id, c.lessons)}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Lesson picker sidebar (collapsible) ─────────────────────────
function LessonSidebar({ course, lessonIndex, onSelect, onBack, collapsed, onToggle }) {
  const { completedLessons } = useCurriculumStore();
  const color = bandColor[course.band] ?? '#00e5ff';

  if (collapsed) {
    return (
      <>
        {/* Mobile collapsed: compact horizontal bar */}
        <div className="md:hidden flex items-center gap-1 px-2 py-1.5 border-b border-white/[0.06] bg-[#060a12]/60 shrink-0">
          <button onClick={onBack} className="text-[10px] text-[#00e5ff] px-2 py-1 hover:bg-white/[0.04] rounded">←</button>
          <div className="flex gap-1 flex-1 overflow-x-auto no-scrollbar">
            {course.lessons.map((lesson, i) => {
              const done = completedLessons.includes(lesson.id);
              const active = i === lessonIndex;
              return (
                <button key={lesson.id} onClick={() => onSelect(i)}
                  className={`w-6 h-6 rounded-full border flex items-center justify-center text-[9px] font-mono shrink-0 transition-all
                    ${done ? 'bg-[#10b981] border-[#10b981] text-white' : active ? 'border-[#00e5ff] text-[#00e5ff] bg-[#00e5ff]/10' : 'border-white/20 text-white/40'}`}
                >{done ? '✓' : i + 1}</button>
              );
            })}
            {course.exam && (
              <button onClick={() => onSelect(-1)}
                className={`w-6 h-6 rounded-full border flex items-center justify-center text-[9px] font-mono shrink-0
                  ${lessonIndex === -1 ? 'border-[#f59e0b] text-[#f59e0b] bg-[#f59e0b]/10' : 'border-[#f59e0b]/40 text-white/40'}`}
              >⚔</button>
            )}
          </div>
          <button onClick={onToggle} className="text-[10px] text-white/40 px-2 py-1 hover:bg-white/[0.04] rounded">▼</button>
        </div>

        {/* Desktop collapsed: thin vertical rail */}
        <div className="hidden md:flex w-12 shrink-0 border-r border-white/[0.06] flex-col bg-[#060a12]/60">
          <button onClick={onToggle} className="flex items-center justify-center py-3 text-[14px] text-[#00e5ff] hover:bg-white/[0.04] transition-colors border-b border-white/[0.06]">›</button>
          <button onClick={onBack} className="flex items-center justify-center py-2.5 text-[11px] text-[#00e5ff] hover:bg-white/[0.04] transition-colors border-b border-white/[0.06]">←</button>
          <div className="flex-1 overflow-y-auto flex flex-col items-center py-2 gap-1">
            {course.lessons.map((lesson, i) => {
              const done = completedLessons.includes(lesson.id);
              const active = i === lessonIndex;
              return (
                <button key={lesson.id} onClick={() => onSelect(i)} title={lesson.title}
                  className={`w-7 h-7 rounded-full border flex items-center justify-center text-[9px] font-mono transition-all
                    ${done ? 'bg-[#10b981] border-[#10b981] text-white' : active ? 'border-[#00e5ff] text-[#00e5ff] bg-[#00e5ff]/10' : 'border-white/20 text-white/40 hover:bg-white/[0.04]'}`}
                >{done ? '✓' : i + 1}</button>
              );
            })}
            {course.exam && (
              <button onClick={() => onSelect(-1)} title="Final Exam"
                className={`w-7 h-7 rounded-full border flex items-center justify-center text-[9px] font-mono transition-all
                  ${lessonIndex === -1 ? 'border-[#f59e0b] text-[#f59e0b] bg-[#f59e0b]/10' : 'border-[#f59e0b]/40 text-white/40 hover:bg-white/[0.04]'}`}
              >⚔</button>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── Expanded ──
  return (
    <>
      {/* Mobile expanded: vertical list that collapses upward */}
      <div className="md:hidden shrink-0 border-b border-white/[0.06] bg-[#060a12]/60">
        <div className="flex items-center border-b border-white/[0.06]">
          <button onClick={onBack} className="flex-1 flex items-center gap-2 px-4 py-2.5 text-[11px] font-mono text-[#00e5ff] hover:bg-white/[0.04]">
            ← Back to courses
          </button>
          <button onClick={onToggle} className="px-3 py-2.5 text-[10px] text-white/40 hover:text-white/60 hover:bg-white/[0.04]">▲ Hide</button>
        </div>
        <div className="max-h-[200px] overflow-y-auto">
          {course.lessons.map((lesson, i) => {
            const done = completedLessons.includes(lesson.id);
            const active = i === lessonIndex;
            return (
              <button key={lesson.id} onClick={() => { onSelect(i); onToggle(); }}
                className={`w-full text-left px-4 py-2 border-b border-white/[0.03] flex items-center gap-2 text-[11px] font-mono
                  ${active ? 'bg-[#00e5ff]/10 text-[#00e5ff]' : 'text-tactical-text/60 hover:bg-white/[0.03]'}`}
              >
                <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] shrink-0
                  ${done ? 'bg-[#10b981] border-[#10b981] text-white' : active ? 'border-[#00e5ff]' : 'border-white/20'}`}>
                  {done ? '✓' : i + 1}
                </span>
                <span className="truncate">{lesson.title}</span>
              </button>
            );
          })}
          {course.exam && (
            <button onClick={() => { onSelect(-1); onToggle(); }}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 text-[11px] font-mono
                ${lessonIndex === -1 ? 'bg-[#f59e0b]/10 text-[#f59e0b]' : 'text-tactical-text/60 hover:bg-white/[0.03]'}`}
            >
              <span className="w-5 h-5 rounded-full border border-[#f59e0b]/40 flex items-center justify-center text-[9px] shrink-0">⚔</span>
              <span className="truncate">Final Exam</span>
            </button>
          )}
        </div>
      </div>

      {/* Desktop expanded: full vertical sidebar */}
      <div className="hidden md:flex w-64 shrink-0 border-r border-white/[0.06] flex-col bg-[#060a12]/60">
        <div className="flex items-center border-b border-white/[0.06]">
          <button onClick={onBack} className="flex-1 flex items-center gap-2 px-4 py-3 text-[11px] font-mono text-[#00e5ff] hover:bg-white/[0.04] transition-colors">
            ← Back to courses
          </button>
          <button onClick={onToggle} className="flex items-center justify-center px-3 py-3 text-[14px] text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors" title="Collapse sidebar">
            ‹
          </button>
        </div>
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <span className="text-[9px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded"
            style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>{course.band}</span>
          <h2 className="text-sm font-mono font-bold text-tactical-text mt-1">{course.title}</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {course.lessons.map((lesson, i) => {
            const done = completedLessons.includes(lesson.id);
            const active = i === lessonIndex;
            return (
              <button key={lesson.id} onClick={() => onSelect(i)}
                className={`w-full text-left px-4 py-2.5 border-b border-white/[0.03] flex items-center gap-2 transition-colors text-[11px] font-mono
                  ${active ? 'bg-[#00e5ff]/10 text-[#00e5ff]' : 'text-tactical-text/60 hover:bg-white/[0.03]'}`}
              >
                <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] shrink-0
                  ${done ? 'bg-[#10b981] border-[#10b981] text-white' : active ? 'border-[#00e5ff]' : 'border-white/20'}`}>
                  {done ? '✓' : i + 1}
                </span>
                <span className="truncate">{lesson.title}</span>
              </button>
            );
          })}
          {course.exam && (
            <button onClick={() => onSelect(-1)}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-2 transition-colors text-[11px] font-mono
                ${lessonIndex === -1 ? 'bg-[#f59e0b]/10 text-[#f59e0b]' : 'text-tactical-text/60 hover:bg-white/[0.03]'}`}
            >
              <span className="w-5 h-5 rounded-full border border-[#f59e0b]/40 flex items-center justify-center text-[9px] shrink-0">⚔</span>
              <span className="truncate">Final Exam</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── ECFL Exams tab ──────────────────────────────────────────────
function ECFLExamsTab() {
  const { examResults } = useCurriculumStore();
  const [examCourseId, setExamCourseId] = useState(null);
  const ecflCourses = useMemo(() => courses.filter(c => c.exam), []);

  if (examCourseId) {
    const course = getCourseById(examCourseId);
    if (!course?.exam) return null;
    return (
      <ExamFlow
        exam={course.exam}
        courseId={course.id}
        courseName={course.title}
        band={course.band}
        onExit={() => setExamCourseId(null)}
      />
    );
  }

  // Group exams by band
  const bandOrder = ['F0', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'Other'];
  const grouped = {};
  for (const c of ecflCourses) {
    const b = c.band ?? 'Other';
    if (!grouped[b]) grouped[b] = [];
    grouped[b].push(c);
  }

  // Count certs per band
  const certsByBand = {};
  const { certificates } = useCurriculumStore.getState();
  for (const cert of certificates) {
    if (cert.band) {
      certsByBand[cert.band] = (certsByBand[cert.band] ?? 0) + 1;
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      {/* ECFL Band Progress Tracker */}
      <div className="mb-6">
        <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-tactical-text/60 mb-3">ECFL BAND PROGRESSION</h2>
        <div className="flex gap-2 flex-wrap mb-4">
          {bandOrder.filter(b => b !== 'Other').map(b => {
            const color = bandColor[b] ?? '#888';
            const coursesInBand = grouped[b] ?? [];
            const passedInBand = certsByBand[b] ?? 0;
            const total = coursesInBand.length;
            const complete = total > 0 && passedInBand >= total;
            return (
              <div key={b} className="flex flex-col items-center gap-1">
                <div
                  className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-mono text-xs font-bold transition-all ${complete ? 'shadow-lg' : 'opacity-60'}`}
                  style={{
                    borderColor: complete ? color : `${color}40`,
                    backgroundColor: complete ? `${color}15` : 'transparent',
                    color: complete ? color : `${color}60`,
                    boxShadow: complete ? `0 0 20px ${color}30` : 'none',
                  }}
                >
                  {complete ? '✓' : b}
                </div>
                <span className="text-[8px] font-mono text-tactical-text/40">{passedInBand}/{total}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exams grouped by band */}
      <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-tactical-text/60 mb-4">ECFL CERTIFICATION EXAMS</h2>
      {bandOrder.filter(b => grouped[b]).map(band => {
        const color = bandColor[band] ?? '#888';
        return (
          <div key={band} className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] font-mono font-bold tracking-widest" style={{ color }}>
                {band} — {bandLabel[band] ?? band}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grouped[band].map(c => {
                const result = examResults[c.id];
                const cColor = bandColor[c.band] ?? '#00e5ff';
                return (
                  <button
                    key={c.id}
                    onClick={() => setExamCourseId(c.id)}
                    className="text-left rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-all p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{c.icon}</span>
                      <div>
                        {c.band && (
                          <span
                            className="text-[9px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded"
                            style={{ color: cColor, backgroundColor: `${cColor}15`, border: `1px solid ${cColor}30` }}
                          >
                            {c.band}
                          </span>
                        )}
                        <h3 className="text-sm font-mono font-bold text-tactical-text">{c.title}</h3>
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-tactical-text/30 mb-2">
                      {c.exam?.questions?.length ?? 0} questions · Pass: {c.exam?.passingScore ?? 70}%
                      {c.exam?.timeLimit ? ` · ${Math.round(c.exam.timeLimit / 60)} min` : ''}
                    </div>
                    {result ? (
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold ${result.passed ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                          {result.passed ? '✓ PASSED' : '✗ FAILED'} — {result.score}%
                        </span>
                        {result.grade && result.passed && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                            style={{ color: cColor, backgroundColor: `${cColor}10`, border: `1px solid ${cColor}25` }}>
                            {result.grade}
                          </span>
                        )}
                        {result.distinction && result.passed && (
                          <span className="text-[8px] font-mono text-tactical-text/40">
                            {result.distinction}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-[10px] font-mono text-tactical-text/30">Not attempted</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Foundations tab ─────────────────────────────────────────────
function FoundationsTab({ onSelect, onSwitchTab }) {
  const { completedLessons, getCompletionPercent, examResults, certificates } = useCurriculumStore();
  const { unlockedFeatures, rewardedCourseIds, grantHistory, unlockProgress } = useFoundationsStore();
  const progress = unlockProgress();
  const srCards = useSpacedRepetitionStore(s => s.cards);
  const srStreak = useSpacedRepetitionStore(s => s.reviewStreak);
  const srStats = useMemo(() => {
    const cards = Object.values(srCards);
    const now = Date.now();
    return {
      total: cards.length,
      due: cards.filter(c => c.dueAt <= now).length,
      mastered: cards.filter(c => c.repetitions >= 4).length,
      struggling: cards.filter(c => c.lapses >= 2).length,
    };
  }, [srCards]);
  const pfBankAccounts = usePersonalFinanceStore(s => s.bankAccounts);
  const pfDebts = usePersonalFinanceStore(s => s.debts);
  const pfVaultBalance = usePersonalFinanceStore(s => s.vaultBalance);
  const personalCash = useEmpireStore(s => s.personalBalance);
  const netWorth = useMemo(() => {
    const bankTotal = pfBankAccounts.reduce((s, a) => s + (a.balance ?? 0), 0);
    const debtTotal = pfDebts.reduce((s, d) => s + (d.balance ?? 0), 0);
    const assets = bankTotal + pfVaultBalance + (personalCash ?? 0);
    return { assets, liabilities: debtTotal, net: assets - debtTotal };
  }, [pfBankAccounts, pfDebts, pfVaultBalance, personalCash]);

  const f0Courses = useMemo(
    () => courses.filter(c => c.band === 'F0').sort((a, b) => {
      const ao = FOUNDATION_UNLOCKS.find(u => u.courseId === a.id)?.order ?? 99;
      const bo = FOUNDATION_UNLOCKS.find(u => u.courseId === b.id)?.order ?? 99;
      return ao - bo;
    }),
    [],
  );

  const color = bandColor.F0;
  const totalRewardedCash = grantHistory.reduce((sum, g) => sum + (g.cash ?? 0), 0);
  const totalRewardedAP = grantHistory.reduce((sum, g) => sum + (g.aegisPoints ?? 0), 0);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      {/* Header + headline stats */}
      <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-[#00e5ff10] to-transparent p-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-tactical-text/60">
            FOUNDATIONS — FINANCIAL LITERACY
          </h2>
        </div>
        <p className="text-[11px] font-mono text-tactical-text/50 max-w-2xl mb-4">
          10 modules mapped to the OECD/INFE Core Competencies Framework for Financial Literacy (2016).
          Each module unlocks a slice of the Empire&apos;s financial features and pays cash + Aegis Points
          on exam distinction. Pass all 10 and you earn a certified F0 badge — the floor for the ECFL
          certification ladder.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox label="UNLOCKED" value={`${progress.unlocked}/${progress.total}`} color={color} />
          <StatBox label="PROGRESS" value={`${progress.pct}%`} color={color} />
          <StatBox label="CASH EARNED" value={`€${totalRewardedCash.toLocaleString()}`} color="#10b981" />
          <StatBox label="AP EARNED" value={totalRewardedAP.toLocaleString()} color="#f59e0b" />
        </div>
      </div>

      {/* Next-Up CTA — surfaces what the player should do right now */}
      <NextUpPanel
        reviewsDue={srStats.due}
        reviewStreak={srStreak}
        unlockProgress={progress}
        certificateCount={certificates.length}
        netWorth={netWorth.net}
        onSwitchTab={onSwitchTab}
      />

      {/* Unlock roadmap */}
      <div className="mb-6">
        <h3 className="text-[11px] font-mono font-bold tracking-widest uppercase text-tactical-text/60 mb-3">
          UNLOCK ROADMAP
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {FOUNDATION_UNLOCKS.map(u => {
            const unlocked = unlockedFeatures.includes(u.feature);
            return (
              <div
                key={u.feature}
                className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <div
                  className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-mono text-[10px] font-bold shrink-0"
                  style={{
                    borderColor: unlocked ? color : 'rgba(255,255,255,0.15)',
                    backgroundColor: unlocked ? `${color}15` : 'transparent',
                    color: unlocked ? color : 'rgba(255,255,255,0.35)',
                  }}
                >
                  {unlocked ? '✓' : u.order}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[12px] font-mono font-bold truncate ${unlocked ? 'text-tactical-text' : 'text-tactical-text/50'}`}>
                    {u.featureLabel}
                  </div>
                  <div className="text-[9px] font-mono text-tactical-text/35 truncate">{u.location}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Course list */}
      <h3 className="text-[11px] font-mono font-bold tracking-widest uppercase text-tactical-text/60 mb-3">
        F0 MODULES — RECOMMENDED PLAY ORDER
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {f0Courses.map(c => {
          const unlock = FOUNDATION_UNLOCKS.find(u => u.courseId === c.id);
          const pct = getCompletionPercent(c.id, c.lessons);
          const rewarded = rewardedCourseIds.includes(c.id);
          const result = examResults[c.id];
          return (
            <FoundationsCourseCard
              key={c.id}
              course={c}
              order={unlock?.order}
              featureLabel={unlock?.featureLabel}
              pct={pct}
              rewarded={rewarded}
              examResult={result}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Foundations course card — richer than CourseCard ────────────
function FoundationsCourseCard({ course, order, featureLabel, pct, rewarded, examResult, onSelect }) {
  const color = bandColor.F0;
  return (
    <button
      onClick={() => onSelect(course.id)}
      className="group text-left w-full rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-all p-4 relative"
    >
      {rewarded && (
        <div
          className="absolute top-2 right-2 text-[8px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded"
          style={{ color: '#10b981', backgroundColor: '#10b98115', border: '1px solid #10b98130' }}
        >
          REWARDED
        </div>
      )}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">{course.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {typeof order === 'number' && (
              <span
                className="text-[9px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded"
                style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
              >
                F0 · {order}
              </span>
            )}
            <h3 className="text-sm font-mono font-bold text-tactical-text truncate">{course.title}</h3>
          </div>
          <p className="text-[11px] font-mono text-tactical-text/40 line-clamp-2">{course.description}</p>
        </div>
      </div>
      {featureLabel && (
        <div className="text-[10px] font-mono text-tactical-text/50 mb-2">
          Unlocks: <span style={{ color }}>{featureLabel}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <ProgressBar pct={pct} color={color} />
        <span className="text-[10px] font-mono text-tactical-text/50 shrink-0">{pct}%</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-tactical-text/30">
        <span>{course.lessons.length} lessons · Final exam</span>
        {examResult && (
          <span className={examResult.passed ? 'text-[#10b981]' : 'text-[#ef4444]'}>
            {examResult.passed ? `✓ ${examResult.distinction ?? 'Pass'}` : `✗ ${examResult.score}%`}
          </span>
        )}
      </div>
    </button>
  );
}

// ── NextUpPanel ────────────────────────────────────────────────
// Surfaces the single most useful action right now. Priority ladder:
//   1. Spaced-repetition reviews due → push them to REVIEW.
//   2. F0 modules incomplete → push to first locked unlock.
//   3. All F0 unlocked, no F1 cert yet → point at F1 ladder.
//   4. Everything green → PRACTICE lab (growth-phase).
function NextUpPanel({ reviewsDue, reviewStreak, unlockProgress, certificateCount, netWorth, onSwitchTab }) {
  let cta = null;

  if (reviewsDue > 0) {
    cta = {
      tone: '#f59e0b',
      icon: '🧠',
      title: `${reviewsDue} review card${reviewsDue === 1 ? '' : 's'} due`,
      subtitle: `Keep your ${reviewStreak || 0}-day streak alive — 2 minutes of review.`,
      action: 'GO TO REVIEW →',
      onClick: () => onSwitchTab('review'),
    };
  } else if (unlockProgress.unlocked < unlockProgress.total) {
    const remaining = unlockProgress.total - unlockProgress.unlocked;
    cta = {
      tone: '#00e5ff',
      icon: '🏛️',
      title: `${remaining} F0 unlock${remaining === 1 ? '' : 's'} remaining`,
      subtitle: `Pass the next Foundations exam to unlock the next gameplay panel.`,
      action: 'PICK A COURSE ↓',
      onClick: null,
    };
  } else if (certificateCount === unlockProgress.total) {
    cta = {
      tone: '#10b981',
      icon: '🎓',
      title: 'F0 complete — graduate to ECFL',
      subtitle: 'Every F0 module is unlocked. Climb the F1–F6 certification ladder.',
      action: 'OPEN ECFL →',
      onClick: () => onSwitchTab('courses'),
    };
  } else {
    cta = {
      tone: '#8b5cf6',
      icon: '🧰',
      title: `Net Worth: €${Math.round(netWorth).toLocaleString()}`,
      subtitle: 'F0 unlocked. Put your skills to work in the Practice Lab.',
      action: 'OPEN PRACTICE →',
      onClick: () => onSwitchTab('practice'),
    };
  }

  return (
    <div
      className="mb-6 rounded-xl border p-4 flex items-center gap-4"
      style={{ borderColor: `${cta.tone}40`, backgroundColor: `${cta.tone}08` }}
    >
      <div
        className="text-3xl rounded-full w-14 h-14 flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${cta.tone}15`, border: `1px solid ${cta.tone}30` }}
      >
        {cta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-mono tracking-widest" style={{ color: cta.tone }}>NEXT UP</div>
        <div className="text-sm font-mono font-bold text-tactical-text truncate">{cta.title}</div>
        <div className="text-[11px] font-mono text-tactical-text/50 mt-0.5">{cta.subtitle}</div>
      </div>
      {cta.onClick && (
        <button
          onClick={cta.onClick}
          className="px-4 py-2 rounded-lg font-mono text-[10px] font-bold tracking-widest shrink-0 hover:opacity-90 transition-all"
          style={{ color: cta.tone, backgroundColor: `${cta.tone}15`, border: `1px solid ${cta.tone}40` }}
        >
          {cta.action}
        </button>
      )}
    </div>
  );
}

// ── StatBox ─────────────────────────────────────────────────────
function StatBox({ label, value, color }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="text-[9px] font-mono tracking-widest text-tactical-text/40">{label}</div>
      <div className="text-lg font-mono font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN SHELL
// ═══════════════════════════════════════════════════════════════
export default function CurriculumShell() {
  // Foundations (F0) is the floor of the ECFL ladder — new learners land here
  // by default, graduate to F1-F6 once the 10 F0 modules are cleared.
  const [tab, setTab] = useState('foundations');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const {
    currentCourseId, currentLessonIndex,
    setCourse, clearCourse, setLessonIndex,
  } = useCurriculumStore();
  const reviewsDue = useSpacedRepetitionStore(s => s.dueCount());

  // ── If a course is selected, show lesson sidebar + reader ─────
  // The reader surfaces for either the ECFL 'courses' tab or the F0
  // 'foundations' tab — both feed into the same lesson/exam flow.
  if (currentCourseId && (tab === 'courses' || tab === 'foundations')) {
    const course = getCourseById(currentCourseId);
    if (!course) { clearCourse(); return null; }

    const isExam = currentLessonIndex === -1;

    return (
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <LessonSidebar
          course={course}
          lessonIndex={currentLessonIndex}
          onSelect={(i) => setLessonIndex(i)}
          onBack={clearCourse}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
        />
        <div className="flex-1 overflow-hidden flex flex-col">
          <Suspense fallback={<LoadingFallback />}>
            {isExam && course.exam ? (
              <ExamFlow
                exam={course.exam}
                courseId={course.id}
                courseName={course.title}
                band={course.band}
                onExit={() => setLessonIndex(0)}
              />
            ) : (
              <TextbookReader
                course={course}
                lessonIndex={currentLessonIndex}
              />
            )}
          </Suspense>
        </div>
      </div>
    );
  }

  // ── Tab bar + content ─────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-[#0a0f1a] rounded-lg border border-white/[0.06] mx-4 mt-3 mb-2 self-center overflow-x-auto no-scrollbar shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative px-4 py-2 rounded-md flex items-center gap-1.5 font-mono text-[10px] tracking-widest transition-all whitespace-nowrap
              ${tab === t.id
                ? 'bg-white/[0.06] text-[#00e5ff]'
                : 'text-white/30 hover:text-white/60 hover:bg-white/[0.03]'}`}
            style={tab === t.id ? { boxShadow: 'inset 0 -2px 0 #00e5ff, 0 0 20px #00e5ff26' } : {}}
          >
            <span className="text-sm">{t.icon}</span>
            <span className="font-bold">{t.label}</span>
            {t.id === 'review' && reviewsDue > 0 && (
              <span
                className="ml-1 px-1.5 rounded-full text-[9px] font-bold"
                style={{ color: '#f59e0b', backgroundColor: '#f59e0b25', border: '1px solid #f59e0b60' }}
              >
                {reviewsDue}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content — Suspense boundary wraps lazy-loaded tab panels */}
      <Suspense fallback={<LoadingFallback />}>
        {tab === 'courses' && <CourseList onSelect={(id) => setCourse(id)} />}
        {tab === 'foundations' && <FoundationsTab onSelect={(id) => setCourse(id)} onSwitchTab={setTab} />}
        {tab === 'practice' && <div className="flex-1 overflow-y-auto"><PracticeHub /></div>}
        {tab === 'review' && <div className="flex-1 overflow-y-auto"><ReviewDeck /></div>}
        {tab === 'notebook' && <NotebookPanel />}
        {tab === 'ecflExams' && <ECFLExamsTab />}
        {tab === 'certificates' && <CertificateViewer />}
        {tab === 'glossary' && <GlossaryPanel />}
      </Suspense>
    </div>
  );
}
