import React, { useState } from 'react';
import { useWorldPoliticsStore } from '../../store/worldPoliticsStore';

const TAKEOVER_TYPES = [
  {
    value: 'coup',
    label: 'Military Coup',
    desc: 'Direct military takeover. Requires superior strength. 40-70% success.',
    risk: 'high',
  },
  {
    value: 'corporate',
    label: 'Corporate Takeover',
    desc: 'Economic pressure with 70%+ regional revenue. Takes 20 ticks.',
    risk: 'medium',
  },
  {
    value: 'revolution',
    label: 'Fund Revolution',
    desc: 'Fund rebel factions. Cheaper but slower (30 ticks), less predictable.',
    risk: 'medium',
  },
  {
    value: 'election',
    label: 'Election Interference',
    desc: 'Spend treasury to influence elections in democracies.',
    risk: 'low',
  },
];

export default function CoupPanel({ countryId, onClose }) {
  const countries = useWorldPoliticsStore(s => s.countries);
  const attemptCoup = useWorldPoliticsStore(s => s.attemptCoup);
  const [selectedType, setSelectedType] = useState('coup');
  const [militaryStrength, setMilitaryStrength] = useState(70);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const country = countries[countryId];
  if (!country) return null;

  const handleExecute = async () => {
    if (selectedType !== 'coup') {
      setResult({ success: false, message: 'Only military coups are currently implemented.' });
      return;
    }
    setIsSubmitting(true);
    const res = await attemptCoup(countryId, militaryStrength);
    setIsSubmitting(false);
    setResult(res);
  };

  const successEstimate = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (0.4 + 0.3 * (militaryStrength / Math.max(country.military_strength, 1)) - country.stability * 0.2) * 100,
      ),
    ),
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6">
      <div className="w-full max-w-[500px] max-h-[90vh] overflow-y-auto bg-tactical-bg/95 border border-tactical-alert/40 rounded-lg shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-tactical-alert/30">
          <span className="text-tactical-alert font-mono text-sm font-semibold uppercase tracking-wide">
            Regime Change — {country.name}
          </span>
          <button onClick={onClose} className="text-tactical-muted hover:text-tactical-text text-lg">
            &times;
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Target Info */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-black/30 rounded p-2">
              <p className="text-[9px] uppercase tracking-wider text-tactical-muted">Military</p>
              <p className="font-mono text-sm text-tactical-text">{country.military_strength}</p>
            </div>
            <div className="bg-black/30 rounded p-2">
              <p className="text-[9px] uppercase tracking-wider text-tactical-muted">Stability</p>
              <p className="font-mono text-sm text-tactical-text">
                {(country.stability * 100).toFixed(0)}%
              </p>
            </div>
            <div className="bg-black/30 rounded p-2">
              <p className="text-[9px] uppercase tracking-wider text-tactical-muted">Status</p>
              <p className="font-mono text-sm text-tactical-text capitalize">
                {country.status.replace('_', ' ')}
              </p>
            </div>
          </div>

          {/* Takeover Type */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-tactical-muted mb-1">
              Method
            </label>
            <div className="space-y-1.5">
              {TAKEOVER_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setSelectedType(t.value)}
                  className={`w-full p-2 rounded border text-left transition ${
                    selectedType === t.value
                      ? 'border-tactical-alert bg-tactical-alert/10 text-tactical-alert'
                      : 'border-tactical-border text-tactical-muted hover:border-tactical-alert/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold">{t.label}</span>
                    <span
                      className={`text-[9px] font-mono uppercase ${
                        t.risk === 'high'
                          ? 'text-tactical-alert'
                          : t.risk === 'medium'
                            ? 'text-amber-400'
                            : 'text-tactical-success'
                      }`}
                    >
                      {t.risk} risk
                    </span>
                  </div>
                  <span className="text-[9px] text-tactical-muted">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Military Strength Slider (for coup) */}
          {selectedType === 'coup' && (
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-tactical-muted mb-1">
                Your Military Strength: {militaryStrength}
              </label>
              <input
                type="range"
                min={10}
                max={200}
                value={militaryStrength}
                onChange={e => setMilitaryStrength(Number(e.target.value))}
                className="w-full accent-tactical-alert"
              />
              <div className="flex justify-between text-[9px] text-tactical-muted font-mono mt-1">
                <span>Success estimate: {successEstimate}%</span>
                <span>vs Target: {country.military_strength}</span>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              className={`p-3 rounded border ${
                result.success
                  ? 'border-tactical-success/40 bg-tactical-success/10'
                  : 'border-tactical-alert/40 bg-tactical-alert/10'
              }`}
            >
              <p
                className={`text-xs font-mono ${
                  result.success ? 'text-tactical-success' : 'text-tactical-alert'
                }`}
              >
                {result.success
                  ? 'Coup successful! You now control ' + country.name + ' as a puppet state.'
                  : result.message || 'Coup failed. Your forces were repelled.'}
              </p>
            </div>
          )}

          {/* Execute */}
          <button
            onClick={handleExecute}
            disabled={isSubmitting}
            className={`w-full py-2.5 rounded font-mono text-sm uppercase tracking-wider transition ${
              isSubmitting
                ? 'bg-tactical-border text-tactical-muted cursor-not-allowed'
                : 'bg-tactical-alert/20 text-tactical-alert border border-tactical-alert/40 hover:bg-tactical-alert/30'
            }`}
          >
            {isSubmitting ? 'Executing...' : 'Execute Takeover'}
          </button>
        </div>
      </div>
    </div>
  );
}
