// ============================================================================
// CountrySelector — picks a jurisdiction for content filtering
// ============================================================================
// Three modes:
//   - modal (default): full-screen overlay used in onboarding flow
//   - inline: embedded in settings page
//   - compact: a small flag-badge dropdown (e.g. in topbar)
//
// Groups countries by region, shows localization coverage badge per entry,
// and offers an IP-detection shortcut.
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { useJurisdictionStore } from '../../store/jurisdictionStore';
import { COUNTRY_META } from '../../types/regulatory';

const REGION_ORDER = ['europe', 'americas', 'africa', 'asia', 'middle_east', 'oceania'];
const REGION_LABELS = {
  europe: 'Europe',
  americas: 'Americas',
  africa: 'Africa',
  asia: 'Asia',
  middle_east: 'Middle East',
  oceania: 'Oceania',
};

const COVERAGE_PILLS = {
  full: { label: 'Localized', className: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50' },
  partial: { label: 'Partial', className: 'bg-amber-900/40 text-amber-300 border-amber-700/50' },
  none: { label: 'Not localized', className: 'bg-stone-800 text-stone-400 border-stone-700/50' },
};

function groupCountries(search = '') {
  const s = search.trim().toLowerCase();
  const groups = {};
  for (const meta of Object.values(COUNTRY_META)) {
    if (s && !meta.name.toLowerCase().includes(s) && !meta.code.toLowerCase().includes(s)) continue;
    const region = meta.region;
    if (!groups[region]) groups[region] = [];
    groups[region].push(meta);
  }
  for (const region of Object.keys(groups)) {
    groups[region].sort((a, b) => a.name.localeCompare(b.name));
  }
  return groups;
}

/**
 * Main country-picker UI. Used by both modal and inline variants.
 */
function PickerBody({ onSelect, currentCountry, showDetect = true }) {
  const [search, setSearch] = useState('');
  const [detecting, setDetecting] = useState(false);
  const detectFromIP = useJurisdictionStore((s) => s.detectFromIP);
  const detectedCountry = useJurisdictionStore((s) => s.detectedCountry);

  const groups = useMemo(() => groupCountries(search), [search]);
  const hasResults = Object.keys(groups).length > 0;

  const handleDetect = async () => {
    setDetecting(true);
    try {
      const code = await detectFromIP();
      if (code) onSelect(code);
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 min-h-0">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search countries…"
          className="flex-1 min-w-[12rem] bg-stone-900 border border-stone-700 rounded px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
          aria-label="Search countries"
          autoFocus
        />
        {showDetect && (
          <button
            type="button"
            onClick={handleDetect}
            disabled={detecting}
            className="px-3 py-2 text-sm rounded bg-stone-800 hover:bg-stone-700 text-stone-200 disabled:opacity-50"
          >
            {detecting ? 'Detecting…' : detectedCountry ? `Use ${COUNTRY_META[detectedCountry]?.flag ?? ''} ${COUNTRY_META[detectedCountry]?.name}` : 'Detect from IP'}
          </button>
        )}
      </div>

      <div className="overflow-y-auto max-h-[60vh] space-y-4 pr-1">
        {!hasResults && (
          <p className="text-stone-400 text-sm text-center py-6">
            No countries match "{search}". Try fewer letters.
          </p>
        )}
        {REGION_ORDER
          .filter((r) => groups[r]?.length)
          .map((region) => (
            <section key={region}>
              <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-2 font-semibold">
                {REGION_LABELS[region]}
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {groups[region].map((meta) => {
                  const isSelected = meta.code === currentCountry;
                  const pill = COVERAGE_PILLS[meta.localized_coverage];
                  return (
                    <li key={meta.code}>
                      <button
                        type="button"
                        onClick={() => onSelect(meta.code)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded border transition-colors text-left ${
                          isSelected
                            ? 'border-amber-500 bg-amber-900/20'
                            : 'border-stone-700/50 hover:border-stone-500 hover:bg-stone-800/60'
                        }`}
                        aria-pressed={isSelected}
                      >
                        <span className="text-xl" aria-hidden>{meta.flag}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm text-stone-100 truncate">{meta.name}</span>
                          <span className="block text-xs text-stone-400">{meta.currency}</span>
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${pill.className} whitespace-nowrap`}>
                          {pill.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
      </div>
    </div>
  );
}

/**
 * Full modal overlay. Blocks app interaction until user picks or skips.
 */
export function CountrySelectorModal({ open, onClose, allowSkip = false }) {
  const country = useJurisdictionStore((s) => s.country);
  const setCountry = useJurisdictionStore((s) => s.setCountry);
  const markPrompted = useJurisdictionStore((s) => s.markPrompted);

  if (!open) return null;

  const handleSelect = async (code) => {
    await setCountry(code);
    onClose?.();
  };

  const handleSkip = () => {
    markPrompted();
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="country-selector-title"
    >
      <div className="card-glass rounded-xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-stone-700/50">
        <header className="p-6 pb-4 border-b border-stone-700/50">
          <h2 id="country-selector-title" className="text-xl font-bold text-stone-100 mb-1">
            Where do you file taxes?
          </h2>
          <p className="text-sm text-stone-400">
            Pick your country so we show the tax wrappers, retirement accounts, and regulatory figures
            that actually apply to you. You can change this anytime in Settings.
          </p>
        </header>

        <div className="flex-1 overflow-hidden p-6 min-h-0">
          <PickerBody onSelect={handleSelect} currentCountry={country} />
        </div>

        {allowSkip && (
          <footer className="p-4 border-t border-stone-700/50 flex justify-end">
            <button
              type="button"
              onClick={handleSkip}
              className="text-sm text-stone-400 hover:text-stone-200 underline"
            >
              Skip — show general principles only
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

/**
 * Inline variant for settings pages. No modal chrome.
 */
export function CountrySelectorInline() {
  const country = useJurisdictionStore((s) => s.country);
  const setCountry = useJurisdictionStore((s) => s.setCountry);
  return (
    <div className="card-glass p-4 rounded-lg">
      <h3 className="text-base font-semibold text-stone-100 mb-1">Your jurisdiction</h3>
      <p className="text-sm text-stone-400 mb-4">
        Choose your country to get tax wrappers, retirement accounts, and regulatory figures tailored to your domicile.
      </p>
      <PickerBody onSelect={(code) => setCountry(code)} currentCountry={country} />
    </div>
  );
}

/**
 * Compact flag-only button that opens the modal. Good for topbars.
 */
export function CountrySelectorCompact() {
  const [open, setOpen] = useState(false);
  const country = useJurisdictionStore((s) => s.country);
  const flag = country ? COUNTRY_META[country]?.flag ?? '🏳️' : '🌍';
  const label = country ? COUNTRY_META[country]?.name ?? country : 'Global';
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-stone-700/50 hover:border-stone-500 text-sm"
        aria-label="Change jurisdiction"
        title={`Jurisdiction: ${label}`}
      >
        <span aria-hidden>{flag}</span>
        <span className="text-stone-200 hidden sm:inline">{country ?? 'Global'}</span>
        <span className="text-xs text-stone-400" aria-hidden>▾</span>
      </button>
      <CountrySelectorModal open={open} onClose={() => setOpen(false)} allowSkip />
    </>
  );
}

/**
 * First-launch gate. Shows the modal exactly once until the user has either
 * selected a country or explicitly skipped. Drop this at the app root.
 */
export function CountrySelectorFirstLaunch() {
  const hasPrompted = useJurisdictionStore((s) => s.hasPrompted);
  const country = useJurisdictionStore((s) => s.country);
  const detectFromIP = useJurisdictionStore((s) => s.detectFromIP);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Only show on first ever launch (never prompted before and no country set).
    if (hasPrompted || country) return;
    detectFromIP().finally(() => setOpen(true));
  }, [hasPrompted, country, detectFromIP]);

  return <CountrySelectorModal open={open} onClose={() => setOpen(false)} allowSkip />;
}

export default CountrySelectorModal;
