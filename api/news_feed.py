"""
News & Sentiment Feed for Quadratic API.

Two-layer architecture:
  1. News ingestion: NewsAPI.org headlines + Polygon ticker news
  2. Sentiment scoring: FinBERT (local) or HuggingFace Inference API (fallback)

Feeds into: finbert.py, market_intel.py, intelligence.py, sentinel alerts

Requires: NEWSAPI_KEY env var ($50/month Everything plan)
Optional: HF_API_TOKEN for HuggingFace Inference fallback
"""

import asyncio
import logging
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

# Load .env so NEWSAPI_KEY is available even when imported standalone
try:
    from dotenv import load_dotenv
    _api_env = Path(__file__).parent / ".env"
    _root_env = Path(__file__).parent.parent / ".env"
    if _api_env.exists():
        load_dotenv(_api_env, override=False)
    if _root_env.exists():
        load_dotenv(_root_env, override=False)
except ImportError:
    pass

import httpx

log = logging.getLogger("quadratic.feeds.news")

# ── Config ───────────────────────────────────────────────────────────────────
NEWSAPI_KEY = os.environ.get("NEWSAPI_KEY", "")
HF_API_TOKEN = os.environ.get("HF_API_TOKEN", "")
NEWSAPI_BASE = "https://newsapi.org/v2"
HF_FINBERT_URL = "https://router.huggingface.co/hf-inference/models/ProsusAI/finbert"

# ── Startup Diagnostics ─────────────────────────────────────────────────────
def _check_news_sentiment_status():
    """Print startup status for news and sentiment services."""
    issues = []
    if not NEWSAPI_KEY:
        issues.append("NEWSAPI UNAVAILABLE: NEWSAPI_KEY not set in environment")
    else:
        log.info(f"NewsAPI configured (key: {NEWSAPI_KEY[:8]}...)")

    if not HF_API_TOKEN:
        log.info("HF_API_TOKEN not set — HF Inference API will attempt unauthenticated access")
    else:
        log.info("HF_API_TOKEN configured — authenticated HF Inference API available")

    for msg in issues:
        log.warning(msg)
    return len(issues) == 0

_news_sentiment_ok = _check_news_sentiment_status()

# Try local FinBERT first
_finbert_pipeline = None
_finbert_load_attempted = False


def _load_finbert():
    """Lazy-load local FinBERT model."""
    global _finbert_pipeline, _finbert_load_attempted
    if _finbert_load_attempted:
        return _finbert_pipeline
    _finbert_load_attempted = True
    try:
        from transformers import pipeline
        _finbert_pipeline = pipeline(
            "sentiment-analysis",
            model="ProsusAI/finbert",
            device=-1,  # CPU
            truncation=True,
            max_length=512,
        )
        log.info("FinBERT loaded locally")
    except Exception as e:
        log.warning(f"Local FinBERT unavailable ({e}), will use HF API fallback")
        _finbert_pipeline = None
    return _finbert_pipeline


# ── Sentiment Scoring ────────────────────────────────────────────────────────

async def score_sentiment(text: str) -> Dict:
    """
    Score financial sentiment of a text.
    Returns: {label: positive/negative/neutral, score: 0-1}
    """
    # Try local FinBERT
    pipe = _load_finbert()
    if pipe:
        try:
            result = pipe(text[:512])[0]
            return {
                "label": result["label"],
                "score": round(result["score"], 4),
                "method": "finbert-local",
            }
        except Exception as e:
            log.warning(f"Local FinBERT error: {e}")

    # Fallback: HuggingFace Inference API (works with or without token)
    try:
        headers = {"Content-Type": "application/json"}
        if HF_API_TOKEN:
            headers["Authorization"] = f"Bearer {HF_API_TOKEN}"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                HF_FINBERT_URL,
                headers=headers,
                json={"inputs": text[:512]},
            )
            resp.raise_for_status()
            results = resp.json()

        if isinstance(results, list) and len(results) > 0:
            # HF returns [[{label, score}, ...]] sorted by score desc
            top = results[0][0] if isinstance(results[0], list) else results[0]
            return {
                "label": top["label"],
                "score": round(top["score"], 4),
                "method": "finbert-hf-api",
            }
    except Exception as e:
        log.warning(f"HF API error: {e}")

    # Last resort: keyword heuristic
    return _keyword_sentiment(text)


