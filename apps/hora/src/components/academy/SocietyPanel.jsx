import React, { useState } from 'react';

/* ─── helpers ───────────────────────────────────────────────── */

const TABS = ['COLLEGES', 'SOCIETIES', 'FREE AGENTS'];

const prestigeStars = (n, max = 5) =>
  Array.from({ length: max }, (_, i) => (i < n ? '★' : '☆')).join('');

const ovrBadgeColor = (rating) => {
  if (rating >= 85) return 'bg-amber-500/90 text-black';
  if (rating >= 75) return 'bg-blue-500/90 text-white';
  if (rating >= 60) return 'bg-emerald-600/90 text-white';
  return 'bg-zinc-600/80 text-zinc-200';
};

const classBadgeColor = (cls) => {
  const map = {
    striker: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    midfielder: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    defender: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    goalkeeper: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    analyst: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    trader: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    engineer: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    strategist: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
  };
  return map[cls?.toLowerCase()] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
};

/* ─── sub-components ────────────────────────────────────────── */

const ProgressBar = ({ value, max = 100, color = 'bg-[#00e5ff]', label }) => (
  <div className="flex items-center gap-2 w-full">
    {label && <span className="text-[9px] font-mono text-[#9C8E7E] w-10 shrink-0">{label}</span>}
    <div className="flex-1 h-[4px] bg-white/5 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
      />
    </div>
    <span className="text-[9px] font-mono text-[#9C8E7E] w-8 text-right">{Math.round((value / max) * 100)}%</span>
  </div>
);

