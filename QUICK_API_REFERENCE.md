# QUICK API REFERENCE CARD
## For Quantico Economy V2 & ML Projects

---

## OHLCV MARKET DATA (Stocks, Crypto, Forex)

### WINNER: Finnhub (General Purpose)
```
URL: https://finnhub.io/docs/api/rate-limit
API Key Required: YES (free registration)
Rate Limit: 60 calls/min (FREE TIER)
Data Format: JSON
Python: pip install finnhub-python
Historical: Full history available
Reliability: EXCELLENT
```
**Get Stock Quote:**
```bash
curl "https://finnhub.io/api/v1/quote?symbol=AAPL&token=YOUR_TOKEN"
```

**Get Candlestick (OHLCV):**
```bash
curl "https://finnhub.io/api/v1/stock/candle?symbol=AAPL&resolution=D&from=1577836800&to=1735689600&token=YOUR_TOKEN"
```

---

### Crypto: CoinGecko (Free Tier - Best for Research)
```
URL: https://www.coingecko.com/en/api
API Key: Optional (better with Demo key)
Rate Limit (No Key): 5-15 calls/min
Rate Limit (Demo Key): 30 calls/min, 10,000/month
Data Format: JSON
Python: pip install pycoingecko
Historical: FULL history, sub-second granularity
Reliability: EXCELLENT
```

**Get Bitcoin OHLCV (365 days):**
```bash
curl "https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=365"
```

---

### Crypto Bulk Download: Binance data.binance.vision
```
URL: https://data.binance.vision/
No API Key: Direct downloads
Format: Monthly/daily ZIP + CSV inside
Data: Full OHLCV history
Cost: FREE
Best Use: Backtest data, bulk historical
```

---

### Stock OHLCV Backup: Alpha Vantage
```
URL: https://www.alphavantage.co/
API Key: Free registration
Rate Limit: 25 requests/day (generous for testing)
Data: 20+ years, 200,000+ tickers
Python: pip install alpha_vantage
Historical: Full daily OHLCV
Reliability: VERY GOOD
```

---

### Casual Stock Data: yfinance (UNRELIABLE BUT FREE)
```
Python: pip install yfinance
API Key: None
Rate Limit: No official limit (breaks without notice)
Data: Full history
Reliability: LOW (breaks frequently)
Use Case: Quick tests, backups only
```

---

## HISTORICAL DATASETS (Download CSV Bulk)

### ML Benchmarks: OpenML (Best)
```
URL: https://www.openml.org/search?type=data
Datasets: 21,000+
Python: pip install openml
Format: Multiple (ARFF, CSV, JSON)
Integration: Native scikit-learn, mlr, WEKA
Access: Web download + Python API
Cost: FREE, CC-licensed
```

**Python Example:**
```python
import openml
dataset = openml.datasets.get_dataset(61)  # Iris
X, y, categorical_mask, _ = dataset.get_data(target='class')
```

---

### UCI Machine Learning Repository
```
URL: https://archive-beta.ics.uci.edu/
Datasets: 600+
Format: CSV, ARFF, Excel
Cost: FREE
Citation: Required
Coverage: Classification, regression, clustering
Famous: Iris, Wine, Breast Cancer Wisconsin
Download: Web UI or Python script
```

---

### Kaggle Datasets
```
URL: https://www.kaggle.com/datasets
Datasets: 100,000+
Python Library: pip install kagglehub
Login: Kaggle account required (free)
API Setup: Download kaggle.json from kaggle.com/settings/account
Format: CSV, JSON, Parquet, etc.
Coverage: Finance, time series, NLP, vision
```

**Python Access:**
```python
import kagglehub
path = kagglehub.dataset_download("username/dataset-name")
```

---

### Stock Data on Kaggle
```
Search: "historical stock data" OR "S&P 500" OR "stock prices"
Format: CSV
Years: Varies (many 5-20 years)
Cost: FREE (CC-licensed)
Note: Always check "last updated" date
```

---

## AIS / MARITIME VESSEL TRACKING

### Real-Time: AISHub
```
URL: https://www.aishub.net/
Real-time: YES
Format: JSON/XML
Registration: Required
Cost: FREE tier available
Data: MMSI, lat/lon, speed, heading, ship type
Reliability: Good
```

---

### Historical + Labeled: Global Fishing Watch (v3.0, March 2025)
```
URL: https://globalfishingwatch.org/dataset-and-code-fishing-effort/
Historical: 2012-2024 (v3.0)
Volume: 190,000 unique AIS devices, ~370M fishing hours
Cost: FREE, CC-licensed
Format Options:
  1. SQL BigQuery (free: 1TB/month query)
  2. CSV Download Portal
  3. R Package (gfwr)
  4. Python API
Data: MMSI, lat/lon, timestamp, fishing hours, gear type, tonnage
Labels: ML-inferred fishing activity
Best For: Anomaly detection training, link analysis
```

**BigQuery SQL (1TB free/month):**
```sql
SELECT mmsi, timestamp, lat, lon, speed, heading, fishing_hours
FROM `global-fishing-watch.public_data_v3.fishing_effort_month_*`
WHERE _TABLE_SUFFIX BETWEEN '202001' AND '202412'
LIMIT 10000;
```

**R Package:**
```r
install.packages("gfwr")
library(gfwr)
# Query via API
```

---

