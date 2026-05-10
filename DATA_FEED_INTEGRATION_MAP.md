# DATA FEED INTEGRATION MAP
## Every Quadratic Engine → Its Free Data Source

Last updated: April 3, 2026

---

## LAYER 1: SERVICES API ENGINES (9 engines)
*Location: `/services/api/engines/`*

### 1. portfolio.py — Portfolio Optimization (Riskfolio-Lib)
**Needs:** Daily OHLCV returns for stocks/crypto/forex (DataFrame of T×N daily returns)

| Source | Why | Rate Limit | Python |
|--------|-----|-----------|--------|
| **Finnhub** (PRIMARY) | 60 calls/min, stocks+crypto+forex, full history | 60/min | `finnhub-python` |
| **yfinance** (QUICK TEST) | Zero setup, returns Pandas DF directly | Unofficial, breaks | `yfinance` |
| **CoinGecko** (CRYPTO) | 30 calls/min demo, 14k+ assets | 30/min | `pycoingecko` |
| **Binance bulk** (BACKTEST) | Full BTC/ETH/etc kline history as CSV | Unlimited bulk | `data.binance.vision` |

**Integration snippet:**
```python
import yfinance as yf
import pandas as pd

tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'JPM', 'GS', 'BRK-B']
prices = yf.download(tickers, start='2020-01-01', end='2025-12-31')['Close']
returns = prices.pct_change().dropna()
# returns is now a T×N DataFrame ready for portfolio.py
```

---

### 2. forecasting.py — Chronos-2 Time Series Forecasting
**Needs:** 1D numpy array of close prices (minimum 10 points)

| Source | Why | Notes |
|--------|-----|-------|
| **Finnhub** (PRIMARY) | OHLCV candles → extract close column | Any resolution: 1min to monthly |
| **Binance bulk** (CRYPTO) | Download ZIP → extract close prices | Best for long crypto histories |
| **Kaggle** (HISTORICAL) | Pre-cleaned stock/crypto CSVs | Search "S&P 500 stock data" |

**Integration snippet:**
```python
import finnhub
import numpy as np

client = finnhub.Client(api_key="FREE_KEY")
candles = client.stock_candle('AAPL', 'D', 1577836800, 1735689600)
close_prices = np.array(candles['c'])  # 1D numpy array for forecasting.py
```

---

### 3. drl_training.py — Deep Reinforcement Learning Trading
**Needs:** OHLCV numpy arrays (closes, highs, lows, opens, volumes) for MarketEnv

| Source | Why | Notes |
|--------|-----|-------|
| **Finnhub** (PRIMARY) | Full OHLCV, 60/min | Best for live retraining |
| **Binance bulk** (CRYPTO) | Years of minute-level klines | Best for initial training runs |
| **Kaggle** (PRE-BUILT) | "Huge Stock Market Dataset" (7000+ stocks) | Best for first training batch |

**Integration snippet:**
```python
import yfinance as yf
import numpy as np

df = yf.download('AAPL', start='2015-01-01', end='2025-12-31')
opens = np.array(df['Open'])
highs = np.array(df['High'])
lows = np.array(df['Low'])
closes = np.array(df['Close'])
volumes = np.array(df['Volume'])
# Feed directly into MarketEnv state vector builder
```

---

### 4. anomaly.py — Behavioral Anomaly Detection (PyOD ensemble)
**Needs:** Entity dicts with uid, speed, heading, altitude, lat, lon, source, entityType, lastSeen

| Source | Why | Notes |
|--------|-----|-------|
| **Global Fishing Watch v3.0** (PRIMARY) | 370M hours of vessel AIS data, MMSI/lat/lon/speed/heading, labeled fishing activity | BigQuery 1TB/month free |
| **AISHub** (REAL-TIME) | Live vessel positions with speed, heading, ship type | Free tier, registration required |
| **Danish Maritime Authority** (HISTORICAL) | 2006-2014 raw AIS, official clean data | Data request form |

