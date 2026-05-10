import React, { useEffect, useState } from 'react';
import { usePlayerDevStore, BUG_REWARDS, INNOVATION_REWARDS } from '../../store/playerDevStore';
import BugReportPanel from './BugReportPanel';
import InnovationFeed from './InnovationFeed';

const STATUS_COLORS = {
  submitted: 'text-tactical-muted',
  verified: 'text-tactical-accent',
  in_progress: 'text-amber-400',
  resolved: 'text-tactical-success',
  rewarded: 'text-tactical-success',
  rejected: 'text-tactical-alert',
};

export default function PlayerDevDashboard({ onClose }) {
  const reports = usePlayerDevStore(s => s.reports);
  const totalRewards = usePlayerDevStore(s => s.totalRewards);
  const isLoading = usePlayerDevStore(s => s.isLoading);
  const loadMyReports = usePlayerDevStore(s => s.loadMyReports);

  const [tab, setTab] = useState('reports');
  const [showBugReport, setShowBugReport] = useState(false);

  useEffect(() => {
    loadMyReports();
  }, [loadMyReports]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6">
      <div className="w-full max-w-[600px] max-h-[90vh] sm:max-h-[80vh] bg-tactical-bg/95 border border-tactical-border rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-tactical-border shrink-0">
          <span className="text-tactical-text font-mono text-sm font-semibold uppercase tracking-wide">
            Player-Dev Program
          </span>
          <button onClick={onClose} className="text-tactical-muted hover:text-tactical-text text-lg">
            &times;
          </button>
        </div>

        {/* Reward Summary */}
        <div className="grid grid-cols-4 gap-2 px-4 pt-3 shrink-0">
          <RewardStat label="Total XP" value={totalRewards.xp.toLocaleString()} color="#00e5ff" />
          <RewardStat label="AP" value={totalRewards.ap.toLocaleString()} color="#FFD700" />
          <RewardStat label="Money" value={`$${(totalRewards.money / 1000).toFixed(0)}K`} color="#10b981" />
          <RewardStat
            label="Trophies"
            value={[...new Set(totalRewards.trophies)].length.toString()}
            color="#a78bfa"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 shrink-0">
          <TabButton label="Bug Reports" active={tab === 'reports'} onClick={() => setTab('reports')} />
          <TabButton label="Innovations" active={tab === 'innovations'} onClick={() => setTab('innovations')} />
          <TabButton label="Reward Tiers" active={tab === 'tiers'} onClick={() => setTab('tiers')} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'reports' && (
            <div className="space-y-3">
              <button
                onClick={() => setShowBugReport(true)}
                className="w-full py-2 rounded font-mono text-xs uppercase tracking-wider
                  bg-tactical-accent/20 text-tactical-accent border border-tactical-accent/40
                  hover:bg-tactical-accent/30 transition"
              >
                Report a Bug
              </button>

              {isLoading ? (
                <p className="text-tactical-muted text-xs font-mono text-center py-4">Loading...</p>
              ) : reports.length === 0 ? (
                <p className="text-tactical-muted text-xs font-mono text-center py-4">
                  No bug reports yet. Report bugs to earn rewards!
                </p>
              ) : (
                <div className="space-y-2">
                  {reports.map(report => (
                    <div key={report.id} className="bg-black/30 rounded p-3 border border-tactical-border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-tactical-text font-semibold">
                          {report.title}
                        </span>
                        <span className={`text-[9px] font-mono uppercase ${STATUS_COLORS[report.status]}`}>
                          {report.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex gap-3 text-[9px] text-tactical-muted font-mono">
                        <span className="capitalize">{report.severity}</span>
                        <span>Quality: {(report.quality_score * 100).toFixed(0)}%</span>
                        {report.reward_xp > 0 && (
                          <span className="text-tactical-accent">
                            +{report.reward_xp} XP · +{report.reward_ap} AP
                          </span>
                        )}
                        <span>{new Date(report.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'innovations' && <InnovationFeed />}

          {tab === 'tiers' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-[10px] uppercase tracking-widest text-tactical-accent mb-2 font-mono">
                  Bug Report Rewards
                </h4>
                <div className="space-y-1">
                  {Object.entries(BUG_REWARDS).map(([severity, reward]) => (
                    <div
                      key={severity}
                      className="flex items-center justify-between bg-black/30 rounded p-2"
                    >
                      <span className="text-xs font-mono text-tactical-text capitalize">{severity}</span>
                      <div className="flex gap-3 text-[9px] font-mono text-tactical-muted">
                        <span>{reward.xp} XP</span>
                        <span>{reward.ap} AP</span>
                        <span>${(reward.money / 1000).toFixed(0)}K</span>
                        {reward.trophy && (
                          <span className="text-tactical-accent">{reward.trophy}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] uppercase tracking-widest text-tactical-accent mb-2 font-mono">
                  Innovation Rewards
                </h4>
                <div className="space-y-1">
                  {Object.entries(INNOVATION_REWARDS).map(([tier, reward]) => (
                    <div
                      key={tier}
                      className="flex items-center justify-between bg-black/30 rounded p-2"
                    >
                      <div>
                        <span className="text-xs font-mono text-tactical-text capitalize">{tier}</span>
                        <span className="text-[9px] text-tactical-muted ml-2">
                          {(reward.minFollowers / 1000).toFixed(0)}K+ followers
                        </span>
                      </div>
                      <div className="flex gap-3 text-[9px] font-mono text-tactical-muted">
                        <span>{reward.xp} XP</span>
                        <span>{reward.ap} AP</span>
                        <span>${(reward.money / 1e6).toFixed(1)}M</span>
                        <span className="text-tactical-accent">{reward.trophy}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showBugReport && <BugReportPanel onClose={() => setShowBugReport(false)} />}
    </div>
  );
}

function RewardStat({ label, value, color }) {
  return (
    <div className="bg-black/30 rounded p-2 text-center">
      <p className="text-[9px] uppercase tracking-wider text-tactical-muted">{label}</p>
      <p className="font-mono text-sm font-semibold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-t text-[10px] font-mono uppercase tracking-wider transition ${
        active
          ? 'bg-black/30 text-tactical-accent border-b-2 border-tactical-accent'
          : 'text-tactical-muted hover:text-tactical-text'
      }`}
    >
      {label}
    </button>
  );
}
