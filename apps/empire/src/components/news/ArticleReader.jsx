/**
 * ArticleReader.jsx — Full article view with term highlighting.
 */

import { useState, useMemo } from 'react';
import { FINANCIAL_TERMS } from '../../data/bulletins';

function sentimentColor(s) {
  if (s === 'bullish') return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
  if (s === 'bearish') return 'text-rose-400 bg-rose-500/15 border-rose-500/30';
  return 'text-gray-400 bg-gray-500/15 border-gray-500/30';
}

function sentimentIcon(s) {
  if (s === 'bullish') return '\u25B2';
  if (s === 'bearish') return '\u25BC';
  return '\u25CF';
}

function sentimentLabel(s) {
  if (s === 'bullish') return 'Bullish';
  if (s === 'bearish') return 'Bearish';
  return 'Neutral';
}

function timeAgo(ts) {
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Term Tooltip ──
function TermTooltip({ term, children }) {
  const [show, setShow] = useState(false);
  const data = FINANCIAL_TERMS[term];
  if (!data) return children;

  return (
    <span
      className="relative inline"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="border-b border-dashed border-amber-400/50 text-amber-300/90 cursor-help">
        {children}
      </span>
      {show && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-72 p-3 rounded-lg border border-tactical-border bg-[#0a0e18] shadow-xl">
          <h4 className="text-[10px] font-mono font-bold text-white mb-1.5">{data.term}</h4>
          {data.why && (
            <div className="mb-1.5">
              <span className="text-[8px] font-mono tracking-wider uppercase text-amber-400">
                Why it matters
              </span>
              <p className="text-[9px] font-mono text-tactical-text/70 leading-relaxed mt-0.5">
                {data.why}
              </p>
            </div>
          )}
          {data.interpret && (
            <div className="mb-1.5">
              <span className="text-[8px] font-mono tracking-wider uppercase text-emerald-400">
                How to read it
              </span>
              <p className="text-[9px] font-mono text-tactical-text/70 leading-relaxed mt-0.5">
                {data.interpret}
              </p>
            </div>
          )}
          {data.marketEffect && (
            <div>
              <span className="text-[8px] font-mono tracking-wider uppercase text-rose-400">
                Market effect
              </span>
              <p className="text-[9px] font-mono text-tactical-text/70 leading-relaxed mt-0.5">
                {data.marketEffect}
              </p>
            </div>
          )}
        </div>
      )}
    </span>
  );
}

// ── Highlight terms in text ──
function HighlightedText({ text, terms, highlight }) {
  if (!highlight || !terms || terms.length === 0) {
    return <span>{text}</span>;
  }

  // Build the term lookup
  const termEntries = terms
    .map((key) => FINANCIAL_TERMS[key])
    .filter(Boolean);

  if (termEntries.length === 0) return <span>{text}</span>;

  // Build regex from longest to shortest
  const sorted = termEntries
    .map((t) => t.term)
    .sort((a, b) => b.length - a.length);
  const pattern = new RegExp(
    `\\b(${sorted.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'gi',
  );

  const parts = [];
  let lastIndex = 0;
  let match;

  // Reset regex
  pattern.lastIndex = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), isTerm: false });
    }
    // Find the matching term key
    const matchedEntry = termEntries.find(
      (t) => t.term.toLowerCase() === match[0].toLowerCase(),
    );
    const termKey = terms.find(
      (k) => FINANCIAL_TERMS[k]?.term.toLowerCase() === match[0].toLowerCase(),
    );
    parts.push({ text: match[0], isTerm: true, termKey: termKey || '' });
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isTerm: false });
  }

  return (
    <>
      {parts.map((part, i) =>
        part.isTerm ? (
          <TermTooltip key={i} term={part.termKey}>
            {part.text}
          </TermTooltip>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

export default function ArticleReader({ bulletin, onBack }) {
  const [highlightTerms, setHighlightTerms] = useState(false);
  const hasTerms = bulletin.financialTerms && bulletin.financialTerms.length > 0;

  const paragraphs = useMemo(() => {
    if (!bulletin.body) return [];
    return bulletin.body.split('\n\n').filter((p) => p.trim());
  }, [bulletin.body]);

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-1 scrollbar-thin">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-[9px] font-mono tracking-wider uppercase text-tactical-text/50 hover:text-[#00e5ff] transition-colors mb-4"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Feed
      </button>

      {/* Article */}
      <article className="space-y-4">
        {/* Header */}
        <header className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-mono border ${sentimentColor(
                bulletin.sentiment,
              )}`}
            >
              <span>{sentimentIcon(bulletin.sentiment)}</span>
              {sentimentLabel(bulletin.sentiment)}
            </span>
            <span className="text-[8px] font-mono text-tactical-text/30">
              {timeAgo(bulletin.publishedAt)}
            </span>
            <span className="text-[8px] font-mono text-tactical-text/40">{bulletin.source}</span>
          </div>

          <h1 className="text-sm font-mono font-bold text-white leading-snug">
            {bulletin.headline}
          </h1>
        </header>

        {/* Term toggle */}
        {hasTerms && (
          <div className="border-y border-tactical-border py-2">
            <button
              onClick={() => setHighlightTerms(!highlightTerms)}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[8px] font-mono tracking-wider uppercase border transition-colors ${
                highlightTerms
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  : 'border-tactical-border text-tactical-text/40 hover:text-tactical-text'
              }`}
            >
              <span
                className={`w-1 h-1 rounded-full ${
                  highlightTerms ? 'bg-amber-400' : 'bg-amber-500/40'
                }`}
              />
              {highlightTerms ? 'Hide Terms' : 'Highlight Terms'}
            </button>
          </div>
        )}

        {/* Body */}
        <div className="space-y-3">
          {paragraphs.map((para, i) => (
            <p key={i} className="text-[10px] font-mono text-tactical-text/70 leading-relaxed">
              <HighlightedText
                text={para}
                terms={bulletin.financialTerms}
                highlight={highlightTerms}
              />
            </p>
          ))}
        </div>

        {/* Sentiment footer */}
        <footer className="border-t border-tactical-border pt-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                bulletin.sentiment === 'bullish'
                  ? 'bg-emerald-400'
                  : bulletin.sentiment === 'bearish'
                    ? 'bg-rose-400'
                    : 'bg-gray-400'
              }`}
            />
            <span className="text-[8px] font-mono text-tactical-text/30">
              Analyst sentiment:{' '}
              <span
                className={
                  bulletin.sentiment === 'bullish'
                    ? 'text-emerald-400'
                    : bulletin.sentiment === 'bearish'
                      ? 'text-rose-400'
                      : 'text-gray-400'
                }
              >
                {sentimentLabel(bulletin.sentiment)}
              </span>
            </span>
          </div>
        </footer>
      </article>
    </div>
  );
}
