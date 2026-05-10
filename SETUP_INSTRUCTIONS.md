# SETUP INSTRUCTIONS: Getting Started with Free Data Sources

---

## STEP 1: Set Up Python Libraries

```bash
# Core data science & finance
pip install pandas numpy scipy matplotlib

# Stock Data APIs
pip install yfinance alpha-vantage finnhub-python twelvedata python-binance

# Crypto APIs
pip install pycoingecko

# ML Benchmarks & Datasets
pip install scikit-learn openml kagglehub opendatasets

# Time Series & Advanced
pip install tensorflow tensorflow-datasets torch torchvision

# Optional: Better DataFrames
pip install polars
```

---

## STEP 2: Configure API Keys

### Finnhub (Best for stocks/forex/crypto)
1. Register: https://finnhub.io/docs/api/rate-limit
2. Get free API key
3. Store in environment or code:
```python
import os
os.environ['FINNHUB_API_KEY'] = 'your_key_here'
# Or pass directly
import finnhub
client = finnhub.Client(api_key="your_key_here")
```

### CoinGecko (Best for crypto)
1. Register (optional): https://www.coingecko.com/en/api
2. No API key needed for free tier (5-15 calls/min)
3. Demo key (30 calls/min, 10k/month):
```python
from pycoingecko import CoinGecko
cg = CoinGecko()  # No key needed for free tier
```

### Kaggle (For datasets)
1. Register: https://www.kaggle.com/
2. Go to Settings > API > Create New API Token
3. Download `kaggle.json` to `~/.kaggle/kaggle.json`
4. Set permissions: `chmod 600 ~/.kaggle/kaggle.json`
5. Use in Python:
```python
import kagglehub
dataset = kagglehub.dataset_download("username/dataset-name")
```

### OpenML (For ML benchmarks)
1. Register: https://www.openml.org/ (optional)
2. Use directly in Python:
```python
import openml
dataset = openml.datasets.get_dataset(61)  # Iris
```

### Binance (For crypto OHLCV)
1. No registration for data endpoints
2. Use Python library:
```python
from binance.client import Client
client = Client()
klines = client.get_historical_klines("BTCUSDT", Client.KLINE_INTERVAL_1DAY, "2024-01-01")
```

---

## STEP 3: Quick Test Scripts

### Test 1: Get Stock Data (Finnhub)
```python
import finnhub

client = finnhub.Client(api_key="YOUR_KEY")
data = client.stock_candle('AAPL', 'D', 1577836800, 1735689600)

print("Apple OHLCV:")
print(f"Timestamps: {len(data['t'])} candles")
print(f"Last close: ${data['c'][-1]}")
```

### Test 2: Get Crypto Data (CoinGecko)
```python
from pycoingecko import CoinGecko
import pandas as pd

cg = CoinGecko()
btc = cg.get_coin_market_chart_by_id(
    id='bitcoin',
    vs_currency='usd',
    days=30
)

df = pd.DataFrame({
    'timestamp': pd.to_datetime(btc['prices'], unit='ms'),
    'price': [p[1] for p in btc['prices']],
    'volume': [v[1] for v in btc['total_volumes']]
})

print(df.head())
print(f"BTC Price Range: ${df['price'].min():.2f} - ${df['price'].max():.2f}")
```

### Test 3: Load ML Dataset (OpenML)
```python
import openml
from sklearn.model_selection import train_test_split

# Get Iris dataset
dataset = openml.datasets.get_dataset(61)
X, y, categorical_mask, attribute_names = dataset.get_data(target=dataset.default_target_attribute)

# Split & train
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

from sklearn.ensemble import RandomForestClassifier
clf = RandomForestClassifier(n_estimators=10, random_state=42)
clf.fit(X_train, y_train)
score = clf.score(X_test, y_test)

print(f"Iris Classification Accuracy: {score:.2f}")
```

### Test 4: Download Kaggle Dataset
```python
import kagglehub

# Download stock price dataset
path = kagglehub.dataset_download("uciml/iris")
print(f"Dataset location: {path}")

# List files
import os
print(os.listdir(path))
```

