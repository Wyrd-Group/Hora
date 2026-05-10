import React, { useState } from 'react';
import { usePlayerDevStore } from '../../store/playerDevStore';

const SEVERITIES = [
  { value: 'cosmetic', label: 'Cosmetic', desc: 'Visual glitch, no gameplay impact' },
  { value: 'minor', label: 'Minor', desc: 'Small issue, workaround exists' },
  { value: 'major', label: 'Major', desc: 'Significant impact on gameplay' },
  { value: 'critical', label: 'Critical', desc: 'Game-breaking, data loss, or crash' },
];

export default function BugReportPanel({ onClose }) {
  const submitBugReport = usePlayerDevStore(s => s.submitBugReport);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [severity, setSeverity] = useState('minor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;
    setIsSubmitting(true);
    const res = await submitBugReport({
      title: title.trim(),
      description: description.trim(),
      steps_to_reproduce: steps.trim() || undefined,
      severity,
    });
    setIsSubmitting(false);
    setResult(res);
    if (res.success) {
      setTimeout(() => onClose?.(), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6">
      <div className="w-full max-w-[480px] max-h-[90vh] overflow-y-auto bg-tactical-bg/95 border border-tactical-border rounded-lg shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-tactical-border">
          <span className="text-tactical-text font-mono text-sm font-semibold uppercase tracking-wide">
            Report a Bug
          </span>
          <button onClick={onClose}
            className="text-tactical-muted hover:text-tactical-text text-lg">&times;</button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-tactical-muted mb-1">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Brief description of the bug..."
              className="w-full bg-black/40 border border-tactical-border rounded px-3 py-2
                text-tactical-text text-sm font-mono placeholder:text-tactical-muted/40
                focus:outline-none focus:border-tactical-accent/50" />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-tactical-muted mb-1">What Happened</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={3} placeholder="Describe what went wrong..."
              className="w-full bg-black/40 border border-tactical-border rounded px-3 py-2
                text-tactical-text text-sm font-mono placeholder:text-tactical-muted/40
                focus:outline-none focus:border-tactical-accent/50 resize-none" />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-tactical-muted mb-1">
              Steps to Reproduce <span className="text-tactical-muted/50">(optional)</span>
            </label>
            <textarea value={steps} onChange={e => setSteps(e.target.value)}
              rows={2} placeholder="1. Go to... 2. Click on... 3. See error"
              className="w-full bg-black/40 border border-tactical-border rounded px-3 py-2
                text-tactical-text text-sm font-mono placeholder:text-tactical-muted/40
                focus:outline-none focus:border-tactical-accent/50 resize-none" />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-tactical-muted mb-1">Severity</label>
            <div className="grid grid-cols-2 gap-2">
              {SEVERITIES.map(s => (
                <button key={s.value} onClick={() => setSeverity(s.value)}
                  className={`p-2 rounded border text-left transition ${
                    severity === s.value
                      ? 'border-tactical-accent bg-tactical-accent/10 text-tactical-accent'
                      : 'border-tactical-border text-tactical-muted hover:border-tactical-accent/30'
                  }`}>
                  <span className="text-xs font-mono font-semibold block">{s.label}</span>
                  <span className="text-[9px] text-tactical-muted">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {result && (
            <p className={`text-[11px] font-mono ${result.success ? 'text-tactical-success' : 'text-tactical-alert'}`}>
              {result.success ? 'Bug report submitted! You may earn rewards when verified.' : result.error}
            </p>
          )}

          <button onClick={handleSubmit}
            disabled={isSubmitting || !title.trim() || !description.trim()}
            className={`w-full py-2.5 rounded font-mono text-sm uppercase tracking-wider transition
              ${isSubmitting || !title.trim() || !description.trim()
                ? 'bg-tactical-border text-tactical-muted cursor-not-allowed'
                : 'bg-tactical-accent/20 text-tactical-accent border border-tactical-accent/40 hover:bg-tactical-accent/30'}`}>
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
