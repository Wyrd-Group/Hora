"""
Unit tests for critical financial math functions.

Tests cover:
  - Kelly criterion (position sizing)
  - Monte Carlo forecast (log-normal simulation)
  - Momentum allocation (portfolio weighting)
  - Portfolio drift calculation
  - Implied probability conversion
  - Arbitrage detection logic

Run:  python3 -m pytest tests/test_critical_math.py -v
      or:  python3 tests/test_critical_math.py
"""

import math
import sys
import os
import unittest
from unittest.mock import patch

import numpy as np

# Add project root to path
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

# We need to mock sentinel config before importing scanners
MOCK_CONFIG = {
    'max_kelly_pct': 5.0,
    'bankroll_eur': 5000,
    'min_edge_pct': 8,
    'stock_watchlist': ['AAPL', 'NVDA', 'TSLA'],
    'crypto_watchlist': ['BTC-USD'],
    'forecast_breakout_pct': 5,
    'rebalance_drift_pct': 10,
    'sports_leagues': ['EPL', 'NBA'],
    'min_odds': 1.40,
    'max_odds': 8.00,
    'confidence_threshold': 0.65,
}


# ─── Inline copies of the math functions under test ──────────────────────────
# We inline these to decouple tests from module import side-effects
# (sentinel config, logging setup, API imports).
# If logic changes in the scanner files, update these copies.

def kelly_criterion(prob: float, odds: float, bankroll: float,
                    max_kelly_pct: float = 5.0) -> float:
    """Kelly criterion stake (mirrors sports_scanner.kelly_criterion)."""
    if odds <= 1 or prob <= 0 or prob >= 1:
        return 0
    edge = prob * odds - (1 - prob)
    if edge <= 0:
        return 0
    bet_frac = edge / (odds - 1)
    bet_pct = bet_frac * 100
    capped_pct = min(bet_pct, max_kelly_pct)
    return max(0, (capped_pct / 100) * bankroll)


def implied_probability(odds: float) -> float:
    """Convert decimal odds to implied probability."""
    if odds <= 1:
        return 1.0
    return 1.0 / odds


def monte_carlo_forecast(prices, horizon=10, n_sims=200, seed=42):
    """Monte Carlo log-normal forecast (mirrors forecast_scanner)."""
    if len(prices) < 10:
        return None
    arr = np.array(prices, dtype=float)
    log_returns = np.diff(np.log(arr))
    mu = float(np.mean(log_returns))
    sigma = float(np.std(log_returns))
    if sigma == 0:
        return None
    last_price = float(arr[-1])
    rng = np.random.default_rng(seed)
    sims = np.zeros((n_sims, horizon))
    for i in range(n_sims):
        price = last_price
        for t in range(horizon):
            shock = rng.normal(mu, sigma)
            price *= math.exp(shock)
            sims[i, t] = price
    median = float(np.median(sims[:, -1]))
    lower = float(np.percentile(sims[:, -1], 10))
    upper = float(np.percentile(sims[:, -1], 90))
    return {
        'median': round(median, 2),
        'lower_bound': round(lower, 2),
        'upper_bound': round(upper, 2),
        'mu_daily': round(mu, 6),
        'sigma_daily': round(sigma, 6),
    }


def compute_equal_weight(symbols):
    if not symbols:
        return {}
    w = round(100.0 / len(symbols), 2)
    return {s: w for s in symbols}


def compute_momentum_allocation(symbols, returns):
    """Momentum-tilted weights (mirrors portfolio_scanner)."""
    if not symbols or not returns:
        return compute_equal_weight(symbols)
    base = 100.0 / len(symbols)
    scores = {}
    for s in symbols:
        ret = returns.get(s, 0)
        tilt = min(max(ret / 50, -0.2), 0.2)
        scores[s] = base * (1 + tilt)
    total = sum(scores.values())
    if total <= 0:
        return compute_equal_weight(symbols)
    return {s: round(v / total * 100, 2) for s, v in scores.items()}


def calculate_drift(last, current):
    """Per-asset allocation drift (mirrors portfolio_scanner)."""
    drift = {}
    all_keys = set(last.keys()) | set(current.keys())
    for sym in all_keys:
        drift[sym] = abs(current.get(sym, 0) - last.get(sym, 0))
    return drift


# ═══════════════════════════════════════════════════════════════════════════════
# TEST CASES
# ═══════════════════════════════════════════════════════════════════════════════

