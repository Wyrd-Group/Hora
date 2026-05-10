/**
 * StudentCard — FIFA-style youth academy student profile card.
 *
 * Features:
 * - Dashed green border to distinguish from full agent cards
 * - OVR / POT rating badges with tier-based coloring
 * - SVG hexagonal radar chart for 6 stats
 * - Graduation & growth progress bars
 * - CV section with work history, metrics, and benchmarks
 * - Context-sensitive action buttons based on student status
 * - Compact (mini) mode for list views
 */

import { useState, useMemo } from 'react';

// ── Rating Color Tiers ─────────────────────────────────────────

function getRatingColor(rating) {
  if (rating >= 85) return '#FBBF24'; // gold
  if (rating >= 75) return '#60A5FA'; // blue
  if (rating >= 60) return '#34D399'; // green
  return '#6B7280';                   // gray
}

function getRatingBg(rating) {
  if (rating >= 85) return 'rgba(251,191,36,0.15)';
  if (rating >= 75) return 'rgba(96,165,250,0.15)';
  if (rating >= 60) return 'rgba(52,211,153,0.15)';
  return 'rgba(107,114,128,0.15)';
}

// ── Stat Radar (SVG Hexagonal) ─────────────────────────────────

function StatRadar({ stats, size = 200 }) {
  const keys = ['intelligence', 'speed', 'stealth', 'loyalty', 'adaptability', 'influence'];
  const labels = ['INT', 'SPD', 'STL', 'LOY', 'ADP', 'INF'];
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;

  const getPoint = (index, scale = 1) => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    return {
      x: cx + r * scale * Math.cos(angle),
      y: cy + r * scale * Math.sin(angle),
    };
  };

  const statPoints = keys.map((key, i) => {
    const val = Math.min(Math.max((stats[key] ?? 0) / 100, 0), 1);
    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    return {
      x: cx + r * val * Math.cos(angle),
      y: cy + r * val * Math.sin(angle),
      lx: cx + (r + 18) * Math.cos(angle),
      ly: cy + (r + 18) * Math.sin(angle),
      label: labels[i],
      value: stats[key] ?? 0,
    };
  });

  const statPolygon = statPoints.map(p => `${p.x},${p.y}`).join(' ');

  // Grid rings at 25%, 50%, 75%, 100%
  const gridRings = [0.25, 0.5, 0.75, 1.0].map(scale => {
    const pts = keys.map((_, i) => {
      const p = getPoint(i, scale);
      return `${p.x},${p.y}`;
    }).join(' ');
    return pts;
  });

  // Axis lines from center to each vertex
  const axisLines = keys.map((_, i) => {
    const p = getPoint(i, 1);
    return { x1: cx, y1: cy, x2: p.x, y2: p.y };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid rings */}
      {gridRings.map((pts, i) => (
        <polygon
          key={`ring-${i}`}
          points={pts}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.5"
        />
      ))}

      {/* Axis lines */}
      {axisLines.map((line, i) => (
        <line
          key={`axis-${i}`}
          x1={line.x1} y1={line.y1}
          x2={line.x2} y2={line.y2}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.5"
        />
      ))}

      {/* Stat fill */}
      <polygon
        points={statPolygon}
        fill="rgba(52,211,153,0.15)"
        stroke="#34D399"
        strokeWidth="1.5"
      />

      {/* Stat dots */}
      {statPoints.map((p, i) => (
        <circle key={`dot-${i}`} cx={p.x} cy={p.y} r="3" fill="#34D399" />
      ))}

      {/* Labels with values */}
      {statPoints.map((p, i) => (
        <g key={`label-${i}`}>
          <text
            x={p.lx}
            y={p.ly - 5}
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(232,224,208,0.6)"
            fontSize="9"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {p.label}
          </text>
          <text
            x={p.lx}
            y={p.ly + 7}
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(232,224,208,0.4)"
            fontSize="8"
            fontFamily="monospace"
          >
            {p.value}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Progress Bar ───────────────────────────────────────────────

function ProgressBar({ label, value, color }) {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 3,
      }}>
        <span style={{
          fontFamily: 'monospace', fontSize: 9, color: 'rgba(232,224,208,0.5)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          {label}
        </span>
        <span style={{
          fontFamily: 'monospace', fontSize: 9, color,
          fontWeight: 'bold',
        }}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div style={{
        height: 4, borderRadius: 2,
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: color,
          borderRadius: 2,
          transition: 'width 0.4s ease-out',
        }} />
      </div>
    </div>
  );
}

// ── Benchmark Value ────────────────────────────────────────────

function BenchmarkValue({ label, value }) {
  const numVal = typeof value === 'number' ? value : parseFloat(value);
  const isPositive = numVal >= 0;
  const color = isPositive ? '#34D399' : '#F87171';
  const prefix = isPositive ? '+' : '';
  const display = typeof value === 'number'
    ? `${prefix}${value.toFixed(1)}%`
    : `${prefix}${value}`;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '4px 8px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 4,
      flex: 1,
    }}>
      <span style={{
        fontFamily: 'monospace', fontSize: 7,
        color: 'rgba(232,224,208,0.4)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
        marginBottom: 2,
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: 'monospace', fontSize: 10,
        color, fontWeight: 'bold',
      }}>
        {display}
      </span>
    </div>
  );
}