async def score_batch(texts: List[str]) -> List[Dict]:
    """Score sentiment for multiple texts."""
    # Try local batch first (much faster)
    pipe = _load_finbert()
    if pipe:
        try:
            results = pipe([t[:512] for t in texts])
            return [
                {"label": r["label"], "score": round(r["score"], 4), "method": "finbert-local"}
                for r in results
            ]
        except Exception as e:
            log.warning(f"Batch FinBERT error: {e}")

    # Fallback: score individually
    return [await score_sentiment(t) for t in texts]


def _keyword_sentiment(text: str) -> Dict:
    """
    Fallback sentiment scoring.
    Uses VADER (valence-aware dictionary) if available — a proper rule-based
    sentiment model that handles negation, degree modifiers, and punctuation.
    Falls through to basic keyword counting only if VADER unavailable.
    """
    # Try VADER first (much better than raw keyword counting)
    try:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        analyzer = SentimentIntensityAnalyzer()
        scores = analyzer.polarity_scores(text)
        compound = scores["compound"]  # -1 to +1
        if compound >= 0.05:
            label = "positive"
        elif compound <= -0.05:
            label = "negative"
        else:
            label = "neutral"
        # Map compound magnitude to confidence score
        confidence = min(abs(compound) + 0.5, 0.95)
        return {"label": label, "score": round(confidence, 4), "method": "vader"}
    except ImportError:
        pass

    # Last resort: basic keyword counting
    text_lower = text.lower()
    pos_words = ["surge", "rally", "gain", "profit", "growth", "beat", "upgrade", "bullish", "record", "boom", "soar"]
    neg_words = ["crash", "plunge", "loss", "decline", "miss", "downgrade", "bearish", "recession", "slump", "tank", "drop", "fall", "cut", "warning"]

    pos_count = sum(1 for w in pos_words if w in text_lower)
    neg_count = sum(1 for w in neg_words if w in text_lower)

    if pos_count > neg_count:
        return {"label": "positive", "score": min(0.5 + pos_count * 0.1, 0.9), "method": "keyword-heuristic"}
    elif neg_count > pos_count:
        return {"label": "negative", "score": min(0.5 + neg_count * 0.1, 0.9), "method": "keyword-heuristic"}
    return {"label": "neutral", "score": 0.6, "method": "keyword-heuristic"}


# ── NewsAPI Headlines ────────────────────────────────────────────────────────

async def get_headlines(
    query: str = None,
    category: str = "business",
    country: str = "us",
    limit: int = 20,
) -> Dict:
    """Fetch top headlines from NewsAPI."""
    if not NEWSAPI_KEY:
        return {"error": "NEWSAPI_KEY not set. Get one at https://newsapi.org ($50/month Everything plan).", "articles": []}

    params = {"apiKey": NEWSAPI_KEY, "pageSize": limit}
    if query:
        params["q"] = query
        url = f"{NEWSAPI_BASE}/everything"
        params["sortBy"] = "publishedAt"
        params["language"] = "en"
    else:
        url = f"{NEWSAPI_BASE}/top-headlines"
        params["category"] = category
        params["country"] = country

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        articles = []
        for a in data.get("articles", []):
            articles.append({
                "title": a.get("title"),
                "description": (a.get("description") or "")[:300],
                "source": a.get("source", {}).get("name"),
                "author": a.get("author"),
                "url": a.get("url"),
                "published": a.get("publishedAt"),
                "image": a.get("urlToImage"),
            })

        return {
            "query": query,
            "total_results": data.get("totalResults", 0),
            "articles": articles,
            "count": len(articles),
        }
    except Exception as e:
        log.error(f"NewsAPI error: {e}")
        return {"error": str(e), "articles": []}


# ── Ticker-Specific News with Sentiment ──────────────────────────────────────

