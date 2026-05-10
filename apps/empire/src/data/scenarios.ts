import type { Scenario } from '../types/curriculum';

export const scenarios: Scenario[] = [
  {
    id: 'scenario-first-portfolio',
    title: 'Open Your First Portfolio',
    description: 'Apply your Financial Awareness knowledge by making your first investment decisions and keeping track of your finances.',
    startingBalance: 5000,
    validators: [
      { type: 'UNIQUE_ASSETS_GTE', value: 1 },
      { type: 'MAX_ALLOCATION_LTE', value: 80 },
    ],
  },
  {
    id: 'scenario-build-portfolio',
    title: 'Build Your First Portfolio',
    description: 'Apply your foundations knowledge by buying at least 3 different crypto assets and diversifying your portfolio.',
    startingBalance: 10000,
    validators: [
      { type: 'UNIQUE_ASSETS_GTE', value: 3 },
      { type: 'TOTAL_INVESTED_GTE', value: 5000 },
      { type: 'MAX_ALLOCATION_LTE', value: 60 },
    ],
  },
  {
    id: 'scenario-trading-strategy',
    title: 'Execute a Trading Strategy',
    description: 'Demonstrate your trading knowledge by executing multiple trades with proper position sizing.',
    startingBalance: 10000,
    validators: [
      { type: 'TRADE_COUNT_GTE', value: 5 },
      { type: 'UNIQUE_ASSETS_GTE', value: 2 },
      { type: 'MAX_ALLOCATION_LTE', value: 30 },
    ],
  },
  {
    id: 'scenario-market-crash',
    title: 'Survive a Market Crash',
    description: 'The market is about to experience a 30% crash. Manage your portfolio to limit total losses to under 15%.',
    startingBalance: 3000,
    validators: [
      { type: 'MAX_DRAWDOWN_LTE', value: 15 },
      { type: 'TRADE_COUNT_GTE', value: 3 },
    ],
    timeLimit: 200,
  },
  {
    id: 'scenario-regulatory-news',
    title: 'Regulatory News Impact',
    description: 'Navigate a session where major regulatory news drops. Observe how compliance-related events affect prices and make informed decisions.',
    startingBalance: 5000,
    validators: [
      { type: 'PROFIT_PCT_GTE', value: 5 },
      { type: 'TRADE_COUNT_GTE', value: 4 },
    ],
    timeLimit: 150,
  },
  {
    id: 'scenario-derivatives-strategy',
    title: 'Derivatives Strategy',
    description: 'Use options and leverage to profit from market movements. Buy at least 1 option, open at least 1 leveraged position, and end with a profit.',
    startingBalance: 10000,
    validators: [
      { type: 'OPTION_COUNT_GTE', value: 1 },
      { type: 'LEVERAGE_COUNT_GTE', value: 1 },
      { type: 'PROFIT_PCT_GTE', value: 3 },
    ],
    timeLimit: 200,
  },
  {
    id: 'scenario-news-driven',
    title: 'News-Driven Trading',
    description: 'Read the bulletin articles, identify the key terms and source biases, then execute trades based on your interpretation of the news.',
    startingBalance: 10000,
    validators: [
      { type: 'ARTICLES_READ_GTE', value: 3 },
      { type: 'TRADE_COUNT_GTE', value: 4 },
      { type: 'UNIQUE_ASSETS_GTE', value: 3 },
    ],
  },
];
