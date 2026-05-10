with open('apps/empire/src/components/academy/AcademyOS.jsx', 'r') as f:
    text = f.read()

start_idx = text.find('// ── ECFL Professional section')
end_idx = text.find('// ── Main AcademyOS')

new_section = """// ── ECFL Professional section ──────────────────────────────────────────────────
const F2_STUDY_MAP = {
  'f2-m1': [{ id: 'lesson-ecfl-f2-statements', title: 'Financial Statements Review', duration: '90m' }],
  'f2-m2': [{ id: 'lesson-ecfl-f2-macro', title: 'Advanced Macroeconomics', duration: '120m' }],
  'f2-m3': [{ id: 'lesson-ecfl-f2-equity', title: 'Institutional Equities', duration: '150m' }, { id: 'lesson-ecfl-f2-fixedincome', title: 'Credit & Fixed Income', duration: '150m' }],
  'f2-m4': [{ id: 'lesson-ecfl-f2-portfolio', title: 'Portfolio Management', duration: '180m' }]
};

function ECFLSection() {
  const f2Modules = COURSES_BY_BAND.F2 ?? [];
  const f1Modules = COURSES_BY_BAND.F1 ?? [];
  const [activeExam, setActiveExam] = useState(null);
  const [selectedStudyModuleId, setSelectedStudyModuleId] = useState(null);
  const [selectedStudyLesson, setSelectedStudyLesson] = useState(null);

  const passedExams = useEmpireStore(s => s.passedExams);
  const ecflScore = useEmpireStore(s => s.ecflScore);
  const completedLessons = useEmpireStore(s => s.completedLessons);
  const markLessonComplete = useEmpireStore(s => s.markLessonComplete);

  const f1PassedCount = f1Modules.filter(m => passedExams.includes(m.id)).length;
  const f2PassedCount = f2Modules.filter(m => passedExams.includes(m.id)).length;
  const isF1Done = f1Modules.length > 0 && f1PassedCount === f1Modules.length;

  const bands = [
    { band: 'F1', label: 'Fundamentals',  pts: 1000, earned: isF1Done ? 1000 : ecflScore, done: isF1Done,  color: '#10b981', modules: f1Modules },
    { band: 'F2', label: 'Practitioner',  pts: 2500, earned: isF1Done ? Math.max(0, ecflScore - 1000) : 0, active: true, color: '#f59e0b', modules: f2Modules },
    { band: 'F3', label: 'Advanced',      pts: 5000, earned: 0,    locked: true, color: '#6366f1', modules: [] },
  ];

  if (activeExam) {
    return <ExamFlow module={activeExam} onExit={() => setActiveExam(null)} />;
  }

  if (selectedStudyLesson) {
    return (
      <LessonReader 
        lesson={selectedStudyLesson} 
        isCompleted={completedLessons.includes(selectedStudyLesson.id)}
        onComplete={() => { markLessonComplete(selectedStudyLesson.id); setSelectedStudyLesson(null); }}
        onBack={() => setSelectedStudyLesson(null)} 
      />
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left — band progress sidebar */}
      <div className="w-56 shrink-0 border-r border-tactical-border/20 flex flex-col overflow-y-auto py-3 px-3 gap-2 custom-scrollbar">
        {bands.map(b => {
          const pct = Math.min(100, Math.round((b.earned / b.pts) * 100));
          return (
            <div key={b.band}
              className={`rounded-xl p-3 border transition-all ${b.active ? 'border-[#f59e0b]/40 bg-[#f59e0b]/5' : b.locked ? 'border-tactical-border/15 opacity-40' : 'border-[#10b981]/25 bg-[#10b981]/5'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg border flex items-center justify-center text-[10px] font-bold font-mono shrink-0"
                  style={{ borderColor: `${b.color}50`, color: b.color, background: `${b.color}10` }}>
                  {b.band}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-[10px] font-mono font-bold">{b.label}</p>
                  {b.done   && <p className="text-[#10b981] text-[9px] font-mono">✓ CERTIFIED</p>}
                  {b.active && <p style={{ color: b.color }} className="text-[9px] font-mono">ACTIVE</p>}
                  {b.locked && <p className="text-tactical-text/30 text-[9px] font-mono">LOCKED</p>}
                </div>
              </div>
              <div className="h-1 bg-tactical-border/20 rounded-full overflow-hidden mb-1">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: b.color }} />
              </div>
              <div className="flex justify-between text-[9px] font-mono">
                <span className="text-tactical-text/30">{b.earned.toLocaleString()}</span>
                <span style={{ color: b.color }}>{b.pts.toLocaleString()} pts</span>
              </div>
            </div>
          );
        })}

        {/* Total score */}
        <div className="mt-auto border border-tactical-border/25 rounded-xl p-3">
          <p className="text-[9px] text-tactical-text/40 font-mono uppercase tracking-widest mb-1">Total Score</p>
          <p className="text-white text-xl font-mono font-bold">{ecflScore.toLocaleString()} <span className="text-tactical-text/30 text-sm">pts</span></p>
          <p className="text-tactical-text/30 text-[10px] font-mono mt-0.5">Rank #142 globally</p>
        </div>
      </div>

      {/* Right — exam list */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* F2 upcoming */}
        <div className="px-6 pt-5 pb-3 border-b border-tactical-border/20 shrink-0">
          <h2 className="text-[#f59e0b] font-mono text-xs font-bold uppercase tracking-widest">F2 Practitioner — Module Exams & Study</h2>
          <p className="text-tactical-text/30 text-[10px] font-mono mt-0.5">Pass each module exam to earn ECFL certification points · 65% threshold</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* F2 exams */}
          <div className="px-6 py-3">
            {f2Modules.map((mod, i) => {
              const isPassed = passedExams.includes(mod.id);
              const mapLessons = F2_STUDY_MAP[mod.id] || [];
              const isStudying = selectedStudyModuleId === mod.id;
              return (
              <React.Fragment key={mod.id}>
                <div className={`flex items-center gap-4 py-3 border-b border-tactical-border/10 group transition-all ${isPassed ? 'opacity-50' : ''}`}>
                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center text-[10px] font-mono shrink-0 transition-all ${isPassed ? 'border-[#10b981]/30 text-[#10b981]' : 'border-tactical-border/30 text-tactical-text/30 group-hover:border-[#f59e0b]/40 group-hover:text-[#f59e0b]'}`}>
                    {isPassed ? '✓' : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-mono transition-colors ${isPassed ? 'text-tactical-text/50 line-through' : 'text-tactical-text group-hover:text-white'}`}>{mod.title} Exam</p>
                    <p className="text-tactical-text/30 text-[10px] font-mono mt-0.5">{mod.examQuestions.length} questions · {mapLessons.length} professional modules</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {mapLessons.length > 0 && (
                      <button
                        onClick={() => setSelectedStudyModuleId(isStudying ? null : mod.id)}
                        className={`px-3 py-1.5 text-[10px] font-mono rounded-lg border transition-all font-bold tracking-widest whitespace-nowrap ${isStudying ? 'border-[#f59e0b] text-[#f59e0b] bg-[#f59e0b]/10' : 'border-tactical-border/30 text-tactical-text hover:border-[#f59e0b]/50 hover:text-[#f59e0b]'}`}
                      >
                       {isStudying ? 'CLOSE' : 'STUDY LESSONS'}
                      </button>
                    )}
                    {!isPassed ? (
                      <button
                        onClick={() => setActiveExam(mod)}
                        className="px-4 py-1.5 text-[10px] font-mono rounded-lg border border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/10 transition-all font-bold tracking-widest whitespace-nowrap"
                      >
                        START EXAM
                      </button>
                    ) : (
                      <span className="text-[#10b981] text-[10px] font-mono whitespace-nowrap px-2">PASSED</span>
                    )}
                  </div>
                </div>
                {/* Expandable study lessons */}
                {isStudying && (
                  <div className="bg-[#111111] border border-tactical-border/10 rounded-lg p-3 ml-11 mt-2 mb-4 shadow-inner">
                    <p className="text-[#f59e0b] text-[9px] font-mono font-bold uppercase tracking-widest mb-3">Professional Reading Modules</p>
                    <div className="space-y-1">
                      {mapLessons.map(l => {
                        const isDone = completedLessons.includes(l.id);
                        return (
                          <button 
                            key={l.id} 
                            onClick={() => setSelectedStudyLesson(l)} 
                            className="flex items-center justify-between w-full p-2.5 rounded hover:bg-tactical-border/5 group transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-4 text-center text-[10px] ${isDone ? 'text-[#10b981]' : 'text-tactical-text/30 group-hover:text-[#f59e0b]/50'}`}>{isDone ? '✓' : '•'}</span>
                              <span className={`text-xs font-mono transition-colors ${isDone ? 'text-tactical-text/50' : 'text-tactical-text group-hover:text-white'}`}>{l.title}</span>
                            </div>
                            <span className="text-[10px] font-mono text-tactical-text/30 group-hover:text-[#f59e0b]/50 transition-colors uppercase flex items-center gap-2">
                              {l.duration}
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </React.Fragment>
            )})}
          </div>

          {/* F1 completed */}
          <div className="px-6 py-3">
            <p className="text-[#10b981] text-[9px] font-mono uppercase tracking-widest mb-3">F1 Fundamentals</p>
            {f1Modules.map((mod, i) => {
              const isPassed = passedExams.includes(mod.id);
              return (
              <div key={mod.id} className={`flex items-center gap-4 py-3 border-b border-tactical-border/8 ${isPassed ? 'opacity-50' : 'group'}`}>
                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center text-[10px] font-mono shrink-0 ${isPassed ? 'border-[#10b981]/30 text-[#10b981]' : 'border-tactical-border/30 text-tactical-text/30 group-hover:border-[#00e5ff]/40 group-hover:text-[#00e5ff]'}`}>
                  {isPassed ? '✓' : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-mono ${isPassed ? 'text-tactical-text/50 line-through' : 'text-tactical-text group-hover:text-white'}`}>{mod.title} Exam</p>
                  <p className="text-tactical-text/20 text-[10px] font-mono">F1 · {isPassed ? 'Completed' : 'Pending'} · {mod.examQuestions.length} questions</p>
                </div>
                {!isPassed ? (
                  <button
                    onClick={() => setActiveExam(mod)}
                    className="px-4 py-1.5 text-[10px] font-mono rounded-lg border border-[#00e5ff]/30 text-[#00e5ff] hover:bg-[#00e5ff]/10 transition-all font-bold tracking-widest whitespace-nowrap"
                  >
                    START EXAM
                  </button>
                ) : (
                  <span className="text-[#10b981] text-[10px] font-mono whitespace-nowrap">PASSED</span>
                )}
              </div>
            )})}
          </div>
        </div>
      </div>
    </div>
  );
}
"""

new_text = text[:start_idx] + new_section + text[end_idx:]

with open('apps/empire/src/components/academy/AcademyOS.jsx', 'w') as f:
    f.write(new_text)

