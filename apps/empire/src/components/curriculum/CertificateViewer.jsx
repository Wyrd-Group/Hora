import React, { useState } from 'react';
import { useCurriculumStore } from '../../store/curriculumStore';
import { getCourseById, courses } from '../../data/courses';
import {
  downloadCertificateSvg,
  downloadCertificatePng,
  copyVerificationUrl,
} from '../../lib/certificateSvg';

const bandColors = { F1: '#10b981', F2: '#f59e0b', F3: '#ef4444', F4: '#8b5cf6', F5: '#3b82f6', F6: '#ec4899' };
const bandLabels = {
  F1: 'Financial Awareness',
  F2: 'Financial Foundation',
  F3: 'Financial Proficiency',
  F4: 'Quantitative Finance',
  F5: 'Institutional Strategy',
  F6: 'Frontier Markets & Innovation',
};

function BandTracker({ certificates }) {
  const bands = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'];
  const certsByBand = {};
  const coursesByBand = {};

  for (const c of courses) {
    if (!c.band) continue;
    coursesByBand[c.band] = (coursesByBand[c.band] ?? 0) + 1;
  }
  for (const cert of certificates) {
    if (cert.band) {
      certsByBand[cert.band] = (certsByBand[cert.band] ?? 0) + 1;
    }
  }

  // Highest completed band
  let highestBand = null;
  for (const b of bands) {
    const needed = coursesByBand[b] ?? 0;
    const earned = certsByBand[b] ?? 0;
    if (needed > 0 && earned >= needed) highestBand = b;
  }

  return (
    <div className="mb-6 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎖</span>
        <h3 className="text-[10px] font-mono font-bold tracking-[0.2em] text-tactical-text/50 uppercase">
          ECFL Certification Level
        </h3>
        {highestBand && (
          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded ml-auto"
            style={{
              color: bandColors[highestBand],
              backgroundColor: `${bandColors[highestBand]}15`,
              border: `1px solid ${bandColors[highestBand]}30`
            }}>
            {highestBand} — {bandLabels[highestBand]}
          </span>
        )}
      </div>

      {/* Band progress chain */}
      <div className="flex items-center gap-1">
        {bands.map((b, i) => {
          const color = bandColors[b];
          const needed = coursesByBand[b] ?? 0;
          const earned = certsByBand[b] ?? 0;
          const complete = needed > 0 && earned >= needed;
          const partial = earned > 0 && earned < needed;
          const pct = needed > 0 ? Math.round((earned / needed) * 100) : 0;

          return (
            <React.Fragment key={b}>
              {i > 0 && (
                <div className="h-0.5 w-4 rounded-full"
                  style={{ backgroundColor: complete || (bands.indexOf(b) <= bands.indexOf(highestBand ?? '')) ? color : `${color}20` }}
                />
              )}
              <div className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-2 flex items-center justify-center font-mono text-[10px] font-bold transition-all relative`}
                  style={{
                    borderColor: complete ? color : partial ? `${color}60` : `${color}20`,
                    backgroundColor: complete ? `${color}15` : 'transparent',
                    color: complete ? color : partial ? `${color}80` : `${color}30`,
                    boxShadow: complete ? `0 0 16px ${color}25` : 'none',
                  }}
                >
                  {complete ? '✓' : b}
                  {partial && (
                    <svg className="absolute inset-0" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="18" cy="18" r="16" fill="none" stroke={`${color}20`} strokeWidth="2" />
                      <circle cx="18" cy="18" r="16" fill="none" stroke={color} strokeWidth="2"
                        strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" opacity="0.6" />
                    </svg>
                  )}
                </div>
                <span className="text-[7px] font-mono text-tactical-text/30">{earned}/{needed}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function CertCard({ cert, expanded, onToggle }) {
  const course = getCourseById(cert.courseId);
  const band = cert.band ?? course?.band;
  const color = bandColors[band] ?? '#00e5ff';

  const distinctionColors = {
    'High Distinction': '#f59e0b',
    'Distinction': '#8b5cf6',
    'Merit': '#3b82f6',
    'Pass': '#10b981',
  };
  const dColor = distinctionColors[cert.distinction] ?? '#10b981';

  return (
    <div
      className="rounded-xl border relative overflow-hidden transition-all cursor-pointer hover:scale-[1.01]"
      style={{ borderColor: `${color}30`, backgroundColor: `${color}04` }}
      onClick={onToggle}
    >
      {/* Decorative corners */}
      <div className="absolute top-0 right-0 w-20 h-20 opacity-10"
        style={{ background: `radial-gradient(circle at top right, ${color}, transparent 70%)` }} />
      <div className="absolute bottom-0 left-0 w-12 h-12 opacity-5"
        style={{ background: `radial-gradient(circle at bottom left, ${color}, transparent 70%)` }} />

      {/* Header */}
      <div className="p-4 pb-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{course?.icon ?? '🎓'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {band && (
                <span className="text-[8px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded"
                  style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                  {band}
                </span>
              )}
              {cert.grade && (
                <span className="text-[8px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded"
                  style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                  {cert.grade}
                </span>
              )}
              {cert.distinction && (
                <span className="text-[7px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded"
                  style={{ color: dColor, backgroundColor: `${dColor}10`, border: `1px solid ${dColor}25` }}>
                  {cert.distinction.toUpperCase()}
                </span>
              )}
            </div>
            <h3 className="text-sm font-mono font-bold text-tactical-text mt-1 truncate">
              {course?.title ?? cert.courseName}
            </h3>
          </div>
          {cert.score != null && (
            <div className="text-right shrink-0">
              <div className="text-xl font-mono font-bold" style={{ color }}>{cert.score}%</div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-2">
        <div className="flex gap-3 text-[9px] font-mono text-tactical-text/40">
          <span>{new Date(cert.earnedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          {cert.correctAnswers != null && cert.totalQuestions != null && (
            <span>{cert.correctAnswers}/{cert.totalQuestions} correct</span>
          )}
          {cert.timeTaken != null && (
            <span>{Math.floor(cert.timeTaken / 60)}m {cert.timeTaken % 60}s</span>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: `${color}10` }}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-[8px] font-mono text-tactical-text/25 tracking-widest mb-0.5">VERIFICATION CODE</div>
              <p className="text-[10px] font-mono font-bold tracking-wider" style={{ color }}>{cert.verificationCode}</p>
            </div>
            <div>
              <div className="text-[8px] font-mono text-tactical-text/25 tracking-widest mb-0.5">BAND</div>
              <p className="text-[10px] font-mono font-bold text-tactical-text/60">{band ? `${band} — ${bandLabels[band] ?? ''}` : 'N/A'}</p>
            </div>
            {cert.timeAllowed != null && (
              <div>
                <div className="text-[8px] font-mono text-tactical-text/25 tracking-widest mb-0.5">TIME ALLOWED</div>
                <p className="text-[10px] font-mono font-bold text-tactical-text/60">{Math.round(cert.timeAllowed / 60)} minutes</p>
              </div>
            )}
            <div>
              <div className="text-[8px] font-mono text-tactical-text/25 tracking-widest mb-0.5">ISSUED</div>
              <p className="text-[10px] font-mono font-bold text-tactical-text/60">
                {new Date(cert.earnedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Mini score bar */}
          {cert.score != null && (
            <div className="mb-2">
              <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${cert.score}%`, backgroundColor: color }} />
              </div>
              <div className="flex justify-between mt-1 text-[8px] font-mono text-tactical-text/25">
                <span>0%</span>
                <span>Passing: 75%</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* Export controls */}
          <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => downloadCertificateSvg({
                courseName: course?.title ?? cert.courseName ?? 'Course',
                band: band ?? undefined,
                bandLabel: band ? bandLabels[band] : undefined,
                score: cert.score,
                grade: cert.grade,
                distinction: cert.distinction,
                correctAnswers: cert.correctAnswers,
                totalQuestions: cert.totalQuestions,
                verificationCode: cert.verificationCode,
                earnedAt: cert.earnedAt,
              })}
              className="flex-1 px-3 py-1.5 rounded text-[10px] font-mono font-bold transition-all"
              style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10`, border: `1px solid ${color}40` }}
            >
              ⬇ SVG
            </button>
            <button
              onClick={() => downloadCertificatePng({
                courseName: course?.title ?? cert.courseName ?? 'Course',
                band: band ?? undefined,
                bandLabel: band ? bandLabels[band] : undefined,
                score: cert.score,
                grade: cert.grade,
                distinction: cert.distinction,
                correctAnswers: cert.correctAnswers,
                totalQuestions: cert.totalQuestions,
                verificationCode: cert.verificationCode,
                earnedAt: cert.earnedAt,
              }).catch(() => {})}
              className="flex-1 px-3 py-1.5 rounded text-[10px] font-mono font-bold transition-all"
              style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10`, border: `1px solid ${color}40` }}
            >
              ⬇ PNG
            </button>
            <button
              onClick={() => copyVerificationUrl(cert.verificationCode)}
              className="flex-1 px-3 py-1.5 rounded text-[10px] font-mono font-bold transition-all text-tactical-text/60 border border-white/10 hover:bg-white/[0.04]"
            >
              🔗 SHARE
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2.5 border-t flex items-center gap-1" style={{ borderColor: `${color}10` }}>
        <span className="text-[#10b981] text-[10px]">✓</span>
        <span className="text-[10px] font-mono text-[#10b981] font-bold">ECFL CERTIFIED</span>
        <span className="ml-auto text-[9px] font-mono text-tactical-text/20">
          {expanded ? '▲ less' : '▼ details'}
        </span>
      </div>
    </div>
  );
}