**Integration snippet:**
```python
# Global Fishing Watch via BigQuery (1TB/month free)
from google.cloud import bigquery
client = bigquery.Client(project='your-gcp-project')

query = """
SELECT
    mmsi as uid,
    timestamp as lastSeen,
    lat, lon,
    speed_knots as speed,
    heading,
    'AIS' as source,
    CASE WHEN is_fishing THEN 'fishing_vessel' ELSE 'cargo' END as entityType
FROM `global-fishing-watch.public_data_v3.messages`
WHERE DATE(timestamp) BETWEEN '2023-01-01' AND '2023-12-31'
    AND speed_knots IS NOT NULL
LIMIT 50000
"""
df = client.query(query).to_dataframe()
entities = df.to_dict('records')  # List of entity dicts for anomaly.py
```

---

### 5. kalman.py — 2D Kalman Filter (State Estimation)
**Needs:** Lat/lon measurements with timestamps

**Same sources as anomaly.py** — Global Fishing Watch, AISHub, DMA. Any AIS data with lat/lon/timestamp works.

**Integration snippet:**
```python
# From Global Fishing Watch data:
from engines.kalman import KalmanFilter2D
kf = KalmanFilter2D()
for row in ais_data:
    kf.update(row['lat'], row['lon'], row['timestamp'])
    predicted = kf.predict()
```

---

### 6. clustering.py — DBSCAN Spatial Clustering + H3 Hexbinning
**Needs:** Entity dicts with lat, lon, entityType, affiliation, uid

**Same sources as anomaly.py.** Global Fishing Watch is ideal — it has vessel type and flag state (affiliation proxy).

---

### 7. threat.py — Rule-Based Threat Scoring
**Needs:** Entity dicts with affiliation, entityType, source, lastSeen, lat, lon + optional AnomalyResult

**Feeds from anomaly.py output** + same AIS sources. The threat engine is a consumer of anomaly.py results, not a standalone data consumer.

---

### 8. link_analysis.py — Entity Relationship Graph (NetworkX)
**Needs:** Entity lists with uid, lat, lon, heading, speed, entityType, affiliation, source + optional cluster/threat data

**Feeds from clustering.py + threat.py output** + same AIS sources. This is the top of the pipeline:
```
AIS Data → anomaly.py → threat.py
         → clustering.py → link_analysis.py (combines all)
```

---

### 9. explain.py — SHAP Model Interpretability
**Needs:** A trained model + feature values. No independent data source needed — it explains whatever model you give it.

**Works with:** Any model from anomaly.py, threat.py, or drl_training.py. Feed it the model + a sample of input features.

---

## LAYER 2: BENCHMARK FRAMEWORK (12 engines)
*Location: `/packages/flowcore/v2/benchmark/src/swarm_benchmark/`*

### 10-14. Core Benchmark Engines (models.py, benchmark_engine.py, real_benchmark_engine.py, optimization/engine.py, claude_optimizer/)
**Needs:** Task configurations and benchmark configs — NOT external data. These are orchestration engines.

| Source | Why |
|--------|-----|
| **scikit-learn built-in** | Quick test datasets (Iris, Digits, Wine) for smoke tests |
| **OpenML** | 21,000+ curated datasets for serious benchmarks |
| **Self-generated** | These engines generate their own task configs |

**No external API needed.** These engines consume task definitions and measure performance. They're already functional.

---

### 15-16. Token Optimizer + Decision Engine (token_optimizer.py, decision_engine.py)
**Needs:** Operation metrics and decision contexts — internally generated data, not external.

**No external API needed.** These consume metrics from other engine runs.

---

### 17. SWE-Bench Engine (swe_bench/engine.py)
**Needs:** SWEBenchTask objects with code generation/bug fix tasks

| Source | Why | Notes |
|--------|-----|-------|
| **SWE-bench dataset** (Hugging Face) | Official benchmark: 2,294 real GitHub issues | `datasets` library |
| **SWE-bench Lite** | Curated 300 tasks subset | Easier to run |

**Integration snippet:**
```python
from datasets import load_dataset
swe_bench = load_dataset("princeton-nlp/SWE-bench", split="test")
# Each entry has: repo, instance_id, patch, test_patch, problem_statement
```

---

