import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useCurriculumStore } from '../../store/curriculumStore';
import { useJurisdictionStore } from '../../store/jurisdictionStore';
import { interpolateText } from '../../lib/regulatory/factStore';
import { resolveJurisdictionBlock } from '../../lib/regulatory/jurisdictionResolver';
import { loadLessonSections } from '../../lib/curriculum/lessonContent';
import TTSController from './TTSController';
import DOMPurify from 'dompurify';

// ── HTML Sanitizer — uses DOMPurify for robust XSS prevention ──
function sanitizeHTML(html) {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'span', 'sub', 'sup', 'code', 'a', 'ul', 'ol', 'li', 'p'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
}

/**
 * Apply {{CC.fact_key}} interpolation to any string before sanitising.
 * Safe to call on falsy/non-string input — returns the input unchanged.
 */
function interpolate(text, country) {
  if (!text || typeof text !== 'string') return text;
  if (!text.includes('{{')) return text;
  return interpolateText(text, country);
}

// ── Variant colours for callouts ────────────────────────────────
const calloutStyle = {
  info:    { border: '#00e5ff', bg: '#00e5ff0d', icon: 'i' },
  warning: { border: '#f59e0b', bg: '#f59e0b0d', icon: '!' },
  tip:     { border: '#10b981', bg: '#10b9810d', icon: '?' },
  example: { border: '#a78bfa', bg: '#a78bfa0d', icon: 'e' },
  funfact: { border: '#ec4899', bg: '#ec489915', icon: '*' },
};

// ── Block Renderer ──────────────────────────────────────────────
function Block({ block }) {
  const userCountry = useJurisdictionStore((s) => s.country);

  switch (block.type) {
    case 'heading':
      if (block.level === 2) return <h2 className="text-[15px] font-semibold text-white mt-8 mb-3 pb-2 border-b border-white/[0.06]">{interpolate(block.content, userCountry)}</h2>;
      if (block.level === 3) return <h3 className="text-[13px] font-semibold text-white/90 mt-6 mb-2">{interpolate(block.content, userCountry)}</h3>;
      return <h4 className="text-[12px] font-semibold text-white/70 mt-4 mb-1">{interpolate(block.content, userCountry)}</h4>;

    case 'text':
      return (
        <p className="text-[13px] text-white/70 leading-[1.8] mb-4" dangerouslySetInnerHTML={{ __html: sanitizeHTML(interpolate(block.content, userCountry)) }} />
      );

    case 'keyterm':
      return (
        <div className="my-4 rounded-lg overflow-hidden border border-[#00e5ff]/20">
          <div className="px-4 py-2 bg-[#00e5ff]/[0.06] flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
            <span className="text-[12px] font-bold text-[#00e5ff] tracking-wide">{block.term}</span>
          </div>
          <div className="px-4 py-3 bg-[#00e5ff]/[0.02]">
            <p className="text-[12px] text-white/60 leading-relaxed">{interpolate(block.definition, userCountry)}</p>
          </div>
        </div>
      );

    case 'callout': {
      const variant = block.style || block.variant || 'info';
      const v = calloutStyle[variant] ?? calloutStyle.info;
      return (
        <div className="my-4 rounded-lg border p-4" style={{ borderColor: `${v.border}30`, backgroundColor: v.bg }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: `${v.border}20`, color: v.border }}>
              {v.icon}
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: v.border }}>{block.title ?? variant}</span>
          </div>
          <p className="text-[12px] text-white/65 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHTML(interpolate(block.content, userCountry)) }} />
        </div>
      );
    }

    case 'jurisdictionGroup':
      return <JurisdictionGroupBlock block={block} />;

    case 'diagram':
      return (
        <div className="my-5 rounded-lg border border-white/[0.08] bg-white/[0.02] p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-[#a78bfa]/20 flex items-center justify-center">
              <span className="text-[10px] text-[#a78bfa]">D</span>
            </div>
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Diagram</span>
          </div>
          {block.alt && <p className="text-[12px] font-semibold text-white/70 mb-2">{block.alt}</p>}
          <p className="text-[11px] text-white/50 leading-relaxed italic">{block.description || block.content}</p>
        </div>
      );

    case 'code':
      return (
        <pre className="my-4 rounded-lg bg-[#0a0f1a] border border-white/[0.06] p-4 overflow-x-auto">
          <code className="text-[11px] text-[#10b981]">{block.content}</code>
        </pre>
      );

    case 'image':
      return (
        <figure className="my-4">
          {block.src && <img src={block.src} alt={block.alt ?? ''} className="rounded-lg max-w-full mx-auto" />}
          {block.caption && <figcaption className="text-[10px] text-white/40 text-center mt-1">{block.caption}</figcaption>}
        </figure>
      );

    case 'activity':
      return <ActivityBlock block={block} />;

    case 'quiz':
    case 'truefalse':
      return <InlineQuiz block={block} />;

    case 'matching':
      return <MatchingExercise block={block} />;

    case 'essay':
      return (
        <div className="my-4 rounded-lg border border-[#f59e0b]/20 bg-[#f59e0b]/[0.03] p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full bg-[#f59e0b]/20 flex items-center justify-center text-[10px] text-[#f59e0b] font-bold">R</div>
            <span className="text-[11px] font-bold text-[#f59e0b] uppercase tracking-wider">Reflection</span>
          </div>
          <p className="text-[12px] text-white/65 leading-relaxed">{block.content}</p>
        </div>
      );

    // ── Interactive short-attention-span blocks ──────────────
    case 'microcard':
    case 'flashcard':
      return <MicroCardDeck block={block} />;

    case 'scenario':
      return <ScenarioCard block={block} />;

    case 'calculator':
      return <CalculatorWidget block={block} />;

    case 'datasight':
      return <DataSightBlock block={block} />;

    case 'casetree':
      return <CaseTreeBlock block={block} />;

    default:
      return null;
  }
}