// ── Compact Card ───────────────────────────────────────────────

function CompactStudentCard({ student, collegeName }) {
  const ovrColor = getRatingColor(student.currentRating);
  const classColors = {
    Analyst: '#60A5FA',
    Operative: '#F87171',
    Diplomat: '#A78BFA',
    Strategist: '#FBBF24',
    Engineer: '#34D399',
    Infiltrator: '#F472B6',
  };
  const classBadgeColor = classColors[student.class] ?? '#9CA3AF';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px',
      background: 'rgba(24,22,18,0.85)',
      border: '1px dashed rgba(52,211,153,0.25)',
      borderRadius: 6,
      cursor: 'pointer',
      height: 40,
      fontFamily: 'monospace',
      transition: 'all 0.2s',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = 'rgba(52,211,153,0.5)';
      e.currentTarget.style.background = 'rgba(52,211,153,0.05)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = 'rgba(52,211,153,0.25)';
      e.currentTarget.style.background = 'rgba(24,22,18,0.85)';
    }}
    >
      {/* OVR */}
      <div style={{
        width: 28, height: 28, borderRadius: 4,
        background: getRatingBg(student.currentRating),
        border: `1px solid ${ovrColor}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, fontWeight: 'bold', color: ovrColor }}>
          {student.currentRating}
        </span>
      </div>

      {/* Name */}
      <span style={{
        fontSize: 11, color: '#E8E0D0', fontWeight: 'bold',
        flex: 1, minWidth: 0,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {student.name}
      </span>

      {/* Class badge */}
      <span style={{
        fontSize: 8, color: classBadgeColor,
        padding: '2px 6px', borderRadius: 10,
        background: `${classBadgeColor}15`,
        border: `1px solid ${classBadgeColor}30`,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        flexShrink: 0,
      }}>
        {student.class}
      </span>

      {/* POT */}
      <span style={{
        fontSize: 9, color: 'rgba(232,224,208,0.5)',
        flexShrink: 0,
      }}>
        POT {student.potentialRating}
      </span>

      {/* Graduation % */}
      <span style={{
        fontSize: 9, color: '#22D3EE',
        flexShrink: 0,
      }}>
        {student.graduationProgress?.toFixed(0) ?? 0}%
      </span>
    </div>
  );
}

// ── Main Student Card ──────────────────────────────────────────

export default function StudentCard({
  student,
  collegeName = 'Unknown College',
  onRecruit,
  onPass,
  onIntern,
  onAssignWork,
  compact = false,
}) {
  const [workUnits, setWorkUnits] = useState(1);

  if (!student) return null;

  if (compact) {
    return <CompactStudentCard student={student} collegeName={collegeName} />;
  }

  const ovrColor = getRatingColor(student.currentRating);
  const potColor = getRatingColor(student.potentialRating);

  const classColors = {
    Analyst: '#60A5FA',
    Operative: '#F87171',
    Diplomat: '#A78BFA',
    Strategist: '#FBBF24',
    Engineer: '#34D399',
    Infiltrator: '#F472B6',
  };
  const classBadgeColor = classColors[student.class] ?? '#9CA3AF';

  const status = student.status ?? 'studying';
  const isGraduated = status === 'graduated' || status === 'graduating';
  const isStudying = status === 'studying';
  const isInterning = status === 'interning';

  const cv = student.cv ?? {};
  const previousWork = cv.previousWork ?? [];
  const metrics = cv.metrics ?? {};
  const benchmarks = cv.benchmarks ?? {};

  // ── Card Wrapper ────────────────────────────────────────────

  return (
    <div style={{
      width: 300,
      background: 'rgba(24,22,18,0.85)',
      border: '2px dashed rgba(52,211,153,0.30)',
      borderRadius: 12,
      overflow: 'hidden',
      fontFamily: 'monospace',
      backdropFilter: 'blur(14px)',
      transition: 'border-color 0.3s',
    }}>

      {/* ── TOP SECTION: Ratings + Identity ─────────────────── */}
      <div style={{
        padding: '14px 16px 10px',
        background: 'linear-gradient(180deg, rgba(52,211,153,0.06) 0%, transparent 100%)',
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>

          {/* OVR Badge (large) */}
          <div style={{
            width: 56, height: 56, borderRadius: 8,
            background: getRatingBg(student.currentRating),
            border: `2px solid ${ovrColor}50`,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: 8, color: 'rgba(232,224,208,0.4)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              lineHeight: 1,
            }}>
              OVR
            </span>
            <span style={{
              fontSize: 24, fontWeight: 'bold', color: ovrColor,
              lineHeight: 1,
            }}>
              {student.currentRating}
            </span>
          </div>

          {/* Name + College + Badges */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 'bold', color: '#E8E0D0',
              lineHeight: 1.2, marginBottom: 2,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {student.name}
            </div>
            <div style={{
              fontSize: 9, color: 'rgba(232,224,208,0.4)',
              marginBottom: 6,
            }}>
              {collegeName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Class badge */}
              <span style={{
                fontSize: 8, color: classBadgeColor,
                padding: '2px 8px', borderRadius: 10,
                background: `${classBadgeColor}15`,
                border: `1px solid ${classBadgeColor}30`,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {student.class}
              </span>
              {/* Intern badge */}
              {student.isIntern && (
                <span style={{
                  fontSize: 8, color: '#FBBF24',
                  padding: '2px 8px', borderRadius: 10,
                  background: 'rgba(251,191,36,0.12)',
                  border: '1px solid rgba(251,191,36,0.30)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  fontWeight: 'bold',
                }}>
                  INTERN
                </span>
              )}
            </div>
          </div>

          {/* POT Badge (smaller, right) */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            padding: '4px 8px',
            borderRadius: 6,
            background: `${potColor}10`,
            border: `1px solid ${potColor}25`,
            boxShadow: `0 0 8px ${potColor}15`,
          }}>
            <span style={{
              fontSize: 7, color: 'rgba(232,224,208,0.4)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              lineHeight: 1, marginBottom: 2,
            }}>
              POT
            </span>
            <span style={{
              fontSize: 16, fontWeight: 'bold', color: potColor,
              lineHeight: 1,
            }}>
              {student.potentialRating}
            </span>
          </div>
        </div>
      </div>

      {/* ── STAT RADAR ──────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'center',
        padding: '4px 0',
        borderTop: '1px solid rgba(232,224,208,0.06)',
        borderBottom: '1px solid rgba(232,224,208,0.06)',
        background: 'rgba(0,0,0,0.15)',
      }}>
        <StatRadar stats={student.stats ?? {}} size={200} />
      </div>

      {/* ── PROGRESS BARS ───────────────────────────────────── */}
      <div style={{ padding: '10px 16px 6px' }}>
        <ProgressBar
          label="Graduation"
          value={student.graduationProgress ?? 0}
          color="#22D3EE"
        />
        <ProgressBar
          label="Growth"
          value={student.growthProgress ?? 0}
          color="#34D399"
        />
      </div>

      {/* ── CV SECTION ──────────────────────────────────────── */}
      <div style={{
        padding: '8px 16px 10px',
        borderTop: '1px solid rgba(232,224,208,0.06)',
      }}>
        <div style={{
          fontSize: 9, color: 'rgba(232,224,208,0.5)',
          textTransform: 'uppercase', letterSpacing: '0.15em',
          marginBottom: 8, fontWeight: 'bold',
        }}>
          CV
        </div>

        {/* Previous work entries */}
        {previousWork.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            {previousWork.slice(0, 3).map((entry, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '3px 0',
              }}>
                <span style={{
                  width: 4, height: 4, borderRadius: 2,
                  background: '#34D399', flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 9, color: 'rgba(232,224,208,0.6)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {entry}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Metrics row */}
        <div style={{
          display: 'flex', gap: 8, marginBottom: 8,
          padding: '6px 8px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 7, color: 'rgba(232,224,208,0.35)', textTransform: 'uppercase', marginBottom: 2 }}>
              Projects
            </div>
            <div style={{ fontSize: 12, color: '#E8E0D0', fontWeight: 'bold' }}>
              {metrics.projectsCompleted ?? 0}
            </div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 7, color: 'rgba(232,224,208,0.35)', textTransform: 'uppercase', marginBottom: 2 }}>
              Avg Score
            </div>
            <div style={{ fontSize: 12, color: '#E8E0D0', fontWeight: 'bold' }}>
              {metrics.avgScore ?? 0}
            </div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 7, color: 'rgba(232,224,208,0.35)', textTransform: 'uppercase', marginBottom: 2 }}>
              Peak
            </div>
            <div style={{ fontSize: 12, color: '#E8E0D0', fontWeight: 'bold' }}>
              {metrics.peakPerformance ?? 0}
            </div>
          </div>
        </div>

        {/* Benchmarks */}
        <div style={{ display: 'flex', gap: 4 }}>
          <BenchmarkValue label="vs Class" value={benchmarks.vsClassAvg ?? 0} />
          <BenchmarkValue label="vs Potential" value={benchmarks.vsPotential ?? 0} />
          <BenchmarkValue label="Growth" value={benchmarks.growthRate ?? 0} />
        </div>
      </div>

      {/* ── ACTION BUTTONS ──────────────────────────────────── */}
      <div style={{
        padding: '8px 16px 12px',
        borderTop: '1px solid rgba(232,224,208,0.06)',
      }}>
        {/* Graduated / Graduating: Recruit + Pass */}
        {isGraduated && (
          <div style={{ display: 'flex', gap: 8 }}>
            {onRecruit && (
              <button
                onClick={() => onRecruit()}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 6,
                  fontFamily: 'monospace', fontSize: 10,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  fontWeight: 'bold', cursor: 'pointer',
                  background: 'rgba(52,211,153,0.15)', color: '#34D399',
                  border: '1px solid rgba(52,211,153,0.35)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(52,211,153,0.25)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(52,211,153,0.15)';
                }}
              >
                Recruit
              </button>
            )}
            {onPass && (
              <button
                onClick={() => onPass()}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 6,
                  fontFamily: 'monospace', fontSize: 10,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  fontWeight: 'bold', cursor: 'pointer',
                  background: 'rgba(107,114,128,0.15)', color: '#9CA3AF',
                  border: '1px solid rgba(107,114,128,0.30)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(107,114,128,0.25)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(107,114,128,0.15)';
                }}
              >
                Pass
              </button>
            )}
          </div>
        )}

        {/* Studying: Assign Work + Intern toggle */}
        {isStudying && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {onAssignWork && (
              <div style={{ display: 'flex', flex: 1, gap: 4 }}>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={workUnits}
                  onChange={e => setWorkUnits(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  style={{
                    width: 36, padding: '6px 4px', borderRadius: 4,
                    fontFamily: 'monospace', fontSize: 10,
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.06)', color: '#E8E0D0',
                    border: '1px solid rgba(255,255,255,0.10)',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => onAssignWork(workUnits)}
                  style={{
                    flex: 1, padding: '6px 0', borderRadius: 6,
                    fontFamily: 'monospace', fontSize: 9,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    fontWeight: 'bold', cursor: 'pointer',
                    background: 'rgba(96,165,250,0.15)', color: '#60A5FA',
                    border: '1px solid rgba(96,165,250,0.30)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(96,165,250,0.25)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(96,165,250,0.15)';
                  }}
                >
                  Assign Work
                </button>
              </div>
            )}
            {onIntern && (
              <button
                onClick={() => onIntern()}
                style={{
                  padding: '6px 12px', borderRadius: 6,
                  fontFamily: 'monospace', fontSize: 9,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  fontWeight: 'bold', cursor: 'pointer',
                  background: 'rgba(251,191,36,0.12)', color: '#FBBF24',
                  border: '1px solid rgba(251,191,36,0.30)',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(251,191,36,0.22)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(251,191,36,0.12)';
                }}
              >
                Intern
              </button>
            )}
          </div>
        )}

        {/* Interning: Status badge + Return */}
        {isInterning && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              flex: 1, padding: '6px 0',
              textAlign: 'center', borderRadius: 6,
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.20)',
            }}>
              <span style={{
                fontFamily: 'monospace', fontSize: 9,
                color: '#FBBF24', textTransform: 'uppercase',
                letterSpacing: '0.1em', fontWeight: 'bold',
              }}>
                On Internship
              </span>
            </div>
            {onIntern && (
              <button
                onClick={() => onIntern()}
                style={{
                  padding: '6px 12px', borderRadius: 6,
                  fontFamily: 'monospace', fontSize: 9,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  fontWeight: 'bold', cursor: 'pointer',
                  background: 'rgba(239,68,68,0.12)', color: '#F87171',
                  border: '1px solid rgba(239,68,68,0.30)',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(239,68,68,0.22)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(239,68,68,0.12)';
                }}
              >
                Return
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export { CompactStudentCard };
