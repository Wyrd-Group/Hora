# FREE DATA SOURCES & APIs RESEARCH (2025-2026)
## Comprehensive Guide for Financial Data, Maritime Tracking, ML Benchmarks & Financial Literacy

---

## CATEGORY 1: OHLCV MARKET DATA
*For portfolio optimization, time series forecasting, DRL trading agents*

### 1.1 STOCKS & ETFs

#### **Alpha Vantage**
- **URL:** https://www.alphavantage.co/
- **Free?** Yes, with limits
- **Rate Limit:** 25 requests/day on free tier
- **Data Format:** JSON, CSV
- **Python Library:** `alpha_vantage` (pip install)
- **Historical Data:** 20+ years of historical daily data for 200,000+ global stock tickers across 20+ exchanges
- **What You Get:** OHLCV, technical indicators (50+), intraday data
- **Notes:** One of the few fully free options with long history; relatively strict rate limits

---

#### **Finnhub**
- **URL:** https://finnhub.io/docs/api/rate-limit
- **Free?** Yes, most generous free tier
- **Rate Limit:** 60 calls/min (free), 30 calls/sec global hard limit
- **Data Format:** JSON, CSV available
- **Python Library:** `finnhub` (pip install finnhub-python)
- **Historical Data:** Full historical + real-time
- **What You Get:** OHLCV, fundamentals, earnings, SEC filings, ESG scores, sentiment analysis, news
- **Coverage:** 60+ global exchanges, US stocks (primary)
- **WebSocket:** Real-time trades/quotes (50 symbols free, unlimited paid)
- **Notes:** Best free tier for serious work; covers stocks, forex, crypto; REST API + WebSocket

---

#### **Yahoo Finance (yfinance Python Library)**
- **URL:** https://algotrading101.com/learn/yahoo-finance-api-guide/ (unofficial API guide)
- **Free?** Yes, but unofficial
- **Rate Limit:** No official limit; occasional breakage
- **Data Format:** Pandas DataFrames (returns time series as DF objects)
- **Python Library:** `yfinance` (pip install)
- **Historical Data:** Full history for most tickers
- **What You Get:** OHLCV, dividends, stock splits
- **Notes:** Extremely popular, free, but unreliable (breaks without warning). Consider backup sources. Good for small-scale exploration.

---

#### **Polygon.io**
- **URL:** https://polygon.io/stocks
- **Free?** Limited free tier
- **Rate Limit:** Real-time quotes available on free plan (with delays/limits)
- **Data Format:** JSON API
- **Python Library:** `polygon-api-client` (pip install)
- **Historical Data:** Varies by tier
- **What You Get:** Stock tickers, options, forex, crypto aggregates
- **Notes:** IEX Cloud shut down August 2024; Polygon is main replacement but free tier is limited. Better for paid use.

---

#### **Twelve Data**
- **URL:** https://twelvedata.com/docs
- **Free?** Yes, limited
- **Rate Limit:** 8 calls/min, 800/day (free tier)
- **Data Format:** JSON
- **Python Library:** `twelvedata` (pip install)
- **Historical Data:** Full historical OHLCV
- **What You Get:** Stocks, forex, crypto, ETFs, indices, commodities
- **Coverage:** US equities, forex, crypto
- **Notes:** Reasonable free tier; WebSocket also available on trial

---

### 1.2 CRYPTOCURRENCY

#### **CoinGecko**
- **URL:** https://www.coingecko.com/en/api
- **Free?** Yes, generous free tier
- **Rate Limit (Free - Public):** 5-15 calls/min (depends on global usage)
- **Rate Limit (Free - Demo Account):** 30 calls/min, 10,000 calls/month
- **Data Format:** JSON
- **Python Library:** `pycoingecko` (pip install)
- **Historical Data:** Full history for all 14,000+ assets; sub-second granularity available
- **What You Get:** OHLCV, market cap, trading volume, market dominance, on-chain DEX data (via GeckoTerminal), NFT metrics, WebSocket API
- **Paid Plans:** Analyst (~$129/mo, 500 calls/min), Pro (~$499/mo, 2M calls/month), Enterprise custom
- **Notes:** Most comprehensive free crypto API; highly recommended for research