### Test 5: Download Crypto Bulk Data (Binance)
```python
from binance.client import Client
import pandas as pd

client = Client()

# Get 1-day OHLCV for Bitcoin (past 365 days)
klines = client.get_historical_klines(
    "BTCUSDT",
    Client.KLINE_INTERVAL_1DAY,
    "365 days ago UTC"
)

df = pd.DataFrame(klines, columns=[
    'timestamp', 'open', 'high', 'low', 'close', 'volume',
    'close_time', 'quote_volume', 'num_trades', 'taker_buy_base',
    'taker_buy_quote', 'ignore'
])

df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
df[['open', 'high', 'low', 'close', 'volume']] = df[
    ['open', 'high', 'low', 'close', 'volume']
].astype(float)

print(df[['timestamp', 'open', 'high', 'low', 'close', 'volume']].head())
```

### Test 6: Query Global Fishing Watch (BigQuery)
```python
# Requires Google Cloud SDK setup
# https://cloud.google.com/bigquery/docs/quickstarts

from google.cloud import bigquery
import pandas as pd

client = bigquery.Client(project='your-project')

query = """
SELECT mmsi, timestamp, lat, lon, speed, heading, fishing_hours
FROM `global-fishing-watch.public_data_v3.fishing_effort_month_*`
WHERE _TABLE_SUFFIX BETWEEN '202301' AND '202312'
AND fishing_hours > 0
LIMIT 10000
"""

df = client.query(query).to_dataframe()
print(f"Found {len(df)} fishing records")
print(df.head())
print(f"Speed range: {df['speed'].min():.2f} - {df['speed'].max():.2f} knots")
```

---

## STEP 4: Rate Limit Handling

### Best Practice: Implement Backoff
```python
import time
from functools import wraps

def rate_limited(calls_per_minute=30):
    min_interval = 60 / calls_per_minute
    last_called = [0.0]

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            elapsed = time.time() - last_called[0]
            wait = min_interval - elapsed
            if wait > 0:
                time.sleep(wait)

            result = func(*args, **kwargs)
            last_called[0] = time.time()
            return result
        return wrapper
    return decorator

# Usage
@rate_limited(calls_per_minute=30)
def get_crypto_price(symbol):
    from pycoingecko import CoinGecko
    cg = CoinGecko()
    return cg.get_price(ids=symbol, vs_currencies='usd')[symbol.lower()]['usd']

# Safe to call in loop
for symbol in ['bitcoin', 'ethereum', 'cardano']:
    price = get_crypto_price(symbol)
    print(f"{symbol}: ${price}")
```

---

## STEP 5: Data Storage & Caching

### Cache API Responses Locally
```python
import json
import os
from datetime import datetime, timedelta

def cache_data(cache_file, fetch_func, max_age_hours=24):
    """
    Fetch data with local file cache.

    Args:
        cache_file: Local path to cache file
        fetch_func: Function that returns data
        max_age_hours: Invalidate cache after this many hours
    """
    if os.path.exists(cache_file):
        age_hours = (datetime.now() - datetime.fromtimestamp(
            os.path.getmtime(cache_file)
        )).total_seconds() / 3600

        if age_hours < max_age_hours:
            with open(cache_file, 'r') as f:
                return json.load(f)

    # Fetch fresh data
    data = fetch_func()

    # Save cache
    os.makedirs(os.path.dirname(cache_file), exist_ok=True)
    with open(cache_file, 'w') as f:
        json.dump(data, f)

    return data

# Usage
def fetch_btc():
    from pycoingecko import CoinGecko
    cg = CoinGecko()
    return cg.get_coin_market_chart_by_id('bitcoin', 'usd', 365)

btc_data = cache_data('cache/btc_365d.json', fetch_btc, max_age_hours=24)
```

---

## STEP 6: Error Handling Template

```python
import logging
import time
from requests.exceptions import RequestException

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fetch_with_retry(func, max_retries=3, backoff_factor=2):
    """
    Retry logic with exponential backoff.
    """
    for attempt in range(max_retries):
        try:
            return func()
        except RequestException as e:
            if attempt == max_retries - 1:
                logger.error(f"Failed after {max_retries} attempts: {e}")
                raise

            wait_time = backoff_factor ** attempt
            logger.warning(f"Attempt {attempt + 1} failed. Retrying in {wait_time}s...")
            time.sleep(wait_time)

# Usage
def get_stock_data():
    import finnhub
    client = finnhub.Client(api_key="YOUR_KEY")
    return client.stock_candle('AAPL', 'D', 1577836800, 1735689600)

data = fetch_with_retry(get_stock_data)
```