async def get_ticker_sentiment(
    symbol: str,
    days: int = 7,
    limit: int = 15,
) -> Dict:
    """
    Fetch recent news for a ticker and score each headline with FinBERT.
    Returns per-article sentiment + aggregate sentiment summary.
    """
    from_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%S")

    # Try NewsAPI first
    articles = []
    if NEWSAPI_KEY:
        news = await get_headlines(query=symbol, limit=limit)
        articles = news.get("articles", [])

    if not articles:
        return {
            "symbol": symbol,
            "error": "No news sources configured. Set NEWSAPI_KEY or POLYGON_API_KEY.",
            "articles": [],
            "sentiment_summary": {},
        }

    # Score sentiment for each headline
    texts = [f"{a.get('title', '')}. {a.get('description', '')}" for a in articles]
    sentiments = await score_batch(texts)

    # Merge sentiment into articles
    scored_articles = []
    for article, sentiment in zip(articles, sentiments):
        scored_articles.append({
            **article,
            "sentiment": sentiment,
        })

    # Aggregate
    labels = [s["label"] for s in sentiments]
    scores = [s["score"] for s in sentiments]

    pos_count = labels.count("positive")
    neg_count = labels.count("negative")
    neu_count = labels.count("neutral")

    if pos_count > neg_count:
        overall = "positive"
    elif neg_count > pos_count:
        overall = "negative"
    else:
        overall = "neutral"

    # Sentiment score: +1 for positive, -1 for negative, weighted by confidence
    weighted_sum = sum(
        s["score"] * (1 if s["label"] == "positive" else -1 if s["label"] == "negative" else 0)
        for s in sentiments
    )
    sentiment_index = round(weighted_sum / max(len(sentiments), 1), 3)

    return {
        "symbol": symbol.upper(),
        "period_days": days,
        "articles": scored_articles,
        "count": len(scored_articles),
        "sentiment_summary": {
            "overall": overall,
            "sentiment_index": sentiment_index,  # -1.0 (very bearish) to +1.0 (very bullish)
            "positive": pos_count,
            "negative": neg_count,
            "neutral": neu_count,
            "avg_confidence": round(sum(scores) / max(len(scores), 1), 3),
            "method": sentiments[0].get("method") if sentiments else "none",
        },
    }


# ── Market Mood (Cross-Ticker Sentiment) ─────────────────────────────────────

async def get_market_mood(
    watchlist: List[str] = None,
    limit_per_ticker: int = 5,
) -> Dict:
    """
    Compute sentiment across a watchlist.
    Returns per-ticker sentiment + overall market mood.
    """
    if watchlist is None:
        watchlist = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "SPY", "QQQ"]

    results = {}
    tasks = [get_ticker_sentiment(sym, days=3, limit=limit_per_ticker) for sym in watchlist]
    ticker_results = await asyncio.gather(*tasks, return_exceptions=True)

    overall_index = 0
    counted = 0
    for sym, result in zip(watchlist, ticker_results):
        if isinstance(result, Exception):
            results[sym] = {"error": str(result)}
            continue
        summary = result.get("sentiment_summary", {})
        results[sym] = {
            "sentiment": summary.get("overall", "unknown"),
            "index": summary.get("sentiment_index", 0),
            "articles_analyzed": result.get("count", 0),
        }
        if summary.get("sentiment_index") is not None:
            overall_index += summary["sentiment_index"]
            counted += 1

    market_index = round(overall_index / max(counted, 1), 3)

    if market_index > 0.3:
        mood = "bullish"
    elif market_index > 0.1:
        mood = "slightly_bullish"
    elif market_index > -0.1:
        mood = "neutral"
    elif market_index > -0.3:
        mood = "slightly_bearish"
    else:
        mood = "bearish"

    return {
        "market_mood": mood,
        "market_sentiment_index": market_index,
        "tickers": results,
        "tickers_analyzed": counted,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ── Geopolitical News (for intelligence.py) ──────────────────────────────────

async def get_geopolitical_news(limit: int = 15) -> Dict:
    """Fetch and score geopolitical/defense/energy news for intelligence engine."""
    keywords = "sanctions OR military OR geopolitical OR conflict OR NATO OR nuclear OR strait OR blockade OR tariff"
    news = await get_headlines(query=keywords, limit=limit)

    if not news.get("articles"):
        return {"error": "No geopolitical news found", "articles": []}

    texts = [f"{a.get('title', '')}. {a.get('description', '')}" for a in news["articles"]]
    sentiments = await score_batch(texts)

    scored = []
    for article, sentiment in zip(news["articles"], sentiments):
        scored.append({**article, "sentiment": sentiment})

    return {
        "topic": "geopolitical",
        "articles": scored,
        "count": len(scored),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