---

#### **Binance API**
- **URL:** https://developers.binance.com/docs/binance-spot-api-docs/rest-api
- **Free?** Yes, no registration required for data endpoints
- **Rate Limit:** 6000 weight/min per IP (default REQUEST_WEIGHT)
- **Data Format:** JSON
- **Python Library:** `python-binance` (pip install)
- **Historical Data:** Full history available via `/klines` endpoint
- **What You Get:** OHLCV (klines), real-time quotes, market data, order book
- **Special:** `data.binance.vision` is dedicated data endpoint (even better for historical bulk downloads)
- **Coverage:** All trading pairs on Binance Spot
- **Notes:** Extremely reliable; rate limits are IP-based, not per API key. Kline endpoint weights vary by timeframe.

---

#### **CoinGecko Alternative: Binance Data Download**
- **URL:** https://data.binance.vision/
- **Free?** Yes
- **Format:** ZIP files (CSV inside), bulk download
- **Data Available:** Monthly/daily OHLCV klines for all pairs
- **Notes:** Best for bulk historical downloads; not real-time but efficient for backtest data

---

### 1.3 FOREX

Covered under: **Finnhub** (free tier), **Twelve Data** (free tier), **Alpha Vantage** (paid tiers primarily)

---

### 1.4 HISTORICAL DATASETS (Downloadable)

#### **Kaggle Datasets**
- **URL:** https://www.kaggle.com/datasets
- **Free?** Yes, CC-licensed and free datasets
- **How to Access:** Web UI or Python `kagglehub` library
- **Python Setup:**
  ```python
  pip install kagglehub
  # Need Kaggle API token (download from kaggle.com/settings/account)
  ```
- **Dataset Format:** CSV, JSON, Parquet, and others
- **Coverage:** Stock prices, crypto prices, commodities, forex, options, financial indicators
- **Example Datasets:** Historical stock data, crypto OHLCV, US equity fundamentals
- **Notes:** Wide variety; quality varies. Check dataset age and licenses.

---

#### **Quandl / Nasdaq Data Link**
- **URL:** https://data.nasdaq.com/publishers/QDL
- **Free?** Yes, curated free datasets
- **Data Format:** CSV, JSON API
- **Python Library:** `quandl` or direct API
- **Historical Data:** Varies by dataset; many have 20+ years
- **What You Get:** Stock prices, commodities, forex, alternative data, macro indicators
- **Notes:** Reputable source; free tier is well-curated. Register for API key for programmatic access.

---

---

## CATEGORY 2: AIS / MARITIME VESSEL TRACKING DATA
*For anomaly detection, Kalman filtering, clustering, threat scoring, link analysis*

### 2.1 REAL-TIME AIS DATA (APIs)

#### **AISHub**
- **URL:** https://www.aishub.net/
- **Free?** Yes
- **Data Format:** JSON/XML ship positions
- **Real-time?** Yes, live vessel positions
- **Coverage:** Global vessel tracking via AIS network
- **Rate Limits:** Varies by plan; free tier available
- **What You Get:** MMSI, lat/lon, speed, heading, ship type, status
- **Notes:** Direct feed from AIS transceivers; good for real-time tracking. Requires registration.

---

#### **VesselFinder**
- **URL:** https://www.vesselfinder.com/
- **Free?** Yes (web UI only, limited API)
- **Data Format:** Web-based tracking, JSON API (limited free)
- **Real-time?** Yes
- **Coverage:** Global, 190,000+ vessels
- **What You Get:** Ship positions, vessel details, port info
- **Notes:** Primary use is web UI. API is available but mostly paid. Good for exploration.

---

