import React, { useState, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { Filter } from 'bad-words';
import { useLivingWorldStore } from '../../store/livingWorldStore';
import { useEmpireStore } from '../../store/empireStore';
import { cellToLatLng, latLngToCell } from 'h3-js';
import { distance } from '@turf/distance';

const profanityFilter = new Filter();

const SECTORS = [
  { value: 'finance',       label: 'Finance',       emoji: '🏦' },
  { value: 'tech',          label: 'Technology',     emoji: '💻' },
  { value: 'manufacturing', label: 'Manufacturing',  emoji: '🏭' },
  { value: 'energy',        label: 'Energy',         emoji: '⚡' },
  { value: 'oil_gas',       label: 'Oil & Gas',      emoji: '🛢️' },
  { value: 'defense',       label: 'Defense',        emoji: '🛡️' },
  { value: 'pharma',        label: 'Pharma',         emoji: '🔬' },
  { value: 'healthcare',    label: 'Healthcare',     emoji: '🏥' },
  { value: 'education',     label: 'Education',      emoji: '🎓' },
  { value: 'cultural',      label: 'Cultural',       emoji: '🏛️' },
  { value: 'hospitality',   label: 'Hospitality',    emoji: '🏨' },
  { value: 'venue',         label: 'Venue',          emoji: '🏪' },
  { value: 'retail',        label: 'Retail',         emoji: '🛍️' },
];

const BASE_FOUNDING_COST = 250_000;
const MIN_NET_WORTH = 500_000;
const MIN_DISTANCE_KM = 1.1;

export default function VentureFounderPanel() {
  const { founderPanelOpen, founderPanelCoords, closeFounderPanel, foundVenture, worldNodes } =
    useLivingWorldStore(useShallow(s => ({
      founderPanelOpen: s.founderPanelOpen,
      founderPanelCoords: s.founderPanelCoords,
      closeFounderPanel: s.closeFounderPanel,
      foundVenture: s.foundVenture,
      worldNodes: s.worldNodes,
    })));
  const netWorth = useEmpireStore(s => s.netWorth);
  const companyBalance = useEmpireStore(s => s.companyBalance);

  const [name, setName] = useState('');
  const [sector, setSector] = useState('tech');
  const [businessModel, setBusinessModel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Compute H3 index and nearby nodes for cost
  const h3Index = useMemo(() => {
    if (!founderPanelCoords) return '';
    return latLngToCell(founderPanelCoords.lat, founderPanelCoords.lng, 5);
  }, [founderPanelCoords]);

  const nearbyCount = useMemo(() => {
    if (!founderPanelCoords) return 0;
    const clickPoint = [founderPanelCoords.lng, founderPanelCoords.lat];
    return Object.values(worldNodes).filter(n => {
      const d = distance(clickPoint, [n.lng, n.lat], { units: 'kilometers' });
      return d < 50; // within 50km
    }).length;
  }, [worldNodes, founderPanelCoords]);

  // Check minimum distance from existing nodes
  const tooClose = useMemo(() => {
    if (!founderPanelCoords) return false;
    const clickPoint = [founderPanelCoords.lng, founderPanelCoords.lat];
    return Object.values(worldNodes).some(n => {
      const d = distance(clickPoint, [n.lng, n.lat], { units: 'kilometers' });
      return d < MIN_DISTANCE_KM;
    });
  }, [worldNodes, founderPanelCoords]);

  const foundingCost = Math.round(BASE_FOUNDING_COST * (1 + nearbyCount * 0.15));
  const canAfford = companyBalance >= foundingCost;
  const meetsNetWorth = netWorth >= MIN_NET_WORTH;
  const validName = name.trim().length >= 3 && name.trim().length <= 60;
  const hasProfanity = useMemo(() => {
    if (name.trim().length < 3) return false;
    try { return profanityFilter.isProfane(name.trim()); } catch { return false; }
  }, [name]);

  if (!founderPanelOpen || !founderPanelCoords) return null;

  const handleSubmit = async () => {
    if (!validName || hasProfanity || !canAfford || !meetsNetWorth || tooClose) return;
    setIsSubmitting(true);
    setError('');

    const result = await foundVenture({
      name: name.trim(),
      sector,
      lat: founderPanelCoords.lat,
      lng: founderPanelCoords.lng,
      h3_index: h3Index,
      business_model: businessModel.trim() || undefined,
      base_income: Math.round(foundingCost * 0.08),
      base_cost: Math.round(foundingCost * 0.03),
      description: businessModel.trim() || undefined,
    });

    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error || 'Failed to found venture');
    } else {
      setName('');
      setBusinessModel('');
    }
  };

  return (
    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-[420px] max-h-[90vh] overflow-y-auto z-[60]
      bg-tactical-bg/95 border border-tactical-border rounded-lg backdrop-blur-xl shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-tactical-border">
        <div className="flex items-center gap-2">
          <span className="text-tactical-accent text-lg">+</span>
          <span className="text-tactical-text font-mono text-sm font-semibold tracking-wide uppercase">
            Found a Company
          </span>
        </div>
        <button
          onClick={closeFounderPanel}
          className="text-tactical-muted hover:text-tactical-text transition text-lg leading-none"
        >
          &times;
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Company Name */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-tactical-muted mb-1">
            Company Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={60}
            placeholder="Enter company name..."
            className="w-full bg-black/40 border border-tactical-border rounded px-3 py-2
              text-tactical-text text-sm font-mono placeholder:text-tactical-muted/40
              focus:outline-none focus:border-tactical-accent/50"
          />
          {name.length > 0 && !validName && (
            <p className="text-tactical-alert text-[10px] mt-1">Name must be 3-60 characters</p>
          )}
        </div>

        {/* Sector */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-tactical-muted mb-1">
            Sector
          </label>
          <select
            value={sector}
            onChange={e => setSector(e.target.value)}
            className="w-full bg-black/40 border border-tactical-border rounded px-3 py-2
              text-tactical-text text-sm font-mono
              focus:outline-none focus:border-tactical-accent/50"
          >
            {SECTORS.map(s => (
              <option key={s.value} value={s.value}>
                {s.emoji} {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Business Model */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-tactical-muted mb-1">
            Business Model <span className="text-tactical-muted/50">(optional)</span>
          </label>
          <textarea
            value={businessModel}
            onChange={e => setBusinessModel(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder="What does your company do?"
            className="w-full bg-black/40 border border-tactical-border rounded px-3 py-2
              text-tactical-text text-sm font-mono placeholder:text-tactical-muted/40
              focus:outline-none focus:border-tactical-accent/50 resize-none"
          />
          <p className="text-[9px] text-tactical-muted/50 text-right">{businessModel.length}/200</p>
        </div>

        {/* Location Info */}
        <div className="bg-black/30 rounded p-3 space-y-1.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-tactical-muted uppercase tracking-wider">Location</span>
            <span className="text-tactical-text font-mono">
              {founderPanelCoords.lat.toFixed(4)}, {founderPanelCoords.lng.toFixed(4)}
            </span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-tactical-muted uppercase tracking-wider">H3 Cell</span>
            <span className="text-tactical-text font-mono text-[9px]">{h3Index}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-tactical-muted uppercase tracking-wider">Nearby Ventures</span>
            <span className="text-tactical-text font-mono">{nearbyCount}</span>
          </div>
        </div>

        {/* Cost Preview */}
        <div className="bg-black/30 rounded p-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-tactical-muted uppercase tracking-wider">
              Founding Cost
            </span>
            <span className={`font-mono text-sm font-semibold ${canAfford ? 'text-tactical-success' : 'text-tactical-alert'}`}>
              {foundingCost.toLocaleString()}
            </span>
          </div>
          {nearbyCount > 0 && (
            <p className="text-[9px] text-tactical-warning mt-1">
              +{Math.round(nearbyCount * 15)}% density premium ({nearbyCount} nearby)
            </p>
          )}
        </div>

        {/* Validation Errors */}
        {!meetsNetWorth && (
          <p className="text-tactical-alert text-[10px]">
            Minimum net worth of {MIN_NET_WORTH.toLocaleString()} required
          </p>
        )}
        {tooClose && (
          <p className="text-tactical-alert text-[10px]">
            Too close to an existing venture (min {MIN_DISTANCE_KM}km)
          </p>
        )}
        {hasProfanity && (
          <p className="text-tactical-alert text-[10px]">
            Company name contains inappropriate language
          </p>
        )}
        {error && (
          <p className="text-tactical-alert text-[10px]">{error}</p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !validName || hasProfanity || !canAfford || !meetsNetWorth || tooClose}
          className={`w-full py-2.5 rounded font-mono text-sm font-semibold uppercase tracking-wider transition
            ${isSubmitting || !validName || hasProfanity || !canAfford || !meetsNetWorth || tooClose
              ? 'bg-tactical-border text-tactical-muted cursor-not-allowed'
              : 'bg-tactical-accent/20 text-tactical-accent border border-tactical-accent/40 hover:bg-tactical-accent/30'
            }`}
        >
          {isSubmitting ? 'Founding...' : 'Found Company'}
        </button>
      </div>
    </div>
  );
}