### 18-19. MLE-STAR Engines (ml_scenarios.py, model_coordinator.py)
**Needs:** Classification/regression/clustering datasets for ML benchmarking

| Source | Why | Notes |
|--------|-----|-------|
| **scikit-learn make_classification** | Already built into the engine | Synthetic data generator |
| **OpenML benchmark suites** | Curated real-world benchmark sets | `openml` library |
| **PMLB** (Penn ML Benchmarks) | 240+ standardized datasets | `pmlb` library |

**Already self-sufficient** — ml_scenarios.py uses `sklearn.datasets.make_classification` internally. For real-world benchmarks, plug in OpenML:

```python
import openml
suite = openml.study.get_suite(271)  # OpenML-CC18 benchmark suite
tasks = suite.tasks  # 72 curated classification tasks
```

---

### 20. Ensemble Executor (mle_star/ensemble_executor.py)
**Needs:** Predictions from model_coordinator.py — not external data.

**No external API needed.** Consumes output from engines 18-19.

---

## SUMMARY: WHAT ACTUALLY NEEDS EXTERNAL DATA

| Priority | Engine(s) | Data Type | Best Free Source | Setup Effort |
|----------|-----------|-----------|-----------------|-------------|
| **HIGH** | portfolio.py, forecasting.py, drl_training.py | OHLCV market data | **Finnhub** (60/min) + **yfinance** (backup) | 10 min — get free API key |
| **HIGH** | anomaly.py, kalman.py, clustering.py, threat.py, link_analysis.py | AIS vessel tracking | **Global Fishing Watch v3.0** (BigQuery) | 30 min — GCP free tier setup |
| **LOW** | swe_bench/engine.py | Code tasks | **SWE-bench** (Hugging Face) | 5 min — pip install datasets |
| **NONE** | explain.py | Model output | Consumes other engine output | Already works |
| **NONE** | 8 benchmark engines | Self-generated | Already have internal data generators | Already works |

---

## QUICK START: GET ALL ENGINES RUNNING IN 1 HOUR

### Step 1: Install Python packages (5 min)
```bash
pip install yfinance finnhub-python pycoingecko python-binance \
    google-cloud-bigquery openml pmlb datasets kagglehub \
    --break-system-packages
```

### Step 2: Get free API keys (10 min)
```
1. Finnhub: https://finnhub.io/register → free key (60 calls/min)
2. CoinGecko: https://www.coingecko.com/en/api/pricing → demo key (30 calls/min)
3. Google Cloud: https://cloud.google.com/free → create project for BigQuery (1TB/month free)
4. Kaggle: https://www.kaggle.com/settings → download kaggle.json API token
```

### Step 3: Download market data for portfolio + forecasting + DRL (15 min)
```python
import yfinance as yf
import pandas as pd
import numpy as np
import json

# Download 5 years of daily OHLCV for top 30 stocks + 5 crypto
stocks = ['AAPL','MSFT','GOOGL','AMZN','TSLA','META','NVDA','JPM','GS','BAC',
          'V','MA','WMT','JNJ','PG','UNH','HD','DIS','NFLX','ADBE',
          'CRM','INTC','AMD','PYPL','SQ','COIN','SHOP','UBER','ABNB','PLTR']
crypto = ['BTC-USD','ETH-USD','SOL-USD','ADA-USD','DOT-USD']

all_tickers = stocks + crypto
data = yf.download(all_tickers, start='2020-01-01', end='2025-12-31')

# Save for portfolio.py
data['Close'].to_csv('market_closes.csv')
data['Close'].pct_change().dropna().to_csv('market_returns.csv')

# Save OHLCV for drl_training.py
for col in ['Open','High','Low','Close','Volume']:
    data[col].to_csv(f'market_{col.lower()}.csv')

print(f"Downloaded {len(all_tickers)} tickers, {len(data)} trading days")
```

