import React from 'react';

/**
 * Compact price sort/filter control for buyable item lists.
 *
 * Props:
 *   sortBy, setSortBy   – current sort mode ('default' | 'price-asc' | 'price-desc' | 'name')
 *   priceMin, setPriceMin – min-price text input
 *   priceMax, setPriceMax – max-price text input
 *   label                – optional currency symbol override (default "€")
 *   variant              – optional style variant: 'dark' (default tactical style) | 'blue' | 'red' | 'light'
 */

const VARIANT_STYLES = {
  dark: {
    select: 'bg-[#0a0f1a] border-tactical-border/20 text-tactical-text/60',
    input: 'bg-[#0a0f1a] border-tactical-border/20 text-tactical-text/60 placeholder:text-tactical-text/25',
    reset: 'text-[#ef4444] hover:text-[#ef4444]/80',
  },
  blue: {
    select: 'bg-[#020617] border-blue-900/40 text-blue-300/70',
    input: 'bg-[#020617] border-blue-900/40 text-blue-300/70 placeholder:text-blue-900/50',
    reset: 'text-red-500 hover:text-red-400',
  },
  red: {
    select: 'bg-black border-red-900/40 text-red-400/70',
    input: 'bg-black border-red-900/40 text-red-400/70 placeholder:text-red-900/50',
    reset: 'text-red-500 hover:text-red-400',
  },
  light: {
    select: 'bg-zinc-900 border-zinc-700/40 text-zinc-300/70',
    input: 'bg-zinc-900 border-zinc-700/40 text-zinc-300/70 placeholder:text-zinc-600',
    reset: 'text-red-400 hover:text-red-300',
  },
};

export function PriceFilter({ sortBy, setSortBy, priceMin, setPriceMin, priceMax, setPriceMax, label = '€', variant = 'dark' }) {
  const hasFilter = priceMin || priceMax || sortBy !== 'default';
  const s = VARIANT_STYLES[variant] || VARIANT_STYLES.dark;
  return (
    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
      <select
        value={sortBy}
        onChange={e => setSortBy(e.target.value)}
        className={`border rounded px-1.5 py-1 text-[8px] font-mono outline-none ${s.select}`}
      >
        <option value="default">Sort: Default</option>
        <option value="price-asc">Price: Low → High</option>
        <option value="price-desc">Price: High → Low</option>
        <option value="name">Name: A → Z</option>
      </select>
      <input
        type="number"
        placeholder={`Min ${label}`}
        value={priceMin}
        onChange={e => setPriceMin(e.target.value)}
        className={`w-16 border rounded px-1.5 py-1 text-[8px] font-mono outline-none ${s.input}`}
      />
      <input
        type="number"
        placeholder={`Max ${label}`}
        value={priceMax}
        onChange={e => setPriceMax(e.target.value)}
        className={`w-16 border rounded px-1.5 py-1 text-[8px] font-mono outline-none ${s.input}`}
      />
      {hasFilter && (
        <button
          onClick={() => { setSortBy('default'); setPriceMin(''); setPriceMax(''); }}
          className={`text-[7px] font-mono ${s.reset}`}
        >
          RESET
        </button>
      )}
    </div>
  );
}

/**
 * Apply price range filtering and sorting to an array of items.
 *
 * @param {Array}  items    – source array
 * @param {string} priceKey – property name that holds the numeric price
 * @param {string} sortBy   – 'default' | 'price-asc' | 'price-desc' | 'name'
 * @param {string} priceMin – min input value (string)
 * @param {string} priceMax – max input value (string)
 * @returns {Array} filtered & sorted copy
 */
export function applyPriceFilter(items, priceKey, sortBy, priceMin, priceMax) {
  let filtered = [...items];
  const min = parseFloat(priceMin) || 0;
  const max = parseFloat(priceMax) || Infinity;
  if (priceMin) filtered = filtered.filter(item => (item[priceKey] || 0) >= min);
  if (priceMax) filtered = filtered.filter(item => (item[priceKey] || 0) <= max);
  if (sortBy === 'price-asc') filtered.sort((a, b) => (a[priceKey] || 0) - (b[priceKey] || 0));
  if (sortBy === 'price-desc') filtered.sort((a, b) => (b[priceKey] || 0) - (a[priceKey] || 0));
  if (sortBy === 'name') filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return filtered;
}

export default PriceFilter;
