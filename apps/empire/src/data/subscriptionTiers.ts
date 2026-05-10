export type SubscriptionTier = 0 | 1 | 2 | 3;

export const TIER_CONFIG = {
  0: { name: 'RECRUIT',   price: 'Free',     priceNum: 0,    stripePriceId: '',                  offline: false, athenaFull: false, academyAthena: false, adFree: false, premiumPass: false, color: '#9CA3AF', icon: '◦' },
  1: { name: 'OPERATIVE', price: '$2.99/mo',  priceNum: 2.99, stripePriceId: 'price_operative',   offline: false, athenaFull: false, academyAthena: false, adFree: true,  premiumPass: false, color: '#00e5ff', icon: '◈' },
  2: { name: 'SENTINEL',  price: '$6.99/mo',  priceNum: 6.99, stripePriceId: 'price_sentinel',    offline: true,  athenaFull: true,  academyAthena: true,  adFree: false, premiumPass: true,  color: '#a78bfa', icon: '◉' },
  3: { name: 'DIRECTOR',  price: '$9.99/mo',  priceNum: 9.99, stripePriceId: 'price_director',    offline: true,  athenaFull: true,  academyAthena: true,  adFree: true,  premiumPass: true,  color: '#f59e0b', icon: '★' },
} as const;

export const TIER_FEATURES = [
  { key: 'offline',        label: 'Offline & Lab Mode' },
  { key: 'athenaFull',     label: 'Unlimited Athena AI' },
  { key: 'academyAthena',  label: 'Athena in Academy' },
  { key: 'adFree',         label: 'Ad-Free Experience' },
  { key: 'premiumPass',    label: 'Premium Battle Pass' },
] as const;