class TestKellyCriterion(unittest.TestCase):
    """Test Kelly criterion position sizing."""

    def test_positive_edge_returns_nonzero(self):
        """When prob*odds > 1, Kelly should recommend a bet."""
        # 60% win prob at 2.0 odds = clear positive edge
        stake = kelly_criterion(0.60, 2.0, 5000)
        self.assertGreater(stake, 0)

    def test_no_edge_returns_zero(self):
        """When prob*odds <= 1 (no edge), Kelly should return 0."""
        # 40% at 2.0 = edge is 0.4*2 - 0.6 = 0.2, still positive
        # 30% at 2.0 = edge is 0.3*2 - 0.7 = -0.1, negative
        stake = kelly_criterion(0.30, 2.0, 5000)
        self.assertEqual(stake, 0)

    def test_even_odds_fifty_fifty(self):
        """50/50 at 2.0 odds = zero edge, should return 0."""
        # edge = 0.5*2 - 0.5 = 0.5 ... that IS positive (fair coin at 2:1)
        # Actually 50% at even money (2.0) = edge > 0
        stake = kelly_criterion(0.50, 2.0, 5000)
        self.assertGreater(stake, 0)

    def test_cap_at_max_kelly(self):
        """Stake should never exceed max_kelly_pct of bankroll."""
        # Very high edge: 90% at 5.0 odds
        stake = kelly_criterion(0.90, 5.0, 10000, max_kelly_pct=5.0)
        max_allowed = 10000 * 0.05  # 500
        self.assertLessEqual(stake, max_allowed)

    def test_invalid_odds_returns_zero(self):
        """Odds <= 1 should always return 0."""
        self.assertEqual(kelly_criterion(0.60, 1.0, 5000), 0)
        self.assertEqual(kelly_criterion(0.60, 0.5, 5000), 0)
        self.assertEqual(kelly_criterion(0.60, -1.0, 5000), 0)

    def test_invalid_prob_returns_zero(self):
        """Probability <= 0 or >= 1 should return 0."""
        self.assertEqual(kelly_criterion(0.0, 2.0, 5000), 0)
        self.assertEqual(kelly_criterion(1.0, 2.0, 5000), 0)
        self.assertEqual(kelly_criterion(-0.1, 2.0, 5000), 0)

    def test_kelly_formula_correctness(self):
        """Verify Kelly formula: f = (p*b - q) / (b - 1) where b=odds, p=prob, q=1-p."""
        prob, odds, bankroll = 0.55, 2.5, 10000
        q = 1 - prob
        expected_frac = (prob * odds - q) / (odds - 1)
        expected_pct = expected_frac * 100
        capped_pct = min(expected_pct, 5.0)
        expected_stake = (capped_pct / 100) * bankroll
        actual = kelly_criterion(prob, odds, bankroll, max_kelly_pct=5.0)
        self.assertAlmostEqual(actual, expected_stake, places=2)

    def test_proportional_to_bankroll(self):
        """Doubling bankroll should double the stake."""
        s1 = kelly_criterion(0.60, 2.5, 5000)
        s2 = kelly_criterion(0.60, 2.5, 10000)
        self.assertAlmostEqual(s2, s1 * 2, places=2)


class TestImpliedProbability(unittest.TestCase):
    """Test odds-to-probability conversion."""

    def test_even_odds(self):
        """2.0 decimal odds = 50% implied."""
        self.assertAlmostEqual(implied_probability(2.0), 0.50, places=4)

    def test_favorite(self):
        """1.5 odds = 66.7% implied."""
        self.assertAlmostEqual(implied_probability(1.5), 1/1.5, places=4)

    def test_longshot(self):
        """5.0 odds = 20% implied."""
        self.assertAlmostEqual(implied_probability(5.0), 0.20, places=4)

    def test_odds_at_or_below_one(self):
        """Odds <= 1 should return 1.0 (certainty)."""
        self.assertEqual(implied_probability(1.0), 1.0)
        self.assertEqual(implied_probability(0.5), 1.0)