#### **My Ship Tracking**
- **URL:** https://www.myshiptracking.com/
- **Free?** Yes
- **Data Format:** Web UI primarily
- **Real-time?** Yes
- **What You Get:** Real-time AIS vessel positions, port activity
- **Notes:** Similar to VesselFinder; web-based interface focus.

---

#### **FleetMon**
- **URL:** https://www.fleetmon.com/
- **Free?** Limited free tier
- **Data Format:** API available (paid primarily)
- **Real-time?** Yes
- **What You Get:** Live vessel positions, historical tracks, port insights
- **Notes:** More comprehensive paid platform; free tier is basic.

---

### 2.2 HISTORICAL AIS DATASETS

#### **Danish Maritime Authority (DMA) - Historical AIS Data**
- **URL:** https://www.dma.dk/safety-at-sea/navigational-information/ais-data
- **Free?** Yes
- **Data Available:** 2006-2014 historical data (can request access for other years)
- **Format:** Raw AIS message data
- **Coverage:** Danish waters and North Sea
- **What You Get:** Raw MMSI, position, timestamp, vessel type
- **GitHub Resources:** https://github.com/dma-ais
- **Notes:** Official historical dataset; requires formal data request. Excellent for research.

---

#### **Global Fishing Watch - AIS Fishing Vessel Data**
- **URL:** https://globalfishingwatch.org/dataset-and-code-fishing-effort/
- **Free?** Yes, CC-licensed
- **Data Format:** BigQuery (SQL), CSV download, R package (`gfwr`), Python API
- **Historical Data:** 2012-2024 (v3.0 released March 2025)
- **Coverage:** 190,000+ unique AIS devices on fishing vessels; ~96,000 active/year
- **Size:** ~370 million hours of fishing activity
- **What You Get:**
  - MMSI, lat/lon, timestamp
  - Inferred fishing activity (via neural network)
  - Gear type, vessel flag, tonnage
  - Speed, heading for anomaly detection