const OvrBadge = ({ ovr, pot }) => (
  <div className="flex items-center gap-1.5">
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded font-mono font-bold text-sm leading-none ${ovrBadgeColor(ovr)}`}>
      {ovr}
    </span>
    <span className="text-[10px] font-mono text-[#9C8E7E]">
      <span className="text-[#9C8E7E]/40">→</span> {pot}
    </span>
  </div>
);

const StudentCard = ({ student, onAssignWork, onTakeIntern, onReturnFromInternship, onRecruitStudent, onPassStudent }) => {
  const [workUnits, setWorkUnits] = useState(1);
  const status = student.status || 'studying';

  return (
    <div className="bg-[rgba(24,22,18,0.65)] border border-[rgba(232,224,208,0.08)] rounded-lg p-3 hover:border-[#00e5ff]/20 transition-all group">
      {/* Top row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <OvrBadge ovr={student.currentRating} pot={student.potentialRating} />
          <div>
            <p className="text-[#E8E0D0] font-mono text-xs font-semibold leading-tight">{student.name}</p>
            <span className={`inline-block mt-0.5 px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider rounded border ${classBadgeColor(student.class)}`}>
              {student.class}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {status === 'studying' && (
            <>
              <button
                onClick={() => onTakeIntern?.(student.id)}
                className="px-2 py-1 text-[9px] font-mono font-bold tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded hover:bg-amber-500/20 transition-all"
              >
                INTERN
              </button>
            </>
          )}
          {status === 'interning' && (
            <button
              onClick={() => onReturnFromInternship?.(student.id)}
              className="px-2 py-1 text-[9px] font-mono font-bold tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/30 rounded hover:bg-sky-500/20 transition-all"
            >
              RETURN
            </button>
          )}
          {(status === 'graduating' || status === 'graduated') && (
            <>
              <button
                onClick={() => onRecruitStudent?.(student.id)}
                className="px-2 py-1 text-[9px] font-mono font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/20 transition-all"
              >
                RECRUIT
              </button>
              <button
                onClick={() => onPassStudent?.(student.id)}
                className="px-2 py-1 text-[9px] font-mono font-bold tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded hover:bg-rose-500/20 transition-all"
              >
                PASS
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats row */}
      {student.stats && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {Object.entries(student.stats).map(([key, val]) => (
            <span key={key} className="text-[8px] font-mono text-[#9C8E7E] bg-white/[0.03] px-1.5 py-0.5 rounded">
              {key.toUpperCase()} <span className="text-[#E8E0D0]">{val}</span>
            </span>
          ))}
        </div>
      )}

      {/* Bars */}
      <div className="space-y-1">
        <ProgressBar value={student.graduationProgress || 0} label="GRAD" color="bg-[#00e5ff]" />
        <ProgressBar value={student.growthProgress || 0} label="GROW" color="bg-emerald-500" />
      </div>

      {/* Assign work (only for studying) */}
      {status === 'studying' && onAssignWork && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.04]">
          <input
            type="range"
            min={1}
            max={10}
            value={workUnits}
            onChange={(e) => setWorkUnits(Number(e.target.value))}
            className="flex-1 h-1 accent-[#00e5ff] cursor-pointer"
          />
          <span className="text-[9px] font-mono text-[#9C8E7E] w-6 text-center">{workUnits}u</span>
          <button
            onClick={() => onAssignWork?.(student.id, workUnits)}
            className="px-2 py-1 text-[9px] font-mono font-bold tracking-wider bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/30 rounded hover:bg-[#00e5ff]/20 transition-all"
          >
            ASSIGN WORK
          </button>
        </div>
      )}

      {/* Status badge */}
      {student.isIntern && (
        <div className="mt-1.5">
          <span className="text-[8px] font-mono font-bold tracking-wider text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded">
            ON INTERNSHIP
          </span>
        </div>
      )}
    </div>
  );
};

/* ─── main component ────────────────────────────────────────── */

const SocietyPanel = ({
  colleges = [],
  societies = [],
  students = {},
  onOpenSociety,
  onAssignWork,
  onTakeIntern,
  onReturnFromInternship,
  onRecruitStudent,
  onPassStudent,
  onAssignScout,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [expandedSociety, setExpandedSociety] = useState(null);
  const [openSocietyName, setOpenSocietyName] = useState('');

  const openedCollegeIds = new Set(societies.map((s) => s.collegeId));

  const allStudents = Object.values(students);
  const freeAgents = allStudents.filter((s) => s.status === 'passed' || s.status === 'free');

  const getStudentsForSociety = (societyId) => {
    const society = societies.find((s) => s.id === societyId);
    if (!society) return [];
    return allStudents.filter((s) => society.students?.includes(s.id));
  };

  const getCollege = (collegeId) => colleges.find((c) => c.id === collegeId);

  /* ─── render tabs ─────────────────────────────────────────── */

  const renderColleges = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
      {colleges.map((college) => {
        const isOpened = openedCollegeIds.has(college.id);
        return (
          <div
            key={college.id}
            className={`bg-[rgba(24,22,18,0.85)] border rounded-lg p-4 backdrop-blur-xl transition-all hover:border-[#00e5ff]/30 ${
              isOpened ? 'border-emerald-500/30' : 'border-[rgba(232,224,208,0.10)]'
            }`}
          >
            {/* Crest + Name */}
            <div className="flex items-start gap-3 mb-3">
              <span className="text-3xl leading-none">{college.crest || '🏛'}</span>
              <div className="min-w-0">
                <h3 className="text-[#E8E0D0] font-mono text-sm font-bold leading-tight truncate">{college.name}</h3>
                <p className="text-[10px] font-mono text-[#9C8E7E] mt-0.5">
                  {college.city}, {college.country}
                </p>
              </div>
            </div>

            {/* Prestige */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-400 text-xs tracking-wider">{prestigeStars(college.prestige)}</span>
              <span className="text-[9px] font-mono text-[#9C8E7E]">PRESTIGE</span>
            </div>

            {/* Specializations */}
            <div className="flex flex-wrap gap-1 mb-3">
              {(college.specializations || []).map((spec) => (
                <span
                  key={spec}
                  className="px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider bg-[#00e5ff]/10 text-[#00e5ff]/80 border border-[#00e5ff]/20 rounded"
                >
                  {spec}
                </span>
              ))}
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-3">
              <div className="text-[9px] font-mono text-[#9C8E7E]">
                POTENTIAL <span className="text-[#E8E0D0]">{college.potentialRange?.[0]}–{college.potentialRange?.[1]}</span>
              </div>
              <div className="text-[9px] font-mono text-[#9C8E7E]">
                MAX <span className="text-[#E8E0D0]">{college.maxStudents}</span>
              </div>
              <div className="text-[9px] font-mono text-[#9C8E7E]">
                GRAD <span className="text-[#E8E0D0]">{college.graduationTicks} ticks</span>
              </div>
              <div className="text-[9px] font-mono text-[#9C8E7E]">
                COST <span className="text-amber-400">{college.costToOpenSociety?.toLocaleString()} Q</span>
              </div>
            </div>

            {/* Description */}
            {college.description && (
              <p className="text-[9px] font-mono text-[#9C8E7E]/70 leading-relaxed mb-3 line-clamp-2">{college.description}</p>
            )}

            {/* Action */}
            {isOpened ? (
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                SOCIETY ACTIVE
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Society name..."
                  value={openSocietyName}
                  onChange={(e) => setOpenSocietyName(e.target.value)}
                  className="flex-1 bg-white/[0.03] border border-[rgba(232,224,208,0.10)] rounded px-2 py-1 text-[10px] font-mono text-[#E8E0D0] placeholder:text-[#9C8E7E]/40 focus:outline-none focus:border-[#00e5ff]/40"
                />
                <button
                  onClick={() => {
                    onOpenSociety?.(college.id, openSocietyName || `${college.name} Society`);
                    setOpenSocietyName('');
                  }}
                  className="px-3 py-1 text-[10px] font-mono font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/20 active:scale-95 transition-all whitespace-nowrap"
                >
                  OPEN SOCIETY
                </button>
              </div>
            )}
          </div>
        );
      })}

      {colleges.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center py-16 text-[#9C8E7E]/50">
          <span className="text-4xl mb-3">🏛</span>
          <p className="font-mono text-xs">No colleges available yet.</p>
        </div>
      )}
    </div>
  );

  const renderSocieties = () => (
    <div className="p-4 space-y-3">
      {societies.map((society) => {
        const college = getCollege(society.collegeId);
        const societyStudents = getStudentsForSociety(society.id);
        const isExpanded = expandedSociety === society.id;
        const maxStudents = college?.maxStudents || 10;

        return (
          <div
            key={society.id}
            className="bg-[rgba(24,22,18,0.85)] border border-[rgba(232,224,208,0.10)] backdrop-blur-xl rounded-lg overflow-hidden transition-all"
          >
            {/* Society header (clickable) */}
            <button
              onClick={() => setExpandedSociety(isExpanded ? null : society.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{college?.crest || '🏛'}</span>
                <div>
                  <h3 className="text-[#E8E0D0] font-mono text-xs font-bold">{society.name}</h3>
                  <p className="text-[9px] font-mono text-[#9C8E7E]">
                    {college?.name} &middot; {college?.city}, {college?.country}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5">
                {/* Student count */}
                <div className="text-right">
                  <p className="text-[10px] font-mono text-[#9C8E7E]">STUDENTS</p>
                  <p className="text-xs font-mono font-bold text-[#E8E0D0]">
                    {societyStudents.length} <span className="text-[#9C8E7E] font-normal">/ {maxStudents}</span>
                  </p>
                </div>

                {/* Graduates */}
                <div className="text-right">
                  <p className="text-[10px] font-mono text-[#9C8E7E]">GRADUATES</p>
                  <p className="text-xs font-mono font-bold text-emerald-400">{society.totalGraduates || 0}</p>
                </div>

                {/* Reputation */}
                <div className="w-24">
                  <p className="text-[9px] font-mono text-[#9C8E7E] mb-0.5">REP {society.reputation || 0}/100</p>
                  <div className="h-[4px] bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${society.reputation || 0}%` }}
                    />
                  </div>
                </div>

                {/* Scout */}
                <div className="text-right">
                  <p className="text-[10px] font-mono text-[#9C8E7E]">SCOUT</p>
                  <p className="text-[10px] font-mono text-[#E8E0D0]">
                    {society.scoutAssigned ? (
                      <span className="text-[#00e5ff]">ASSIGNED</span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAssignScout?.(society.id, null);
                        }}
                        className="text-amber-400/60 hover:text-amber-400 transition-colors"
                      >
                        + ASSIGN
                      </button>
                    )}
                  </p>
                </div>

                {/* Expand indicator */}
                <span className={`text-[#9C8E7E]/40 text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </div>
            </button>

            {/* Expanded student list */}
            {isExpanded && (
              <div className="border-t border-[rgba(232,224,208,0.06)] bg-black/20 p-4">
                {societyStudents.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {societyStudents.map((student) => (
                      <StudentCard
                        key={student.id}
                        student={student}
                        onAssignWork={onAssignWork}
                        onTakeIntern={onTakeIntern}
                        onReturnFromInternship={onReturnFromInternship}
                        onRecruitStudent={onRecruitStudent}
                        onPassStudent={onPassStudent}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-[#9C8E7E]/40">
                    <span className="font-mono text-xs">No students enrolled yet. Assign a scout to begin recruiting.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {societies.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-[#9C8E7E]/50">
          <span className="text-4xl mb-3">📋</span>
          <p className="font-mono text-xs">No active societies. Open one from the Colleges tab.</p>
        </div>
      )}
    </div>
  );

  const renderFreeAgents = () => (
    <div className="p-4">
      {freeAgents.length > 0 ? (
        <div className="space-y-2">
          {freeAgents.map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between bg-[rgba(24,22,18,0.85)] border border-[rgba(232,224,208,0.10)] backdrop-blur-xl rounded-lg px-4 py-3 hover:border-[#00e5ff]/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <OvrBadge ovr={student.currentRating} pot={student.potentialRating} />
                <div>
                  <p className="text-[#E8E0D0] font-mono text-xs font-semibold">{student.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider rounded border ${classBadgeColor(student.class)}`}>
                      {student.class}
                    </span>
                    {student.stats && Object.entries(student.stats).slice(0, 4).map(([key, val]) => (
                      <span key={key} className="text-[8px] font-mono text-[#9C8E7E]">
                        {key.toUpperCase()} <span className="text-[#E8E0D0]">{val}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {student.cv && (
                <p className="text-[9px] font-mono text-[#9C8E7E]/60 max-w-[200px] truncate mx-4">{student.cv}</p>
              )}

              <button
                onClick={() => onRecruitStudent?.(student.id)}
                className="px-3 py-1.5 text-[10px] font-mono font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/20 active:scale-95 transition-all shrink-0"
              >
                RECRUIT
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-[#9C8E7E]/50">
          <span className="text-4xl mb-3">👤</span>
          <p className="font-mono text-xs">No free agents available. Students you pass will appear here.</p>
        </div>
      )}
    </div>
  );

  /* ─── main render ─────────────────────────────────────────── */

  return (
    <div className="absolute inset-0 z-40 bg-[#060a12]/95 backdrop-blur-xl flex flex-col font-mono" style={{ top: 40 }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[rgba(232,224,208,0.08)] bg-black/40 shrink-0">
        <div className="flex items-center gap-5">
          <button
            onClick={onBack}
            className="text-[#9C8E7E] hover:text-[#E8E0D0] transition-colors text-xs font-bold tracking-wider"
          >
            ← BACK
          </button>
          <div className="h-4 w-px bg-[rgba(232,224,208,0.10)]" />
          <span className="text-[#00e5ff] font-bold text-sm tracking-[0.2em]">YOUTH ACADEMY</span>
        </div>

        {/* Summary stats */}
        <div className="flex items-center gap-6">
          <div className="text-[10px] text-[#9C8E7E]">
            SOCIETIES <span className="text-[#E8E0D0] font-bold">{societies.length}</span>
          </div>
          <div className="text-[10px] text-[#9C8E7E]">
            STUDENTS <span className="text-[#E8E0D0] font-bold">{allStudents.filter(s => s.status !== 'passed' && s.status !== 'free').length}</span>
          </div>
          <div className="text-[10px] text-[#9C8E7E]">
            FREE AGENTS <span className="text-amber-400 font-bold">{freeAgents.length}</span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0 px-6 border-b border-[rgba(232,224,208,0.06)] bg-black/20 shrink-0">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`relative px-5 py-2.5 text-[10px] font-bold tracking-[0.15em] transition-colors ${
              activeTab === i
                ? 'text-[#00e5ff]'
                : 'text-[#9C8E7E]/60 hover:text-[#9C8E7E]'
            }`}
          >
            {tab}
            {activeTab === i && (
              <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#00e5ff] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#9C8E7E]/10 scrollbar-track-transparent">
        {activeTab === 0 && renderColleges()}
        {activeTab === 1 && renderSocieties()}
        {activeTab === 2 && renderFreeAgents()}
      </div>
    </div>
  );
};

export default SocietyPanel;