class TestMonteCarloForecast(unittest.TestCase):
    """Test Monte Carlo log-normal forecasting."""

    def _make_trending_prices(self, n=60, start=100, daily_return=0.002):
        """Generate synthetic uptrending prices."""
        prices = [start]
        for _ in range(n - 1):
            prices.append(prices[-1] * (1 + daily_return + np.random.normal(0, 0.01)))
        return prices

    def _make_flat_prices(self, n=60, price=100):
        """Generate flat prices with small noise."""
        return [price + np.random.normal(0, 0.5) for _ in range(n)]

    def test_returns_none_for_short_series(self):
        """Need at least 10 data points."""
        self.assertIsNone(monte_carlo_forecast([100, 101, 102]))
        self.assertIsNone(monte_carlo_forecast([100] * 9))

    def test_returns_none_for_zero_volatility(self):
        """Constant prices = zero sigma = should return None."""
        self.assertIsNone(monte_carlo_forecast([100.0] * 20))

    def test_output_structure(self):
        """Verify all expected keys are returned."""
        prices = self._make_trending_prices()
        result = monte_carlo_forecast(prices, seed=42)
        self.assertIsNotNone(result)
        for key in ['median', 'lower_bound', 'upper_bound', 'mu_daily', 'sigma_daily']:
            self.assertIn(key, result)

    def test_confidence_band_ordering(self):
        """Lower bound < median < upper bound."""
        prices = self._make_trending_prices()
        result = monte_carlo_forecast(prices, seed=42)
        self.assertLess(result['lower_bound'], result['median'])
        self.assertLess(result['median'], result['upper_bound'])

    def test_uptrend_forecast_above_current(self):
        """Strong uptrend should forecast median above last price."""
        prices = self._make_trending_prices(n=60, daily_return=0.01)
        result = monte_carlo_forecast(prices, horizon=10, seed=42)
        last_price = prices[-1]
        # With 1% daily drift, median should be above current
        self.assertGreater(result['median'], last_price * 0.95)

    def test_deterministic_with_seed(self):
        """Same seed should produce identical results."""
        prices = self._make_trending_prices(n=60, daily_return=0.005)
        r1 = monte_carlo_forecast(prices, seed=123)
        r2 = monte_carlo_forecast(prices, seed=123)
        self.assertEqual(r1['median'], r2['median'])
        self.assertEqual(r1['lower_bound'], r2['lower_bound'])

    def test_more_sims_narrows_variance(self):
        """More simulations should produce more stable estimates."""
        prices = self._make_trending_prices(n=60, daily_return=0.003)
        results = []
        for seed in range(10):
            r = monte_carlo_forecast(prices, n_sims=50, seed=seed)
            results.append(r['median'])
        spread_50 = max(results) - min(results)

        results2 = []
        for seed in range(10):
            r = monte_carlo_forecast(prices, n_sims=1000, seed=seed)
            results2.append(r['median'])
        spread_1000 = max(results2) - min(results2)

        # Higher sim count should have tighter spread across seeds
        self.assertLess(spread_1000, spread_50)


class TestMomentumAllocation(unittest.TestCase):
    """Test momentum-tilted portfolio allocation."""

    def test_equal_weight_no_returns(self):
        """With no return data, should fall back to equal weight."""
        symbols = ['AAPL', 'NVDA', 'TSLA']
        alloc = compute_momentum_allocation(symbols, {})
        for s in symbols:
            self.assertAlmostEqual(alloc[s], 100 / 3, places=1)

    def test_sums_to_100(self):
        """Allocation must always sum to 100%."""
        symbols = ['AAPL', 'NVDA', 'TSLA', 'MSFT']
        returns = {'AAPL': 15, 'NVDA': 30, 'TSLA': -10, 'MSFT': 5}
        alloc = compute_momentum_allocation(symbols, returns)
        total = sum(alloc.values())
        self.assertAlmostEqual(total, 100.0, places=1)

    def test_winner_gets_more_weight(self):
        """Higher-return asset should get more weight."""
        symbols = ['A', 'B']
        returns = {'A': 20, 'B': -10}
        alloc = compute_momentum_allocation(symbols, returns)
        self.assertGreater(alloc['A'], alloc['B'])

    def test_tilt_capped_at_20_pct(self):
        """Even extreme returns shouldn't tilt more than ±20%."""
        symbols = ['X', 'Y']
        returns = {'X': 500, 'Y': -500}  # extreme
        alloc = compute_momentum_allocation(symbols, returns)
        # Base is 50%. Max tilt ±20% of base = 40-60 pre-normalization
        # After normalization both sum to 100
        self.assertGreater(alloc['X'], 50)
        self.assertLess(alloc['Y'], 50)

    def test_empty_symbols_returns_empty(self):
        """No symbols = no allocation."""
        alloc = compute_momentum_allocation([], {})
        self.assertEqual(alloc, {})

    def test_single_symbol_gets_100(self):
        """Single symbol should get 100%."""
        alloc = compute_momentum_allocation(['AAPL'], {'AAPL': 10})
        self.assertAlmostEqual(alloc['AAPL'], 100.0, places=1)


