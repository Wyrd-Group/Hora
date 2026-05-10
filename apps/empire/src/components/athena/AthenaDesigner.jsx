/**
 * AthenaDesigner — ATHENA-powered UI personalizer.
 *
 * Players describe their desired UI look to ATHENA, which generates
 * theme configs. Changes are previewed live before applying.
 * Also includes built-in preset gallery and manual color pickers.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useThemeStore, THEME_PRESETS, DEFAULT_THEME } from '../../store/themeStore';
import { useEmpireStore } from '../../store/empireStore';
import { apiFetch } from '../../lib/apiFetch';

const ATHENA_CHAT_URL = '/api/v1/athena/chat';

const DESIGN_SYSTEM_PROMPT = `You are ATHENA, an elite AI design assistant for the AEGIS Empire platform.
The player wants to customize their UI theme. You generate theme configurations.

Current theme system supports these customizable properties:
- colors.bg: Main background (hex, e.g. "#0A0C10")
- colors.panel: Panel overlay (rgba, e.g. "rgba(10,12,16,0.85)")
- colors.border: Border color (hex)
- colors.text: Primary text color (hex)
- colors.accent: Accent/highlight color (hex) — used for buttons, glows, highlights
- colors.alert: Alert/danger color (hex)
- colors.warning: Warning color (hex)
- colors.success: Success/positive color (hex)
- colors.muted: Muted/secondary text (hex)
- fontFamily: "mono" (JetBrains Mono) or "sans" (Inter)
- borderRadius: Corner rounding (e.g. "8px", "0px", "12px")
- glowIntensity: 0-1 (controls neon glow effects)
- panelBlur: Backdrop blur (e.g. "14px", "20px")
- scanlines: true/false (CRT scanline overlay)

RULES:
1. When the player describes a look, generate a COMPLETE theme config as a JSON code block
2. Always wrap the theme JSON in \`\`\`json ... \`\`\` markers
3. Include an "id" (lowercase, no spaces) and "name" (display name)
4. Ensure sufficient contrast between bg and text colors (WCAG AA minimum)
5. Keep backgrounds dark — this is a tactical/gaming interface
6. Be creative but maintain readability
7. Respond conversationally + include the JSON block
8. If the player says "apply" or "use this", just confirm — the UI handles the rest
9. If they want small tweaks to the current preview, modify only the changed fields`;

function parseThemeFromResponse(text) {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[1]);
    // Validate required fields
    if (!parsed.colors || !parsed.name) return null;
    return {
      id: parsed.id || `custom-${Date.now()}`,
      name: parsed.name,
      colors: {
        bg: parsed.colors.bg || DEFAULT_THEME.colors.bg,
        panel: parsed.colors.panel || DEFAULT_THEME.colors.panel,
        border: parsed.colors.border || DEFAULT_THEME.colors.border,
        text: parsed.colors.text || DEFAULT_THEME.colors.text,
        accent: parsed.colors.accent || DEFAULT_THEME.colors.accent,
        alert: parsed.colors.alert || DEFAULT_THEME.colors.alert,
        warning: parsed.colors.warning || DEFAULT_THEME.colors.warning,
        success: parsed.colors.success || DEFAULT_THEME.colors.success,
        muted: parsed.colors.muted || DEFAULT_THEME.colors.muted,
      },
      fontFamily: parsed.fontFamily || DEFAULT_THEME.fontFamily,
      borderRadius: parsed.borderRadius || DEFAULT_THEME.borderRadius,
      glowIntensity: parsed.glowIntensity ?? DEFAULT_THEME.glowIntensity,
      panelBlur: parsed.panelBlur || DEFAULT_THEME.panelBlur,
      scanlines: parsed.scanlines ?? DEFAULT_THEME.scanlines,
    };
  } catch {
    return null;
  }
}

// Mini preview card that shows how colors look together
function ThemePreviewCard({ theme, isActive, onClick, onPreview }) {
  const c = theme.colors;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => onPreview?.(theme)}
      onMouseLeave={() => onPreview?.(null)}
      className={`relative w-full p-3 rounded-lg border transition-all text-left
        ${isActive ? 'ring-2 ring-tactical-accent' : 'hover:brightness-125'}`}
      style={{
        background: c.bg,
        borderColor: c.border,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ background: c.accent }} />
        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: c.text }}>
          {theme.name}
        </span>
      </div>
      <div className="flex gap-1">
        {[c.accent, c.success, c.warning, c.alert, c.muted].map((color, i) => (
          <div key={i} className="w-4 h-2 rounded-sm" style={{ background: color }} />
        ))}
      </div>
    </button>
  );
}

export default function AthenaDesigner({ onClose }) {
  const { activeTheme, previewTheme, setPreview, applyTheme, saveCustomTheme, customThemes, resetToDefault } = useThemeStore();
  const [tab, setTab] = useState('presets');  // 'presets' | 'athena' | 'manual'
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastGeneratedTheme, setLastGeneratedTheme] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clean up preview on unmount
  useEffect(() => {
    return () => setPreview(null);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setQuery('');
    setLoading(true);
    setError('');

    // If user says "apply", apply the last generated theme
    const applyWords = ['apply', 'use this', 'yes', 'go for it', 'do it', 'confirm', 'keep it'];
    if (lastGeneratedTheme && applyWords.some(w => trimmed.toLowerCase().includes(w))) {
      applyTheme(lastGeneratedTheme);
      saveCustomTheme(lastGeneratedTheme);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Theme "${lastGeneratedTheme.name}" applied and saved. You can always switch back from the presets gallery.`
      }]);
      setLoading(false);
      return;
    }

    try {
      const currentThemeContext = previewTheme || activeTheme;
      const systemPrompt = DESIGN_SYSTEM_PROMPT + `\n\nCurrent active theme: ${JSON.stringify(currentThemeContext, null, 2)}`;

      const res = await apiFetch(ATHENA_CHAT_URL, {
        method: 'POST',
        body: JSON.stringify({
          system: systemPrompt,
          messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
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

      // Try to parse a theme from the response
      const generated = parseThemeFromResponse(responseText);
      if (generated) {
        setLastGeneratedTheme(generated);
        setPreview(generated);
      }
    } catch (err) {
      setError(`ATHENA_ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [query, messages, loading, lastGeneratedTheme, activeTheme, previewTheme]);

  const handlePresetClick = (theme) => {
    applyTheme(theme);
  };

  const handlePresetHover = (theme) => {
    setPreview(theme);
  };

  const handlePresetLeave = () => {
    setPreview(null);
  };

  // Strip JSON blocks from displayed messages for cleaner chat
  const cleanMessage = (text) => {
    return text.replace(/```json[\s\S]*?```/g, '[Theme generated — see preview above]');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6">
      <div className="w-full max-w-[800px] max-h-[90vh] sm:max-h-[85vh] bg-[#0A0C10] border border-tactical-border rounded-xl
        shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-tactical-border">
          <div className="flex items-center gap-3">
            <span className="text-tactical-accent text-lg">◆</span>
            <span className="text-tactical-text font-mono text-sm font-semibold tracking-wide uppercase">
              UI Designer
            </span>
            <span className="text-tactical-muted text-[9px] font-mono">powered by ATHENA</span>
          </div>
          <button
            onClick={onClose}
            className="text-tactical-muted hover:text-tactical-text transition text-lg"
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-tactical-border">
          {[
            { id: 'presets', label: 'PRESETS' },
            { id: 'athena', label: 'ATHENA AI' },
            { id: 'manual', label: 'MANUAL' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 font-mono text-[10px] tracking-widest transition
                ${tab === t.id
                  ? 'text-tactical-accent border-b-2 border-tactical-accent bg-tactical-accent/5'
                  : 'text-tactical-muted hover:text-tactical-text'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {/* Presets Tab */}
          {tab === 'presets' && (
            <div className="space-y-4">
              <p className="text-[10px] text-tactical-muted uppercase tracking-wider font-mono">
                Built-in Themes — hover to preview, click to apply
              </p>
              <div className="grid grid-cols-2 gap-3">
                {THEME_PRESETS.map(preset => (
                  <ThemePreviewCard
                    key={preset.id}
                    theme={preset}
                    isActive={activeTheme.id === preset.id}
                    onClick={() => handlePresetClick(preset)}
                    onPreview={(t) => t ? handlePresetHover(t) : handlePresetLeave()}
                  />
                ))}
              </div>

              {customThemes.length > 0 && (
                <>
                  <p className="text-[10px] text-tactical-muted uppercase tracking-wider font-mono mt-6">
                    Your Custom Themes
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {customThemes.map(theme => (
                      <ThemePreviewCard
                        key={theme.id}
                        theme={theme}
                        isActive={activeTheme.id === theme.id}
                        onClick={() => handlePresetClick(theme)}
                        onPreview={(t) => t ? handlePresetHover(t) : handlePresetLeave()}
                      />
                    ))}
                  </div>
                </>
              )}

              <button
                onClick={resetToDefault}
                className="w-full mt-4 py-2 rounded font-mono text-[10px] uppercase tracking-wider
                  text-tactical-muted border border-tactical-border hover:border-tactical-text/30 transition"
              >
                Reset to Default
              </button>
            </div>
          )}

          {/* ATHENA AI Tab */}
          {tab === 'athena' && (
            <div className="flex flex-col h-full min-h-[400px]">
              {messages.length === 0 && (
                <div className="text-center py-8 space-y-3">
                  <div className="text-tactical-accent text-3xl">◆</div>
                  <p className="text-tactical-text/60 text-sm">
                    Describe your ideal UI look and ATHENA will generate it
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {[
                      'Make it cyberpunk with neon pink',
                      'Clean minimal blue theme',
                      'Dark military tactical feel',
                      'Warm sunset colors',
                      'More contrast, bigger glow',
                    ].map(suggestion => (
                      <button
                        key={suggestion}
                        onClick={() => { setQuery(suggestion); }}
                        className="px-3 py-1.5 rounded-full text-[10px] font-mono
                          bg-tactical-accent/10 text-tactical-accent/70 border border-tactical-accent/20
                          hover:bg-tactical-accent/20 transition"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar mb-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-lg text-xs font-mono leading-relaxed
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
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="px-3 py-2 rounded-lg bg-tactical-border/30 border border-tactical-border/30">
                      <span className="text-tactical-accent text-[9px] block mb-1">ATHENA</span>
                      <span className="text-tactical-muted text-xs animate-pulse">Designing...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {error && (
                <p className="text-tactical-alert text-[10px] font-mono mb-2">{error}</p>
              )}

              {/* Preview Controls */}
              {lastGeneratedTheme && (
                <div className="flex items-center gap-2 mb-3 p-2 rounded bg-tactical-success/10 border border-tactical-success/20">
                  <div className="flex gap-1">
                    {Object.values(lastGeneratedTheme.colors).slice(0, 5).map((c, i) => (
                      <div key={i} className="w-3 h-3 rounded-full" style={{ background: c }} />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono text-tactical-success flex-1">
                    {lastGeneratedTheme.name} — previewing
                  </span>
                  <button
                    onClick={() => {
                      applyTheme(lastGeneratedTheme);
                      saveCustomTheme(lastGeneratedTheme);
                    }}
                    className="px-3 py-1 rounded text-[9px] font-mono uppercase
                      bg-tactical-success/20 text-tactical-success border border-tactical-success/40
                      hover:bg-tactical-success/30 transition"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => { setPreview(null); setLastGeneratedTheme(null); }}
                    className="px-3 py-1 rounded text-[9px] font-mono uppercase
                      text-tactical-muted border border-tactical-border hover:text-tactical-text transition"
                  >
                    Discard
                  </button>
                </div>
              )}

              {/* Input */}
              <div className="flex gap-2">
                <textarea
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend(); }}
                  placeholder="Describe your ideal UI..."
                  rows={2}
                  className="flex-1 bg-black/40 border border-tactical-border rounded px-3 py-2
                    text-tactical-text text-xs font-mono placeholder:text-tactical-muted/40
                    focus:outline-none focus:border-tactical-accent/50 resize-none"
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
          )}

          {/* Manual Tab */}
          {tab === 'manual' && (
            <ManualEditor />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Manual Color Editor ──

function ManualEditor() {
  const { activeTheme, setPreview, applyTheme, saveCustomTheme } = useThemeStore();
  const [draft, setDraft] = useState({ ...activeTheme });

  const updateColor = (key, value) => {
    const next = { ...draft, colors: { ...draft.colors, [key]: value } };
    setDraft(next);
    setPreview(next);
  };

  const updateProp = (key, value) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    setPreview(next);
  };

  const handleApply = () => {
    const themed = { ...draft, id: `custom-${Date.now()}`, name: draft.name || 'My Theme' };
    applyTheme(themed);
    saveCustomTheme(themed);
  };

  // Clean up preview on unmount
  useEffect(() => {
    return () => setPreview(null);
  }, []);

  const colorFields = [
    { key: 'bg', label: 'Background' },
    { key: 'panel', label: 'Panel' },
    { key: 'border', label: 'Border' },
    { key: 'text', label: 'Text' },
    { key: 'accent', label: 'Accent' },
    { key: 'alert', label: 'Alert' },
    { key: 'warning', label: 'Warning' },
    { key: 'success', label: 'Success' },
    { key: 'muted', label: 'Muted' },
  ];

  return (
    <div className="space-y-4">
      {/* Theme Name */}
      <div>
        <label className="block text-[9px] text-tactical-muted uppercase tracking-wider font-mono mb-1">
          Theme Name
        </label>
        <input
          type="text"
          value={draft.name}
          onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
          className="w-full bg-black/40 border border-tactical-border rounded px-3 py-1.5
            text-tactical-text text-xs font-mono focus:outline-none focus:border-tactical-accent/50"
        />
      </div>

      {/* Colors */}
      <div>
        <label className="block text-[9px] text-tactical-muted uppercase tracking-wider font-mono mb-2">
          Colors
        </label>
        <div className="grid grid-cols-3 gap-2">
          {colorFields.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2 p-2 rounded bg-black/30 border border-tactical-border/30">
              <input
                type="color"
                value={draft.colors[key]?.startsWith('#') ? draft.colors[key] : '#000000'}
                onChange={e => updateColor(key, e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
              />
              <span className="text-[9px] font-mono text-tactical-text/60">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Properties */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[9px] text-tactical-muted uppercase tracking-wider font-mono mb-1">
            Font
          </label>
          <select
            value={draft.fontFamily}
            onChange={e => updateProp('fontFamily', e.target.value)}
            className="w-full bg-black/40 border border-tactical-border rounded px-3 py-1.5
              text-tactical-text text-xs font-mono focus:outline-none"
          >
            <option value="mono">JetBrains Mono</option>
            <option value="sans">Inter (Sans)</option>
          </select>
        </div>
        <div>
          <label className="block text-[9px] text-tactical-muted uppercase tracking-wider font-mono mb-1">
            Border Radius
          </label>
          <input
            type="range"
            min="0" max="20" step="1"
            value={parseInt(draft.borderRadius)}
            onChange={e => updateProp('borderRadius', `${e.target.value}px`)}
            className="w-full accent-[var(--color-accent)]"
          />
          <span className="text-[9px] font-mono text-tactical-muted">{draft.borderRadius}</span>
        </div>
        <div>
          <label className="block text-[9px] text-tactical-muted uppercase tracking-wider font-mono mb-1">
            Glow Intensity
          </label>
          <input
            type="range"
            min="0" max="100" step="5"
            value={Math.round(draft.glowIntensity * 100)}
            onChange={e => updateProp('glowIntensity', Number(e.target.value) / 100)}
            className="w-full accent-[var(--color-accent)]"
          />
          <span className="text-[9px] font-mono text-tactical-muted">{Math.round(draft.glowIntensity * 100)}%</span>
        </div>
        <div>
          <label className="block text-[9px] text-tactical-muted uppercase tracking-wider font-mono mb-1">
            Panel Blur
          </label>
          <input
            type="range"
            min="0" max="30" step="2"
            value={parseInt(draft.panelBlur)}
            onChange={e => updateProp('panelBlur', `${e.target.value}px`)}
            className="w-full accent-[var(--color-accent)]"
          />
          <span className="text-[9px] font-mono text-tactical-muted">{draft.panelBlur}</span>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.scanlines}
            onChange={e => updateProp('scanlines', e.target.checked)}
            className="accent-[var(--color-accent)]"
          />
          <span className="text-[10px] font-mono text-tactical-text/60">Scanlines</span>
        </label>
      </div>

      {/* Apply */}
      <button
        onClick={handleApply}
        className="w-full py-2.5 rounded font-mono text-xs font-semibold uppercase tracking-wider
          bg-tactical-accent/20 text-tactical-accent border border-tactical-accent/40
          hover:bg-tactical-accent/30 transition"
      >
        Save & Apply Theme
      </button>
    </div>
  );
}
