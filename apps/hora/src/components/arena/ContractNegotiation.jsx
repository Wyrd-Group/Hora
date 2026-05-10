import { useState, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const RARITY_MULTIPLIERS = {
  Common: 1,
  Uncommon: 1.5,
  Rare: 2,
  Epic: 3,
  Legendary: 5,
  Mythic: 8,
};

const RARITY_ACCENT = {
  Common: '#9CA3AF',
  Uncommon: '#34D399',
  Rare: '#60A5FA',
  Epic: '#A78BFA',
  Legendary: '#FBBF24',
  Mythic: '#F472B6',
};

const MAX_ROUNDS = 5;
const MAX_LOWBALLS = 3;

const AGENT_RESPONSES = {
  happy: [
    "This is a fair deal. I'm in.",
    "Excellent terms. Let's do this.",
    "You clearly value talent. I accept.",
    "Now we're talking. Where do I sign?",
  ],
  neutral: [
    "Hmm, I expected more. But I can work with this.",
    "Not bad, but can you do better on the salary?",
    "I've seen better offers... but also worse.",
    "My expectations were higher, but let's keep talking.",
  ],
  frustrated: [
    "This is insulting. I have other offers.",
    "My agent won't let me accept this.",
    "You're wasting my time with these numbers.",
    "I'm starting to think you don't really want me.",
  ],
  walkaway: [
    "We're done here. Don't call me again.",
    "I'll find someone who respects my value.",
    "This negotiation is over. Goodbye.",
  ],
};

const MOOD_EMOJI = {
  happy: '\uD83D\uDE0A',
  neutral: '\uD83D\uDE10',
  frustrated: '\uD83D\uDE24',
  walkaway: '\uD83D\uDEB6',
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/* ------------------------------------------------------------------ */
/*  Demand Calculator                                                  */
/* ------------------------------------------------------------------ */

function computeDemands(ovr, rarity) {
  const mult = RARITY_MULTIPLIERS[rarity] ?? 1;
  const salary = Math.floor(ovr * 0.5 + mult * 10);
  const contractLength = Math.floor(200 + (mult - 1) * 42.86); // 200-500 range
  const releaseClause = Math.floor(salary * contractLength * 1.5);
  return { salary, contractLength, releaseClause };
}

function evaluateOffer(offer, demands) {
  const salaryRatio = offer.salary / demands.salary;
  const lengthRatio = offer.contractLength / demands.contractLength;
  const clauseRatio = offer.releaseClause / demands.releaseClause;
  return (salaryRatio * 0.5 + lengthRatio * 0.25 + clauseRatio * 0.25);
}

/* ------------------------------------------------------------------ */
/*  Slider Component                                                   */
/* ------------------------------------------------------------------ */

function NegotiationSlider({ label, value, min, max, step, onChange, accentColor, suffix = '' }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-mono uppercase tracking-wider text-[#9C8E7E]">{label}</span>
        <span className="text-sm font-mono font-bold text-[#E8E0D0]">
          {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </span>
      </div>
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'rgba(232,224,208,0.08)' }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-150"
          style={{ width: `${pct}%`, background: accentColor }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-1 appearance-none bg-transparent cursor-pointer"
        style={{
          height: '20px',
          WebkitAppearance: 'none',
          '--slider-thumb': accentColor,
        }}
      />
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px; height: 16px;
          border-radius: 50%;
          background: ${accentColor};
          border: 2px solid rgba(232,224,208,0.3);
          cursor: pointer;
          box-shadow: 0 0 8px ${accentColor}44;
          margin-top: -8px;
        }
        input[type=range]::-webkit-slider-runnable-track {
          height: 2px;
          background: transparent;
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chat Bubble                                                        */
/* ------------------------------------------------------------------ */

function ChatBubble({ speaker, text, isAgent }) {
  return (
    <div className={`flex ${isAgent ? 'justify-start' : 'justify-end'} mb-3`}>
      <div
        className={`
          max-w-[85%] px-4 py-3 rounded-2xl text-sm font-mono leading-relaxed
          ${isAgent
            ? 'rounded-tl-sm bg-white/5 border border-white/10 text-[#E8E0D0]'
            : 'rounded-tr-sm bg-emerald-500/15 border border-emerald-500/20 text-emerald-300'
          }
        `}
      >
        <span className="text-[10px] uppercase tracking-widest text-[#9C8E7E] block mb-1">{speaker}</span>
        {text}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function ContractNegotiation({ agent, agentDef, onComplete, onCancel }) {
  const ovr = agent?.currentOverallRating ?? 75;
  const rarity = agentDef?.rarity ?? 'Common';
  const accent = RARITY_ACCENT[rarity] ?? '#9CA3AF';

  const demands = computeDemands(ovr, rarity);

  // ── State ──
  const [round, setRound] = useState(1);
  const [mood, setMood] = useState('neutral');
  const [lowballs, setLowballs] = useState(0);
  const [negotiationOver, setNegotiationOver] = useState(false);
  const [result, setResult] = useState(null); // 'accepted' | 'rejected' | 'walkaway'
  const [chatLog, setChatLog] = useState([
    { speaker: agentDef?.name ?? 'Agent', text: getOpeningLine(rarity), isAgent: true },
  ]);

  // Player offer state
  const [offerSalary, setOfferSalary] = useState(Math.floor(demands.salary * 0.8));
  const [offerLength, setOfferLength] = useState(demands.contractLength);
  const [offerClause, setOfferClause] = useState(Math.floor(demands.releaseClause * 0.8));

  const agentName = agentDef?.name ?? 'Unknown Agent';
  const portraitGradient = agentDef?.portraitGradient ?? ['#4B5563', '#374151', '#1F2937'];
  const iconGlyph = agentDef?.iconGlyph ?? '\uD83E\uDD16';

  // ── Handlers ──
  const submitOffer = useCallback(() => {
    if (negotiationOver || round > MAX_ROUNDS) return;

    const offer = { salary: offerSalary, contractLength: offerLength, releaseClause: offerClause };
    const ratio = evaluateOffer(offer, demands);

    const newLog = [...chatLog, {
      speaker: 'You',
      text: `Offering: \u20AC${offerSalary.toLocaleString()}/tick salary, ${offerLength} tick contract, \u20AC${offerClause.toLocaleString()} release clause`,
      isAgent: false,
    }];

    let newMood = mood;
    let newLowballs = lowballs;
    let isOver = false;
    let finalResult = null;

    if (ratio >= 0.8) {
      // ACCEPT
      newMood = 'happy';
      isOver = true;
      finalResult = 'accepted';
      newLog.push({ speaker: agentName, text: pick(AGENT_RESPONSES.happy), isAgent: true });
    } else if (ratio >= 0.6) {
      // COUNTER
      newMood = 'neutral';
      const counterSalary = Math.floor(demands.salary * (0.85 + Math.random() * 0.1));
      const counterLength = Math.floor(demands.contractLength * (0.9 + Math.random() * 0.08));
      const counterClause = Math.floor(demands.releaseClause * (0.85 + Math.random() * 0.1));
      newLog.push({
        speaker: agentName,
        text: `${pick(AGENT_RESPONSES.neutral)} Counter: \u20AC${counterSalary.toLocaleString()}/tick, ${counterLength} ticks, \u20AC${counterClause.toLocaleString()} clause.`,
        isAgent: true,
      });
      // Update sliders to counter as suggestion
      setOfferSalary(Math.floor((offerSalary + counterSalary) / 2));
      setOfferLength(Math.floor((offerLength + counterLength) / 2));
      setOfferClause(Math.floor((offerClause + counterClause) / 2));
    } else {
      // LOWBALL
      newLowballs = lowballs + 1;
      newMood = 'frustrated';
      if (newLowballs >= MAX_LOWBALLS) {
        newMood = 'walkaway';
        isOver = true;
        finalResult = 'walkaway';
        newLog.push({ speaker: agentName, text: pick(AGENT_RESPONSES.walkaway), isAgent: true });
      } else {
        newLog.push({
          speaker: agentName,
          text: `${pick(AGENT_RESPONSES.frustrated)} (Warning ${newLowballs}/${MAX_LOWBALLS})`,
          isAgent: true,
        });
      }
    }

    // Check round limit
    const nextRound = round + 1;
    if (!isOver && nextRound > MAX_ROUNDS) {
      isOver = true;
      finalResult = 'rejected';
      newLog.push({ speaker: agentName, text: "Time's up. We couldn't reach an agreement.", isAgent: true });
    }

    setChatLog(newLog);
    setMood(newMood);
    setLowballs(newLowballs);
    setRound(nextRound);
    setNegotiationOver(isOver);
    setResult(finalResult);

    if (isOver && finalResult === 'accepted') {
      // Build contract object
      setTimeout(() => {
        onComplete?.({
          agentMintId: agent?.mintId,
          agentCardId: agentDef?.id,
          salary: offerSalary,
          contractLength: offerLength,
          releaseClause: offerClause,
          role: agentDef?.class ?? 'Autonomous',
          signedAtRound: round,
        });
      }, 2000);
    } else if (isOver && (finalResult === 'rejected' || finalResult === 'walkaway')) {
      setTimeout(() => onComplete?.(null), 2500);
    }
  }, [negotiationOver, round, offerSalary, offerLength, offerClause, demands, mood, lowballs, chatLog, agentName, agent, agentDef, onComplete]);

  // ── Render ──
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
      <div
        className="w-full max-w-5xl rounded-2xl border overflow-hidden"
        style={{
          background: 'rgba(24,22,18,0.95)',
          borderColor: 'rgba(232,224,208,0.10)',
          boxShadow: `0 0 60px ${accent}15, 0 0 120px rgba(0,0,0,0.5)`,
        }}
      >
        {/* ── Header ── */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'rgba(232,224,208,0.08)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg font-mono font-bold text-[#E8E0D0]">CONTRACT NEGOTIATION</span>
            <span
              className="px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider"
              style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}40` }}
            >
              {rarity.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-mono text-[#9C8E7E]">
              Round <span className="text-[#E8E0D0] font-bold">{Math.min(round, MAX_ROUNDS)}</span>/{MAX_ROUNDS}
            </span>
            <button
              onClick={onCancel}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9C8E7E] hover:text-[#E8E0D0] hover:bg-white/5 transition-colors"
            >
              &#x2715;
            </button>
          </div>
        </div>

        {/* ── Split Body ── */}
        <div className="flex flex-col md:flex-row" style={{ minHeight: '520px' }}>

          {/* ── LEFT: Agent Portrait + Demands ── */}
          <div
            className="w-full md:w-[45%] p-6 border-b md:border-b-0 md:border-r flex flex-col"
            style={{ borderColor: 'rgba(232,224,208,0.08)' }}
          >
            {/* Portrait */}
            <div className="flex flex-col items-center mb-6">
              <div
                className="w-28 h-28 rounded-2xl flex items-center justify-center mb-4 relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${portraitGradient[0]}, ${portraitGradient[1]}, ${portraitGradient[2]})`,
                  boxShadow: `0 0 30px ${portraitGradient[0]}40`,
                }}
              >
                <span className="text-5xl">{iconGlyph}</span>
                {/* OVR Badge */}
                <div
                  className="absolute top-1 right-1 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-black"
                  style={{ background: 'rgba(0,0,0,0.6)', color: accent }}
                >
                  {ovr}
                </div>
              </div>
              {/* Mood Indicator */}
              <div className="text-4xl mb-2 transition-all duration-300" style={{ filter: mood === 'walkaway' ? 'grayscale(0.5)' : 'none' }}>
                {MOOD_EMOJI[mood]}
              </div>
              <span className="text-base font-mono font-bold text-[#E8E0D0]">{agentName}</span>
              <span className="text-xs font-mono text-[#9C8E7E] mt-1">{agentDef?.class ?? 'Agent'} &middot; {agentDef?.biography?.title ?? 'Specialist'}</span>
            </div>

            {/* Demands Table */}
            <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(232,224,208,0.04)', border: '1px solid rgba(232,224,208,0.06)' }}>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#9C8E7E] block mb-3">Agent Demands</span>
              <div className="space-y-3">
                <DemandRow label="Salary" value={`\u20AC${demands.salary.toLocaleString()}/tick`} />
                <DemandRow label="Contract" value={`${demands.contractLength} ticks`} />
                <DemandRow label="Release Clause" value={`\u20AC${demands.releaseClause.toLocaleString()}`} />
                <DemandRow label="Role" value={agentDef?.class ?? 'Autonomous'} />
              </div>
            </div>

            {/* Chat Log */}
            <div className="flex-1 overflow-y-auto rounded-xl p-3 space-y-1" style={{ background: 'rgba(0,0,0,0.2)', maxHeight: '200px' }}>
              {chatLog.map((msg, i) => (
                <ChatBubble key={i} speaker={msg.speaker} text={msg.text} isAgent={msg.isAgent} />
              ))}
            </div>
          </div>

          {/* ── RIGHT: Player Offer ── */}
          <div className="w-full md:w-[55%] p-6 flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#9C8E7E] block mb-5">Your Offer</span>

            <div className="flex-1">
              <NegotiationSlider
                label="Salary per tick"
                value={offerSalary}
                min={1}
                max={Math.floor(demands.salary * 2)}
                step={1}
                onChange={setOfferSalary}
                accentColor={accent}
                suffix="/tick"
              />

              <NegotiationSlider
                label="Contract length (ticks)"
                value={offerLength}
                min={50}
                max={1000}
                step={10}
                onChange={setOfferLength}
                accentColor={accent}
                suffix=" ticks"
              />

              <NegotiationSlider
                label="Release clause"
                value={offerClause}
                min={Math.floor(demands.releaseClause * 0.2)}
                max={Math.floor(demands.releaseClause * 3)}
                step={100}
                onChange={setOfferClause}
                accentColor={accent}
              />

              {/* Comparison Bars */}
              <div className="mt-6 rounded-xl p-4" style={{ background: 'rgba(232,224,208,0.04)', border: '1px solid rgba(232,224,208,0.06)' }}>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#9C8E7E] block mb-3">Offer vs Demands</span>
                <ComparisonBar label="Salary" offered={offerSalary} demanded={demands.salary} accent={accent} />
                <ComparisonBar label="Length" offered={offerLength} demanded={demands.contractLength} accent={accent} />
                <ComparisonBar label="Clause" offered={offerClause} demanded={demands.releaseClause} accent={accent} />
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(232,224,208,0.06)' }}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-[#9C8E7E]">Overall satisfaction</span>
                    <SatisfactionBadge ratio={evaluateOffer({ salary: offerSalary, contractLength: offerLength, releaseClause: offerClause }, demands)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-xl text-sm font-mono font-bold tracking-wider transition-all duration-200 border cursor-pointer"
                style={{
                  background: 'rgba(232,224,208,0.05)',
                  borderColor: 'rgba(232,224,208,0.10)',
                  color: '#9C8E7E',
                }}
              >
                CANCEL
              </button>
              <button
                onClick={submitOffer}
                disabled={negotiationOver}
                className="flex-[2] py-3 rounded-xl text-sm font-mono font-bold tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: negotiationOver ? 'rgba(52,211,153,0.1)' : 'rgba(52,211,153,0.2)',
                  border: '1px solid rgba(52,211,153,0.3)',
                  color: '#34D399',
                  boxShadow: negotiationOver ? 'none' : '0 0 20px rgba(52,211,153,0.15)',
                }}
              >
                {negotiationOver
                  ? (result === 'accepted' ? 'DEAL AGREED' : result === 'walkaway' ? 'AGENT LEFT' : 'NO DEAL')
                  : `SUBMIT OFFER (Round ${Math.min(round, MAX_ROUNDS)}/${MAX_ROUNDS})`
                }
              </button>
            </div>

            {/* Result Banner */}
            {negotiationOver && (
              <div
                className="mt-4 rounded-xl p-4 text-center font-mono animate-pulse"
                style={{
                  background: result === 'accepted' ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${result === 'accepted' ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  color: result === 'accepted' ? '#34D399' : '#F87171',
                }}
              >
                {result === 'accepted' && `Contract signed! ${agentName} joins your empire.`}
                {result === 'rejected' && `Negotiations failed. ${agentName} declined.`}
                {result === 'walkaway' && `${agentName} walked away permanently.`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper Sub-components                                              */
/* ------------------------------------------------------------------ */

function DemandRow({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs font-mono text-[#9C8E7E]">{label}</span>
      <span className="text-sm font-mono font-bold text-[#E8E0D0]">{value}</span>
    </div>
  );
}

function ComparisonBar({ label, offered, demanded, accent }) {
  const ratio = clamp(offered / demanded, 0, 2);
  const pct = Math.min(ratio * 50, 100); // 100% at 2x demands
  const color = ratio >= 0.8 ? '#34D399' : ratio >= 0.6 ? '#FBBF24' : '#F87171';
  return (
    <div className="mb-2">
      <div className="flex justify-between mb-1">
        <span className="text-[10px] font-mono text-[#9C8E7E]">{label}</span>
        <span className="text-[10px] font-mono" style={{ color }}>{Math.round(ratio * 100)}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(232,224,208,0.08)' }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function SatisfactionBadge({ ratio }) {
  const pct = Math.round(ratio * 100);
  let color, label;
  if (pct >= 80) { color = '#34D399'; label = 'Likely Accept'; }
  else if (pct >= 60) { color = '#FBBF24'; label = 'May Counter'; }
  else { color = '#F87171'; label = 'Will Reject'; }
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold"
      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
    >
      {pct}% &middot; {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Opening Lines                                                      */
/* ------------------------------------------------------------------ */

function getOpeningLine(rarity) {
  const lines = {
    Common:    "I'm looking for a solid opportunity. Let's see what you've got.",
    Uncommon:  "I've been getting some interest. Make me an offer I can't refuse.",
    Rare:      "Several empires have reached out. You'll need to impress me.",
    Epic:      "My talents are in high demand. This better be worth my time.",
    Legendary: "You want me? Every empire in the league wants me. Bring serious numbers.",
    Mythic:    "I don't normally take meetings. You have five rounds. Make them count.",
  };
  return lines[rarity] ?? lines.Common;
}