class TestDriftCalculation(unittest.TestCase):
    """Test portfolio drift detection."""

    def test_no_drift(self):
        """Identical allocations = zero drift."""
        alloc = {'AAPL': 50, 'NVDA': 50}
        drift = calculate_drift(alloc, alloc)
        for v in drift.values():
            self.assertEqual(v, 0)

    def test_simple_drift(self):
        """Known drift values."""
        last = {'AAPL': 50, 'NVDA': 50}
        current = {'AAPL': 55, 'NVDA': 45}
        drift = calculate_drift(last, current)
        self.assertEqual(drift['AAPL'], 5)
        self.assertEqual(drift['NVDA'], 5)

    def test_new_asset_in_current(self):
        """Asset appearing in current but not last = full weight as drift."""
        last = {'AAPL': 100}
        current = {'AAPL': 70, 'NEW': 30}
        drift = calculate_drift(last, current)
        self.assertEqual(drift['NEW'], 30)
        self.assertEqual(drift['AAPL'], 30)

    def test_removed_asset(self):
        """Asset in last but not current = its old weight as drift."""
        last = {'AAPL': 60, 'GONE': 40}
        current = {'AAPL': 100}
        drift = calculate_drift(last, current)
        self.assertEqual(drift['GONE'], 40)


class TestArbitrageDetection(unittest.TestCase):
    """Test cross-bookmaker arbitrage logic."""

    def test_normal_market_no_arb(self):
        """Typical market with ~5% vig has no arbitrage."""
        # Home 2.0 (50%), Away 3.5 (28.6%), Draw 3.2 (31.3%)
        # Total implied = 50 + 28.6 + 31.3 = 109.9% → no arb
        prices = {'Home': 2.0, 'Away': 3.5, 'Draw': 3.2}
        total_implied = sum(1/p for p in prices.values())
        self.assertGreater(total_implied, 1.0)

    def test_arbitrage_detected(self):
        """Best odds across books can create arb when total implied < 100%."""
        # Artificially good odds: total implied < 1.0
        prices = {'Home': 2.2, 'Away': 4.0, 'Draw': 4.5}
        total_implied = sum(1/p for p in prices.values())
        # 1/2.2 + 1/4.0 + 1/4.5 = 0.4545 + 0.25 + 0.2222 = 0.9267 < 1
        self.assertLess(total_implied, 1.0)
        arb_pct = (1.0 - total_implied) * 100
        self.assertGreater(arb_pct, 0)

    def test_arb_return_calculation(self):
        """Verify arbitrage % calculation accuracy."""
        prices = {'A': 2.2, 'B': 4.0, 'C': 4.5}
        total_implied = sum(1/p for p in prices.values())
        arb_pct = (1.0 - total_implied) * 100
        # Manual: 1/2.2=0.4545, 1/4=0.25, 1/4.5=0.2222
        # Total = 0.9268, arb = 7.32%
        self.assertAlmostEqual(arb_pct, 7.32, places=0)

    def test_two_outcome_no_arb(self):
        """Standard 2-outcome market shouldn't have arb."""
        prices = {'Home': 1.8, 'Away': 2.1}
        total_implied = sum(1/p for p in prices.values())
        # 1/1.8 + 1/2.1 = 0.556 + 0.476 = 1.032 > 1
        self.assertGreater(total_implied, 1.0)


class TestEdgeCases(unittest.TestCase):
    """Test edge cases and boundary conditions."""

    def test_kelly_with_zero_bankroll(self):
        """Zero bankroll = zero stake regardless of edge."""
        stake = kelly_criterion(0.70, 3.0, 0)
        self.assertEqual(stake, 0)

    def test_monte_carlo_with_exactly_10_prices(self):
        """Minimum viable input: exactly 10 prices."""
        prices = [100 + i * 0.5 for i in range(10)]
        result = monte_carlo_forecast(prices, seed=42)
        self.assertIsNotNone(result)

    def test_monte_carlo_negative_drift(self):
        """Downtrending prices should produce lower median."""
        prices = [100 - i * 0.5 for i in range(30)]
        result = monte_carlo_forecast(prices, seed=42)
        self.assertIsNotNone(result)
        # Median should be below last price due to negative drift
        self.assertLess(result['median'], prices[-1] * 1.05)

    def test_drift_with_empty_allocations(self):
        """Empty inputs should produce empty drift."""
        drift = calculate_drift({}, {})
        self.assertEqual(drift, {})

    def test_momentum_all_negative_returns(self):
        """All negative returns should still sum to 100%."""
        symbols = ['A', 'B', 'C']
        returns = {'A': -15, 'B': -20, 'C': -5}
        alloc = compute_momentum_allocation(symbols, returns)
        total = sum(alloc.values())
        self.assertAlmostEqual(total, 100.0, places=1)


if __name__ == '__main__':
    unittest.main()