// ── Jurisdiction group block ───────────────────────────────────
// Filters content variants by the user's country + supranational memberships.
// Each rendered section carries a flag/badge so the reader knows why they're
// seeing a given variant ("🇫🇷 France", "🇪🇺 EU", "🌍 Global").
function JurisdictionGroupBlock({ block }) {
  const userCountry = useJurisdictionStore((s) => s.country);
  const setCountry = useJurisdictionStore((s) => s.setCountry);

  const sections = useMemo(
    () => resolveJurisdictionBlock(block, userCountry),
    [block, userCountry],
  );

  // No country selected yet — prompt the user.
  if (!userCountry) {
    return (
      <aside className="my-5 rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/[0.05] p-4">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-[#f59e0b]/20 flex items-center justify-center text-[11px] font-bold text-[#f59e0b]">i</div>
          <div className="flex-1">
            <h4 className="text-[13px] font-semibold text-[#f59e0b] mb-1">
              This section is jurisdiction-specific
            </h4>
            <p className="text-[12px] text-white/70 leading-relaxed mb-2">
              Pick your country to see the tax wrappers, retirement accounts, and regulatory figures that apply to you.
            </p>
            <div className="text-[11px] text-white/60">
              Topic: <em>{block.topic ?? 'jurisdiction-specific'}</em>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // No section matched user's memberships and no fallback exists either.
  if (sections.length === 0) {
    return (
      <aside className="my-5 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
        <p className="text-[12px] text-white/60 italic">
          Content for <strong>{userCountry}</strong> on this topic (“{block.topic}”) isn't yet localized.
          We're building this — contact us to prioritise your country.
        </p>
      </aside>
    );
  }

  return (
    <div className="my-4 space-y-3">
      {sections.map((section, i) => (
        <section
          key={`${section.layer}-${i}`}
          className={`rounded-lg border p-4 ${
            section.isFallback
              ? 'border-white/[0.08] bg-white/[0.02]'
              : 'border-white/[0.12] bg-white/[0.03]'
          }`}
          aria-label={`Content for ${section.layerLabel}`}
        >
          <header className="flex items-center gap-2 mb-3 pb-2 border-b border-white/[0.06]">
            <span className="text-base" aria-hidden>{section.layerBadge}</span>
            <span className="text-[11px] font-semibold text-white/80 uppercase tracking-wider">
              {section.layerLabel}
            </span>
            {section.isFallback && (
              <span className="text-[10px] italic text-white/40 ml-1">(no localized content yet)</span>
            )}
            {block.topic && (
              <span className="text-[10px] text-white/30 ml-auto truncate">{block.topic}</span>
            )}
          </header>
          {section.blocks.map((subBlock, j) => (
            <Block key={j} block={subBlock} />
          ))}
        </section>
      ))}
    </div>
  );
}

// ── Activity block (handles truefalse, matching, multiplechoice from ecflContent format) ──
function ActivityBlock({ block }) {
  const style = block.style || 'generic';

  if (style === 'truefalse' && block.items) return <TrueFalseActivity block={block} />;
  if (style === 'matching' && block.items) return <MatchingActivity block={block} />;
  if (style === 'multiplechoice' && block.items) return <MultipleChoiceActivity block={block} />;

  // Generic activity
  return (
    <div className="my-5 rounded-lg border border-[#a78bfa]/30 bg-[#a78bfa]/[0.04] p-5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded-full bg-[#a78bfa]/20 flex items-center justify-center text-[10px] text-[#a78bfa] font-bold">A</div>
        <span className="text-[11px] font-bold text-[#a78bfa] uppercase tracking-wider">{block.title ?? 'Activity'}</span>
      </div>
      <p className="text-[12px] text-white/65 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHTML(block.instructions || block.content || '') }} />
    </div>
  );
}

// ── True/False interactive ──────────────────────────────────────
function TrueFalseActivity({ block }) {
  const [answers, setAnswers] = useState({});
  const items = block.items || [];
  const allAnswered = Object.keys(answers).length === items.length;
  const correctCount = items.filter((item, i) => answers[i] === item.answer).length;

  const pick = (idx, val) => {
    if (answers[idx] !== undefined) return;
    setAnswers(prev => ({ ...prev, [idx]: val }));
  };

  return (
    <div className="my-5 rounded-lg border border-[#00e5ff]/20 bg-[#00e5ff]/[0.02] p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-5 h-5 rounded-full bg-[#00e5ff]/20 flex items-center justify-center text-[10px] text-[#00e5ff] font-bold">T</div>
        <span className="text-[11px] font-bold text-[#00e5ff] uppercase tracking-wider">{block.title ?? 'True or False?'}</span>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => {
          const answered = answers[i] !== undefined;
          const correct = answered && answers[i] === item.answer;
          return (
            <div key={i} className={`rounded-lg border p-3 transition-all ${
              answered ? (correct ? 'border-[#10b981]/40 bg-[#10b981]/[0.05]' : 'border-[#ef4444]/40 bg-[#ef4444]/[0.05]') : 'border-white/[0.08] bg-white/[0.02]'
            }`}>
              <p className="text-[12px] text-white/80 mb-2">{item.statement}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => pick(i, true)}
                  disabled={answered}
                  className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${
                    answered && item.answer === true ? 'bg-[#10b981] text-white' :
                    answered && answers[i] === true && item.answer !== true ? 'bg-[#ef4444] text-white' :
                    answered ? 'opacity-30 border border-white/10 text-white/40' :
                    'border border-white/20 text-white/60 hover:bg-white/[0.06]'
                  }`}
                >
                  TRUE
                </button>
                <button
                  onClick={() => pick(i, false)}
                  disabled={answered}
                  className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${
                    answered && item.answer === false ? 'bg-[#10b981] text-white' :
                    answered && answers[i] === false && item.answer !== false ? 'bg-[#ef4444] text-white' :
                    answered ? 'opacity-30 border border-white/10 text-white/40' :
                    'border border-white/20 text-white/60 hover:bg-white/[0.06]'
                  }`}
                >
                  FALSE
                </button>
                {answered && (
                  <span className={`text-[10px] ml-2 self-center ${correct ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {correct ? 'Correct' : 'Incorrect'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {allAnswered && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] text-center">
          <span className="text-[11px] font-bold text-[#00e5ff]">{correctCount}/{items.length} correct</span>
        </div>
      )}
    </div>
  );
}

// ── Matching activity ───────────────────────────────────────────
function MatchingActivity({ block }) {
  const items = block.items || [];
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="my-5 rounded-lg border border-[#a78bfa]/20 bg-[#a78bfa]/[0.02] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[#a78bfa]/20 flex items-center justify-center text-[10px] text-[#a78bfa] font-bold">M</div>
          <span className="text-[11px] font-bold text-[#a78bfa] uppercase tracking-wider">{block.title ?? 'Match the Pairs'}</span>
        </div>
        <button
          onClick={() => setRevealed(!revealed)}
          className="text-[10px] font-bold text-[#a78bfa] hover:underline transition-all"
        >
          {revealed ? 'HIDE ANSWERS' : 'REVEAL ANSWERS'}
        </button>
      </div>
      {block.instructions && <p className="text-[11px] text-white/50 mb-3">{block.instructions}</p>}
      <div className="space-y-1.5">
        {items.map((p, i) => (
          <div key={i} className="flex gap-3 items-center text-[12px] rounded-lg px-3 py-2 bg-white/[0.02]">
            <span className="text-white/80 flex-1">{p.item || p.left}</span>
            <span className="text-white/20">→</span>
            <span className={`flex-1 transition-all ${revealed ? 'text-[#10b981]' : 'text-transparent bg-white/[0.06] rounded select-none'}`}>
              {p.match || p.right}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Multiple choice activity ────────────────────────────────────
function MultipleChoiceActivity({ block }) {
  const items = block.items || [];
  const [answers, setAnswers] = useState({});

  const pick = (qIdx, optIdx) => {
    if (answers[qIdx] !== undefined) return;
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  return (
    <div className="my-5 rounded-lg border border-[#f59e0b]/20 bg-[#f59e0b]/[0.02] p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-5 h-5 rounded-full bg-[#f59e0b]/20 flex items-center justify-center text-[10px] text-[#f59e0b] font-bold">Q</div>
        <span className="text-[11px] font-bold text-[#f59e0b] uppercase tracking-wider">{block.title ?? 'Knowledge Check'}</span>
      </div>
      <div className="space-y-5">
        {items.map((q, qi) => {
          const answered = answers[qi] !== undefined;
          const correct = answered && answers[qi] === q.answer;
          return (
            <div key={qi}>
              <p className="text-[12px] font-semibold text-white/80 mb-2">{qi + 1}. {q.question}</p>
              <div className="space-y-1.5">
                {(q.options || []).map((opt, oi) => {
                  let cls = 'border-white/[0.08] hover:bg-white/[0.04]';
                  if (answered && oi === q.answer) cls = 'border-[#10b981]/40 bg-[#10b981]/10';
                  else if (answered && oi === answers[qi]) cls = 'border-[#ef4444]/40 bg-[#ef4444]/10';
                  else if (answered) cls = 'border-white/[0.04] opacity-40';
                  return (
                    <button
                      key={oi}
                      onClick={() => pick(qi, oi)}
                      disabled={answered}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-[11px] text-white/70 transition-all ${cls}`}
                    >
                      <span className="text-white/30 mr-2">{String.fromCharCode(65 + oi)}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {answered && (
                <p className={`text-[10px] mt-1 ${correct ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  {correct ? 'Correct!' : `Incorrect — the answer is ${String.fromCharCode(65 + q.answer)}.`}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Inline quiz (from flat courseContent format) ─────────────────
function InlineQuiz({ block }) {
  const [selected, setSelected] = useState(null);
  const answered = selected !== null;
  const correct = selected === block.correctIndex;

  const pick = (i) => {
    if (answered) return;
    setSelected(i);
  };

  return (
    <div className="my-4 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
      <p className="text-[12px] font-semibold text-white/80 mb-3">{block.content}</p>
      <div className="space-y-1.5">
        {(block.options ?? []).map((opt, i) => {
          let cls = 'border-white/[0.08] hover:bg-white/[0.04]';
          if (answered && i === block.correctIndex) cls = 'border-[#10b981]/40 bg-[#10b981]/10';
          else if (answered && i === selected) cls = 'border-[#ef4444]/40 bg-[#ef4444]/10';
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={answered}
              className={`w-full text-left px-3 py-2 rounded-lg border text-[11px] text-white/70 transition-all ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {answered && block.explanation && (
        <p className={`text-[10px] mt-2 ${correct ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
          {correct ? 'Correct! ' : 'Incorrect. '}{block.explanation}
        </p>
      )}
    </div>
  );
}

// ── Matching exercise (flat format) ─────────────────────────────
function MatchingExercise({ block }) {
  const pairs = block.pairs ?? [];
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="my-4 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold text-[#00e5ff] uppercase tracking-wider">Match the pairs</span>
        <button onClick={() => setRevealed(!revealed)} className="text-[10px] font-bold text-[#00e5ff] hover:underline">
          {revealed ? 'HIDE' : 'REVEAL'}
        </button>
      </div>
      <div className="space-y-1">
        {pairs.map((p, i) => (
          <div key={i} className="flex gap-2 text-[11px]">
            <span className="text-white/80 flex-1">{p.left}</span>
            <span className="text-white/30">→</span>
            <span className={`flex-1 ${revealed ? 'text-[#10b981]' : 'text-transparent bg-white/[0.06] rounded select-none'}`}>
              {p.right}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Interactive F0 block components — microcard/flashcard, scenario,
// calculator, datasight, casetree.
// ═══════════════════════════════════════════════════════════════

// ── Microcard / flashcard deck (swipeable concept cards) ────────
function MicroCardDeck({ block }) {
  const cards = block.cards ?? [];
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[i];
  if (!card) return null;

  const next = () => { setFlipped(false); setI((i + 1) % cards.length); };
  const prev = () => { setFlipped(false); setI((i - 1 + cards.length) % cards.length); };

  return (
    <div className="my-5 rounded-xl border border-[#00e5ff]/30 bg-gradient-to-br from-[#00e5ff]/[0.08] to-[#00e5ff]/[0.02] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[#00e5ff]/20 flex items-center justify-center text-[10px] text-[#00e5ff] font-bold">◐</div>
          <span className="text-[11px] font-bold text-[#00e5ff] uppercase tracking-wider">{block.title ?? 'Flashcards'}</span>
        </div>
        <span className="text-[10px] font-mono text-white/40">{i + 1}/{cards.length}</span>
      </div>

      <button
        onClick={() => setFlipped(f => !f)}
        className="w-full min-h-[140px] rounded-lg bg-[#0a0f1a] border border-white/[0.08] px-5 py-5 text-center hover:border-[#00e5ff]/40 transition-all flex flex-col items-center justify-center group"
      >
        {!flipped ? (
          <>
            <p className="text-[14px] font-bold text-white leading-relaxed">{card.front}</p>
            {card.hint && <p className="text-[10px] text-white/40 mt-3">{card.hint}</p>}
            <p className="text-[9px] font-mono text-[#00e5ff]/60 mt-4 opacity-0 group-hover:opacity-100 transition">TAP TO FLIP</p>
          </>
        ) : (
          <p className="text-[13px] text-[#00e5ff] leading-relaxed">{card.back}</p>
        )}
      </button>

      <div className="flex items-center justify-between mt-4">
        <button onClick={prev} className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-[10px] font-bold text-white/60 hover:bg-white/[0.04]">← PREV</button>
        <div className="flex gap-1.5">
          {cards.map((_, idx) => (
            <div key={idx} className={`w-2 h-2 rounded-full transition-all ${idx === i ? 'bg-[#00e5ff] scale-125' : 'bg-white/[0.15]'}`} />
          ))}
        </div>
        <button onClick={next} className="px-3 py-1.5 rounded-lg border border-[#00e5ff]/30 text-[10px] font-bold text-[#00e5ff] hover:bg-[#00e5ff]/10">NEXT →</button>
      </div>
    </div>
  );
}

// ── Scenario (A/B/C branching decision card) ───────────────────
function ScenarioCard({ block }) {
  const choices = block.choices ?? [];
  const [pickedIdx, setPickedIdx] = useState(null);
  const picked = pickedIdx != null ? choices[pickedIdx] : null;

  return (
    <div className="my-5 rounded-xl border border-[#a78bfa]/30 bg-gradient-to-br from-[#a78bfa]/[0.08] to-[#a78bfa]/[0.02] p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-full bg-[#a78bfa]/20 flex items-center justify-center text-[10px] text-[#a78bfa] font-bold">?</div>
        <span className="text-[11px] font-bold text-[#a78bfa] uppercase tracking-wider">{block.title ?? 'Scenario'}</span>
      </div>
      <p className="text-[13px] text-white/80 leading-relaxed mb-4">{block.prompt}</p>
      <div className="space-y-2">
        {choices.map((c, idx) => {
          const isPicked = pickedIdx === idx;
          const show = pickedIdx != null;
          let cls = 'border-white/[0.08] hover:bg-white/[0.04]';
          if (show && c.correct) cls = 'border-[#10b981]/40 bg-[#10b981]/10';
          else if (show && isPicked && !c.correct) cls = 'border-[#ef4444]/40 bg-[#ef4444]/10';
          else if (show) cls = 'border-white/[0.04] opacity-40';
          return (
            <button
              key={idx}
              onClick={() => pickedIdx == null && setPickedIdx(idx)}
              disabled={show}
              className={`w-full text-left px-4 py-3 rounded-lg border text-[12px] text-white/75 transition-all ${cls}`}
            >
              <span className="text-white/30 mr-2 font-mono">{String.fromCharCode(65 + idx)}.</span>
              {c.label}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className={`mt-4 p-3 rounded-lg border ${picked.correct ? 'border-[#10b981]/30 bg-[#10b981]/[0.06]' : 'border-[#f59e0b]/30 bg-[#f59e0b]/[0.06]'}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${picked.correct ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>
            {picked.correct ? 'Good call' : 'Think again'}
          </p>
          <p className="text-[11px] text-white/70 leading-relaxed">{picked.outcome}</p>
        </div>
      )}
    </div>
  );
}

// ── Calculator widget (financial formulas; pure JS) ────────────
function CalculatorWidget({ block }) {
  const kind = block.calculator ?? 'compound';
  const CONFIGS = {
    compound: {
      title: 'Compound Interest',
      inputs: [
        { id: 'principal', label: 'Principal (€)',  def: 5000 },
        { id: 'rate',      label: 'Annual rate (%)', def: 7 },
        { id: 'years',     label: 'Years',            def: 10 },
        { id: 'monthly',   label: 'Monthly add (€)', def: 200 },
      ],
      compute: ({ principal, rate, years, monthly }) => {
        const r = rate / 100;
        const n = years;
        const fv = principal * Math.pow(1 + r, n)
                 + monthly * 12 * ((Math.pow(1 + r, n) - 1) / r);
        return { 'Future value': `€${Math.round(fv).toLocaleString()}`,
                 'Total contributions': `€${(principal + monthly * 12 * years).toLocaleString()}`,
                 'Interest earned': `€${Math.round(fv - principal - monthly * 12 * years).toLocaleString()}` };
      },
    },
    'budget-50-30-20': {
      title: '50 / 30 / 20 Budget',
      inputs: [{ id: 'income', label: 'Monthly net income (€)', def: 3000 }],
      compute: ({ income }) => ({
        'Needs (50%)':  `€${Math.round(income * 0.5).toLocaleString()}`,
        'Wants (30%)':  `€${Math.round(income * 0.3).toLocaleString()}`,
        'Savings (20%)':`€${Math.round(income * 0.2).toLocaleString()}`,
      }),
    },
    loan: {
      title: 'Loan Payment',
      inputs: [
        { id: 'amount', label: 'Loan amount (€)',    def: 20000 },
        { id: 'rate',   label: 'Annual rate (%)',    def: 6 },
        { id: 'years',  label: 'Term (years)',       def: 5 },
      ],
      compute: ({ amount, rate, years }) => {
        const i = rate / 100 / 12;
        const n = years * 12;
        const m = amount * i / (1 - Math.pow(1 + i, -n));
        return { 'Monthly payment': `€${m.toFixed(2)}`,
                 'Total paid': `€${(m * n).toFixed(2)}`,
                 'Total interest': `€${(m * n - amount).toFixed(2)}` };
      },
    },
    'bond-price': {
      title: 'Bond Price',
      inputs: [
        { id: 'face',   label: 'Face value (€)',   def: 1000 },
        { id: 'coupon', label: 'Coupon rate (%)',  def: 5 },
        { id: 'ytm',    label: 'Yield to maturity (%)', def: 4 },
        { id: 'years',  label: 'Years to maturity',def: 10 },
      ],
      compute: ({ face, coupon, ytm, years }) => {
        const c = face * coupon / 100;
        const y = ytm / 100;
        const pv = Array.from({ length: years }, (_, k) => c / Math.pow(1 + y, k + 1)).reduce((s, v) => s + v, 0)
                 + face / Math.pow(1 + y, years);
        return { 'Bond price': `€${pv.toFixed(2)}`,
                 'Annual coupon': `€${c.toFixed(2)}`,
                 'Premium/Discount': pv > face ? 'Premium' : pv < face ? 'Discount' : 'Par' };
      },
    },
    dcf: {
      title: 'DCF Valuation',
      inputs: [
        { id: 'fcf',    label: 'Year-1 FCF (€m)',   def: 100 },
        { id: 'g',      label: 'Growth rate (%)',   def: 6 },
        { id: 'wacc',   label: 'WACC (%)',          def: 10 },
        { id: 'years',  label: 'Forecast years',    def: 5 },
        { id: 'term',   label: 'Terminal growth (%)', def: 2.5 },
      ],
      compute: ({ fcf, g, wacc, years, term }) => {
        const r = wacc / 100, gr = g / 100, tg = term / 100;
        let pv = 0;
        let last = fcf;
        for (let k = 1; k <= years; k++) {
          last = fcf * Math.pow(1 + gr, k);
          pv += last / Math.pow(1 + r, k);
        }
        const tv = (last * (1 + tg)) / (r - tg);
        const tvPv = tv / Math.pow(1 + r, years);
        return { 'Enterprise value': `€${(pv + tvPv).toFixed(1)}m`,
                 'Forecast PV': `€${pv.toFixed(1)}m`,
                 'Terminal PV': `€${tvPv.toFixed(1)}m` };
      },
    },
    'option-payoff': {
      title: 'Option Payoff',
      inputs: [
        { id: 'strike',  label: 'Strike price (€)',  def: 100 },
        { id: 'spot',    label: 'Spot at expiry (€)', def: 110 },
        { id: 'premium', label: 'Premium paid (€)',  def: 4 },
        { id: 'type',    label: 'Type (1=call, 0=put)', def: 1 },
      ],
      compute: ({ strike, spot, premium, type }) => {
        const isCall = !!type;
        const intrinsic = isCall ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
        const pnl = intrinsic - premium;
        return { 'Intrinsic value': `€${intrinsic.toFixed(2)}`,
                 'Net P&L': `€${pnl.toFixed(2)}`,
                 'Break-even': `€${(isCall ? strike + premium : strike - premium).toFixed(2)}` };
      },
    },
    duration: {
      title: 'Modified Duration',
      inputs: [
        { id: 'coupon', label: 'Coupon rate (%)', def: 5 },
        { id: 'ytm',    label: 'YTM (%)',          def: 5 },
        { id: 'years',  label: 'Years to maturity',def: 10 },
      ],
      compute: ({ coupon, ytm, years }) => {
        const c = coupon / 100, y = ytm / 100, n = years;
        const face = 1;
        let w = 0, price = 0;
        for (let t = 1; t <= n; t++) {
          const cf = t === n ? c + face : c;
          const pv = cf / Math.pow(1 + y, t);
          w += t * pv;
          price += pv;
        }
        const mac = w / price;
        const mod = mac / (1 + y);
        return { 'Macaulay duration': `${mac.toFixed(2)} yrs`,
                 'Modified duration': `${mod.toFixed(2)}`,
                 '∆Price / +100 bps': `${(-mod).toFixed(2)}%` };
      },
    },
  };

  const cfg = CONFIGS[kind] ?? CONFIGS.compound;
  const [vals, setVals] = useState(Object.fromEntries(cfg.inputs.map(i => [i.id, i.def])));
  const outputs = (() => { try { return cfg.compute(vals); } catch { return {}; } })();

  return (
    <div className="my-5 rounded-xl border border-[#10b981]/30 bg-gradient-to-br from-[#10b981]/[0.08] to-[#10b981]/[0.02] p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-5 h-5 rounded-full bg-[#10b981]/20 flex items-center justify-center text-[10px] text-[#10b981] font-bold">Σ</div>
        <span className="text-[11px] font-bold text-[#10b981] uppercase tracking-wider">{block.title ?? cfg.title}</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        {cfg.inputs.map(inp => (
          <label key={inp.id} className="block">
            <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">{inp.label}</span>
            <input
              type="number"
              value={vals[inp.id]}
              onChange={e => setVals(v => ({ ...v, [inp.id]: parseFloat(e.target.value) || 0 }))}
              className="mt-1 w-full bg-[#0a0f1a] border border-white/[0.08] rounded-md px-3 py-1.5 text-[12px] text-white font-mono focus:outline-none focus:border-[#10b981]/50"
            />
          </label>
        ))}
      </div>
      <div className="rounded-lg bg-[#0a0f1a] border border-white/[0.08] p-3 space-y-1.5">
        {Object.entries(outputs).map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-[12px]">
            <span className="text-white/50">{k}</span>
            <span className="text-[#10b981] font-mono font-bold">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DataSight — read a chart/statement snippet, answer a question ──
function DataSightBlock({ block }) {
  const [picked, setPicked] = useState(null);
  const answered = picked != null;
  const correct = answered && picked === (block.correctIndex ?? block.answer);
  return (
    <div className="my-5 rounded-xl border border-[#f59e0b]/30 bg-gradient-to-br from-[#f59e0b]/[0.08] to-[#f59e0b]/[0.02] p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-full bg-[#f59e0b]/20 flex items-center justify-center text-[10px] text-[#f59e0b] font-bold">📊</div>
        <span className="text-[11px] font-bold text-[#f59e0b] uppercase tracking-wider">{block.title ?? 'DataSight'}</span>
      </div>
      {block.chartSpec && (
        <pre className="mb-3 p-3 rounded-lg bg-[#0a0f1a] border border-white/[0.08] text-[11px] text-white/70 font-mono whitespace-pre-wrap leading-relaxed">{block.chartSpec}</pre>
      )}
      {block.prompt && <p className="text-[12px] font-semibold text-white/80 mb-3">{block.prompt}</p>}
      <div className="space-y-1.5">
        {(block.options ?? []).map((opt, i) => {
          let cls = 'border-white/[0.08] hover:bg-white/[0.04]';
          const ci = block.correctIndex ?? block.answer;
          if (answered && i === ci) cls = 'border-[#10b981]/40 bg-[#10b981]/10';
          else if (answered && i === picked) cls = 'border-[#ef4444]/40 bg-[#ef4444]/10';
          else if (answered) cls = 'border-white/[0.04] opacity-40';
          return (
            <button
              key={i}
              onClick={() => answered || setPicked(i)}
              disabled={answered}
              className={`w-full text-left px-3 py-2 rounded-lg border text-[11px] text-white/70 transition-all ${cls}`}
            >
              <span className="text-white/30 mr-2 font-mono">{String.fromCharCode(65 + i)}.</span>{opt}
            </button>
          );
        })}
      </div>
      {answered && block.explanation && (
        <p className={`text-[10px] mt-2 leading-relaxed ${correct ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
          {correct ? 'Correct! ' : 'Incorrect. '}{block.explanation}
        </p>
      )}
    </div>
  );
}

// ── CaseTree — multi-step branching case with graded verdict ───
function CaseTreeBlock({ block }) {
  const tree = block.tree ?? { root: '', nodes: {} };
  const [nodeId, setNodeId] = useState(tree.root);
  const [score, setScore] = useState(0);
  const [path, setPath] = useState([]);
  const node = tree.nodes[nodeId];
  if (!node) return null;

  const pick = (choice) => {
    setScore(s => s + (choice.score ?? 0));
    setPath(p => [...p, { from: nodeId, label: choice.label }]);
    setNodeId(choice.next);
  };

  const reset = () => { setNodeId(tree.root); setScore(0); setPath([]); };

  return (
    <div className="my-5 rounded-xl border border-[#ec4899]/30 bg-gradient-to-br from-[#ec4899]/[0.08] to-[#ec4899]/[0.02] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[#ec4899]/20 flex items-center justify-center text-[10px] text-[#ec4899] font-bold">⚘</div>
          <span className="text-[11px] font-bold text-[#ec4899] uppercase tracking-wider">{block.title ?? 'Case Study'}</span>
        </div>
        <span className="text-[10px] font-mono text-white/40">Score: {score}</span>
      </div>

      <p className="text-[13px] text-white/80 leading-relaxed mb-3">{node.text}</p>

      {node.terminal ? (
        <div className="mt-2 p-3 rounded-lg border border-[#ec4899]/30 bg-[#ec4899]/[0.06]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#ec4899] mb-1">Verdict · Score {score}</p>
          <p className="text-[11px] text-white/70 leading-relaxed">{node.verdict}</p>
          <button onClick={reset} className="mt-3 px-3 py-1.5 rounded-md border border-[#ec4899]/30 text-[10px] font-bold text-[#ec4899] hover:bg-[#ec4899]/10">
            RESTART CASE
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {(node.choices ?? []).map((c, idx) => (
            <button
              key={idx}
              onClick={() => pick(c)}
              className="w-full text-left px-4 py-2.5 rounded-lg border border-white/[0.08] text-[12px] text-white/75 hover:bg-white/[0.04] hover:border-[#ec4899]/30 transition-all"
            >
              <span className="text-white/30 mr-2 font-mono">{idx + 1}.</span>{c.label}
            </button>
          ))}
        </div>
      )}

      {path.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.04] text-[9px] font-mono text-white/30">
          Path: {path.map((p, i) => <span key={i}>{p.label}{i < path.length - 1 ? ' → ' : ''}</span>)}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TEXTBOOK READER — Kognity-style with section tabs
// ═══════════════════════════════════════════════════════════════
export default function TextbookReader({ course, lessonIndex, sections: sectionsProp }) {
  const {
    completeLesson, completedLessons, setLessonIndex,
  } = useCurriculumStore();

  const lesson = course.lessons[lessonIndex];

  // ── All hooks declared up-front so the count is stable across renders ──
  // (Rules of Hooks: the early-return for missing-lesson must come AFTER
  // every hook call.)
  const [resolvedSections, setResolvedSections] = useState(sectionsProp ?? null);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const scrollRef = useRef(null);

  // Load lesson content (via dynamic loader) whenever the lesson changes.
  useEffect(() => {
    if (sectionsProp) {
      setResolvedSections(sectionsProp);
      return;
    }
    if (!lesson) {
      setResolvedSections([]);
      return;
    }
    let cancelled = false;
    loadLessonSections(course, lessonIndex)
      .then(s => {
        if (cancelled) return;
        setResolvedSections(s);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('[TextbookReader] failed to load lesson content:', err);
        setResolvedSections([]);
      });
    return () => { cancelled = true; };
  }, [course, lessonIndex, sectionsProp, lesson]);

  // Reset section when lesson changes
  useEffect(() => {
    setActiveSectionIdx(0);
    scrollRef.current?.scrollTo(0, 0);
  }, [lessonIndex]);

  // ── Early exit AFTER all hooks ─────────────────────────────────────────
  if (!lesson) return null;

  // sections is the ecflContent format: [{ id, title, blocks }]
  // If resolution hasn't finished yet, fall back to a single empty section
  // so downstream code can still render shell chrome.
  const sectionList = (resolvedSections && resolvedSections.length > 0)
    ? resolvedSections
    : [{ id: 'main', title: lesson.title, blocks: [] }];

  const activeSection = sectionList[activeSectionIdx] || sectionList[0];

  const isCompleted = completedLessons.includes(lesson.id);
  const isLast = lessonIndex >= course.lessons.length - 1;

  // Collect text for TTS
  const plainText = useMemo(() => {
    if (!activeSection?.blocks) return '';
    return activeSection.blocks
      .filter(b => b.type === 'text' || b.type === 'keyterm' || b.type === 'callout')
      .map(b => b.content || b.definition || '')
      .join('. ')
      .replace(/<[^>]+>/g, '');
  }, [activeSection]);

  const handleComplete = () => {
    completeLesson(lesson.id);
    if (!isLast) {
      setLessonIndex(lessonIndex + 1);
    }
  };

  const handlePrev = () => {
    if (activeSectionIdx > 0) {
      setActiveSectionIdx(activeSectionIdx - 1);
      scrollRef.current?.scrollTo(0, 0);
    } else if (lessonIndex > 0) {
      setLessonIndex(lessonIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeSectionIdx < sectionList.length - 1) {
      setActiveSectionIdx(activeSectionIdx + 1);
      scrollRef.current?.scrollTo(0, 0);
    } else if (!isLast) {
      setLessonIndex(lessonIndex + 1);
    } else if (course.exam) {
      setLessonIndex(-1);
    }
  };

  const isFirstSection = activeSectionIdx === 0;
  const isLastSection = activeSectionIdx >= sectionList.length - 1;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-6 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[9px] font-bold text-white/30 tracking-[0.2em] uppercase">
              LESSON {lessonIndex + 1} OF {course.lessons.length}
            </p>
            <h1 className="text-sm font-bold text-white">{lesson.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <TTSController text={plainText} />
            {isCompleted && (
              <span className="text-[9px] font-bold text-[#10b981] bg-[#10b981]/10 px-2 py-1 rounded">COMPLETED</span>
            )}
          </div>
        </div>

        {/* Section tabs — Kognity style */}
        {sectionList.length > 1 && (
          <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            {sectionList.map((sec, idx) => (
              <button
                key={sec.id || idx}
                onClick={() => { setActiveSectionIdx(idx); scrollRef.current?.scrollTo(0, 0); }}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold whitespace-nowrap transition-all ${
                  idx === activeSectionIdx
                    ? 'bg-[#00e5ff]/15 text-[#00e5ff] shadow-[inset_0_-2px_0_#00e5ff]'
                    : 'text-white/35 hover:text-white/60 hover:bg-white/[0.04]'
                }`}
              >
                <span className="mr-1.5 text-white/20">{idx + 1}</span>
                {sec.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Progress indicator */}
      <div className="h-0.5 bg-white/[0.04] shrink-0">
        <div
          className="h-full bg-[#00e5ff] transition-all duration-300"
          style={{ width: `${((activeSectionIdx + 1) / sectionList.length) * 100}%` }}
        />
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-5 md:px-8 py-6">
          {/* Section title */}
          {activeSection.title && sectionList.length > 1 && (
            <h2 className="text-[16px] font-bold text-white mb-6">{activeSection.title}</h2>
          )}

          {/* Render blocks */}
          {(activeSection.blocks || []).map((b, i) => (
            <Block key={`${activeSectionIdx}-${i}`} block={b} />
          ))}

          {/* Section / Lesson navigation */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/[0.06]">
            <button
              onClick={handlePrev}
              disabled={isFirstSection && lessonIndex === 0}
              className="px-4 py-2 rounded-lg border border-white/[0.08] text-[11px] font-bold text-white/50 hover:bg-white/[0.04] transition-all disabled:opacity-20"
            >
              {isFirstSection ? '← Previous Lesson' : '← Previous Section'}
            </button>

            <div className="flex items-center gap-2">
              {isLastSection && !isCompleted && (
                <button
                  onClick={handleComplete}
                  className="px-5 py-2 rounded-lg bg-[#10b981] text-[11px] font-bold text-white hover:bg-[#10b981]/80 transition-all"
                >
                  Complete Lesson
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={isLastSection && isLast && !course.exam}
                className="px-4 py-2 rounded-lg bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[11px] font-bold text-[#00e5ff] hover:bg-[#00e5ff]/20 transition-all disabled:opacity-20"
              >
                {isLastSection
                  ? (isLast && course.exam ? 'Take Exam →' : isLast ? 'Done' : 'Next Lesson →')
                  : 'Next Section →'}
              </button>
            </div>
          </div>

          {/* Section dots */}
          {sectionList.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-4">
              {sectionList.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => { setActiveSectionIdx(idx); scrollRef.current?.scrollTo(0, 0); }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === activeSectionIdx ? 'bg-[#00e5ff] scale-125' :
                    idx < activeSectionIdx ? 'bg-[#00e5ff]/30' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
