import React, { useState } from 'react';
import { ALL_COURSES } from '../../data/courses';

const AcademyPanel = ({ onClose }) => {
  const [activeCourse, setActiveCourse] = useState(ALL_COURSES[0]);
  const [activeModule, setActiveModule] = useState(ALL_COURSES[0].modules[0]);
  const [activeLesson, setActiveLesson] = useState(ALL_COURSES[0].modules[0].lessons[0]);
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [examMode, setExamMode] = useState(null); // null | { questions, score, current, answers }

  const markComplete = (lessonId) => {
    setCompletedLessons(prev => new Set([...prev, lessonId]));
  };

  const startExam = (mod) => {
    setExamMode({ questions: mod.examQuestions, current: 0, answers: [], score: null, module: mod });
  };

  const answerQuestion = (idx) => {
    const newAnswers = [...examMode.answers, idx];
    if (examMode.current + 1 >= examMode.questions.length) {
      const score = newAnswers.reduce((s, a, i) => s + (a === examMode.questions[i].correct ? 1 : 0), 0);
      setExamMode(prev => ({ ...prev, answers: newAnswers, score }));
    } else {
      setExamMode(prev => ({ ...prev, current: prev.current + 1, answers: newAnswers }));
    }
  };

  const totalLessons = activeCourse.modules.reduce((s, m) => s + m.lessons.length, 0);
  const completedInCourse = activeCourse.modules.reduce((s, m) => s + m.lessons.filter(l => completedLessons.has(l.id)).length, 0);
  const progressPct = Math.round((completedInCourse / totalLessons) * 100);

  return (
    <div className="absolute inset-0 z-40 bg-[#060a12]/95 backdrop-blur-xl flex flex-col" style={{ top: 40 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-tactical-border/50 bg-black/40 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-[#00e5ff] font-mono font-bold text-sm tracking-widest">ACADEMY</span>
          <div className="flex gap-1">
            {ALL_COURSES.map(c => (
              <button key={c.id} onClick={() => { setActiveCourse(c); setActiveModule(c.modules[0]); setActiveLesson(c.modules[0].lessons[0]); setExamMode(null); }}
                className={`px-3 py-0.5 text-[10px] font-mono rounded border transition-all ${activeCourse.id === c.id ? 'border-[#00e5ff]/50 text-[#00e5ff] bg-[#00e5ff10]' : 'border-tactical-border text-tactical-text/50 hover:text-tactical-text'}`}>
                {c.band} — {c.title}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[10px] font-mono text-tactical-text/50">{completedInCourse}/{totalLessons} lessons · {progressPct}%</div>
          <div className="w-24 h-1 bg-tactical-border/30 rounded-full overflow-hidden">
            <div className="h-full bg-[#00e5ff] rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
          <button onClick={onClose} className="text-tactical-text/40 hover:text-tactical-text transition-colors px-2 py-1 font-mono text-xs">✕ CLOSE</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Module sidebar */}
        <div className="w-56 flex-shrink-0 border-r border-tactical-border/30 bg-black/20 overflow-y-auto">
          {activeCourse.modules.map((mod) => {
            const modCompleted = mod.lessons.filter(l => completedLessons.has(l.id)).length;
            const isModActive = activeModule.id === mod.id;
            return (
              <div key={mod.id}>
                <button onClick={() => { setActiveModule(mod); setActiveLesson(mod.lessons[0]); setExamMode(null); }}
                  className={`w-full text-left px-3 py-2.5 border-b border-tactical-border/20 transition-all ${isModActive ? 'bg-[#00e5ff08] border-l-2 border-l-[#00e5ff]' : 'hover:bg-white/5'}`}>
                  <p className={`text-[11px] font-mono font-medium ${isModActive ? 'text-[#00e5ff]' : 'text-tactical-text/70'}`}>{mod.title}</p>
                  <p className="text-[9px] text-tactical-text/30 mt-0.5">{modCompleted}/{mod.lessons.length} complete</p>
                </button>
                {isModActive && mod.lessons.map(lesson => (
                  <button key={lesson.id} onClick={() => { setActiveLesson(lesson); setExamMode(null); }}
                    className={`w-full text-left pl-5 pr-3 py-2 transition-all border-b border-tactical-border/10 flex items-center gap-2 ${activeLesson.id === lesson.id ? 'bg-white/5 text-tactical-text' : 'text-tactical-text/40 hover:text-tactical-text/70'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${completedLessons.has(lesson.id) ? 'bg-[#10b981]' : activeLesson.id === lesson.id ? 'bg-[#00e5ff]' : 'bg-tactical-border'}`} />
                    <span className="text-[10px] font-mono truncate">{lesson.title}</span>
                  </button>
                ))}
                {isModActive && (
                  <button onClick={() => startExam(mod)}
                    className="w-full text-left pl-5 pr-3 py-2 text-[10px] font-mono text-[#f59e0b] hover:bg-[#f59e0b10] transition-all border-b border-tactical-border/10 flex items-center gap-2">
                    <span className="text-[#f59e0b]">▶</span> Module Exam ({mod.examQuestions.length}q)
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6">
          {examMode ? (
            examMode.score !== null ? (
              /* Exam result */
              <div className="max-w-xl mx-auto text-center py-12">
                <div className={`text-4xl font-mono font-bold mb-2 ${examMode.score >= examMode.questions.length * 0.65 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  {examMode.score}/{examMode.questions.length}
                </div>
                <div className="text-tactical-text/60 text-sm mb-6">
                  {examMode.score >= examMode.questions.length * 0.65 ? '✓ PASSED — Module unlocked' : '✗ FAILED — Review lessons and retry'}
                </div>
                <div className="space-y-2 text-left mb-6">
                  {examMode.questions.map((q, i) => (
                    <div key={q.id} className={`text-xs font-mono p-2 rounded border ${examMode.answers[i] === q.correct ? 'border-[#10b981]/30 bg-[#10b98108]' : 'border-[#ef4444]/30 bg-[#ef444408]'}`}>
                      <span className={examMode.answers[i] === q.correct ? 'text-[#10b981]' : 'text-[#ef4444]'}>{examMode.answers[i] === q.correct ? '✓' : '✗'}</span>
                      <span className="text-tactical-text/60 ml-2">{q.question}</span>
                      {examMode.answers[i] !== q.correct && <div className="text-[#10b981] text-[10px] mt-1 pl-4">Correct: {q.options[q.correct]} — {q.explanation}</div>}
                    </div>
                  ))}
                </div>
                <button onClick={() => setExamMode(null)} className="px-4 py-2 border border-[#00e5ff]/40 text-[#00e5ff] font-mono text-xs rounded hover:bg-[#00e5ff10] transition-all">
                  BACK TO LESSONS
                </button>
              </div>
            ) : (
              /* Exam question */
              <div className="max-w-xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[#f59e0b] font-mono text-xs tracking-widest">EXAM — {examMode.module.title}</span>
                  <span className="text-tactical-text/40 text-xs font-mono">{examMode.current + 1} / {examMode.questions.length}</span>
                </div>
                <div className="w-full h-1 bg-tactical-border/30 rounded-full mb-6 overflow-hidden">
                  <div className="h-full bg-[#f59e0b] rounded-full transition-all" style={{ width: `${((examMode.current) / examMode.questions.length) * 100}%` }} />
                </div>
                <p className="text-tactical-text text-sm font-mono mb-6 leading-relaxed">{examMode.questions[examMode.current].question}</p>
                <div className="space-y-2">
                  {examMode.questions[examMode.current].options.map((opt, i) => (
                    <button key={i} onClick={() => answerQuestion(i)}
                      className="w-full text-left px-4 py-3 border border-tactical-border/40 rounded text-xs font-mono text-tactical-text/70 hover:border-[#f59e0b]/50 hover:text-tactical-text hover:bg-[#f59e0b08] transition-all">
                      <span className="text-[#f59e0b] mr-2">{String.fromCharCode(65+i)}.</span>{opt}
                    </button>
                  ))}
                </div>
              </div>
            )
          ) : (
            /* Lesson view */
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[9px] font-mono text-tactical-text/30 tracking-widest uppercase">{activeModule.title}</span>
                <span className="text-tactical-text/20">·</span>
                <span className="text-[9px] font-mono text-tactical-text/30">{activeLesson.duration}</span>
              </div>
              <h2 className="text-tactical-text text-lg font-mono font-bold mb-4">{activeLesson.title}</h2>
              <div className="text-tactical-text/70 text-sm leading-relaxed whitespace-pre-line font-mono mb-6">{activeLesson.content}</div>
              <button onClick={() => markComplete(activeLesson.id)}
                className={`px-4 py-2 rounded text-xs font-mono border transition-all ${completedLessons.has(activeLesson.id) ? 'border-[#10b981]/40 text-[#10b981] bg-[#10b98108]' : 'border-[#00e5ff]/40 text-[#00e5ff] hover:bg-[#00e5ff10]'}`}>
                {completedLessons.has(activeLesson.id) ? '✓ COMPLETED' : 'MARK COMPLETE'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcademyPanel;
