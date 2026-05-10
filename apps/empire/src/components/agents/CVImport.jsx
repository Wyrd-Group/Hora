import React, { useState, useRef } from 'react';

// ── Skill pill ──
function SkillPill({ label }) {
  const colors = [
    'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
    'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    'bg-amber-500/15 text-amber-300 border-amber-500/25',
    'bg-violet-500/15 text-violet-300 border-violet-500/25',
    'bg-rose-500/15 text-rose-300 border-rose-500/25',
  ];
  const color = colors[Math.abs(label.length * 7) % colors.length];

  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono border ${color}`}
    >
      {label}
    </span>
  );
}

// ── Existing profile view ──
function ProfileView({ profile, onOpenUpdate, onClear }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-[#E8E0D0] mb-1">
          Your Profile
        </h2>
        <div className="h-px bg-[#00e5ff]/20" />
      </div>

      {/* Skills */}
      {profile.skills?.length > 0 && (
        <div>
          <p className="text-[10px] text-[#9C8E7E] uppercase tracking-wider mb-2 font-mono">
            Skills
          </p>
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((s, i) => (
              <SkillPill key={i} label={s} />
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      {profile.experience?.length > 0 && (
        <div>
          <p className="text-[10px] text-[#9C8E7E] uppercase tracking-wider mb-2 font-mono">
            Experience
          </p>
          <ul className="space-y-1.5">
            {profile.experience.map((exp, i) => (
              <li key={i} className="text-xs font-mono text-[#E8E0D0]">
                <span className="text-[#00e5ff]">{exp.role}</span>
                <span className="text-[#9C8E7E]"> @ </span>
                <span>{exp.company}</span>
                {exp.duration && (
                  <span className="text-[#9C8E7E] ml-1">({exp.duration})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Education */}
      {profile.education?.length > 0 && (
        <div>
          <p className="text-[10px] text-[#9C8E7E] uppercase tracking-wider mb-2 font-mono">
            Education
          </p>
          <ul className="space-y-1.5">
            {profile.education.map((edu, i) => (
              <li key={i} className="text-xs font-mono text-[#E8E0D0]">
                <span>{edu.degree}</span>
                <span className="text-[#9C8E7E]"> @ </span>
                <span>{edu.institution}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onOpenUpdate}
          className="flex-1 px-4 py-2 rounded bg-[#00e5ff]/20 text-[#00e5ff] font-mono text-xs uppercase tracking-wider border border-[#00e5ff]/30 hover:bg-[#00e5ff]/30 transition-colors"
        >
          Update CV
        </button>
        <button
          onClick={onClear}
          className="px-4 py-2 rounded bg-rose-500/15 text-rose-400 font-mono text-xs uppercase tracking-wider border border-rose-500/25 hover:bg-rose-500/25 transition-colors"
        >
          Clear CV
        </button>
      </div>
    </div>
  );
}

// ── Import form ──
function ImportForm({ onImport, initialText = '' }) {
  const [text, setText] = useState(initialText);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer?.files?.[0];
    if (!file) return;

    // Read as text — works for .txt; PDF/DOCX would need real parsing
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') {
        setText(result);
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onImport(trimmed);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-[#E8E0D0] mb-1">
          Import Your CV
        </h2>
        <p className="text-[10px] text-[#9C8E7E] font-mono leading-relaxed">
          Help Athena understand your background to better delegate tasks
        </p>
        <div className="h-px bg-[#00e5ff]/20 mt-2" />
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => textareaRef.current?.focus()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-text transition-colors ${
          isDragOver
            ? 'border-[#00e5ff]/50 bg-[#00e5ff]/5'
            : 'border-[rgba(232,224,208,0.12)] hover:border-[rgba(232,224,208,0.25)]'
        }`}
      >
        <p className="text-[#9C8E7E] text-xs font-mono mb-1">
          Drop PDF / DOCX or paste text below
        </p>
        <p className="text-[#9C8E7E]/40 text-[10px] font-mono">
          Plain text paste is the primary input method
        </p>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your CV / resume text here..."
        rows={10}
        className="w-full bg-[rgba(232,224,208,0.04)] border border-[rgba(232,224,208,0.08)] rounded-lg px-4 py-3 text-xs text-[#E8E0D0] placeholder-[#9C8E7E]/40 font-mono resize-none focus:outline-none focus:border-[#00e5ff]/40 transition-colors"
      />

      {/* Privacy notice */}
      <p className="text-[10px] text-[#9C8E7E]/60 font-mono leading-relaxed">
        Your data stays on-device. Anonymized task patterns improve the platform.
      </p>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!text.trim()}
        className="w-full px-4 py-2.5 rounded bg-[#00e5ff]/20 text-[#00e5ff] font-mono text-xs uppercase tracking-wider border border-[#00e5ff]/30 hover:bg-[#00e5ff]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Import
      </button>
    </div>
  );
}

// ── Main modal ──
export default function CVImport({ onImport, onClose, existingProfile = null }) {
  const [showUpdate, setShowUpdate] = useState(false);

  const handleClear = () => {
    // Pass empty string to signal clearing
    onImport('');
  };

  const showImportForm = !existingProfile || showUpdate;

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 bg-[rgba(24,22,18,0.95)] border border-[rgba(232,224,208,0.15)] rounded-xl backdrop-blur-xl p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#9C8E7E] hover:text-[#E8E0D0] text-xs font-mono transition-colors"
        >
          ESC
        </button>

        {showImportForm ? (
          <ImportForm onImport={onImport} />
        ) : (
          <ProfileView
            profile={existingProfile}
            onOpenUpdate={() => setShowUpdate(true)}
            onClear={handleClear}
          />
        )}
      </div>
    </div>
  );
}