### Danish Maritime Authority (Official Historical)
```
URL: https://www.dma.dk/safety-at-sea/navigational-information/ais-data
Historical: 2006-2014
Cost: FREE (data request form)
Format: Raw AIS messages
Coverage: Danish waters + North Sea
Authority: Official Danish government data
Note: Request process may take weeks
```

---

## ML BENCHMARK DATASETS

### NLP: Hugging Face Datasets
```
URL: https://huggingface.co/datasets
Python: pip install datasets
Format: Streaming (no download) or cached locally
Coverage: GLUE, SuperGLUE, SQuAD, MNIST, CIFAR-100
Integration: Seamless with transformers
Cost: FREE
```

**Python:**
```python
from datasets import load_dataset
dataset = load_dataset("glue", "mrpc")  # Download + cache
```

---

### Quick Testing: scikit-learn Built-in
```
Python: pip install scikit-learn
No Download: Built into library
Datasets: Iris, Digits, Wine, Breast Cancer, Boston Housing (deprecated)
Format: NumPy arrays
No Setup: Zero configuration
Cost: FREE
```

**Python:**
```python
from sklearn.datasets import load_iris
iris = load_iris()
X, y = iris.data, iris.target
```

---

### Time Series + Image: TensorFlow Datasets
```
URL: https://www.tensorflow.org/datasets
Python: pip install tensorflow-datasets
Format: TensorFlow/NumPy compatible
Coverage: CIFAR-10, MNIST, Fashion-MNIST, ImageNet subsets
Cost: FREE (some large datasets)
```

---

### Vision: PyTorch Torchvision
```
Python: pip install torchvision
Coverage: CIFAR-10, CIFAR-100, MNIST, Fashion-MNIST, ImageNet, STL-10
Format: PyTorch tensors
Auto Download: On first use
Cost: FREE
Integration: Direct with PyTorch models
```

---

## FINANCIAL LITERACY DATA

### OECD PISA 2022 (Student Financial Literacy)
```
URL: https://www.oecd.org/en/publications/pisa-2022-results-volume-iv_5a849c2a-en.html
Published: YES, free PDF
Microdata: Request-based access
Coverage: 15-year-olds, 20+ countries
Data: Scores + demographics + financial behavior
Key Findings: 2/3 active product users, 1/5 lack basic proficiency
Cost: FREE (report), access request for microdata
Year: 2022 data (published 2023)
```

---

### World Bank Findex (Adult Financial Inclusion)
```
URL: https://www.worldbank.org/en/publication/globalfindex
Coverage: 140+ countries, adults
Data: Bank accounts, digital payments, credit, insurance, demographics
Format: CSV, Excel, interactive dashboard
Frequency: Every 3 years (next: 2026 data release)
Cost: FREE
Best For: Global trends, inclusion rates
```

---

### World Bank Development Indicators (Macro Financial)
```
URL: https://data.worldbank.org/
Python: pip install wbdata
Format: CSV, Excel, API
Coverage: 200+ countries, 1990-present
Indicators: Credit, stock market cap, bank branches, ATMs, mobile money
Cost: FREE
Note: Macro-level, not individual behavior
```

---

### OECD/INFE Adult Survey (2025-2026, COMING SOON)
```
URL: https://www.oecd.org/en/topics/financial-education.html
Status: Data collection begins end of 2025
Release: Expected 2026-2027
Coverage: Adults, digital + traditional literacy, inclusion, well-being
Will Supersede: PISA 2022 for adult data
Cost: Expected FREE
Watch: OECD publications for release date
```

---

## QUICK COMPARISON: RATE LIMITS & RELIABILITY

| Source | Rate Limit | Format | Reliability | Python Lib |
|--------|-----------|--------|-------------|-----------|
| **Finnhub** | 60/min | JSON | Excellent | `finnhub` |
| **CoinGecko** (Demo) | 30/min, 10k/mo | JSON | Excellent | `pycoingecko` |
| **Alpha Vantage** | 25/day | JSON, CSV | Very Good | `alpha_vantage` |
| **yfinance** | Unlimited | Pandas DF | Poor (breaks) | `yfinance` |
| **Binance API** | 6000 weight/min | JSON | Excellent | `python-binance` |
| **Twelve Data** (free) | 8/min, 800/day | JSON | Good | `twelvedata` |
| **OpenML** | N/A | Multiple | Excellent | `openml` |
| **Kaggle** | N/A (bulk) | Multiple | Excellent | `kagglehub` |
| **Global Fishing Watch** | N/A (bulk) | CSV, BigQuery | Excellent | `gfwr` (R) |
| **AISHub** | Varies | JSON/XML | Good | Manual |

---

## CRITICAL: IEX Cloud is DEAD (Aug 2024)

Do NOT use IEX Cloud — it shut down. Use **Polygon.io** (limited free) or **Finnhub** (generous free) instead.

---

## FILE LOCATIONS FOR YOUR PROJECT

Created: `/sessions/gracious-cool-edison/FREE_DATA_SOURCES_COMPREHENSIVE_2025.md`
- Full details for all sources
- Code examples
- Caveats & limitations
- Recommendations for Quantico

This file: `/sessions/gracious-cool-edison/QUICK_API_REFERENCE.md`
- Quick lookup
- Rate limits
- Python setup
- Curl examples

---

**Last Updated:** April 3, 2026
**Best For:** Developers, data engineers, ML practitioners