---

## STEP 7: Verify Everything Works

```bash
# Run this script to test all major sources
python test_all_apis.py
```

**test_all_apis.py:**
```python
#!/usr/bin/env python3
"""Quick test of all major free data sources."""

import sys

def test_yfinance():
    """Test yfinance (most fragile)."""
    try:
        import yfinance as yf
        data = yf.download('AAPL', start='2024-01-01', end='2024-01-31', progress=False)
        assert len(data) > 0, "No data returned"
        print("✓ yfinance: OK (but unreliable, use as backup)")
        return True
    except Exception as e:
        print(f"✗ yfinance: FAILED ({e})")
        return False

def test_coingecko():
    """Test CoinGecko."""
    try:
        from pycoingecko import CoinGecko
        cg = CoinGecko()
        btc = cg.get_price(ids='bitcoin', vs_currencies='usd')
        assert 'bitcoin' in btc, "No bitcoin price"
        print(f"✓ CoinGecko: OK (BTC = ${btc['bitcoin']['usd']})")
        return True
    except Exception as e:
        print(f"✗ CoinGecko: FAILED ({e})")
        return False

def test_openml():
    """Test OpenML."""
    try:
        import openml
        dataset = openml.datasets.get_dataset(61)
        X, y, _, _ = dataset.get_data()
        assert X.shape[0] > 0, "No data"
        print(f"✓ OpenML: OK (Iris: {X.shape[0]} samples)")
        return True
    except Exception as e:
        print(f"✗ OpenML: FAILED ({e})")
        return False

def test_sklearn():
    """Test scikit-learn built-in datasets."""
    try:
        from sklearn.datasets import load_iris
        iris = load_iris()
        assert iris.data.shape[0] > 0
        print(f"✓ scikit-learn: OK (Iris: {iris.data.shape[0]} samples)")
        return True
    except Exception as e:
        print(f"✗ scikit-learn: FAILED ({e})")
        return False

if __name__ == '__main__':
    tests = [
        ("yfinance (Stock Data)", test_yfinance),
        ("CoinGecko (Crypto)", test_coingecko),
        ("OpenML (ML Benchmarks)", test_openml),
        ("scikit-learn (Quick ML)", test_sklearn),
    ]

    results = []
    for name, test_func in tests:
        print(f"\nTesting {name}...")
        results.append(test_func())

    print(f"\n{'='*50}")
    print(f"Results: {sum(results)}/{len(results)} tests passed")

    sys.exit(0 if all(results) else 1)
```

Run it:
```bash
python test_all_apis.py
```

---

## TROUBLESHOOTING

**"API key not found"**
- Check environment: `echo $FINNHUB_API_KEY`
- Pass directly to Client: `Client(api_key="your_key")`

**"Rate limit exceeded (429)"**
- Implement backoff (see STEP 4 above)
- Use CoinGecko Demo key instead of public (30 vs 5-15 calls/min)

**"yfinance returns empty data"**
- It breaks randomly. Use Finnhub or Alpha Vantage as backup
- Try a different symbol
- Check internet connection

**"Kaggle dataset not found"**
- Verify kaggle.json is in `~/.kaggle/`
- Use exact dataset name: `kagglehub.dataset_download("username/exact-name")`

**"BigQuery costs money"**
- Free tier: 1TB queries/month
- Global Fishing Watch queries are usually <1MB
- Monitor costs: https://cloud.google.com/bigquery/pricing

---

## QUICK REFERENCE: Import Patterns

```python
# Stock data
import yfinance as yf
import finnhub
from alpha_vantage.timeseries import TimeSeries

# Crypto
from pycoingecko import CoinGecko
from binance.client import Client

# ML datasets
import openml
from sklearn.datasets import load_iris, load_digits
from datasets import load_dataset  # Hugging Face
import kagglehub

# Financial data
import pandas as pd
from world_bank_data import get_dataframe

# AIS / Maritime
from google.cloud import bigquery  # Global Fishing Watch
```

---

**All set!** See `FREE_DATA_SOURCES_COMPREHENSIVE_2025.md` for full details on each source.
