import React, { useState, useReducer, useEffect, useCallback } from 'react';
import RitualBackdrop from '../shared/RitualBackdrop';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'aegis-training-camp';
const COLORS = {
  bg: '#060a12',
  bgCard: 'rgba(14, 20, 32, 0.85)',
  border: 'rgba(0, 229, 255, 0.12)',
  borderActive: 'rgba(0, 229, 255, 0.35)',
  text: '#E8E0D0',
  muted: '#7a8a9e',
  cyan: '#00e5ff',
  green: '#10b981',
  red: '#ef4444',
  amber: '#f59e0b',
};

const CATEGORIES = {
  FUNDAMENTALS: { label: 'FUNDAMENTALS', color: COLORS.cyan },
  OPERATIONS: { label: 'OPERATIONS', color: COLORS.amber },
  CRISIS: { label: 'CRISIS', color: COLORS.red },
  STRATEGY: { label: 'STRATEGY', color: COLORS.green },
};

// ─── DRILL DEFINITIONS ───────────────────────────────────────────────────────

const DRILLS = [
  // ── DRILL 1: First Acquisition ──────────────────────────────────────────────
  {
    id: 'first-acquisition',
    name: 'First Acquisition',
    category: 'FUNDAMENTALS',
    description: 'Learn to evaluate nodes by ROI, not sticker price.',
    maxRounds: 8,
    startBalance: 500000,
    startHeat: 0,
    rounds: [
      // Round 1 — TRAP: expensive node looks best
      {
        briefing: 'You have €500K to invest. Three nodes are available. Your analysts recommend reviewing the income-to-capex ratio before committing.',
        stats: {},
        choices: [
          { id: 'a', label: 'Quantum Datacenter', desc: '€400K capex — €28K/mo income. State-of-the-art facility.', trap: true },
          { id: 'b', label: 'Logistics Hub', desc: '€180K capex — €22K/mo income. Modest but efficient.', trap: false },
          { id: 'c', label: 'Retail Outlet', desc: '€120K capex — €9K/mo income. Cheap and simple.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: false, profit: -45000, feedback: 'The Quantum Datacenter costs €400K but only earns €28K/mo — a 7% monthly ROI. You overpaid for prestige.', lesson: 'Always calculate ROI (income / capex). The flashiest asset is often the worst investment.' };
          if (choiceId === 'b') return { passed: true, profit: 120000, feedback: 'The Logistics Hub costs €180K but earns €22K/mo — a 12.2% monthly ROI. Excellent value!', lesson: 'Income-to-capex ratio is the fundamental metric. The Logistics Hub was 1.7x more efficient than the Datacenter.' };
          return { passed: false, profit: 15000, feedback: 'The Retail Outlet is cheap but its 7.5% ROI barely beats the trap. You played it too safe.', lesson: 'Being cheap is not the same as being efficient. Look for the best ratio, not the lowest price.' };
        },
      },
      // Round 2 — REWARD: player should pick best ROI
      {
        briefing: 'New quarter. Two expansion options available. One has heavy marketing but questionable numbers.',
        stats: {},
        choices: [
          { id: 'a', label: 'Media Tower', desc: '€250K capex — €15K/mo income. Trendy sector, lots of hype.', trap: true },
          { id: 'b', label: 'Freight Terminal', desc: '€200K capex — €30K/mo income. Boring but profitable.', trap: false },
          { id: 'c', label: 'Skip this round', desc: 'Hold cash. Wait for better deals.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'b') return { passed: true, profit: 150000, feedback: 'The Freight Terminal at 15% monthly ROI was the clear winner. Your portfolio is growing fast.', lesson: 'Ignore hype. The numbers never lie — 15% ROI beats 6% ROI every time.' };
          if (choiceId === 'a') return { passed: false, profit: -30000, feedback: 'The Media Tower\'s 6% ROI is terrible. Hype does not equal returns.', lesson: 'Trendy sectors often carry a "hype premium" that destroys ROI.' };
          return { passed: false, profit: 0, feedback: 'Holding cash earns nothing. In this case, the Freight Terminal was a clear buy.', lesson: 'Cash drag kills growth. When a high-ROI asset is available, deploy capital.' };
        },
      },
      // Round 3 — STREAK: another clear win
      {
        briefing: 'Market is hot. Three nodes, wide spread in quality. Trust your ROI instincts.',
        stats: {},
        choices: [
          { id: 'a', label: 'Biotech Lab', desc: '€300K capex — €48K/mo income. Cutting-edge research.', trap: false },
          { id: 'b', label: 'Shopping Mall', desc: '€350K capex — €25K/mo income. High foot traffic area.', trap: true },
          { id: 'c', label: 'Parking Complex', desc: '€80K capex — €7K/mo income. Passive income play.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: true, profit: 180000, feedback: 'Biotech Lab at 16% ROI — you\'re reading the numbers like a pro now.', lesson: 'When you find a 16% monthly ROI, you buy it. Period.' };
          if (choiceId === 'b') return { passed: false, profit: -20000, feedback: 'Shopping Mall at 7.1% ROI — foot traffic doesn\'t pay the bills.', lesson: 'High traffic does not mean high ROI. Always run the numbers.' };
          return { passed: true, profit: 40000, feedback: 'Parking Complex at 8.75% ROI — decent but you missed the Biotech Lab at 16%.', lesson: 'Good is the enemy of great. The Biotech Lab was nearly 2x better.' };
        },
      },
      // Round 4 — CURVEBALL: hidden OPEX
      {
        briefing: 'A suspiciously cheap node appears on the market. The price seems too good to be true.',
        stats: {},
        choices: [
          { id: 'a', label: 'Mining Rig', desc: '€60K capex — €18K/mo income. Incredibly cheap!', trap: true },
          { id: 'b', label: 'Warehouse', desc: '€150K capex — €20K/mo income. Standard deal.', trap: false },
          { id: 'c', label: 'Commission a due diligence report first (€10K)', desc: 'Spend €10K to investigate hidden costs before buying.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: false, profit: -85000, feedback: 'The Mining Rig has €15K/mo in hidden OPEX (energy, cooling, maintenance). Net income: €3K/mo. Your real ROI is 5%.', lesson: 'OPEX eats profit. Always check operating costs — income alone is misleading. If a deal looks too good, it probably is.' };
          if (choiceId === 'c') return { passed: true, profit: 100000, feedback: 'Due diligence revealed the Mining Rig\'s €15K/mo OPEX. You dodged a bullet and bought the Warehouse instead.', lesson: 'Spending money on research saves money on bad deals. Due diligence is always worth it.' };
          return { passed: true, profit: 80000, feedback: 'The Warehouse is a solid 13.3% ROI with no hidden costs. Smart, safe play.', lesson: 'When something looks too cheap, go with the known quantity.' };
        },
      },
      // Round 5 — RECOVERY
      {
        briefing: 'After the OPEX scare, you\'re cautious. Two options with fully transparent cost sheets.',
        stats: {},
        choices: [
          { id: 'a', label: 'Solar Farm', desc: '€220K capex — €32K/mo income — €5K/mo OPEX. Net: €27K/mo.', trap: false },
          { id: 'b', label: 'Server Farm', desc: '€280K capex — €45K/mo income — €18K/mo OPEX. Net: €27K/mo.', trap: false },
          { id: 'c', label: 'Both (if you can afford it)', desc: 'Total: €500K capex for €54K/mo net income.', trap: false },
        ],
        evaluate: (choiceId, state) => {
          if (choiceId === 'a') return { passed: true, profit: 130000, feedback: 'Solar Farm: 12.3% net ROI. Lower risk, transparent costs. Solid pick.', lesson: 'With transparent OPEX, compare NET income to capex. Solar Farm: €27K/€220K = 12.3%.' };
          if (choiceId === 'b') return { passed: true, profit: 110000, feedback: 'Server Farm: 9.6% net ROI. Higher gross but OPEX eats into it.', lesson: 'High OPEX reduces real ROI. Server Farm looks better gross but Solar Farm wins net.' };
          if (choiceId === 'c' && state.balance >= 500000) return { passed: true, profit: 200000, feedback: 'Both! €54K/mo net for €500K. Average 10.8% ROI. Diversification bonus.', lesson: 'When you can afford it, diversification reduces risk while maintaining returns.' };
          return { passed: false, profit: -10000, feedback: 'You can\'t afford both. Overextending causes cash flow crises.', lesson: 'Never invest more than you have. Cash reserves are survival.' };
        },
      },
      // Round 6 — DEEPER: portfolio review
      {
        briefing: 'Mid-year review. One of your nodes is underperforming. A buyer offers to take it off your hands at a loss. Do you sell or hold?',
        stats: {},
        choices: [
          { id: 'a', label: 'Sell the underperformer at -15%', desc: 'Take the loss now. Redeploy capital into a 14% ROI node.', trap: false },
          { id: 'b', label: 'Hold and hope it recovers', desc: 'Sunk cost — maybe it\'ll turn around next quarter.', trap: true },
          { id: 'c', label: 'Invest more to "fix" it', desc: 'Spend €50K on upgrades to boost income.', trap: true },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: true, profit: 95000, feedback: 'You sold at a loss but redeployed into a 14% ROI node. Net gain after 4 months: +€95K.', lesson: 'Cut losers early. Sunk cost fallacy kills portfolios. Redeploy into winners.' };
          if (choiceId === 'b') return { passed: false, profit: -40000, feedback: 'The node continued to decline. You lost another €40K waiting for a recovery that never came.', lesson: 'Hope is not a strategy. Holding losers is the most expensive mistake in empire building.' };
          return { passed: false, profit: -65000, feedback: 'Throwing money at a bad asset made it worse. The upgrades didn\'t fix the fundamental problem.', lesson: 'Don\'t pour good money after bad. If the fundamentals are broken, no amount of patching helps.' };
        },
      },
      // Round 7 — CURVEBALL 2: market downturn
      {
        briefing: 'Market correction hits. All node values drop 20%. Two fire-sale opportunities appear.',
        stats: {},
        choices: [
          { id: 'a', label: 'Buy the dip: Aerospace Node', desc: '€160K (was €200K) — €28K/mo income. 17.5% ROI at discount!', trap: false },
          { id: 'b', label: 'Panic sell your portfolio', desc: 'Liquidate everything at -20% before it gets worse.', trap: true },
          { id: 'c', label: 'Hold cash and wait', desc: 'The market might drop further. Stay liquid.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: true, profit: 170000, feedback: 'Buying at a discount + strong fundamentals = massive returns. The market recovered and you profited.', lesson: 'Market corrections are buying opportunities for assets with strong fundamentals.' };
          if (choiceId === 'b') return { passed: false, profit: -120000, feedback: 'You sold at the bottom. The market recovered 3 months later. Panic selling destroyed your portfolio.', lesson: 'NEVER panic sell during corrections. If fundamentals are sound, hold or buy more.' };
          return { passed: false, profit: 10000, feedback: 'The market bounced back quickly. You missed the best buying opportunity of the year.', lesson: 'Timing the bottom is impossible. When you see strong ROI at a discount, act.' };
        },
      },
      // Round 8 — FINAL: comprehensive test
      {
        briefing: 'Final round. Three nodes. One is a trap, one is good, one is great. Everything you\'ve learned is tested here.',
        stats: {},
        choices: [
          { id: 'a', label: 'AI Supercluster', desc: '€500K capex — €80K/mo income — €35K/mo OPEX. Net: €45K/mo. Prestigious.', trap: false },
          { id: 'b', label: 'Distribution Network', desc: '€200K capex — €35K/mo income — €3K/mo OPEX. Net: €32K/mo. Boring.', trap: false },
          { id: 'c', label: 'Crypto Mine', desc: '€100K capex — €40K/mo income. No OPEX listed. "Trust us."', trap: true },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'b') return { passed: true, profit: 250000, feedback: 'Distribution Network: 16% net ROI, low OPEX, transparent. You\'ve mastered this. Perfect score.', lesson: 'You\'ve learned the core lesson: best NET ROI + transparent costs + boring fundamentals = winning strategy.' };
          if (choiceId === 'a') return { passed: true, profit: 120000, feedback: 'AI Supercluster: 9% net ROI. Not bad, but the Distribution Network was nearly 2x better.', lesson: 'Good but not great. High gross income is seductive — always subtract OPEX first.' };
          return { passed: false, profit: -90000, feedback: 'The Crypto Mine had hidden €38K/mo OPEX. Net income: €2K/mo. 2% ROI. You fell for the same trick.', lesson: '"No OPEX listed" means "we\'re hiding the OPEX." If costs aren\'t transparent, walk away.' };
        },
      },
    ],
  },

  // ── DRILL 2: Heat Management ────────────────────────────────────────────────
  {
    id: 'heat-management',
    name: 'Heat Management',
    category: 'FUNDAMENTALS',
    description: 'Master the regulatory heat system before it masters you.',
    maxRounds: 7,
    startBalance: 800000,
    startHeat: 30,
    rounds: [
      {
        briefing: 'Your empire has 3 nodes generating €45K/mo. Heat is at 30. You want to expand. How aggressively do you move?',
        stats: { nodes: 3, income: 45000 },
        choices: [
          { id: 'a', label: 'Buy 3 nodes at once', desc: 'Triple your empire in one move. Heat +40.', trap: true },
          { id: 'b', label: 'Buy 1 node', desc: 'Steady growth. Heat +10.', trap: false },
          { id: 'c', label: 'Buy 1 node + run PR campaign', desc: 'Grow and cool simultaneously. Heat +10, then -8 from PR.', trap: false },
        ],
        evaluate: (choiceId, state) => {
          if (choiceId === 'a') return { passed: false, profit: -200000, heatDelta: 40, feedback: 'Heat jumped to 70! Regulators froze 2 of your new nodes. You lost the capex.', lesson: 'Never expand when heat > 50. Aggressive expansion triggers regulatory crackdowns. Grow steadily.' };
          if (choiceId === 'c') return { passed: true, profit: 80000, heatDelta: 2, feedback: 'Net heat change: +2. You grew AND managed risk. Income up €15K/mo with minimal heat.', lesson: 'Pair every expansion with a cooling action. Growth + risk management is the winning formula.' };
          return { passed: true, profit: 60000, heatDelta: 10, feedback: 'Safe expansion. Heat is now 40 — manageable but climbing.', lesson: 'Steady growth is fine, but pairing it with cooling is even better.' };
        },
      },
      {
        briefing: 'Heat is climbing. A competitor reports you to regulators. Heat spikes +15. Your current heat is now 55.',
        stats: { heatWarning: true },
        choices: [
          { id: 'a', label: 'Retaliate — buy competitor\'s turf', desc: 'Show dominance. Heat +20.', trap: true },
          { id: 'b', label: 'Lay low — pause all expansion', desc: 'Cool off for one quarter. Heat -15.', trap: false },
          { id: 'c', label: 'Hire lobbyists', desc: 'Costs €50K but reduces heat by -25.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: false, profit: -150000, heatDelta: 20, feedback: 'Heat hit 75. Full regulatory audit. €150K in fines and 1 node seized.', lesson: 'When heat is high, NEVER escalate. Regulators are watching. Cool down first.' };
          if (choiceId === 'c') return { passed: true, profit: 40000, heatDelta: -25, feedback: 'Lobbyists reduced heat to 30. Expensive but saved your empire. Income continued flowing.', lesson: 'Spending money to reduce heat is an investment, not an expense. Regulatory risk is existential.' };
          return { passed: true, profit: 20000, heatDelta: -15, feedback: 'Heat dropped to 40. You lost a quarter of growth but stayed safe.', lesson: 'Sometimes the best move is no move. Patience preserves empires.' };
        },
      },
      {
        briefing: 'Heat is manageable now. A lucrative but risky opportunity appears: acquire a grey-market node for 50% off.',
        stats: {},
        choices: [
          { id: 'a', label: 'Buy the grey-market node', desc: 'Half price! But heat +30.', trap: true },
          { id: 'b', label: 'Pass on it', desc: 'Not worth the heat risk. Heat unchanged.', trap: false },
          { id: 'c', label: 'Report it to regulators', desc: 'Gain goodwill. Heat -10. Small cash reward.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: false, profit: -100000, heatDelta: 30, feedback: 'Grey-market node was a sting operation. Node seized, €100K lost, heat spiked.', lesson: 'If a deal requires breaking rules, the risk always exceeds the reward. Grey market = guaranteed heat.' };
          if (choiceId === 'c') return { passed: true, profit: 50000, heatDelta: -10, feedback: 'Regulators rewarded your cooperation. €50K bonus and reduced scrutiny.', lesson: 'Working WITH regulators can be profitable. Goodwill is a strategic asset.' };
          return { passed: true, profit: 30000, heatDelta: 0, feedback: 'Smart pass. You kept your clean record and steady income.', lesson: 'Knowing when to say no is as important as knowing when to say yes.' };
        },
      },
      // Round 4 — CURVEBALL: sudden regulatory event
      {
        briefing: 'BREAKING: New regulation targets your sector specifically. All operators get +20 heat. Industry in panic.',
        stats: { emergency: true },
        choices: [
          { id: 'a', label: 'Sell nodes to reduce exposure', desc: 'Sell 1 node. Lose income but heat -15.', trap: false },
          { id: 'b', label: 'Restructure to compliant entity', desc: 'Costs €80K. Heat -30. Takes one round.', trap: false },
          { id: 'c', label: 'Ignore it and keep operating', desc: 'Regulations are just suggestions, right? Heat unchanged.', trap: true },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'b') return { passed: true, profit: 60000, heatDelta: -30, feedback: 'Restructuring cost €80K but heat dropped massively. You\'re now seen as a compliant operator. Premium status.', lesson: 'When regulations change, adapt immediately. Early compliance = competitive advantage.' };
          if (choiceId === 'a') return { passed: true, profit: 10000, heatDelta: -15, feedback: 'You lost income but survived the crackdown. Others weren\'t so lucky.', lesson: 'Sometimes you have to shrink to survive. Live to fight another day.' };
          return { passed: false, profit: -200000, heatDelta: 25, feedback: 'Regulators made an example of you. Massive fines, 2 nodes frozen.', lesson: 'Ignoring regulation is the fastest way to lose everything. Compliance is not optional.' };
        },
      },
      {
        briefing: 'Dust is settling. Your heat is low and competitors are weakened. Time to expand?',
        stats: {},
        choices: [
          { id: 'a', label: 'Acquire 2 distressed competitor nodes', desc: 'Great prices from weakened rivals. Heat +15.', trap: false },
          { id: 'b', label: 'Acquire 1 node + invest in compliance', desc: 'Balanced growth. Heat +5.', trap: false },
          { id: 'c', label: 'Go on a buying spree — 4 nodes', desc: 'Dominate while others are weak! Heat +35.', trap: true },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: true, profit: 140000, heatDelta: 15, feedback: 'Smart opportunism. You expanded at discount prices while staying within heat limits.', lesson: 'Other players\' crises are your opportunities — but only if your heat is low enough to act.' };
          if (choiceId === 'b') return { passed: true, profit: 90000, heatDelta: 5, feedback: 'Conservative but safe. Your compliance investment will pay dividends later.', lesson: 'Compliance-first growth is slower but much more sustainable.' };
          return { passed: false, profit: -80000, heatDelta: 35, feedback: 'You triggered the same regulatory response you just survived. Some lessons need to be learned twice.', lesson: 'The post-crisis period has INCREASED regulatory scrutiny. Going big right after a crackdown is suicidal.' };
        },
      },
      {
        briefing: 'A rival offers you a partnership: merge operations to share heat and reduce regulatory burden.',
        stats: {},
        choices: [
          { id: 'a', label: 'Accept the partnership', desc: 'Shared heat pool. Your heat effectively halves but profits split 60/40.', trap: false },
          { id: 'b', label: 'Reject and go solo', desc: 'Keep all profits. Keep all heat.', trap: false },
          { id: 'c', label: 'Accept, then undermine them', desc: 'Take the deal, then gradually absorb their assets.', trap: true },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: true, profit: 100000, heatDelta: -20, feedback: 'Partnership reduced heat and provided stable income. A mature play.', lesson: 'Strategic partnerships reduce systemic risk. Sharing profit is better than losing everything.' };
          if (choiceId === 'b') return { passed: true, profit: 70000, heatDelta: 0, feedback: 'Solo play works if your heat is managed. Riskier but you keep full control.', lesson: 'Independence has value, but so does partnership. Know when each is appropriate.' };
          return { passed: false, profit: -130000, heatDelta: 30, feedback: 'Your betrayal was discovered. Partner reported you. Heat spike + reputation destroyed.', lesson: 'Betrayal generates massive heat. Your reputation is your most valuable asset in a regulated market.' };
        },
      },
      {
        briefing: 'Final assessment. Your empire is stable. One last opportunity: an unregulated offshore node with 25% ROI.',
        stats: {},
        choices: [
          { id: 'a', label: 'Buy it — offshore means no heat', desc: 'Incredible ROI. What regulators don\'t know won\'t hurt.', trap: true },
          { id: 'b', label: 'Pass — too risky', desc: 'Maintain your clean operation.', trap: false },
          { id: 'c', label: 'Report to regulators + expand legally', desc: 'Gain goodwill and use it to expand with reduced heat.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'c') return { passed: true, profit: 180000, heatDelta: -15, feedback: 'Regulators rewarded you with a compliance premium. You expanded legally with reduced scrutiny. Mastery achieved.', lesson: 'The ultimate strategy: turn regulation into competitive advantage. Compliance IS your moat.' };
          if (choiceId === 'b') return { passed: true, profit: 60000, heatDelta: 0, feedback: 'Safe play. You preserved your empire. Not the best outcome but far from the worst.', lesson: 'Sometimes passing is correct. Risk management is knowing your limits.' };
          return { passed: false, profit: -250000, heatDelta: 50, feedback: 'International regulators traced the transaction. Full empire audit. Catastrophic fines.', lesson: 'Offshore ≠ invisible. In the modern world, all transactions leave traces. There is no escape from heat.' };
        },
      },
    ],
  },

  // ── DRILL 3: Supply Route Profit ────────────────────────────────────────────
  {
    id: 'supply-route-profit',
    name: 'Supply Route Profit',
    category: 'OPERATIONS',
    description: 'Optimize routes, vehicles, and frequency for maximum profit.',
    maxRounds: 7,
    startBalance: 600000,
    startHeat: 10,
    rounds: [
      {
        briefing: 'Connect City A to City B (400km). Choose your vehicle fleet. Revenue: €8 per ton delivered.',
        stats: { distance: '400km', revenuePerTon: 8 },
        choices: [
          { id: 'a', label: '10 Heavy Trucks', desc: '€200K — 50t each — €3/t fuel. Capacity: 500t/run.', trap: true },
          { id: 'b', label: '5 Cargo Trains', desc: '€300K — 200t each — €1/t fuel. Capacity: 1000t/run.', trap: false },
          { id: 'c', label: '20 Light Vans', desc: '€100K — 10t each — €5/t fuel. Capacity: 200t/run.', trap: true },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'b') return { passed: true, profit: 140000, feedback: 'Trains: 1000t × (€8 - €1) = €7K/run profit. High capacity, low per-unit cost. Dominant choice.', lesson: 'For long distances, choose the vehicle with lowest cost-per-ton. Trains dominate for bulk + distance.' };
          if (choiceId === 'a') return { passed: false, profit: -20000, feedback: 'Trucks: 500t × (€8 - €3) = €2.5K/run profit but €200K capex. ROI too slow.', lesson: 'Trucks are flexible but expensive per ton on long routes. Calculate profit per ton, not just total capacity.' };
          return { passed: false, profit: -60000, feedback: 'Vans: 200t × (€8 - €5) = €600/run. Terrible. You need 333 runs to break even.', lesson: 'Small vehicles on long routes = death by fuel costs. Scale your vehicle to the distance.' };
        },
      },
      {
        briefing: 'Route A-B is profitable. Now connect City B to City C (80km). Short urban route. Revenue: €12 per ton.',
        stats: { distance: '80km', revenuePerTon: 12 },
        choices: [
          { id: 'a', label: '8 Light Vans', desc: '€40K — 10t each — €2/t fuel. Fast turnaround.', trap: false },
          { id: 'b', label: '2 Cargo Trains', desc: '€120K — 200t each — €1/t fuel. Massive capacity.', trap: true },
          { id: 'c', label: '4 Medium Trucks', desc: '€80K — 30t each — €2.5/t fuel. Balanced.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: true, profit: 100000, feedback: 'Vans on short urban routes: fast turnaround, low capex, €10/t profit. 3 runs/day = huge throughput.', lesson: 'Short routes favor speed and turnaround over raw capacity. Vans dominate urban logistics.' };
          if (choiceId === 'b') return { passed: false, profit: -30000, feedback: 'Trains need infrastructure that costs more than the route earns. Overkill for 80km.', lesson: 'Don\'t bring a train to a van fight. Match vehicle scale to route distance.' };
          return { passed: true, profit: 60000, feedback: 'Trucks: decent but vans would have been 40% more profitable on this route.', lesson: 'Medium options are safe but rarely optimal. Specialize for the route.' };
        },
      },
      {
        briefing: 'Both routes running. Now optimize FREQUENCY. Route A-B runs 2x/day. You can increase to 4x/day for €30K/mo extra.',
        stats: { currentFreq: '2x/day', demandFill: '60%' },
        choices: [
          { id: 'a', label: 'Increase to 4x/day', desc: '€30K/mo extra cost. Should fill remaining 40% demand.', trap: false },
          { id: 'b', label: 'Increase to 6x/day', desc: '€70K/mo extra cost. Maximum possible frequency.', trap: true },
          { id: 'c', label: 'Keep at 2x/day', desc: 'Save money. Current profit is fine.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: true, profit: 110000, feedback: '4x/day fills 95% of demand. €30K extra cost, €80K extra revenue. Net +€50K/mo.', lesson: 'Increase frequency until marginal cost approaches marginal revenue. 4x was the sweet spot.' };
          if (choiceId === 'b') return { passed: false, profit: -15000, feedback: '6x/day: runs 5 and 6 go half-empty. €70K cost for only €90K revenue. Diminishing returns.', lesson: 'Over-servicing a route wastes money. Demand has a ceiling — don\'t run empty vehicles.' };
          return { passed: false, profit: 20000, feedback: 'You left 40% of demand unserved. Competitors will fill that gap.', lesson: 'Under-servicing leaves money on the table and invites competition.' };
        },
      },
      // CURVEBALL: fuel price spike
      {
        briefing: 'FUEL CRISIS: Fuel prices double overnight. Your route economics are upside down.',
        stats: { fuelIncrease: '+100%', emergency: true },
        choices: [
          { id: 'a', label: 'Shut down Route A-B temporarily', desc: 'Pause until fuel normalizes. Lose market share.', trap: false },
          { id: 'b', label: 'Switch A-B from trucks to trains', desc: 'Trains are fuel-efficient. €80K conversion cost.', trap: false },
          { id: 'c', label: 'Keep running at full capacity', desc: 'Absorb the cost. Fuel will go back down... right?', trap: true },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'b') return { passed: true, profit: 90000, heatDelta: 0, feedback: 'Switching to trains cut fuel costs 60%. You stayed profitable while competitors bled cash.', lesson: 'Fuel crises demand immediate vehicle optimization. Flexibility is worth paying for.' };
          if (choiceId === 'a') return { passed: true, profit: 10000, heatDelta: 0, feedback: 'You survived but lost market share. Competitors who adapted captured your customers.', lesson: 'Shutting down preserves cash but loses market position. Adapt, don\'t retreat.' };
          return { passed: false, profit: -120000, heatDelta: 0, feedback: 'You burned through €120K before fuel stabilized 3 months later. Nearly bankrupt.', lesson: 'NEVER absorb doubled costs hoping for recovery. Adapt immediately or die slowly.' };
        },
      },
      {
        briefing: 'Fuel stabilized at +30% above pre-crisis. Time to rebuild routes with new economics.',
        stats: { fuelLevel: '+30% above normal' },
        choices: [
          { id: 'a', label: 'Open Route C-D (300km, high demand)', desc: '€180K setup. Revenue €10/t. Use fuel-efficient fleet.', trap: false },
          { id: 'b', label: 'Reopen all old routes at old capacity', desc: 'Back to normal. Pre-crisis fleet composition.', trap: true },
          { id: 'c', label: 'Focus on short urban routes only', desc: 'Fuel costs matter less on short routes.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: true, profit: 130000, feedback: 'New route with fuel-efficient fleet: adapted to the new reality. Strong profits.', lesson: 'After a crisis, don\'t go back to the old playbook. Build for the new normal.' };
          if (choiceId === 'c') return { passed: true, profit: 80000, feedback: 'Urban routes insulated from fuel costs. Smart defensive play.', lesson: 'Playing to your strengths (low fuel impact) is a valid strategy in uncertain markets.' };
          return { passed: false, profit: -50000, feedback: 'Old fleet at +30% fuel = thin margins everywhere. You didn\'t learn from the crisis.', lesson: 'The world changed. Your strategy must change with it.' };
        },
      },
      {
        briefing: 'New technology: electric vehicles. 3x upfront cost but zero fuel. Worth the investment?',
        stats: {},
        choices: [
          { id: 'a', label: 'Convert short routes to EV', desc: '€150K. Zero fuel costs on urban routes.', trap: false },
          { id: 'b', label: 'Convert ALL routes to EV', desc: '€500K. Zero fuel everywhere!', trap: true },
          { id: 'c', label: 'Wait for prices to drop', desc: 'EV costs will decrease in 2 years.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: true, profit: 160000, feedback: 'EVs on short routes: perfect match. Low range needed, zero fuel, fast payback.', lesson: 'New tech works best where it fits naturally. EVs + short routes = instant ROI.' };
          if (choiceId === 'b') return { passed: false, profit: -80000, feedback: 'EV range can\'t handle your 400km routes reliably. Deliveries failed. Customer trust destroyed.', lesson: 'Don\'t force new technology where it doesn\'t fit. Match capabilities to requirements.' };
          return { passed: true, profit: 40000, feedback: 'Waiting saved capex but competitors who adopted early got market advantages.', lesson: 'Early adoption of well-matched tech pays off. Waiting has an opportunity cost.' };
        },
      },
      {
        briefing: 'Final optimization. Your network is mature. One route is breaking even, one is highly profitable, one is new.',
        stats: {},
        choices: [
          { id: 'a', label: 'Double down on the profitable route', desc: 'Increase capacity 2x on your best performer.', trap: false },
          { id: 'b', label: 'Fix the break-even route', desc: 'Invest €60K to optimize the underperformer.', trap: false },
          { id: 'c', label: 'Open a 4th route', desc: 'More routes = more revenue!', trap: true },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: true, profit: 200000, feedback: 'Doubling capacity on a proven route is the lowest-risk way to grow. Excellent.', lesson: 'Scale what works. Your best route is your best investment. Concentration beats diversification here.' };
          if (choiceId === 'b') return { passed: true, profit: 80000, feedback: 'Route optimization turned break-even into +€30K/mo. Good but the profitable route had more upside.', lesson: 'Fixing underperformers has a ceiling. Scaling winners has no ceiling.' };
          return { passed: false, profit: -70000, feedback: 'Spreading thin across 4 routes means none get enough attention. Quality dropped everywhere.', lesson: 'Management bandwidth is finite. Better to run 3 great routes than 4 mediocre ones.' };
        },
      },
    ],
  },

  // ── DRILL 4: Market Crash Survival ──────────────────────────────────────────
  {
    id: 'market-crash-survival',
    name: 'Market Crash Survival',
    category: 'CRISIS',
    description: 'Navigate market downturns without losing your empire.',
    maxRounds: 7,
    startBalance: 1000000,
    startHeat: 15,
    rounds: [
      {
        briefing: 'Your portfolio is worth €1M. Markets are at all-time highs. Analysts are euphoric. What\'s your move?',
        stats: { portfolioValue: '€1M', marketSentiment: 'Euphoric' },
        choices: [
          { id: 'a', label: 'Go all-in — buy more assets', desc: 'Markets only go up! Invest remaining cash.', trap: true },
          { id: 'b', label: 'Take profits — sell 20% to cash', desc: 'Lock in gains. Build a war chest.', trap: false },
          { id: 'c', label: 'Hold current positions', desc: 'Don\'t sell winners. Don\'t buy at highs.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: false, profit: -180000, feedback: 'You bought at the top. A 30% correction hit next quarter. No cash to survive.', lesson: 'When everyone is euphoric, it\'s time to build cash reserves. Tops are made of optimism.' };
          if (choiceId === 'b') return { passed: true, profit: 100000, feedback: 'You sold 20% near the top. When the crash came, you had €200K cash ready to deploy.', lesson: 'Taking profits at highs is discipline, not fear. Cash is a position — and it\'s the best one before a crash.' };
          return { passed: true, profit: 30000, feedback: 'Holding is OK but you missed the chance to build reserves.', lesson: 'Holding is neutral. The smart money was building cash for the opportunity ahead.' };
        },
      },
      {
        briefing: 'CRASH: Markets drop 25% in one week. Your portfolio is down €250K. Panic is everywhere.',
        stats: { drawdown: '-25%', cashReserve: 'varies' },
        choices: [
          { id: 'a', label: 'Panic sell everything', desc: 'Get out before it drops more!', trap: true },
          { id: 'b', label: 'Hold and do nothing', desc: 'Ride it out. Don\'t look at the screen.', trap: false },
          { id: 'c', label: 'Buy more with cash reserves', desc: 'Blood in the streets = opportunity.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: false, profit: -250000, feedback: 'You sold at the bottom. Classic retail mistake. Markets recovered 60% of the drop within 3 months.', lesson: 'Panic selling locks in losses permanently. The crash is temporary; selling makes it permanent.' };
          if (choiceId === 'c') return { passed: true, profit: 180000, feedback: 'You bought quality assets at -25%. When markets recovered, those purchases were up 35%.', lesson: 'Crashes are the best buying opportunities if you have cash reserves. "Be greedy when others are fearful."' };
          return { passed: true, profit: 50000, feedback: 'Holding preserved your capital. Markets partially recovered. But you missed the buying opportunity.', lesson: 'Holding beats selling in a crash, but buying beats holding. You need cash reserves to capitalize.' };
        },
      },
      {
        briefing: 'Markets bounce 15% from the bottom. Relief rally or real recovery? Your cash is limited.',
        stats: { bounce: '+15% from lows' },
        choices: [
          { id: 'a', label: 'Deploy remaining cash now', desc: 'The bottom is in! Go all-in on the recovery.', trap: false },
          { id: 'b', label: 'Deploy 50% of cash', desc: 'Hedge your bets. Keep some powder dry.', trap: false },
          { id: 'c', label: 'Wait for new lows', desc: 'This is a dead cat bounce. It\'ll drop again.', trap: true },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'b') return { passed: true, profit: 120000, feedback: 'Deploying 50% caught the recovery while keeping reserves. Optimal risk management.', lesson: 'Dollar-cost averaging into a recovery is the professional play. Never go all-in, never stay all-out.' };
          if (choiceId === 'a') return { passed: true, profit: 150000, feedback: 'This time it worked — but only because the recovery was real. This is a risky strategy.', lesson: 'Going all-in on a bounce is gambling. It worked this time, but keep reserves for the next drop.' };
          return { passed: false, profit: -30000, feedback: 'Markets continued up 25% while you waited. The new lows never came. You missed the recovery.', lesson: 'Don\'t wait for perfection. Trying to time the exact bottom is a fool\'s errand.' };
        },
      },
      // CURVEBALL: double-dip
      {
        briefing: 'SECOND CRASH: Just when everyone thought it was over, markets drop another 20%. Double-dip recession confirmed.',
        stats: { drawdown: '-20% again', sentiment: 'Despair' },
        choices: [
          { id: 'a', label: 'Sell everything — this time it\'s different', desc: 'Two crashes means it\'s the end.', trap: true },
          { id: 'b', label: 'Hold but don\'t buy', desc: 'Preserve what\'s left. No more risk.', trap: false },
          { id: 'c', label: 'Buy selectively — only strongest assets', desc: 'Cherry-pick the best at maximum discount.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'c') return { passed: true, profit: 200000, feedback: 'Buying quality at maximum despair = maximum returns. The second crash was the better buying opportunity.', lesson: 'Double-dips test your conviction. Those who buy quality during maximum fear earn the maximum returns.' };
          if (choiceId === 'b') return { passed: true, profit: 30000, feedback: 'Holding preserved capital but you missed the deepest discount of the cycle.', lesson: 'Emotional preservation is valid, but financial preservation means buying when you\'re most scared.' };
          return { passed: false, profit: -200000, feedback: 'You sold at the second bottom. Markets recovered fully within 12 months. You locked in maximum loss.', lesson: 'The second crash feels like the end of the world. It never is. Selling at despair is the worst possible trade.' };
        },
      },
      {
        briefing: 'Markets are recovering slowly. Your portfolio is rebuilding. How do you manage risk going forward?',
        stats: {},
        choices: [
          { id: 'a', label: 'Build a 6-month cash reserve', desc: 'Keep €180K liquid for the next crash.', trap: false },
          { id: 'b', label: 'Invest everything for maximum growth', desc: 'Make up lost ground aggressively.', trap: true },
          { id: 'c', label: 'Diversify across 5 sectors', desc: 'Spread risk. Never be concentrated again.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: true, profit: 100000, feedback: 'Cash reserves in place. When the next opportunity comes, you\'re ready. Income lower but survival guaranteed.', lesson: 'The #1 lesson of any crash: ALWAYS maintain cash reserves. The best opportunities come when everyone is broke.' };
          if (choiceId === 'c') return { passed: true, profit: 80000, feedback: 'Diversification reduced volatility by 40%. Slower growth but smoother ride.', lesson: 'Diversification won\'t prevent crashes but it reduces the damage. Survive first, grow second.' };
          return { passed: false, profit: -60000, feedback: 'Aggressive recovery investing hit another minor correction. Without reserves, you were forced to sell at a loss again.', lesson: 'Trying to make up losses aggressively usually creates more losses. Rebuild with discipline.' };
        },
      },
      {
        briefing: 'A year after the crash. Markets are 10% below pre-crash highs. Sentiment is cautious. Your empire is stable.',
        stats: {},
        choices: [
          { id: 'a', label: 'Steady expansion with reserves', desc: 'Grow 10%/quarter. Keep 3 months cash.', trap: false },
          { id: 'b', label: 'Aggressive expansion — this is the bottom!', desc: 'Markets always recover past the old high.', trap: true },
          { id: 'c', label: 'Fortress mode — max cash, min risk', desc: 'Stay defensive. Another crash could come.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: true, profit: 150000, feedback: 'Disciplined growth with reserves. You surpassed your pre-crash portfolio value within 6 months.', lesson: 'Post-crash growth should be steady and protected. This is the golden strategy.' };
          if (choiceId === 'b') return { passed: false, profit: -40000, feedback: 'A minor correction hit your overleveraged portfolio. Without reserves, you\'re back to damage control.', lesson: 'Aggressive post-crash behavior shows you didn\'t learn from the crash.' };
          return { passed: true, profit: 50000, feedback: 'Ultra-safe but you missed growth. Markets climbed 20% while you stayed in cash.', lesson: 'Being TOO conservative after a crash has its own cost — opportunity cost.' };
        },
      },
      {
        briefing: 'Final test. Markets hit a new all-time high. You\'ve been through the cycle. What\'s your permanent strategy?',
        stats: {},
        choices: [
          { id: 'a', label: '70% invested / 30% cash reserves — always', desc: 'Permanent allocation. Never deviate.', trap: false },
          { id: 'b', label: '100% invested at all times', desc: 'Cash drag kills returns long-term.', trap: true },
          { id: 'c', label: 'Dynamic: 50-80% invested based on heat/sentiment', desc: 'Adjust allocation based on market conditions.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'c') return { passed: true, profit: 220000, feedback: 'Dynamic allocation is the master strategy. Reduce exposure when heat is high, increase when fear dominates.', lesson: 'The ultimate crash survival skill: adjust your allocation to the environment. Rigid strategies break; adaptive ones thrive.' };
          if (choiceId === 'a') return { passed: true, profit: 140000, feedback: '70/30 is a strong permanent strategy. Simple and effective.', lesson: '70/30 works. It\'s not optimal but it\'s bulletproof. Sometimes simple is best.' };
          return { passed: false, profit: -100000, feedback: 'History repeats. 100% invested means 100% exposed when the next crash comes.', lesson: 'If you went through an entire crash drill and still picked 100% invested, the crash taught you nothing.' };
        },
      },
    ],
  },

  // ── DRILL 5: Corporate Tax Optimization ─────────────────────────────────────
  {
    id: 'corporate-tax-optimization',
    name: 'Corporate Tax Optimization',
    category: 'STRATEGY',
    description: 'Structure your empire to minimize the tax burden legally.',
    maxRounds: 7,
    startBalance: 750000,
    startHeat: 5,
    rounds: [
      {
        briefing: 'Your empire earns €100K/mo. As an unincorporated operator, you pay 30% tax on everything above €10K net worth. That\'s €27K/mo in taxes.',
        stats: { income: '€100K/mo', taxRate: '30%', taxBill: '€27K/mo' },
        choices: [
          { id: 'a', label: 'Just pay the taxes', desc: 'It\'s the cost of doing business. Keep things simple.', trap: true },
          { id: 'b', label: 'Incorporate as a basic LLC', desc: '€50K cost. Reduces tax rate to 20%.', trap: false },
          { id: 'c', label: 'Incorporate as a holding company', desc: '€150K cost. Reduces tax rate to 12%.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: false, profit: -80000, feedback: 'You paid €27K/mo × 6 months = €162K in taxes. An LLC would have saved €54K of that.', lesson: 'Ignoring incorporation is like burning money. At €100K/mo income, the 30% rate is devastating.' };
          if (choiceId === 'c') return { passed: true, profit: 130000, feedback: 'Holding company costs €150K but saves €18K/mo (30% → 12%). Payback in 8.3 months. Long-term: massive savings.', lesson: 'The most expensive structure pays for itself fastest when income is high. Think in payback periods.' };
          return { passed: true, profit: 80000, feedback: 'LLC saves €10K/mo (30% → 20%). Payback in 5 months. Good but the holding company was better long-term.', lesson: 'LLC is the minimum viable incorporation. Always incorporate, but consider whether a higher structure pays off faster.' };
        },
      },
      {
        briefing: 'Your empire grows to €200K/mo income. Your current structure\'s tax rate is applied to a much larger base. Time to review.',
        stats: { income: '€200K/mo' },
        choices: [
          { id: 'a', label: 'Stay with current structure', desc: 'Already incorporated. Good enough.', trap: false },
          { id: 'b', label: 'Upgrade to next structure tier', desc: 'Higher cost but lower rate.', trap: false },
          { id: 'c', label: 'Create multiple entities', desc: 'Split income across 3 entities. €100K setup.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'c') return { passed: true, profit: 160000, feedback: 'Multiple entities keep each below higher tax brackets. Combined savings: €25K/mo.', lesson: 'Multi-entity structures are the professional approach. Each entity optimizes its own bracket.' };
          if (choiceId === 'b') return { passed: true, profit: 120000, feedback: 'Upgraded structure reduces rate further. Solid incremental improvement.', lesson: 'As income grows, your structure should grow with it. Review structure at every income milestone.' };
          return { passed: true, profit: 60000, feedback: 'Current structure still works but you\'re leaving money on the table at this income level.', lesson: 'Good enough today is expensive tomorrow. Revisit structure whenever income doubles.' };
        },
      },
      {
        briefing: 'Your accountant suggests reinvesting profits to reduce taxable income. Options for €100K reinvestment:',
        stats: {},
        choices: [
          { id: 'a', label: 'Buy new nodes (capital expenditure)', desc: '€100K into income-generating assets. Deductible.', trap: false },
          { id: 'b', label: 'Buy luxury items for "business use"', desc: '€100K on a company yacht. "Client entertainment."', trap: true },
          { id: 'c', label: 'R&D investment', desc: '€100K into research. 150% tax deduction in some jurisdictions.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'c') return { passed: true, profit: 140000, feedback: 'R&D gets 150% deduction: €100K spend = €150K deduction. Plus, the research generates future income.', lesson: 'R&D tax credits are the most powerful legal tax reduction. Invest in innovation for double benefits.' };
          if (choiceId === 'a') return { passed: true, profit: 100000, feedback: 'New nodes: tax deduction + income generation. The basic but reliable strategy.', lesson: 'Capex is always deductible and always generates returns. The foundational tax strategy.' };
          return { passed: false, profit: -70000, feedback: 'Auditors flagged the yacht as personal use. Tax deduction denied. €20K penalty.', lesson: 'Aggressive personal deductions get flagged. Keep "business expenses" genuinely business-related.' };
        },
      },
      // CURVEBALL: regulation change
      {
        briefing: 'TAX REFORM: New regulation eliminates multi-entity loopholes. All entities consolidated for tax purposes. Your effective rate just jumped.',
        stats: { emergency: true },
        choices: [
          { id: 'a', label: 'Lobby against the reform', desc: '€80K lobbying cost. 40% chance of reversal.', trap: true },
          { id: 'b', label: 'Restructure to single optimized entity', desc: '€60K. Maximize deductions under new rules.', trap: false },
          { id: 'c', label: 'Relocate operations to tax-friendly zone', desc: '€120K. Lower base rate but operational disruption.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'b') return { passed: true, profit: 110000, feedback: 'Quick restructure adapted to new rules. Single entity with maximum legal deductions. Minimal disruption.', lesson: 'When tax laws change, adapt immediately. Fighting regulation is expensive and uncertain.' };
          if (choiceId === 'c') return { passed: true, profit: 80000, feedback: 'Relocation worked long-term but the transition cost 2 months of reduced income.', lesson: 'Relocation is powerful but slow. Only relocate if the tax savings justify the disruption.' };
          return { passed: false, profit: -90000, feedback: 'Lobbying failed. You spent €80K and the reform stayed. Meanwhile, adapted competitors gained advantage.', lesson: 'Lobbying against finalized reform is almost always a waste. Adapt to the rules, don\'t fight them.' };
        },
      },
      {
        briefing: 'Post-reform stability. Your restructured entity is operational. Now optimize ongoing operations.',
        stats: {},
        choices: [
          { id: 'a', label: 'Hire a tax strategist (€5K/mo)', desc: 'Ongoing optimization. Finds deductions you\'d miss.', trap: false },
          { id: 'b', label: 'Handle taxes yourself', desc: 'Save the €5K/mo. How hard can it be?', trap: true },
          { id: 'c', label: 'Use automated tax software', desc: '€1K/mo. Handles basics well.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: true, profit: 130000, feedback: 'Tax strategist found €20K/mo in missed deductions. Net benefit: €15K/mo after their fee.', lesson: 'Professional tax help pays for itself 3-4x over. At your income level, DIY tax is malpractice.' };
          if (choiceId === 'c') return { passed: true, profit: 70000, feedback: 'Software caught basic deductions. Saved €8K/mo. But a human strategist would find more.', lesson: 'Automation is good for basics. But complex structures need human expertise.' };
          return { passed: false, profit: -40000, feedback: 'You missed €15K/mo in deductions and made a filing error that triggered an audit.', lesson: 'DIY tax at scale is reckless. The cost of NOT having a professional always exceeds their fee.' };
        },
      },
      {
        briefing: 'Year-end planning. You can accelerate expenses or defer income to optimize this year\'s tax bill.',
        stats: {},
        choices: [
          { id: 'a', label: 'Accelerate €200K in planned purchases', desc: 'Buy equipment early. Big deduction this year.', trap: false },
          { id: 'b', label: 'Defer €150K income to next year', desc: 'Delay invoicing. Lower this year\'s taxable income.', trap: false },
          { id: 'c', label: 'Both — accelerate expenses AND defer income', desc: 'Maximum tax reduction this year.', trap: true },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: true, profit: 110000, feedback: 'Accelerated purchases: legitimate deduction + useful assets acquired. Clean strategy.', lesson: 'Accelerating real business expenses is the safest year-end optimization. You get the deduction AND the asset.' };
          if (choiceId === 'b') return { passed: true, profit: 80000, feedback: 'Deferred income reduced this year\'s bill. Next year\'s bill will be higher though.', lesson: 'Income deferral is legal but is borrowing from the future. Use it when this year\'s rate is unusually high.' };
          return { passed: false, profit: -60000, feedback: 'Both together triggered anti-avoidance rules. Flagged as aggressive tax planning. Audit commenced.', lesson: 'Each strategy alone is fine. Combined, they create a pattern that regulators flag as avoidance.' };
        },
      },
      {
        briefing: 'Final assessment. Your empire is large. A competitor proposes merging to create a tax-efficient mega-entity.',
        stats: {},
        choices: [
          { id: 'a', label: 'Merge — combined entity pays 8% effective rate', desc: 'Half your current rate. But you lose control.', trap: false },
          { id: 'b', label: 'Refuse — maintain independence', desc: 'Your 15% rate is fine. Control is priceless.', trap: false },
          { id: 'c', label: 'Counter-propose: acquire them outright', desc: 'Take their tax advantages AND maintain control.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'c') return { passed: true, profit: 200000, feedback: 'Acquisition captured their tax structure while maintaining your control. Best of both worlds.', lesson: 'The master play: don\'t merge, acquire. Tax advantages + full control = empire building.' };
          if (choiceId === 'a') return { passed: true, profit: 130000, feedback: 'Merger halved your tax rate. But you\'re now a minority shareholder in your own empire.', lesson: 'Tax savings mean nothing if you lose control. Always weigh autonomy against optimization.' };
          return { passed: true, profit: 80000, feedback: 'Independence preserved. Your tax rate is acceptable and you retained full strategic control.', lesson: 'Sometimes the best deal is no deal. Control of your empire is worth a higher tax rate.' };
        },
      },
    ],
  },

  // ── DRILL 6: The Monopoly Play ──────────────────────────────────────────────
  {
    id: 'the-monopoly-play',
    name: 'The Monopoly Play',
    category: 'STRATEGY',
    description: 'Achieve the 1.5x sector bonus by concentrating nodes.',
    maxRounds: 8,
    startBalance: 900000,
    startHeat: 10,
    rounds: [
      {
        briefing: 'You have €900K. Nodes available across 4 sectors. The MONOPOLY BONUS: owning 3+ nodes in one sector gives 1.5x income. Where do you invest?',
        stats: { monopolyThreshold: 3, bonus: '1.5x income' },
        choices: [
          { id: 'a', label: 'Buy 1 node in each of 3 sectors', desc: '€250K each. Diversify across Tech, Energy, Logistics.', trap: true },
          { id: 'b', label: 'Buy 3 nodes in Tech sector', desc: '€250K each = €750K. Triggers monopoly bonus!', trap: false },
          { id: 'c', label: 'Buy 2 Tech + 1 Energy', desc: '€250K each. Hedge your bets.', trap: true },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'b') return { passed: true, profit: 180000, feedback: '3 Tech nodes activated the 1.5x bonus! €75K/mo income instead of €50K/mo. That\'s €25K/mo free money.', lesson: 'The monopoly bonus (1.5x at 3 nodes) is the single most powerful income multiplier. Concentrate to activate it.' };
          if (choiceId === 'a') return { passed: false, profit: 30000, feedback: '3 sectors, 1 node each = no bonus anywhere. You earn €50K/mo. Concentrated play earns €75K/mo.', lesson: 'Diversification prevents the monopoly bonus. In AEGIS, concentration is strength, not risk.' };
          return { passed: false, profit: 50000, feedback: '2 Tech nodes: so close to the bonus but no cigar. That 3rd Tech node would have earned you €25K/mo more.', lesson: '2/3 is the most expensive position. Either commit to 3 or don\'t start. The bonus is all-or-nothing.' };
        },
      },
      {
        briefing: 'You have the Tech monopoly (3 nodes, 1.5x). A 4th Tech node is available AND an Energy node. Budget: €280K.',
        stats: { techNodes: 3, bonus: 'ACTIVE 1.5x' },
        choices: [
          { id: 'a', label: '4th Tech node', desc: '€280K. Deepens monopoly. Still 1.5x bonus.', trap: false },
          { id: 'b', label: '1st Energy node', desc: '€250K. Starts a new sector. No bonus yet.', trap: false },
          { id: 'c', label: 'Buy the cheapest option regardless of sector', desc: '€180K Retail node. Save cash.', trap: true },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: true, profit: 140000, feedback: '4th Tech node at 1.5x = €37.5K/mo (vs €25K unbonused). Deepening a monopoly is pure value.', lesson: 'Every additional node in a monopoly sector earns 50% more. Deepen before diversifying.' };
          if (choiceId === 'b') return { passed: true, profit: 70000, feedback: 'Energy node earns base income. You\'re 2 nodes away from a second monopoly bonus.', lesson: 'Starting a second sector is valid once your first monopoly is secure. Plan the path to 3.' };
          return { passed: false, profit: 20000, feedback: 'Cheap Retail node earns base income in an isolated sector. No path to monopoly.', lesson: 'Cheap nodes in random sectors are traps. Every purchase should advance a monopoly strategy.' };
        },
      },
      {
        briefing: 'Good momentum with Tech. Energy sector nodes are going on sale. You have €500K.',
        stats: { techNodes: 4, energyNodes: 0 },
        choices: [
          { id: 'a', label: 'Buy 3 Energy nodes at €150K each', desc: '€450K. Instant second monopoly!', trap: false },
          { id: 'b', label: 'Buy 1 Energy + 1 more Tech', desc: '€300K. Mixed approach.', trap: true },
          { id: 'c', label: 'Buy 2 Energy nodes', desc: '€300K. Start the path. Save cash.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: true, profit: 200000, feedback: 'Double monopoly! Tech (1.5x) + Energy (1.5x). Your income is now 1.5x across all 7 nodes.', lesson: 'When you can leap to a second monopoly in one move, take it. Double monopoly is exponential power.' };
          if (choiceId === 'c') return { passed: true, profit: 80000, feedback: '2 Energy nodes puts you 1 away from the bonus. Smart if cash is tight.', lesson: 'If you can\'t afford 3, buying 2 and saving for the 3rd is better than scattering.' };
          return { passed: false, profit: 40000, feedback: '1 Energy + 1 Tech: the Tech is redundant (already monopolized) and Energy is 2 away from bonus.', lesson: 'Once a sector is monopolized, additional nodes there have diminishing value vs. building a second monopoly.' };
        },
      },
      // CURVEBALL: rival breaks your monopoly
      {
        briefing: 'HOSTILE TAKEOVER: A rival acquires one of your Tech nodes! You\'re down to 3 Tech. Monopoly barely held. They\'re eyeing another.',
        stats: { techNodes: 3, threat: 'HIGH', emergency: true },
        choices: [
          { id: 'a', label: 'Buy a replacement Tech node immediately', desc: '€300K (premium price due to urgency). Secure the monopoly.', trap: false },
          { id: 'b', label: 'Counter-attack: acquire rival\'s Energy node', desc: '€250K. Hit them where it hurts.', trap: true },
          { id: 'c', label: 'Fortify existing nodes (anti-takeover)', desc: '€100K. Makes remaining nodes 80% harder to acquire.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'c') return { passed: true, profit: 120000, feedback: 'Fortification saved your monopoly long-term. The rival couldn\'t take another node. Premium cost avoided.', lesson: 'Defense is cheaper than replacement. Anti-takeover protection preserves monopoly at a fraction of the cost.' };
          if (choiceId === 'a') return { passed: true, profit: 60000, feedback: 'Replacement secured but you paid a 20% premium. Monopoly safe though.', lesson: 'Emergency purchases are always expensive. Proactive defense is cheaper than reactive replacement.' };
          return { passed: false, profit: -100000, feedback: 'While you attacked their Energy, they took your 2nd Tech node. Monopoly broken. 1.5x bonus lost.', lesson: 'Defend your monopoly before attacking others. Losing a bonus is worse than not gaining one.' };
        },
      },
      {
        briefing: 'Monopolies secured and defended. Now a new sector opens: Biotech. Nodes are expensive but high-income.',
        stats: {},
        choices: [
          { id: 'a', label: 'Buy 3 Biotech nodes (€900K total)', desc: 'Instant third monopoly. Requires most of your cash.', trap: true },
          { id: 'b', label: 'Buy 1 Biotech node (€300K)', desc: 'Test the waters. Plan for monopoly over 3 rounds.', trap: false },
          { id: 'c', label: 'Ignore Biotech, deepen existing monopolies', desc: 'Add nodes to Tech and Energy.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'b') return { passed: true, profit: 110000, feedback: 'Test node in Biotech is profitable. You\'ll build to monopoly over time without risking cash reserves.', lesson: 'New sectors are opportunities but don\'t go all-in on day one. Test, validate, then commit to monopoly.' };
          if (choiceId === 'c') return { passed: true, profit: 90000, feedback: 'Deepening existing monopolies is safe value. But Biotech early movers will have an advantage.', lesson: 'Existing monopolies have diminishing returns per additional node. New monopolies have higher marginal value.' };
          return { passed: false, profit: -60000, feedback: 'Spending €900K left you with no reserves. A minor crisis forced you to sell a Biotech node at a loss.', lesson: 'Never spend ALL your cash on a monopoly play. Cash reserves protect your existing empire.' };
        },
      },
      {
        briefing: 'A sector-wide event: Tech regulation increases operating costs 20%. Your Tech monopoly is now less profitable.',
        stats: { techProfitDrop: '-20%' },
        choices: [
          { id: 'a', label: 'Sell Tech monopoly, pivot to Biotech', desc: 'Sell 3 Tech nodes. Buy 2 more Biotech.', trap: true },
          { id: 'b', label: 'Hold Tech, accept lower returns', desc: '1.5x bonus on reduced income is still better than no bonus.', trap: false },
          { id: 'c', label: 'Hold Tech + accelerate Biotech buildup', desc: 'Don\'t sell, just shift new investment focus.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'c') return { passed: true, profit: 150000, feedback: 'Held Tech (still profitable with bonus) while building Biotech. Triple monopoly incoming.', lesson: 'Never abandon a monopoly unless it\'s losing money. Reduced profit with 1.5x bonus still beats no bonus.' };
          if (choiceId === 'b') return { passed: true, profit: 80000, feedback: 'Tech monopoly at -20% still earns more than scattered nodes. Patience pays.', lesson: 'A weakened monopoly is still a monopoly. The 1.5x bonus makes even reduced income viable.' };
          return { passed: false, profit: -90000, feedback: 'Selling Tech destroyed the bonus. Buying 2 Biotech doesn\'t reach monopoly. You\'re in no-man\'s land.', lesson: 'Breaking a monopoly to chase a new one is almost always wrong. You lose the bonus before gaining the next.' };
        },
      },
      {
        briefing: 'Late game. You have 2 monopolies and 2 Biotech nodes. One more Biotech = triple monopoly. But a rival is also at 2 Biotech.',
        stats: { yourBiotech: 2, rivalBiotech: 2, lastBiotechNode: '1 remaining' },
        choices: [
          { id: 'a', label: 'Buy the last Biotech node at any price', desc: 'Bidding war. Will cost 2x normal. But: triple monopoly.', trap: false },
          { id: 'b', label: 'Let the rival have it', desc: 'Save money. Focus on other sectors.', trap: true },
          { id: 'c', label: 'Sabotage the rival\'s bid', desc: 'Costs €50K to delay their purchase by 1 round.', trap: false },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'a') return { passed: true, profit: 180000, feedback: 'Triple monopoly achieved! The 2x price pays for itself in 4 months via the 1.5x bonus.', lesson: 'When one node separates you from a monopoly, pay the premium. The bonus ROI dwarfs the overpayment.' };
          if (choiceId === 'c') return { passed: true, profit: 130000, feedback: 'Delay let you accumulate cash and buy next round at normal price. Clever tactical play.', lesson: 'If you can\'t afford the premium, buying time is the next best option.' };
          return { passed: false, profit: -40000, feedback: 'Rival got triple monopoly. Their 1.5x bonus makes them dominant. You\'re now behind permanently.', lesson: 'Letting a rival complete a monopoly is a strategic disaster. Block or beat them — never concede.' };
        },
      },
      {
        briefing: 'Final round. You control multiple monopolies. The endgame question: expand to a 4th sector or fortify?',
        stats: {},
        choices: [
          { id: 'a', label: 'Start a 4th monopoly (Manufacturing)', desc: '€600K for 3 nodes. Spread thin but maximum bonuses.', trap: false },
          { id: 'b', label: 'Fortify all 3 monopolies + build reserves', desc: '€300K on defense. €300K cash.', trap: false },
          { id: 'c', label: 'Sell weakest monopoly, double strongest', desc: 'Consolidate power in fewer, stronger sectors.', trap: true },
        ],
        evaluate: (choiceId) => {
          if (choiceId === 'b') return { passed: true, profit: 220000, feedback: 'Fortified monopolies are nearly untouchable. Cash reserves handle any crisis. Empire secured.', lesson: 'The endgame is defense. Once you have 3 monopolies, protecting them is worth more than adding a 4th.' };
          if (choiceId === 'a') return { passed: true, profit: 160000, feedback: '4th monopoly adds income but spreads your defense thin. One hostile takeover could cascade.', lesson: '4 monopolies is powerful but fragile. Only expand if you can also defend.' };
          return { passed: false, profit: -70000, feedback: 'Selling a monopoly destroyed the bonus. The "strongest" sector now has diminishing returns on extra nodes.', lesson: 'Never voluntarily break a monopoly. The 1.5x bonus on 3 nodes beats any premium on extra nodes in another sector.' };
        },
      },
    ],
  },
];

// ─── PERSISTENCE ──────────────────────────────────────────────────────────────

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch { /* silent */ }
}

// ─── DRILL REDUCER ────────────────────────────────────────────────────────────

const initialDrillState = (drill) => ({
  drillId: drill.id,
  round: 1,
  maxRounds: drill.maxRounds,
  phase: 'briefing',
  balance: drill.startBalance,
  score: 0,
  streak: 0,
  bestStreak: 0,
  roundHistory: [],
  heat: drill.startHeat,
  message: drill.rounds[0].briefing,
  choices: drill.rounds[0].choices,
  feedback: '',
  lesson: '',
  passed: null,
  lastProfit: 0,
  animClass: '',
});

function drillReducer(state, action) {
  switch (action.type) {
    case 'CHOOSE': {
      const drill = DRILLS.find((d) => d.id === state.drillId);
      const roundDef = drill.rounds[state.round - 1];
      const result = roundDef.evaluate(action.choiceId, state);
      const newBalance = state.balance + result.profit;
      const newStreak = result.passed ? state.streak + 1 : 0;
      const newBestStreak = Math.max(state.bestStreak, newStreak);
      const heatDelta = result.heatDelta || 0;
      return {
        ...state,
        phase: 'result',
        balance: newBalance,
        score: state.score + result.profit,
        streak: newStreak,
        bestStreak: newBestStreak,
        heat: Math.max(0, Math.min(100, state.heat + heatDelta)),
        feedback: result.feedback,
        lesson: result.lesson,
        passed: result.passed,
        lastProfit: result.profit,
        roundHistory: [
          ...state.roundHistory,
          { round: state.round, choice: action.choiceId, outcome: result.passed ? 'win' : 'loss', profit: result.profit, passed: result.passed },
        ],
        animClass: result.passed ? 'anim-win' : 'anim-loss',
      };
    }
    case 'NEXT_ROUND': {
      const drill = DRILLS.find((d) => d.id === state.drillId);
      const nextRound = state.round + 1;
      if (nextRound > state.maxRounds) {
        return { ...state, phase: 'complete', animClass: '' };
      }
      const nextDef = drill.rounds[nextRound - 1];
      return {
        ...state,
        round: nextRound,
        phase: 'briefing',
        message: nextDef.briefing,
        choices: nextDef.choices,
        feedback: '',
        lesson: '',
        passed: null,
        lastProfit: 0,
        animClass: '',
      };
    }
    case 'CLEAR_ANIM':
      return { ...state, animClass: '' };
    default:
      return state;
  }
}

// ─── FORMATTERS ───────────────────────────────────────────────────────────────

function fmtMoney(n) {
  if (n == null) return '€0';
  const abs = Math.abs(n);
  const prefix = n < 0 ? '-' : n > 0 ? '+' : '';
  if (abs >= 1000000) return `${prefix}€${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${prefix}€${(abs / 1000).toFixed(0)}K`;
  return `${prefix}€${abs}`;
}

function starRating(score, maxRounds) {
  const avgPerRound = score / maxRounds;
  if (avgPerRound >= 20000) return 3;
  if (avgPerRound >= 8000) return 2;
  if (avgPerRound > 0) return 1;
  return 0;
}

// ─── INLINE STYLES (glassmorphism, dark tactical theme) ───────────────────────

const S = {
  root: {
    background: COLORS.bg,
    minHeight: '100vh',
    color: COLORS.text,
    fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
    padding: '1.5rem',
  },
  card: {
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '12px',
    padding: '1.25rem',
    backdropFilter: 'blur(14px)',
    marginBottom: '1rem',
  },
  cardActive: {
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.borderActive}`,
    borderRadius: '12px',
    padding: '1.25rem',
    backdropFilter: 'blur(14px)',
    marginBottom: '1rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  backBtn: {
    background: 'transparent',
    border: `1px solid ${COLORS.border}`,
    color: COLORS.muted,
    padding: '0.4rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.85rem',
    transition: 'all 0.2s',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: COLORS.cyan,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: '0.85rem',
    marginTop: '0.25rem',
  },
  sectionLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: '0.75rem',
    paddingBottom: '0.4rem',
    borderBottom: `1px solid ${COLORS.border}`,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '1rem',
  },
  drillCard: (hovered) => ({
    ...S.card,
    cursor: 'pointer',
    transition: 'all 0.2s',
    transform: hovered ? 'translateY(-2px)' : 'none',
    borderColor: hovered ? COLORS.cyan : COLORS.border,
    boxShadow: hovered ? `0 0 20px ${COLORS.cyan}22` : 'none',
  }),
  catBadge: (color) => ({
    display: 'inline-block',
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color,
    border: `1px solid ${color}44`,
    borderRadius: '4px',
    padding: '0.15rem 0.5rem',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
  }),
  choiceBtn: (hovered) => ({
    background: hovered ? 'rgba(0, 229, 255, 0.08)' : 'rgba(14, 20, 32, 0.6)',
    border: `1px solid ${hovered ? COLORS.cyan : COLORS.border}`,
    borderRadius: '10px',
    padding: '1rem 1.25rem',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    color: COLORS.text,
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    transition: 'all 0.15s',
    marginBottom: '0.5rem',
  }),
  statBox: {
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '80px',
  },
  statValue: (color) => ({
    fontSize: '1.3rem',
    fontWeight: 700,
    color: color || COLORS.text,
  }),
  statLabel: {
    fontSize: '0.65rem',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginTop: '0.15rem',
  },
  resultBox: (passed) => ({
    background: passed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
    border: `1px solid ${passed ? COLORS.green + '44' : COLORS.red + '44'}`,
    borderRadius: '10px',
    padding: '1.25rem',
    marginBottom: '1rem',
  }),
  lessonBox: {
    background: 'rgba(245, 158, 11, 0.08)',
    border: `1px solid ${COLORS.amber}44`,
    borderRadius: '8px',
    padding: '1rem',
    marginTop: '0.75rem',
    fontSize: '0.85rem',
    lineHeight: 1.5,
  },
  historyRow: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  historyItem: (passed) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    fontSize: '0.8rem',
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
    background: passed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
    color: passed ? COLORS.green : COLORS.red,
    fontWeight: 600,
  }),
  nextBtn: {
    background: `linear-gradient(135deg, ${COLORS.cyan}22, ${COLORS.cyan}11)`,
    border: `1px solid ${COLORS.cyan}66`,
    color: COLORS.cyan,
    padding: '0.6rem 2rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    fontWeight: 600,
    marginTop: '1rem',
    transition: 'all 0.2s',
  },
  starContainer: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'center',
    margin: '1rem 0',
  },
  star: (filled) => ({
    fontSize: '2rem',
    color: filled ? COLORS.amber : COLORS.muted + '44',
    transition: 'color 0.3s',
  }),
  completionCard: {
    ...{
      background: COLORS.bgCard,
      border: `1px solid ${COLORS.borderActive}`,
      borderRadius: '12px',
      padding: '2rem',
      backdropFilter: 'blur(14px)',
      textAlign: 'center',
      maxWidth: '500px',
      margin: '2rem auto',
    },
  },
};

// ─── ANIMATION KEYFRAMES (injected once) ──────────────────────────────────────

const KEYFRAMES_ID = 'tc-keyframes';
function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes tc-flash-green {
      0% { box-shadow: 0 0 0px ${COLORS.green}; }
      30% { box-shadow: 0 0 30px ${COLORS.green}88; }
      100% { box-shadow: 0 0 0px ${COLORS.green}00; }
    }
    @keyframes tc-shake-red {
      0%, 100% { transform: translateX(0); }
      10% { transform: translateX(-6px); }
      20% { transform: translateX(6px); }
      30% { transform: translateX(-4px); }
      40% { transform: translateX(4px); }
      50% { transform: translateX(-2px); }
      60% { transform: translateX(2px); }
    }
    @keyframes tc-pulse-streak {
      0% { transform: scale(1); }
      50% { transform: scale(1.15); }
      100% { transform: scale(1); }
    }
    .anim-win { animation: tc-flash-green 0.6s ease-out; }
    .anim-loss { animation: tc-shake-red 0.5s ease-out; }
    .anim-streak { animation: tc-pulse-streak 0.4s ease-out; }
  `;
  document.head.appendChild(style);
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function DrillSelectionGrid({ onSelect, progress }) {
  const [hoveredId, setHoveredId] = useState(null);
  const grouped = {};
  DRILLS.forEach((d) => {
    if (!grouped[d.category]) grouped[d.category] = [];
    grouped[d.category].push(d);
  });

  return (
    <div>
      {Object.entries(grouped).map(([cat, drills]) => {
        const catInfo = CATEGORIES[cat] || { label: cat, color: COLORS.muted };
        return (
          <div key={cat} style={{ marginBottom: '2rem' }}>
            <div style={{ ...S.sectionLabel, color: catInfo.color, borderColor: catInfo.color + '33' }}>
              {catInfo.label}
            </div>
            <div style={S.grid}>
              {drills.map((d) => {
                const p = progress[d.id];
                const best = p ? p.bestScore : null;
                const stars = best != null ? starRating(best, d.maxRounds) : null;
                const isHovered = hoveredId === d.id;
                return (
                  <div
                    key={d.id}
                    style={S.drillCard(isHovered)}
                    onClick={() => onSelect(d)}
                    onMouseEnter={() => setHoveredId(d.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onSelect(d)}
                  >
                    <div style={S.catBadge(catInfo.color)}>{catInfo.label}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem' }}>{d.name}</div>
                    <div style={{ fontSize: '0.8rem', color: COLORS.muted, marginBottom: '0.75rem', lineHeight: 1.4 }}>
                      {d.description}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                      <span style={{ color: COLORS.muted }}>{d.maxRounds} rounds</span>
                      {stars != null ? (
                        <span>
                          {[1, 2, 3].map((s) => (
                            <span key={s} style={{ color: s <= stars ? COLORS.amber : COLORS.muted + '44' }}>
                              {'\u2605'}
                            </span>
                          ))}
                          {' '}
                          <span style={{ color: COLORS.muted }}>Best: {fmtMoney(best)}</span>
                        </span>
                      ) : (
                        <span style={{ color: COLORS.muted, fontStyle: 'italic' }}>Not started</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatsBar({ state }) {
  const heatColor = state.heat > 60 ? COLORS.red : state.heat > 35 ? COLORS.amber : COLORS.green;
  return (
    <div style={S.card}>
      <div style={S.statBox}>
        <div style={S.stat}>
          <div style={S.statValue(COLORS.cyan)}>{fmtMoney(state.balance).replace('+', '')}</div>
          <div style={S.statLabel}>Balance</div>
        </div>
        <div style={S.stat}>
          <div style={S.statValue(heatColor)}>{state.heat}</div>
          <div style={S.statLabel}>Heat</div>
        </div>
        <div style={S.stat}>
          <div className={state.streak >= 2 ? 'anim-streak' : ''} style={S.statValue(state.streak >= 2 ? COLORS.amber : COLORS.text)}>
            {state.streak}
          </div>
          <div style={S.statLabel}>Streak</div>
        </div>
        <div style={S.stat}>
          <div style={S.statValue(state.score >= 0 ? COLORS.green : COLORS.red)}>{fmtMoney(state.score)}</div>
          <div style={S.statLabel}>Score</div>
        </div>
      </div>
    </div>
  );
}

function ChoicePanel({ choices, onChoose, disabled }) {
  const [hoveredId, setHoveredId] = useState(null);
  return (
    <div style={S.card}>
      <div style={{ ...S.sectionLabel, color: COLORS.cyan }}>CHOOSE YOUR ACTION</div>
      {choices.map((c) => (
        <button
          key={c.id}
          style={S.choiceBtn(hoveredId === c.id)}
          onClick={() => !disabled && onChoose(c.id)}
          onMouseEnter={() => setHoveredId(c.id)}
          onMouseLeave={() => setHoveredId(null)}
          disabled={disabled}
        >
          <div style={{ fontWeight: 700, marginBottom: '0.3rem', color: COLORS.text }}>{c.label}</div>
          <div style={{ fontSize: '0.8rem', color: COLORS.muted, lineHeight: 1.4 }}>{c.desc}</div>
        </button>
      ))}
    </div>
  );
}

function ResultPanel({ passed, feedback, lesson, profit, onNext, isLastRound }) {
  return (
    <div className={passed ? 'anim-win' : 'anim-loss'}>
      <div style={S.resultBox(passed)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>{passed ? '\u2713' : '\u2717'}</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: passed ? COLORS.green : COLORS.red }}>
            {passed ? 'SUCCESS' : 'FAILURE'} {fmtMoney(profit)}
          </span>
        </div>
        <div style={{ fontSize: '0.9rem', lineHeight: 1.5, color: COLORS.text }}>{feedback}</div>
        <div style={S.lessonBox}>
          <div style={{ fontWeight: 700, color: COLORS.amber, marginBottom: '0.3rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            KEY LESSON
          </div>
          {lesson}
        </div>
        <div style={{ textAlign: 'right' }}>
          <button style={S.nextBtn} onClick={onNext}>
            {isLastRound ? 'VIEW RESULTS' : 'NEXT ROUND \u2192'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoundHistory({ history }) {
  if (history.length === 0) return null;
  return (
    <div style={S.card}>
      <div style={{ ...S.sectionLabel, color: COLORS.muted }}>ROUND HISTORY</div>
      <div style={S.historyRow}>
        {history.map((h) => (
          <div key={h.round} style={S.historyItem(h.passed)}>
            R{h.round}: {h.passed ? '\u2713' : '\u2717'} {fmtMoney(h.profit)}
          </div>
        ))}
      </div>
    </div>
  );
}

function CompletionScreen({ state, drill, onBack, onRetry }) {
  const stars = starRating(state.score, state.maxRounds);
  const wins = state.roundHistory.filter((r) => r.passed).length;
  return (
    <div style={S.completionCard}>
      <div style={{ fontSize: '0.75rem', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
        DRILL COMPLETE
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: COLORS.cyan, marginBottom: '0.25rem' }}>{drill.name}</div>
      <div style={S.starContainer}>
        {[1, 2, 3].map((s) => (
          <span key={s} style={S.star(s <= stars)}>{'\u2605'}</span>
        ))}
      </div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: state.score >= 0 ? COLORS.green : COLORS.red }}>
          Final Score: {fmtMoney(state.score)}
        </div>
        <div style={{ fontSize: '0.85rem', color: COLORS.muted, marginTop: '0.3rem' }}>
          {wins}/{state.maxRounds} rounds won &middot; Best streak: {state.bestStreak}
        </div>
        <div style={{ fontSize: '0.85rem', color: COLORS.muted, marginTop: '0.15rem' }}>
          Final balance: {fmtMoney(state.balance).replace('+', '')}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
        <button style={{ ...S.backBtn, borderColor: COLORS.cyan + '44', color: COLORS.cyan }} onClick={onRetry}>
          RETRY DRILL
        </button>
        <button style={S.backBtn} onClick={onBack}>
          BACK TO CAMP
        </button>
      </div>
    </div>
  );
}

// ─── ACTIVE DRILL VIEW ───────────────────────────────────────────────────────

function ActiveDrill({ drill, onBack, onComplete }) {
  const [state, dispatch] = useReducer(drillReducer, drill, initialDrillState);

  useEffect(() => {
    if (state.animClass) {
      const t = setTimeout(() => dispatch({ type: 'CLEAR_ANIM' }), 700);
      return () => clearTimeout(t);
    }
  }, [state.animClass]);

  const handleChoose = useCallback((choiceId) => {
    dispatch({ type: 'CHOOSE', choiceId });
  }, []);

  const handleNext = useCallback(() => {
    dispatch({ type: 'NEXT_ROUND' });
  }, []);

  const handleRetry = useCallback(() => {
    dispatch({ type: 'INIT' }); // will fall through to default which is a no-op — re-init via parent
    onComplete(state, true);
  }, [state, onComplete]);

  if (state.phase === 'complete') {
    return (
      <CompletionScreen
        state={state}
        drill={drill}
        onBack={() => onComplete(state, false)}
        onRetry={() => onComplete(state, true)}
      />
    );
  }

  const catInfo = CATEGORIES[drill.category] || { label: drill.category, color: COLORS.muted };

  return (
    <div>
      {/* Header */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>{'\u2190'} BACK TO CAMP</button>
        <div style={{ textAlign: 'center' }}>
          <div style={S.catBadge(catInfo.color)}>{catInfo.label}</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: COLORS.text }}>{drill.name}</div>
        </div>
        <div style={{ fontSize: '0.85rem', color: COLORS.muted, fontWeight: 600 }}>
          Round <span style={{ color: COLORS.cyan }}>{state.round}</span>/{state.maxRounds}
        </div>
      </div>

      {/* Briefing */}
      {(state.phase === 'briefing' || state.phase === 'action') && (
        <div style={S.cardActive}>
          <div style={{ ...S.sectionLabel, color: COLORS.amber }}>SITUATION BRIEFING</div>
          <div style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>{state.message}</div>
        </div>
      )}

      {/* Stats */}
      <StatsBar state={state} />

      {/* Choices (briefing phase) */}
      {state.phase === 'briefing' && (
        <ChoicePanel choices={state.choices} onChoose={handleChoose} disabled={false} />
      )}

      {/* Result (result phase) */}
      {state.phase === 'result' && (
        <ResultPanel
          passed={state.passed}
          feedback={state.feedback}
          lesson={state.lesson}
          profit={state.lastProfit}
          onNext={handleNext}
          isLastRound={state.round >= state.maxRounds}
        />
      )}

      {/* History */}
      <RoundHistory history={state.roundHistory} />
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function TrainingCamp({ onBack }) {
  const [activeDrill, setActiveDrill] = useState(null);
  const [progress, setProgress] = useState(loadProgress);

  useEffect(() => {
    ensureKeyframes();
  }, []);

  const handleSelect = useCallback((drill) => {
    setActiveDrill(drill);
  }, []);

  const handleDrillBack = useCallback(() => {
    setActiveDrill(null);
  }, []);

  const handleDrillComplete = useCallback((finalState, retry) => {
    // Save best score
    const prev = progress[finalState.drillId];
    const prevBest = prev ? prev.bestScore : -Infinity;
    const newBest = Math.max(prevBest, finalState.score);
    const updated = {
      ...progress,
      [finalState.drillId]: {
        bestScore: newBest,
        bestStreak: Math.max(prev?.bestStreak || 0, finalState.bestStreak),
        completions: (prev?.completions || 0) + (retry ? 0 : 1),
        lastPlayed: Date.now(),
      },
    };
    setProgress(updated);
    saveProgress(updated);

    if (retry) {
      // Force remount by toggling null then setting drill again
      const drill = DRILLS.find((d) => d.id === finalState.drillId);
      setActiveDrill(null);
      setTimeout(() => setActiveDrill(drill), 0);
    } else {
      setActiveDrill(null);
    }
  }, [progress]);

  return (
    <div className="relative" style={{ ...S.root, background: 'transparent' }}>
      {/* Subtle ritual atmosphere \u2014 same world as the onboarding ritual,
          turned down so the drill grid stays the focus. */}
      <RitualBackdrop density="subtle" />
      <div className="relative z-10">
        {activeDrill ? (
          <ActiveDrill
            key={activeDrill.id + '-' + (progress[activeDrill.id]?.completions || 0)}
            drill={activeDrill}
            onBack={handleDrillBack}
            onComplete={handleDrillComplete}
          />
        ) : (
          <>
            <div style={S.header}>
              {onBack && (
                <button style={S.backBtn} onClick={onBack}>{'\u2190'} BACK</button>
              )}
              <div>
                <div style={S.title}>TRAINING CAMP</div>
                <div style={{ ...S.subtitle, fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: 'italic', fontSize: '1rem' }}>
                  Master the game through hands-on drills. Fail, learn, and dominate.
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: COLORS.muted }}>
                {Object.keys(progress).length}/{DRILLS.length} completed
              </div>
            </div>
            <DrillSelectionGrid onSelect={handleSelect} progress={progress} />
          </>
        )}
      </div>
    </div>
  );
}