- **Access Methods:**
  1. **SQL via BigQuery:** Public dataset (free tier: 1TB/month query)
  2. **Download Portal:** Full dataset CSV
  3. **R Package:** `gfwr` (https://globalfishingwatch.github.io/gfwr/)
  4. **Python API:** Direct queries
  5. **Web Map:** Visual exploration
- **Notes:** Exceptional resource for vessel tracking research; massive real-world dataset with ground truth labels for fishing inference. Great for anomaly detection (non-fishing vessel anomalies).

---

#### **NOAA AIS Data (US Waters)**
- **URL:** https://www.noaa.gov/ (search for AIS data)
- **Free?** Yes
- **Coverage:** US coastal waters
- **Notes:** Limited compared to global sources; check NOAA data repositories for specific regional datasets.

---

#### **UN Global Fishing Watch** (See Global Fishing Watch above)

---

### 2.3 RECOMMENDATION FOR AIS/MARITIME USE CASE

**Best free dataset for research:** Global Fishing Watch (v3.0) - has cleaned, labeled data with vessel metadata. Excellent for training ML models on real-world maritime data.

**Best for real-time exploration:** AISHub or VesselFinder (web UI for quick checks).

**Best for historical research:** DMA (official, clean) or Global Fishing Watch (labeled inference data).

---

---

## CATEGORY 3: ML BENCHMARK DATASETS
*For classification, regression, clustering, anomaly detection, time series, NLP*

### 3.1 COMPREHENSIVE BENCHMARK PLATFORMS

#### **OpenML**
- **URL:** https://www.openml.org/search?type=data
- **Free?** Yes, fully open
- **Number of Datasets:** 21,000+
- **Data Format:** Multiple (ARFF, CSV, JSON, etc.)
- **Python Library:** `openml` (pip install)
- **Coverage:** Classification, regression, clustering, anomaly detection, time series
- **Key Features:**
  - Rich metadata & task annotations
  - Native integration: scikit-learn, mlr, WEKA
  - Connected to model runs & benchmarks
  - Provenance tracking
- **Benchmarking Suites:** Pre-defined evaluation sets
- **Notes:** Best integrated with scikit-learn; designed for reproducible ML research. Highly curated.

---

#### **UCI Machine Learning Repository**
- **URL:** https://archive-beta.ics.uci.edu/
- **Free?** Yes, 100% free
- **Number of Datasets:** 600+ curated datasets
- **Data Format:** CSV, ARFF, Excel, etc.
- **Python Access:** Direct download or Kaggle mirror
- **Coverage:** Classification, regression, clustering, time series, multivariate
- **Notable Datasets:** Iris, Wine, Digits, Breast Cancer Wisconsin, Adult Census, Bank Marketing
- **Notes:** The gold standard academic benchmark repository. Datasets used in thousands of papers.

---

#### **Hugging Face Datasets**
- **URL:** https://huggingface.co/datasets
- **Free?** Yes, open-source collection
- **Focus:** NLP, vision, audio, multimodal
- **Data Format:** Streaming (no download needed) or cached locally
- **Python Library:** `datasets` (pip install)
- **Coverage:**
  - NLP: GLUE, SuperGLUE, SQuAD, MNIST, CIFAR-100
  - Vision: ImageNet subsets, COCO, etc.
  - Multimodal: Vision-language datasets
- **Key Features:**
  - Unified API across different task types
  - Integrated with transformers library
  - Automatic caching & versioning
  - Community-contributed datasets
- **Notes:** The de facto standard for NLP/vision benchmarks. Seamless PyTorch integration.

---

#### **scikit-learn Built-in Datasets**
- **URL:** https://scikit-learn.org/stable/modules/generated/sklearn.datasets.load_digits.html
- **Free?** Yes, included in library
- **Data Format:** NumPy arrays
- **Python:** Built into `sklearn.datasets` module
- **Coverage:**
  - Iris (classification)
  - Digits (image classification)
  - Wine (classification)
  - Breast Cancer Wisconsin (binary classification)
  - Boston Housing (regression, deprecated but available)
  - Digits (time series)
- **Size:** Small datasets (100-1000s samples) ideal for testing
- **Notes:** Zero setup; perfect for quick prototyping and algorithm testing.

---

### 3.2 SPECIALIZED BENCHMARK DATASETS

#### **Kaggle Datasets (Free Tier)**
- **URL:** https://www.kaggle.com/datasets
- **Free?** Yes, CC-licensed datasets
- **What's Available:**
  - Tabular: Classification, regression (thousands of datasets)
  - Time Series: Stock prices, sensor data, weather
  - NLP: Text classification, sentiment analysis
  - Vision: Image classification (MNIST variants, etc.)
  - Anomaly Detection: Credit fraud, system logs
- **Python Access:** `kagglehub` library or direct download
- **Setup:**
  ```python
  pip install kagglehub
  # Configure Kaggle API token
  import kagglehub
  dataset = kagglehub.dataset_download("username/dataset-name")
  ```
- **Variety:** Massive; quality varies widely
- **Notes:** Search carefully; check download counts and ratings for quality datasets.

---

#### **PMLB (Penn Machine Learning Benchmarks)**
- **URL:** (Typically accessed via: https://github.com/EpistasisLab/penn-machine-learning-benchmarks or PMLB.readthedocs.io)
- **Free?** Yes
- **Number of Datasets:** 240+ classification and regression datasets
- **Python Library:** `pmlb` (pip install)
- **Format:** Standardized CSV format (easy access)
- **Coverage:** Classification, regression
- **Key Feature:** All datasets preprocessed & standardized
- **Python Example:**
  ```python
  from pmlb import fetch_data
  X, y = fetch_data('iris')
  ```
- **Notes:** Excellent for algorithm comparison; everything is pre-processed.

---

#### **TensorFlow Datasets (TFDS)**
- **URL:** https://www.tensorflow.org/datasets
- **Free?** Yes
- **Data Format:** TensorFlow/NumPy compatible
- **Python Library:** `tensorflow-datasets` (pip install)
- **Coverage:** Vision (CIFAR-10, MNIST, Fashion-MNIST, ImageNet subsets), NLP, audio
- **Size:** Small to medium (some datasets 50GB+)
- **Notes:** Deep learning focused; tight integration with TensorFlow/Keras.

---

#### **PyTorch Vision & Torchvision**
- **URL:** https://pytorch.org/vision/
- **Free?** Yes
- **Data Format:** PyTorch tensors
- **Python Library:** `torchvision` (pip install)
- **Coverage:** CIFAR-10, CIFAR-100, MNIST, Fashion-MNIST, ImageNet (with license), STL-10, SVHN
- **Notes:** Automatic download on first use. Pre-processing pipelines included.

---

### 3.3 ANOMALY DETECTION & TIME SERIES SPECIFIC

#### **NASA Anomaly Detection Datasets**
- **Available via:** OpenML, Kaggle
- **Content:** Spacecraft telemetry, sensor data
- **Format:** Time series CSV
- **Use Case:** Anomaly detection benchmarks

---

#### **Yahoo S5 Dataset (Time Series Anomalies)**
- **Available via:** Kaggle, GitHub academic repos
- **Content:** Yahoo's production time series with labeled anomalies
- **Format:** CSV
- **Use Case:** Real-world time series anomaly detection

---

---

## CATEGORY 4: FINANCIAL LITERACY & EDUCATION DATA

### 4.1 OECD PISA FINANCIAL LITERACY DATA

#### **PISA 2022 Results (Volume IV) - Financial Literacy**
- **URL:** https://www.oecd.org/en/publications/pisa-2022-results-volume-iv_5a849c2a-en.html
- **Free?** Yes, report available as PDF
- **Data Available:** Student-level microdata (registration/agreement required)
- **Coverage:** 20+ countries, 15-year-old students
- **What You Get:**
  - Financial literacy scores (knowledge, behavior, attitude dimensions)
  - Student demographics, socio-economic background
  - Financial product usage (bank accounts, payment cards, online shopping)
  - Behavioral patterns (saving, price comparison, financial planning)
- **Key Findings:**
  - 2/3 of students are active financial product users
  - 1/5 lack basic financial literacy proficiency
  - High performers 72% more likely to save; 50% more likely to compare prices
  - Socio-economic gap: background explains 12% of variance
- **Access:** PDF download + microdata request via OECD portal
- **Notes:** Highly rigorous study; survey data not raw transactions.

---

#### **OECD/INFE International Survey of Adult Financial Literacy (2025-2026)**
- **URL:** https://www.oecd.org/en/topics/financial-education.html
- **Timeline:** Data collection begins end of 2025 (toolkit finalized Oct 2025)
- **Scope:** Adult financial literacy, digital financial literacy, inclusion, resilience, well-being
- **Countries:** OECD + partners (10+ countries participating)
- **Expected Data Release:** 2026-2027
- **Dimensions Measured:**
  - Knowledge (financial concepts)
  - Behavior (financial decisions)
  - Attitudes (risk tolerance, time preference)
  - Digital literacy
- **Notes:** New dataset; will be major source for 2026+. Watch OECD publications for release.

---

#### **OECD/INFE Toolkit 2026**
- **URL:** https://www.oecd.org/en/publications/oecd-infe-toolkit-for-measuring-financial-literacy-inclusion-and-well-being-2026_92f2d439-en.html
- **Free?** Yes, toolkit available as PDF
- **Content:** Measurement framework & questionnaires for financial literacy surveys
- **Use:** Reproduce OECD survey methodology in your own studies
- **Finalized:** October 2025

---

### 4.2 WORLD BANK FINANCIAL INCLUSION DATA

#### **World Bank Findex Database**
- **URL:** https://www.worldbank.org/en/publication/globalfindex (search for Findex)
- **Free?** Yes, public database
- **Coverage:** 140+ countries, adult financial services usage
- **Data Format:** CSV, Excel, interactive dashboards
- **What You Get:**
  - Bank account ownership
  - Digital payment adoption
  - Credit, savings, insurance usage
  - Demographics by country
- **Frequency:** Every 3 years (next: 2026 release of 2024 data)
- **Notes:** Global representative survey; excellent for financial inclusion trends.

---

#### **World Bank Development Indicators (WDI) - Financial Sector**
- **URL:** https://data.worldbank.org/
- **Free?** Yes, fully open
- **Data Format:** CSV, Excel, API
- **Financial Indicators:**
  - Domestic credit to private sector
  - Stock market capitalization
  - Insurance premiums
  - Bank branches, ATMs per capita
  - Mobile money accounts
- **Python Access:** `wbdata` library (pip install)
- **Coverage:** 200+ countries, 1990-present
- **Notes:** Macro-level financial indicators, not individual behavior.

---

### 4.3 ADDITIONAL RESOURCES

#### **World Economic Forum Global Competitiveness Index - Financial System Pillar**
- **URL:** https://www.weforum.org/
- **Free?** Report publicly available (detailed data may require registration)
- **What You Get:** Financial system strength rankings, country comparisons

---

#### **S&P Global FinLit Survey (Academic Access)**
- **URL:** Check institutional access through universities
- **Free?** Depends on institution
- **Content:** Corporate financial literacy, investor behavior
- **Notes:** May require institutional affiliation for access.

---

---

## SUMMARY TABLE: BEST SOURCES BY USE CASE

| Use Case | Best Free Source | Rate Limit | Format | Python Lib |
|----------|------------------|-----------|--------|-----------|
| **Stock OHLCV** | Finnhub | 60 calls/min | JSON | `finnhub` |
| **Stock OHLCV (Backup)** | Alpha Vantage | 25 req/day | JSON, CSV | `alpha_vantage` |
| **Stock OHLCV (Casual)** | yfinance | Unlimited (unreliable) | Pandas DF | `yfinance` |
| **Crypto OHLCV** | CoinGecko (Demo) | 30 calls/min | JSON | `pycoingecko` |
| **Crypto Bulk Download** | Binance data.binance.vision | N/A (bulk) | ZIP + CSV | N/A |
| **Historical Stock Data** | Kaggle | N/A (download) | CSV | `kagglehub` |
| **AIS Real-time** | AISHub | Varies | JSON/XML | Manual |
| **AIS Historical (Labeled)** | Global Fishing Watch | N/A (bulk) | CSV, BigQuery, R pkg | `gfwr` |
| **ML Benchmarks (Best)** | OpenML | N/A | Multiple | `openml` |
| **ML Benchmarks (Classic)** | UCI Repository | N/A | CSV, ARFF | Direct DL |
| **NLP Benchmarks** | Hugging Face Datasets | N/A (streaming) | Multiple | `datasets` |
| **Quick ML Testing** | scikit-learn built-in | N/A | NumPy arrays | `sklearn.datasets` |
| **Financial Literacy** | OECD PISA 2022 | N/A (static) | PDF, CSV (request) | Request access |
| **Adult FinLit (2026)** | OECD/INFE Survey | Coming 2026 | TBD | TBD |
| **Financial Inclusion** | World Bank Findex | N/A | CSV, Excel | Manual DL |

---

---

## QUICK-START CODE EXAMPLES

### Python: Download Stock Data (Multiple Sources)

```python
# Option 1: Finnhub (Best free tier)
import finnhub
client = finnhub.Client(api_key="YOUR_KEY")
# Get historical data
data = client.stock_candle('AAPL', 'D', 1577836800, 1735689600)

# Option 2: yfinance (Simple, unreliable)
import yfinance as yf
df = yf.download('AAPL', start='2024-01-01', end='2025-12-31')

# Option 3: Alpha Vantage
from alpha_vantage.timeseries import TimeSeries
ts = TimeSeries(key='YOUR_KEY', output_format='pandas')
data, meta = ts.get_daily(symbol='AAPL')
```

### Python: Download Crypto Data

```python
# CoinGecko
from pycoingecko import CoinGecko
cg = CoinGecko()
btc = cg.get_coin_market_chart_by_id(
    id='bitcoin',
    vs_currency='usd',
    days=365
)
# Returns: [timestamp, price, volume]

# Binance
from binance.client import Client
client = Client()
klines = client.get_historical_klines(
    "BTCUSDT",
    Client.KLINE_INTERVAL_1DAY,
    "2024-01-01"
)
```

### Python: Download ML Datasets

```python
# OpenML
import openml
dataset = openml.datasets.get_dataset(61)  # Iris
X, y, categorical_mask, _ = dataset.get_data()

# scikit-learn
from sklearn.datasets import load_iris, load_digits
iris = load_iris()
X, y = iris.data, iris.target

# Kaggle
import kagglehub
path = kagglehub.dataset_download("username/dataset-name")

# Hugging Face (NLP)
from datasets import load_dataset
dataset = load_dataset("glue", "mrpc")
```

### Python: Download AIS Data

```python
# Global Fishing Watch (via BigQuery)
from google.cloud import bigquery
client = bigquery.Client(project='your-project')
query = """
SELECT mmsi, timestamp, lat, lon, speed, heading, fishing_hours
FROM `global-fishing-watch.public_data_v3.fishing_effort_month_*`
WHERE _TABLE_SUFFIX BETWEEN '202001' AND '202412'
LIMIT 10000
"""
df = client.query(query).to_dataframe()

# Or use R package
# install.packages("gfwr")
# library(gfwr)
# gfw_get_dataset(dataset_id, sql_query)
```

### Python: Download OECD Financial Literacy Data

```python
# PISA 2022 microdata (after registration/access request)
# Typically provided as:
import pandas as pd
pisa_data = pd.read_csv('PISA_2022_Financial_Literacy.csv')
# Columns: student_id, country, financial_literacy_score, bank_account, ...
```

---

---

## CAVEATS & LIMITATIONS

1. **Yahoo Finance Reliability:** Breaks frequently without notice. Always have a backup (Finnhub).
2. **Rate Limits:** All free APIs enforce rate limits. For production: consider paid tiers or multiple APIs.
3. **IEX Cloud Shutdown (Aug 2024):** No longer available. Polygon is the successor but free tier is limited.
4. **AIS Data Privacy:** Some AIS data is blocked (military vessels, sensitive areas). Check provider terms.
5. **OECD Data Delays:** PISA published every 3 years; microdata request may take weeks.
6. **CoinGecko vs Binance:** CoinGecko more reliable for historical research; Binance better for real-time trading.
7. **Dataset Age:** Always check Kaggle dataset "last updated" date; some are years old.

---

---

## RECOMMENDATIONS FOR YOUR PROJECT (Quantico Economy V2)

**For Curriculum/Education Data:**
- Use OECD PISA 2022 reports for context (published, free)
- Watch for OECD/INFE adult survey data (end of 2025)
- Reference World Bank Findex for global inclusion context

**For Market Data (Sandbox/Trading):**
- Primary: **Finnhub** (60 calls/min, reliable, stocks + crypto + forex)
- Backup: **CoinGecko** (30 calls/min, excellent for crypto)
- Bulk Historical: **Kaggle** (pre-downloaded datasets, CSV format)

**For Benchmarking/Testing:**
- **OpenML** + scikit-learn for quick algorithm tests
- **UCI Repository** for classic algorithms
- **Hugging Face Datasets** if adding NLP modules later

**For AIS/Advanced Features (Future):**
- **Global Fishing Watch** v3.0 (exceptional labeled dataset)
- Real-time: AISHub or VesselFinder web UI for demos

---

**Last Updated:** April 3, 2026
**Sources:** Web research Feb-Apr 2026, official API docs
