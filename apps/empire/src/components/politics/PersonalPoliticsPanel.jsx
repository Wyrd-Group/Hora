import { useState, useMemo } from 'react';
import { usePersonalPoliticsStore } from '../../store/personalPoliticsStore';
import { useEmpireStore } from '../../store/empireStore';
import { fmtGameTime } from '../../lib/fmtGameTime';
import {
  POLITICAL_RANKS,
  CAMPAIGN_ACTIVITIES,
  POLITICAL_POLICIES,
} from '../../data/personalPoliticsData';
import AdCardInline from '../ads/AdCardInline';

const fmt = (n) =>
  n >= 1e6 ? `\u20AC${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `\u20AC${(n / 1e3).toFixed(0)}K` : `\u20AC${n}`;

const RANK_COLORS = [
  '#9ca3af', // 0 gray
  '#3b82f6', // 1 blue
  '#06b6d4', // 2 cyan
  '#a855f7', // 3 purple
  '#f59e0b', // 4 amber
  '#f43f5e', // 5 rose
  '#fbbf24', // 6 gold
];

const DEPOSIT_AMOUNTS = [100_000, 1_000_000, 10_000_000];

export default function PersonalPoliticsPanel() {
  const gameTick = useEmpireStore((s) => s.gameTick);
  const followers = useEmpireStore((s) => s.followers) ?? 0;
  const power = useEmpireStore((s) => s.power) ?? 0;
  const personalBalance = useEmpireStore((s) => s.personalBalance) ?? 0;

  const currentRank = usePersonalPoliticsStore((s) => s.currentRank);
  const approval = usePersonalPoliticsStore((s) => s.approval);
  const politicalXp = usePersonalPoliticsStore((s) => s.politicalXp);
  const campaignFund = usePersonalPoliticsStore((s) => s.campaignFund);
  const activeCampaign = usePersonalPoliticsStore((s) => s.activeCampaign);
  const activePolicies = usePersonalPoliticsStore((s) => s.activePolicies);
  const activeScandal = usePersonalPoliticsStore((s) => s.activeScandal);
  const activityCooldowns = usePersonalPoliticsStore((s) => s.activityCooldowns);
  const electionHistory = usePersonalPoliticsStore((s) => s.electionHistory);
  const termsServed = usePersonalPoliticsStore((s) => s.termsServed);

  const depositToCampaignFund = usePersonalPoliticsStore((s) => s.depositToCampaignFund);
  const launchCampaign = usePersonalPoliticsStore((s) => s.launchCampaign);
  const performActivity = usePersonalPoliticsStore((s) => s.performActivity);
  const enactPolicy = usePersonalPoliticsStore((s) => s.enactPolicy);
  const spinScandal = usePersonalPoliticsStore((s) => s.spinScandal);

  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Derived data ──
  const rankData = POLITICAL_RANKS[currentRank];
  const nextRank = POLITICAL_RANKS[currentRank + 1] ?? null;

  const nextReqs = useMemo(() => {
    if (!nextRank) return null;
    const r = nextRank.requirements;
    return {
      approval: { met: approval >= r.minApproval, need: r.minApproval, have: approval },
      followers: { met: followers >= r.minFollowers, need: r.minFollowers, have: followers },
      power: { met: power >= r.minPower, need: r.minPower, have: power },
      funds: { met: campaignFund >= r.campaignCost, need: r.campaignCost, have: campaignFund },
    };
  }, [nextRank, approval, followers, power, campaignFund]);

  const allReqsMet = nextReqs
    ? nextReqs.approval.met && nextReqs.followers.met && nextReqs.power.met && nextReqs.funds.met
    : false;

  const availableActivities = useMemo(
    () => CAMPAIGN_ACTIVITIES.filter((a) => currentRank >= a.minRank || activeCampaign),
    [currentRank, activeCampaign],
  );

  const availablePolicies = useMemo(
    () => POLITICAL_POLICIES.filter((p) => currentRank >= p.minRank),
    [currentRank],
  );

  const campaignProgress = useMemo(() => {
    if (!activeCampaign) return 0;
    const elapsed = gameTick - activeCampaign.startTick;
    return Math.min(1, elapsed / activeCampaign.duration);
  }, [activeCampaign, gameTick]);

  const campaignTimeLeft = useMemo(() => {
    if (!activeCampaign) return 0;
    return Math.max(0, activeCampaign.duration - (gameTick - activeCampaign.startTick));
  }, [activeCampaign, gameTick]);

  // ── Approval bar color ──
  const approvalColor = approval > 60 ? '#10b981' : approval >= 30 ? '#f59e0b' : '#ef4444';

  return (
    <div className="h-full overflow-y-auto space-y-3 p-3 text-tactical-text">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded font-mono text-xs
            ${toast.type === 'error' ? 'bg-red-900/90 text-red-300 border border-red-500/40' : 'bg-emerald-900/90 text-emerald-300 border border-emerald-500/40'}`}
        >
          {toast.msg}
        </div>
      )}

      {/* ─── 1. Career Status Header ─── */}
      <section className="border border-tactical-border rounded-lg p-3 space-y-3">
        <p className="font-mono text-[8px] tracking-widest uppercase text-tactical-muted">
          Political Career
        </p>

        {/* Rank title */}
        <h2 className="font-mono text-lg font-bold" style={{ color: RANK_COLORS[currentRank] }}>
          {rankData.title}
        </h2>

        {/* Approval bar */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="font-mono text-[8px] tracking-widest uppercase text-tactical-muted">
              Approval Rating
            </span>
            <span className="font-mono text-xs font-semibold" style={{ color: approvalColor }}>
              {approval}%
            </span>
          </div>
          <div className="h-2 bg-black/40 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${approval}%`, backgroundColor: approvalColor }}
            />
          </div>
        </div>

        {/* XP + Campaign Fund */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-black/30 rounded p-2">
            <p className="font-mono text-[8px] tracking-widest uppercase text-tactical-muted">
              Political XP
            </p>
            <p className="font-mono text-sm font-semibold text-[#ec4899]">
              {politicalXp.toLocaleString()}
            </p>
          </div>
          <div className="bg-black/30 rounded p-2">
            <p className="font-mono text-[8px] tracking-widest uppercase text-tactical-muted">
              Campaign Fund
            </p>
            <p className="font-mono text-sm font-semibold text-[#ec4899]">{fmt(campaignFund)}</p>
          </div>
        </div>

        {/* Deposit buttons */}
        <div>
          <p className="font-mono text-[8px] tracking-widest uppercase text-tactical-muted mb-1">
            Deposit to Campaign Fund
          </p>
          <div className="flex gap-2">
            {DEPOSIT_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => {
                  const ok = depositToCampaignFund(amt);
                  showToast(
                    ok ? `Deposited ${fmt(amt)} to campaign fund.` : 'Insufficient personal balance.',
                    ok ? 'info' : 'error',
                  );
                }}
                disabled={personalBalance < amt}
                className="flex-1 py-1.5 rounded font-mono text-[10px] uppercase tracking-wider
                  bg-[#ec4899]/10 text-[#ec4899] border border-[#ec4899]/30
                  hover:bg-[#ec4899]/20 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                {fmt(amt)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 2. Career Ladder ─── */}
      <section className="border border-tactical-border rounded-lg p-3 space-y-2">
        <p className="font-mono text-[8px] tracking-widest uppercase text-tactical-muted mb-2">
          Career Ladder
        </p>

        <div className="relative pl-6 space-y-3">
          {/* Vertical line */}
          <div className="absolute left-2 top-1 bottom-1 w-px bg-tactical-border" />

          {POLITICAL_RANKS.map((rank) => {
            const isCurrent = rank.rank === currentRank;
            const isPast = rank.rank < currentRank;
            const isNext = rank.rank === currentRank + 1;
            const color = RANK_COLORS[rank.rank];

            return (
              <div key={rank.id} className="relative">
                {/* Node dot */}
                <div
                  className={`absolute -left-4 top-1 w-3 h-3 rounded-full border-2 ${
                    isCurrent ? 'shadow-[0_0_8px]' : ''
                  }`}
                  style={{
                    borderColor: isPast || isCurrent ? color : '#4a4a4a',
                    backgroundColor: isPast || isCurrent ? color : 'transparent',
                    boxShadow: isCurrent ? `0 0 10px ${color}` : undefined,
                  }}
                />

                <div className={`${isCurrent ? 'opacity-100' : isPast ? 'opacity-50' : 'opacity-70'}`}>
                  <p
                    className="font-mono text-xs font-semibold"
                    style={{ color: isCurrent || isPast ? color : '#6b7280' }}
                  >
                    {rank.title}
                  </p>

                  {isCurrent && (
                    <p className="text-[9px] text-tactical-muted mt-0.5">{rank.description}</p>
                  )}

                  {/* Next rank requirements checklist */}
                  {isNext && nextReqs && (
                    <div className="mt-1.5 space-y-1">
                      <ReqCheck label="Approval" met={nextReqs.approval.met}
                        detail={`${nextReqs.approval.have}% / ${nextReqs.approval.need}%`} />
                      <ReqCheck label="Followers" met={nextReqs.followers.met}
                        detail={`${nextReqs.followers.have.toLocaleString()} / ${nextReqs.followers.need.toLocaleString()}`} />
                      <ReqCheck label="Power" met={nextReqs.power.met}
                        detail={`${nextReqs.power.have} / ${nextReqs.power.need}`} />
                      <ReqCheck label="Campaign Fund" met={nextReqs.funds.met}
                        detail={`${fmt(nextReqs.funds.have)} / ${fmt(nextReqs.funds.need)}`} />

                      {!activeCampaign && (
                        <button
                          onClick={() => {
                            const res = launchCampaign(rank.rank, gameTick);
                            showToast(res.message, res.success ? 'info' : 'error');
                          }}
                          disabled={!allReqsMet}
                          className="mt-2 w-full py-1.5 rounded font-mono text-[10px] uppercase tracking-wider
                            bg-[#ec4899]/15 text-[#ec4899] border border-[#ec4899]/40
                            hover:bg-[#ec4899]/25 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                          Launch Campaign for {rank.title}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Active campaign progress */}
        {activeCampaign && (
          <div className="mt-3 bg-black/30 rounded p-3 border border-[#ec4899]/30 space-y-2">
            <p className="font-mono text-[8px] tracking-widest uppercase text-[#ec4899]">
              Active Campaign — {POLITICAL_RANKS[activeCampaign.targetRank]?.title}
            </p>

            {/* Progress bar */}
            <div className="h-2.5 bg-black/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#ec4899] to-[#a855f7] transition-all duration-300"
                style={{ width: `${campaignProgress * 100}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] font-mono text-tactical-muted">
              <span>{(campaignProgress * 100).toFixed(0)}% complete</span>
              <span>{fmtGameTime(campaignTimeLeft)} remaining</span>
            </div>

            {/* Candidate vs Opponent */}
            <div className="flex items-center gap-3 mt-1">
              <div className="flex-1 text-center">
                <p className="font-mono text-[8px] uppercase tracking-widest text-[#ec4899]">You</p>
                <p className="font-mono text-sm font-bold text-[#ec4899]">{approval}%</p>
              </div>
              <div className="text-tactical-muted text-[10px] font-mono">vs</div>
              <div className="flex-1 text-center">
                <p className="font-mono text-[8px] uppercase tracking-widest text-tactical-muted">
                  Opponent
                </p>
                <p className="font-mono text-sm font-bold text-tactical-muted">
                  {Math.max(20, 100 - approval - Math.floor(Math.random() * 5))}%
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ─── 3. Campaign Activities ─── */}
      {(currentRank > 0 || activeCampaign) && availableActivities.length > 0 && (
        <section className="border border-tactical-border rounded-lg p-3">
          <p className="font-mono text-[8px] tracking-widest uppercase text-tactical-muted mb-2">
            Campaign Activities
          </p>

          <div className="grid grid-cols-2 gap-2">
            {availableActivities.map((activity) => {
              const cd = activityCooldowns.find((c) => c.activityId === activity.id);
              const onCooldown = cd && gameTick < cd.availableAtTick;
              const cooldownLeft = onCooldown ? cd.availableAtTick - gameTick : 0;

              return (
                <button
                  key={activity.id}
                  onClick={() => {
                    const res = performActivity(activity.id, gameTick);
                    showToast(res.message, res.success ? 'info' : 'error');
                  }}
                  disabled={onCooldown}
                  className="relative bg-black/30 rounded p-2 text-left border border-tactical-border/50
                    hover:border-[#ec4899]/40 hover:bg-black/40 disabled:opacity-40 disabled:cursor-not-allowed
                    transition group"
                >
                  <p className="font-mono text-[10px] font-semibold text-tactical-text leading-tight mb-1">
                    {activity.name}
                  </p>
                  <p className="font-mono text-[8px] text-tactical-muted">{fmt(activity.cost)}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="font-mono text-[8px] text-emerald-400">
                      +{activity.approvalBoost} appr
                    </span>
                    <span className="font-mono text-[8px] text-blue-400">
                      +{activity.followerBoost} fol
                    </span>
                  </div>
                  {activity.riskChance > 0 && (
                    <span className="font-mono text-[8px] text-amber-400">
                      {(activity.riskChance * 100).toFixed(0)}% risk
                    </span>
                  )}
                  {onCooldown && (
                    <div className="absolute inset-0 bg-black/60 rounded flex items-center justify-center">
                      <span className="font-mono text-[9px] text-amber-400">
                        {fmtGameTime(cooldownLeft)}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── 4. Active Policies ─── */}
      {currentRank >= 2 && (
        <section className="border border-tactical-border rounded-lg p-3">
          <p className="font-mono text-[8px] tracking-widest uppercase text-tactical-muted mb-2">
            Policies
          </p>

          {/* Currently active policies */}
          {activePolicies.length > 0 && (
            <div className="mb-3 space-y-1.5">
              <p className="font-mono text-[8px] tracking-widest uppercase text-emerald-400">
                Active
              </p>
              {activePolicies.map((p) => {
                const ticksLeft =
                  p.duration === 0 ? Infinity : p.duration - (gameTick - p.enactedTick);
                return (
                  <div key={p.id} className="bg-emerald-900/20 border border-emerald-500/20 rounded p-2">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[10px] font-semibold text-emerald-300">
                        {p.name}
                      </span>
                      <span className="font-mono text-[8px] text-emerald-400">
                        {ticksLeft === Infinity ? 'Permanent' : fmtGameTime(Math.max(0, ticksLeft))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Enactable policies */}
          <div className="space-y-2">
            {availablePolicies
              .filter((p) => !activePolicies.some((ap) => ap.id === p.id))
              .map((policy) => (
                <div
                  key={policy.id}
                  className="bg-black/30 rounded p-2.5 border border-tactical-border/50"
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-mono text-[10px] font-semibold text-tactical-text">
                      {policy.name}
                    </p>
                    <span className="font-mono text-[8px] text-tactical-muted shrink-0 ml-2">
                      {fmt(policy.cost)}
                    </span>
                  </div>
                  <p className="text-[9px] text-tactical-muted mb-1">{policy.description}</p>
                  <p className="font-mono text-[8px] text-cyan-400 mb-1.5">{policy.effect}</p>
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono text-[8px] ${
                        policy.approvalChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {policy.approvalChange >= 0 ? '+' : ''}
                      {policy.approvalChange} approval
                    </span>
                    <button
                      onClick={() => {
                        const res = enactPolicy(policy.id, gameTick);
                        showToast(res.message, res.success ? 'info' : 'error');
                      }}
                      className="px-3 py-1 rounded font-mono text-[9px] uppercase tracking-wider
                        bg-[#ec4899]/15 text-[#ec4899] border border-[#ec4899]/30
                        hover:bg-[#ec4899]/25 transition"
                    >
                      Enact
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* ─── 5. Active Scandal ─── */}
      {activeScandal && !activeScandal.resolved && (
        <section className="border border-red-500/40 bg-red-900/20 rounded-lg p-3 space-y-2">
          <p className="font-mono text-[8px] tracking-widest uppercase text-red-400">
            Active Scandal
          </p>
          <p className="font-mono text-sm font-bold text-red-300">{activeScandal.name}</p>
          <p className="font-mono text-[10px] text-red-400">
            Approval hit: -{activeScandal.approvalHit}%
          </p>

          {/* Recovery timer */}
          <div className="flex justify-between items-center">
            <span className="font-mono text-[8px] text-tactical-muted">Recovery:</span>
            <span className="font-mono text-[9px] text-amber-400">
              {fmtGameTime(
                Math.max(0, activeScandal.recoveryTicks - (gameTick - activeScandal.startTick)),
              )}
            </span>
          </div>

          {activeScandal.canBeSpunPositive && (
            <button
              onClick={() => {
                const res = spinScandal();
                showToast(res.message, res.success ? 'info' : 'error');
              }}
              className="w-full py-1.5 rounded font-mono text-[10px] uppercase tracking-wider
                bg-amber-500/15 text-amber-400 border border-amber-500/30
                hover:bg-amber-500/25 transition"
            >
              Spin Story ({fmt(activeScandal.spinCost)})
            </button>
          )}
        </section>
      )}

      <AdCardInline variant="wide" />

      {/* ─── 6. Election History ─── */}
      {electionHistory.length > 0 && (
        <section className="border border-tactical-border rounded-lg p-3">
          <p className="font-mono text-[8px] tracking-widest uppercase text-tactical-muted mb-2">
            Election History
          </p>

          <p className="font-mono text-[10px] text-tactical-muted mb-2">
            Terms served: <span className="text-[#ec4899] font-semibold">{termsServed}</span>
          </p>

          <div className="space-y-1">
            {[...electionHistory].reverse().map((entry, i) => {
              const rank = POLITICAL_RANKS[entry.rank];
              return (
                <div
                  key={i}
                  className="flex justify-between items-center text-[10px] font-mono"
                >
                  <span className="text-tactical-text">{rank?.title ?? `Rank ${entry.rank}`}</span>
                  <span className={entry.won ? 'text-emerald-400' : 'text-rose-400'}>
                    {entry.won ? 'WON' : 'LOST'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Helper: Requirement checklist row ──
function ReqCheck({ label, met, detail }) {
  return (
    <div className="flex items-center gap-1.5 text-[9px] font-mono">
      <span className={met ? 'text-emerald-400' : 'text-rose-400'}>{met ? '\u2713' : '\u2717'}</span>
      <span className="text-tactical-muted">{label}:</span>
      <span className={met ? 'text-emerald-400' : 'text-rose-400'}>{detail}</span>
    </div>
  );
}