### Step 4: Download AIS data for anomaly pipeline (20 min)
```python
# Option A: BigQuery (best, needs GCP account)
from google.cloud import bigquery
client = bigquery.Client(project='your-project-id')

query = """
SELECT
    mmsi as uid,
    timestamp as lastSeen,
    lat, lon,
    speed_knots as speed,
    course as heading,
    0 as altitude,
    'AIS' as source,
    vessel_class_inferred as entityType,
    flag as affiliation
FROM `global-fishing-watch.public_data_v3.messages`
WHERE DATE(timestamp) BETWEEN '2023-06-01' AND '2023-06-30'
    AND speed_knots IS NOT NULL
    AND lat BETWEEN 35 AND 45
    AND lon BETWEEN -10 AND 5
LIMIT 100000
"""
df = client.query(query).to_dataframe()
df.to_csv('ais_entities.csv', index=False)
print(f"Downloaded {len(df)} AIS records")

# Option B: If no GCP, use synthetic data generator
import random
import time

def generate_synthetic_ais(n=10000):
    entities = []
    for i in range(n):
        entities.append({
            'uid': f'MMSI-{random.randint(100000000, 999999999)}',
            'lat': random.uniform(35, 45),
            'lon': random.uniform(-10, 5),
            'speed': random.gauss(12, 5),
            'heading': random.uniform(0, 360),
            'altitude': 0,
            'source': 'AIS',
            'entityType': random.choice(['cargo', 'tanker', 'fishing', 'passenger', 'unknown']),
            'lastSeen': time.time() - random.randint(0, 86400)
        })
    return entities

# Use this if BigQuery isn't set up yet
entities = generate_synthetic_ais(10000)
```

### Step 5: Verify everything works (10 min)
```python
# Test portfolio.py
import pandas as pd
returns = pd.read_csv('market_returns.csv', index_col=0, parse_dates=True)
print(f"Portfolio data: {returns.shape[0]} days × {returns.shape[1]} assets ✓")

# Test forecasting.py
import numpy as np
closes = pd.read_csv('market_closes.csv', index_col=0, parse_dates=True)
aapl_closes = np.array(closes['AAPL'].dropna())
print(f"Forecasting data: {len(aapl_closes)} price points for AAPL ✓")

# Test anomaly pipeline
ais = pd.read_csv('ais_entities.csv')
print(f"AIS data: {len(ais)} entity records ✓")
print(f"Entity types: {ais['entityType'].value_counts().to_dict()}")

# Test ML benchmarks
from sklearn.datasets import load_iris
iris = load_iris()
print(f"ML benchmark: Iris {iris.data.shape} ✓")

print("\n✅ All engines have data. Ready to train.")
```

---

## API KEY STORAGE

Create `/services/api/.env`:
```env
FINNHUB_API_KEY=your_free_key_here
COINGECKO_API_KEY=your_demo_key_here
GOOGLE_CLOUD_PROJECT=your_gcp_project_id
KAGGLE_USERNAME=your_kaggle_username
```

**Never commit .env to git.** Add to `.gitignore`.

---

## LIVE DATA REFRESH SCHEDULE

| Data Type | Refresh Frequency | Source | Method |
|-----------|-------------------|--------|--------|
| Stock OHLCV | Daily after market close | Finnhub | Cron job or manual |
| Crypto OHLCV | Every 4 hours | Binance/CoinGecko | API call |
| AIS positions | Hourly (if real-time needed) | AISHub | WebSocket or polling |
| ML benchmarks | One-time download | OpenML/sklearn | Static |
| Financial literacy | Annual check | OECD/World Bank | Manual download |

---

## WHAT'S ALREADY WORKING (NO DATA NEEDED)

These engines are self-sufficient — they generate their own data or consume output from other engines:

1. **explain.py** — consumes trained model output
2. **threat.py** — consumes anomaly.py output + entity data
3. **link_analysis.py** — consumes clustering + threat output
4. **benchmark_engine.py** — generates own task configs
5. **real_benchmark_engine.py** — generates own metrics
6. **optimization/engine.py** — generates own task lists
7. **claude_optimizer/** — generates own project contexts
8. **token_optimizer.py** — consumes operation metrics
9. **decision_engine.py** — consumes decision contexts
10. **ensemble_executor.py** — consumes model predictions

**10 out of 21 engines need zero external data.**
**Only 8 engines need external data feeds (3 market, 5 AIS pipeline).**
**3 engines use built-in/downloadable ML datasets.**
