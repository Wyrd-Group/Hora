#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Quadratic Data Feed Bootstrap
# Downloads all dependencies and data for every engine
# ═══════════════════════════════════════════════════════════════

set -e

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Quadratic Data Feed Bootstrap                          ║"
echo "║  Installing deps + downloading data for ALL engines     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ─── Step 1: Python dependencies ─────────────────────────────

echo "━━━ Step 1/4: Installing Python dependencies ━━━"
echo ""

# Core (required)
pip install numpy pandas scikit-learn --break-system-packages -q 2>/dev/null || \
pip install numpy pandas scikit-learn -q

# Market data
pip install yfinance --break-system-packages -q 2>/dev/null || \
pip install yfinance -q

# AIS pipeline
pip install networkx --break-system-packages -q 2>/dev/null || \
pip install networkx -q

# Optional but recommended
pip install pyod --break-system-packages -q 2>/dev/null || \
pip install pyod -q 2>/dev/null || echo "  ⚠ PyOD install failed (optional)"

pip install riskfolio-lib --break-system-packages -q 2>/dev/null || \
pip install riskfolio-lib -q 2>/dev/null || echo "  ⚠ Riskfolio-lib install failed (optional)"

pip install openml --break-system-packages -q 2>/dev/null || \
pip install openml -q 2>/dev/null || echo "  ⚠ OpenML install failed (optional)"

echo ""
echo "  ✓ Python dependencies installed"
echo ""

# ─── Step 2: Verify imports ──────────────────────────────────

echo "━━━ Step 2/4: Verifying Python imports ━━━"
echo ""

python3 -c "
import sys
deps = {
    'numpy': 'numpy',
    'pandas': 'pandas',
    'sklearn': 'scikit-learn',
    'yfinance': 'yfinance',
    'networkx': 'networkx',
}
optional = {
    'pyod': 'pyod',
    'riskfolio': 'riskfolio-lib',
    'openml': 'openml',
}

ok = 0
for mod, name in deps.items():
    try:
        __import__(mod)
        print(f'  ✓ {name}')
        ok += 1
    except ImportError:
        print(f'  ✗ {name} — REQUIRED, install failed')

for mod, name in optional.items():
    try:
        __import__(mod)
        print(f'  ✓ {name} (optional)')
    except ImportError:
        print(f'  ○ {name} (optional, not installed)')

print(f'\n  {ok}/{len(deps)} required dependencies OK')
"

echo ""

# ─── Step 3: Download and cache data ────────────────────────

echo "━━━ Step 3/4: Downloading and caching data ━━━"
echo ""

python3 -c "
import sys
sys.path.insert(0, '.')
sys.path.insert(0, 'data_feeds')

from data_feeds.market_data import MarketDataFeed
from data_feeds.ais_data import AISDataFeed
from data_feeds.ml_benchmarks import MLBenchmarkFeed

print('--- Market Data ---')
MarketDataFeed().bootstrap()

print('\n--- AIS Data ---')
AISDataFeed().bootstrap()

print('\n--- ML Benchmarks ---')
MLBenchmarkFeed().bootstrap()
"

echo ""
echo "  ✓ All data downloaded and cached"
echo ""

# ─── Step 4: Run engine integration test ─────────────────────

echo "━━━ Step 4/4: Testing engine integrations ━━━"
echo ""

python3 data_feeds/run_all_engines.py

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✓ Bootstrap complete                                   ║"
echo "║                                                         ║"
echo "║  All engines now have data feeds connected.             ║"
echo "║                                                         ║"
echo "║  To re-run:  python data_feeds/run_all_engines.py       ║"
echo "║  Status:     python data_feeds/run_all_engines.py -s    ║"
echo "║  One engine: python data_feeds/run_all_engines.py -e X  ║"
echo "╚══════════════════════════════════════════════════════════╝"
