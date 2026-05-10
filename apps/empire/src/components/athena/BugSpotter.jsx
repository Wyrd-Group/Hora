/**
 * BugSpotter — Visual bug reporting with ATHENA.
 *
 * When activated, the player enters "inspect mode":
 * 1. Overlay appears with crosshair cursor
 * 2. Elements highlight on hover
 * 3. Player clicks on the problem element
 * 4. Element context is captured (tag, classes, styles, text, position)
 * 5. ATHENA chat opens with the element context pre-loaded
 * 6. Player explains the issue
 * 7. ATHENA analyzes and can suggest CSS overrides which are applied live
 *
 * Flow: inspect → capture → chat → fix
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { apiFetch } from '../../lib/apiFetch';

const ATHENA_CHAT_URL = '/api/v1/athena/chat';

const BUG_SYSTEM_PROMPT = `You are ATHENA, acting as a visual UI debugger for the AEGIS Empire platform.
The player has clicked on a UI element that has a problem. You will receive:
- Element tag, classes, computed styles, text content, and position
- The player's description of the issue
- A screenshot context (element dimensions and location)

Your job:
1. Analyze the element context and the player's description
2. Identify the likely CSS/styling issue
3. Generate a FIX as a JSON code block with CSS overrides

FIX FORMAT — wrap in \`\`\`json ... \`\`\`:
{
  "type": "css_fix",
  "selector": "the CSS selector targeting the element",
  "properties": {
    "property-name": "value",
    ...
  },
  "description": "What this fix does"
}

RULES:
- Only suggest visual/CSS fixes — never modify JavaScript behavior
- Use specific selectors to avoid breaking other elements
- Prefer CSS custom property overrides when possible
- If the issue is a content/data problem (not styling), explain that it's not a CSS fix
- Be concise and tactical in your explanation
- If you need more info, ask one specific question
- Always include the fix JSON block when you can identify the issue`;

// Element context captured on click
function captureElementContext(element) {
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  const computed = window.getComputedStyle(element);

  return {
    tag: element.tagName.toLowerCase(),
    id: element.id || null,
    classes: Array.from(element.classList).join(' '),
    text: element.textContent?.slice(0, 200) || '',
    rect: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
    styles: {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      fontSize: computed.fontSize,
      fontFamily: computed.fontFamily,
      padding: computed.padding,
      margin: computed.margin,
      border: computed.border,
      borderRadius: computed.borderRadius,
      opacity: computed.opacity,
      display: computed.display,
      position: computed.position,
      overflow: computed.overflow,
    },
    parentTag: element.parentElement?.tagName.toLowerCase() || null,
    parentClasses: element.parentElement ? Array.from(element.parentElement.classList).join(' ') : '',
  };
}

function parseCSSFix(text) {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[1]);
    if (parsed.type !== 'css_fix' || !parsed.selector || !parsed.properties) return null;
    return parsed;
  } catch {
    return null;
  }
}

function applyCSSFix(fix) {
  const styleId = 'athena-bug-fixes';
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  const props = Object.entries(fix.properties)
    .map(([k, v]) => `  ${k}: ${v} !important;`)
    .join('\n');
  const rule = `${fix.selector} {\n${props}\n}`;

  styleEl.textContent += `\n/* ATHENA fix: ${fix.description} */\n${rule}\n`;
}

// ── Inspect Mode Overlay ──

function InspectOverlay({ onCapture, onCancel }) {
  const [hoverRect, setHoverRect] = useState(null);
  const [hoverLabel, setHoverLabel] = useState('');
  const hoveredRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    // Ignore our own overlay elements
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.closest('[data-bugspotter]')) return;

    hoveredRef.current = el;
    const rect = el.getBoundingClientRect();
    setHoverRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
    const tag = el.tagName.toLowerCase();
    const cls = el.className && typeof el.className === 'string'
      ? '.' + el.className.split(' ').filter(c => c).slice(0, 2).join('.')
      : '';
    setHoverLabel(`${tag}${cls}`);
  }, []);

  const handleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (hoveredRef.current && !hoveredRef.current.closest('[data-bugspotter]')) {
      const context = captureElementContext(hoveredRef.current);
      onCapture(context);
    }
  }, [onCapture]);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('click', handleClick, true);
    };
  }, [handleMouseMove, handleClick]);

  return (
    <div data-bugspotter="overlay" className="fixed inset-0 z-[200]" style={{ cursor: 'crosshair' }}>
      {/* Highlight box */}
      {hoverRect && (
        <div
          className="fixed pointer-events-none border-2 border-tactical-accent"
          style={{
            top: hoverRect.top,
            left: hoverRect.left,
            width: hoverRect.width,
            height: hoverRect.height,
            background: 'rgba(0, 240, 255, 0.08)',
            boxShadow: '0 0 12px rgba(0, 240, 255, 0.3)',
          }}
        >
          <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-tactical-accent text-black
            text-[9px] font-mono rounded-sm whitespace-nowrap">
            {hoverLabel}
          </div>
        </div>
      )}

      {/* Instructions bar */}
      <div data-bugspotter="bar"
        className="fixed top-0 left-0 right-0 flex items-center justify-center gap-4 py-3 px-6
          bg-tactical-alert/90 backdrop-blur-sm z-[201]">
        <span className="text-white font-mono text-xs uppercase tracking-wider animate-pulse">
          ● INSPECT MODE
        </span>
        <span className="text-white/70 font-mono text-[10px]">
          Click on the element with the issue
        </span>
        <button
          onClick={onCancel}
          data-bugspotter="cancel"
          className="px-4 py-1 rounded font-mono text-[10px] uppercase
            bg-white/20 text-white border border-white/30 hover:bg-white/30 transition"
        >
          Cancel (Esc)
        </button>
      </div>
    </div>
  );
}

// ── Bug Chat Panel ──

function BugChat({ elementContext, onClose, onNewInspect }) {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appliedFixes, setAppliedFixes] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: 'user', content: trimmed };
    let allMessages;

    if (messages.length === 0) {
      // First message — include element context
      const contextMsg = {
        role: 'user',
        content: `I'm reporting a visual issue with this element:

ELEMENT CONTEXT:
- Tag: <${elementContext.tag}>
- ID: ${elementContext.id || '(none)'}
- Classes: ${elementContext.classes || '(none)'}
- Text: "${elementContext.text.slice(0, 100)}"
- Position: x=${elementContext.rect.x}, y=${elementContext.rect.y}, ${elementContext.rect.width}x${elementContext.rect.height}px
- Styles: ${JSON.stringify(elementContext.styles, null, 1)}
- Parent: <${elementContext.parentTag}> class="${elementContext.parentClasses}"

THE ISSUE: ${trimmed}`
      };
      allMessages = [contextMsg];
    } else {
      allMessages = [...messages, userMsg];
    }

    setMessages(allMessages);
    setQuery('');
    setLoading(true);
    setError('');

    try {
      const res = await apiFetch(ATHENA_CHAT_URL, {
        method: 'POST',
        body: JSON.stringify({
          system: BUG_SYSTEM_PROMPT,
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          max_tokens: 1024,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      const responseText = data.text ?? '(no response)';
      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);

      // Try to parse and offer CSS fix
      const fix = parseCSSFix(responseText);
      if (fix) {
        // Don't auto-apply — let user confirm
        setMessages(prev => [...prev, {
          role: 'system',
          content: `__FIX_PENDING__${JSON.stringify(fix)}`
        }]);
      }
    } catch (err) {
      setError(`ATHENA_ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [query, messages, loading, elementContext]);

  const handleApplyFix = (fix) => {
    applyCSSFix(fix);
    setAppliedFixes(prev => [...prev, fix]);
    setMessages(prev => prev.map(m =>
      m.content === `__FIX_PENDING__${JSON.stringify(fix)}`
        ? { role: 'system', content: `__FIX_APPLIED__${fix.description}` }
        : m
    ));
  };

  const cleanMessage = (text) => {
    return text.replace(/```json[\s\S]*?```/g, '[CSS fix generated]');
  };

  return (
    <div data-bugspotter="chat"
      className="fixed bottom-4 right-4 left-4 sm:left-auto w-auto sm:w-[440px] max-w-[440px] ml-auto max-h-[70vh] z-[90]
        bg-[#0A0C10] border border-tactical-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-tactical-border bg-tactical-alert/5">
        <div className="flex items-center gap-2">
          <span className="text-tactical-alert">●</span>
          <span className="text-tactical-text font-mono text-[11px] font-semibold tracking-wide uppercase">
            Bug Report
          </span>
          <span className="text-tactical-muted text-[9px] font-mono">
            &lt;{elementContext.tag}&gt;
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onNewInspect}
            className="text-[9px] font-mono text-tactical-accent hover:text-tactical-text transition px-2 py-0.5
              border border-tactical-accent/30 rounded"
          >
            Re-inspect
          </button>
          <button onClick={onClose} className="text-tactical-muted hover:text-tactical-text transition text-lg">
            &times;
          </button>
        </div>
      </div>

      {/* Element Preview */}
      <div className="px-4 py-2 bg-black/40 border-b border-tactical-border/50">
        <div className="flex items-center gap-3 text-[9px] font-mono">
          <div className="w-8 h-8 rounded border border-tactical-accent/30 flex items-center justify-center"
            style={{ background: elementContext.styles.backgroundColor }}>
            <span style={{ color: elementContext.styles.color, fontSize: '7px' }}>Aa</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-tactical-text/60 truncate">{elementContext.classes || elementContext.tag}</div>
            <div className="text-tactical-muted/40 truncate">{elementContext.text.slice(0, 50)}</div>
          </div>
          <div className="text-tactical-muted/40">
            {elementContext.rect.width}×{elementContext.rect.height}
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 min-h-[200px]">
        {messages.length === 0 && (
          <p className="text-tactical-muted text-[10px] font-mono text-center py-4">
            Describe the visual issue you see with this element
          </p>
        )}

        {messages.map((msg, i) => {
          // Fix pending message
          if (msg.role === 'system' && msg.content.startsWith('__FIX_PENDING__')) {
            const fix = JSON.parse(msg.content.replace('__FIX_PENDING__', ''));
            return (
              <div key={i} className="p-2 rounded bg-tactical-success/10 border border-tactical-success/20">
                <p className="text-[9px] font-mono text-tactical-success mb-1">FIX READY: {fix.description}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApplyFix(fix)}
                    className="px-3 py-1 rounded text-[9px] font-mono uppercase
                      bg-tactical-success/20 text-tactical-success border border-tactical-success/40
                      hover:bg-tactical-success/30 transition"
                  >
                    Apply Fix
                  </button>
                  <button
                    onClick={() => setMessages(prev => prev.filter((_, idx) => idx !== i))}
                    className="px-3 py-1 rounded text-[9px] font-mono uppercase
                      text-tactical-muted border border-tactical-border hover:text-tactical-text transition"
                  >
                    Skip
                  </button>
                </div>
              </div>
            );
          }

          // Fix applied message
          if (msg.role === 'system' && msg.content.startsWith('__FIX_APPLIED__')) {
            return (
              <div key={i} className="p-2 rounded bg-tactical-success/5 border border-tactical-success/10">
                <p className="text-[9px] font-mono text-tactical-success/60">
                  ✓ Fix applied: {msg.content.replace('__FIX_APPLIED__', '')}
                </p>
              </div>
            );
          }

          return (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] px-3 py-2 rounded-lg text-[11px] font-mono leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-tactical-accent/10 text-tactical-text border border-tactical-accent/20'
                  : 'bg-tactical-border/30 text-tactical-text/80 border border-tactical-border/30'}`}
              >
                {msg.role === 'assistant' && (
                  <span className="text-tactical-accent text-[9px] block mb-1">ATHENA</span>
                )}
                <span className="whitespace-pre-wrap">{cleanMessage(msg.content)}</span>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-lg bg-tactical-border/30 border border-tactical-border/30">
              <span className="text-tactical-accent text-[9px] block mb-1">ATHENA</span>
              <span className="text-tactical-muted text-[10px] animate-pulse">Analyzing...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {error && (
        <p className="text-tactical-alert text-[10px] font-mono px-3 mb-1">{error}</p>
      )}

      {/* Applied fixes count */}
      {appliedFixes.length > 0 && (
        <div className="px-3 py-1 border-t border-tactical-border/30 bg-tactical-success/5">
          <span className="text-[9px] font-mono text-tactical-success/60">
            {appliedFixes.length} fix{appliedFixes.length > 1 ? 'es' : ''} applied this session
          </span>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 p-3 border-t border-tactical-border">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Describe the issue..."
          className="flex-1 bg-black/40 border border-tactical-border rounded px-3 py-2
            text-tactical-text text-xs font-mono placeholder:text-tactical-muted/40
            focus:outline-none focus:border-tactical-accent/50"
        />
        <button
          onClick={handleSend}
          disabled={!query.trim() || loading}
          className={`px-4 rounded font-mono text-[10px] uppercase tracking-wider transition
            ${!query.trim() || loading
              ? 'bg-tactical-border text-tactical-muted cursor-not-allowed'
              : 'bg-tactical-accent/20 text-tactical-accent border border-tactical-accent/40 hover:bg-tactical-accent/30'}`}
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ── Main BugSpotter Component ──

export default function BugSpotter({ onClose }) {
  const [phase, setPhase] = useState('inspect'); // 'inspect' | 'chat'
  const [capturedElement, setCapturedElement] = useState(null);

  const handleCapture = useCallback((context) => {
    setCapturedElement(context);
    setPhase('chat');
  }, []);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleNewInspect = useCallback(() => {
    setCapturedElement(null);
    setPhase('inspect');
  }, []);

  // Escape key handler
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (phase === 'inspect') onClose();
        else handleNewInspect();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, onClose, handleNewInspect]);

  return (
    <>
      {phase === 'inspect' && (
        <InspectOverlay onCapture={handleCapture} onCancel={handleCancel} />
      )}
      {phase === 'chat' && capturedElement && (
        <BugChat
          elementContext={capturedElement}
          onClose={onClose}
          onNewInspect={handleNewInspect}
        />
      )}
    </>
  );
}
