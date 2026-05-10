"""
POST /api/v1/nlp/sentiment         — single text sentiment
POST /api/v1/nlp/sentiment/batch   — batch sentiment analysis
POST /api/v1/nlp/earnings          — earnings call transcript analysis
GET  /api/v1/nlp/status            — model status (local vs API)
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from engines import finbert

log = logging.getLogger("mss.nlp")

router = APIRouter(prefix="/api/v1/nlp", tags=["nlp"])


# ── Request models ────────────────────────────────────────────────────────────

class SentimentRequest(BaseModel):
    text: str = Field(..., min_length=5, max_length=10000)

class BatchSentimentRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=50)

class EarningsRequest(BaseModel):
    transcript: str = Field(..., min_length=50, max_length=500000)
    ticker: Optional[str] = None
    quarter: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/sentiment")
async def sentiment(req: SentimentRequest) -> dict:
    """Analyze sentiment of a single text using FinBERT."""
    result = await finbert.analyze_sentiment(req.text)
    return result.as_dict()


@router.post("/sentiment/batch")
async def sentiment_batch(req: BatchSentimentRequest) -> dict:
    """Analyze sentiment of multiple texts (max 50)."""
    results = await finbert.analyze_batch(req.texts)
    return {
        "results": [r.as_dict() for r in results],
        "count": len(results),
    }


@router.post("/earnings")
async def earnings_analysis(req: EarningsRequest) -> dict:
    """
    Analyze an earnings call transcript.
    Returns overall sentiment, management tone, guidance sentiment,
    Q&A sentiment, and per-sentence breakdown.
    """
    analysis = await finbert.analyze_earnings_call(req.transcript)
    result = analysis.as_dict()
    if req.ticker:
        result["ticker"] = req.ticker
    if req.quarter:
        result["quarter"] = req.quarter
    return result


@router.get("/status")
async def nlp_status() -> dict:
    """Check FinBERT model status."""
    return {
        "model": finbert.HF_MODEL_ID,
        "mode": "local" if finbert._local_pipeline is not None else "api",
        "hasToken": bool(finbert.HF_TOKEN),
    }