/**
 * CertificateViewer — Professional ECFL certification display with band tracker.
 */
export default function CertificateViewer() {
  const { certificates } = useCurriculumStore();
  const [expandedId, setExpandedId] = useState(null);

  // Sort: newest first, group by band
  const sorted = [...certificates].sort((a, b) => b.earnedAt - a.earnedAt);

  // Stats
  const totalCerts = certificates.length;
  const avgScore = totalCerts > 0
    ? Math.round(certificates.reduce((s, c) => s + (c.score ?? 0), 0) / totalCerts)
    : 0;
  const highDistinctions = certificates.filter(c => c.distinction === 'High Distinction').length;

  if (certificates.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <span className="text-5xl mb-4">🏆</span>
        <p className="text-sm font-mono font-bold text-tactical-text/40">No certificates yet</p>
        <p className="text-[11px] font-mono text-tactical-text/20 mt-1 text-center max-w-sm">
          Complete course lessons and pass ECFL certification exams to earn professional certificates.
          Each band (F1–F6) represents a level of financial competency.
        </p>
        <div className="mt-6 flex gap-2">
          {['F1', 'F2', 'F3', 'F4', 'F5', 'F6'].map(b => (
            <div key={b} className="w-8 h-8 rounded-full border flex items-center justify-center text-[9px] font-mono"
              style={{ borderColor: `${bandColors[b]}30`, color: `${bandColors[b]}40` }}>
              {b}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      {/* Band tracker */}
      <BandTracker certificates={certificates} />

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
          <div className="text-2xl font-mono font-bold text-[#00e5ff]">{totalCerts}</div>
          <div className="text-[8px] font-mono text-tactical-text/30 tracking-widest">CERTIFICATES</div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
          <div className="text-2xl font-mono font-bold text-[#f59e0b]">{avgScore}%</div>
          <div className="text-[8px] font-mono text-tactical-text/30 tracking-widest">AVG SCORE</div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
          <div className="text-2xl font-mono font-bold text-[#8b5cf6]">{highDistinctions}</div>
          <div className="text-[8px] font-mono text-tactical-text/30 tracking-widest">HIGH DIST.</div>
        </div>
      </div>

      {/* Certificate list */}
      <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-tactical-text/60 mb-4">
        YOUR CERTIFICATES ({certificates.length})
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map(cert => (
          <CertCard
            key={cert.id}
            cert={cert}
            expanded={expandedId === cert.id}
            onToggle={() => setExpandedId(expandedId === cert.id ? null : cert.id)}
          />
        ))}
      </div>
    </div>
  );
}
