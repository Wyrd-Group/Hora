"""
FinBERT Financial Sentiment Engine — Hugging Face-powered.

Two modes:
  1. LOCAL:  transformers + torch (if installed) — runs ProsusAI/finbert locally
  2. API:    Hugging Face Inference API (free tier, no GPU needed) — fallback

Exposes a simple interface:
  - analyze_sentiment(text) → SentimentResult
  - analyze_batch(texts)    → list[SentimentResult]
  - analyze_earnings_call(transcript) → EarningsAnalysis

The JS nlpEngine.js (280-term lexicon) remains as a fast browser-side fallback.
This module handles the cases the lexicon can't: sarcasm, negation chains,
multi-sentence context, regulatory nuance.

References:
  Araci (2019) "FinBERT: Financial Sentiment Analysis with Pre-Trained Language Models"
  Huang, Wang, Yang (2023) "FinBERT: A Large Language Model for Extracting Information
  from Financial Text"
"""
from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass, field
from typing import Optional

import httpx

log = logging.getLogger("mss.finbert")

# ── Configuration ─────────────────────────────────────────────────────────────
HF_MODEL_ID     = "ProsusAI/finbert"
HF_API_URL      = f"https://router.huggingface.co/hf-inference/models/{HF_MODEL_ID}"
HF_TOKEN        = os.getenv("HF_TOKEN", "")  # optional, increases rate limits

# Try local transformers first
_local_pipeline = None
try:
    from transformers import pipeline as hf_pipeline
    _local_pipeline = hf_pipeline(
        "sentiment-analysis",
        model=HF_MODEL_ID,
        tokenizer=HF_MODEL_ID,
        device=-1,  # CPU
        top_k=None,  # return all labels with scores
    )
    log.info("FinBERT loaded locally via transformers")
except Exception as e:
    log.info("Local FinBERT not available (%s) — will use HF Inference API", e)


# ── Data classes ──────────────────────────────────────────────────────────────

@dataclass
class SentimentResult:
    text:       str
    label:      str         # "positive", "negative", "neutral"
    confidence: float       # 0–1
    scores:     dict[str, float] = field(default_factory=dict)  # all label scores

    def as_dict(self) -> dict:
        return {
            "text":       self.text[:200],  # truncate for API response
            "label":      self.label,
            "confidence": round(self.confidence, 4),
            "scores":     {k: round(v, 4) for k, v in self.scores.items()},
        }


@dataclass
class EarningsAnalysis:
    overall_sentiment:    str
    overall_confidence:   float
    management_tone:      str
    guidance_sentiment:   str
    qa_sentiment:         str
    key_phrases:          list[dict]   # [{text, label, confidence}]
    sentence_sentiments:  list[dict]   # per-sentence breakdown
    positive_ratio:       float
    negative_ratio:       float
    neutral_ratio:        float

    def as_dict(self) -> dict:
        return {
            "overallSentiment":   self.overall_sentiment,
            "overallConfidence":  round(self.overall_confidence, 4),
            "managementTone":     self.management_tone,
            "guidanceSentiment":  self.guidance_sentiment,
            "qaSentiment":        self.qa_sentiment,
            "keyPhrases":         self.key_phrases[:20],
            "sentenceSentiments": self.sentence_sentiments[:100],
            "positiveRatio":      round(self.positive_ratio, 3),
            "negativeRatio":      round(self.negative_ratio, 3),
            "neutralRatio":       round(self.neutral_ratio, 3),
        }


# ── Core inference ────────────────────────────────────────────────────────────

async def _infer_hf_api(texts: list[str]) -> list[list[dict]]:
    """Call Hugging Face Inference API for batch sentiment."""
    headers = {"Content-Type": "application/json"}
    if HF_TOKEN:
        headers["Authorization"] = f"Bearer {HF_TOKEN}"

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            HF_API_URL,
            json={"inputs": texts, "options": {"wait_for_model": True}},
            headers=headers,
        )
        resp.raise_for_status()
        return resp.json()  # [[{label, score}, ...], ...]


def _infer_local(texts: list[str]) -> list[list[dict]]:
    """Run local transformers pipeline."""
    if _local_pipeline is None:
        raise RuntimeError("Local pipeline not available")
    # Pipeline returns list of list of dicts when top_k=None
    results = _local_pipeline(texts, truncation=True, max_length=512)
    # Normalize: if single input, wrap in list
    if texts and isinstance(results[0], dict):
        results = [results]
    return results


def _parse_result(text: str, raw: list[dict]) -> SentimentResult:
    """Parse raw HF output into SentimentResult."""
    scores = {item["label"].lower(): item["score"] for item in raw}
    best   = max(raw, key=lambda x: x["score"])
    return SentimentResult(
        text=text,
        label=best["label"].lower(),
        confidence=best["score"],
        scores=scores,
    )


# ── Public API ────────────────────────────────────────────────────────────────

async def analyze_sentiment(text: str) -> SentimentResult:
    """Analyze sentiment of a single text string."""
    results = await analyze_batch([text])
    return results[0]


async def analyze_batch(texts: list[str]) -> list[SentimentResult]:
    """
    Analyze sentiment of multiple texts.
    Uses local model if available, falls back to HF API.
    """
    if not texts:
        return []

    # Truncate very long texts (FinBERT max 512 tokens ≈ 2000 chars)
    truncated = [t[:2000] for t in texts]

    try:
        if _local_pipeline is not None:
            raw_results = _infer_local(truncated)
        else:
            raw_results = await _infer_hf_api(truncated)
    except Exception as e:
        log.error("FinBERT inference failed: %s", e)
        # Return neutral fallback
        return [
            SentimentResult(text=t, label="neutral", confidence=0.0,
                          scores={"positive": 0.33, "negative": 0.33, "neutral": 0.34})
            for t in texts
        ]

    return [_parse_result(t, r) for t, r in zip(texts, raw_results)]


async def analyze_earnings_call(transcript: str) -> EarningsAnalysis:
    """
    Analyze an earnings call transcript.

    Splits into sentences, classifies each, then computes:
    - Overall sentiment (weighted by sentence position — later = more candid)
    - Management tone (prepared remarks section)
    - Guidance sentiment (forward-looking statements)
    - Q&A sentiment (analyst questions and management responses)
    """
    # Split into sentences
    sentences = [s.strip() for s in re.split(r'[.!?]+', transcript) if len(s.strip()) > 20]

    if not sentences:
        return EarningsAnalysis(
            overall_sentiment="neutral", overall_confidence=0.0,
            management_tone="neutral", guidance_sentiment="neutral",
            qa_sentiment="neutral", key_phrases=[], sentence_sentiments=[],
            positive_ratio=0.0, negative_ratio=0.0, neutral_ratio=1.0,
        )

    # Batch analyze all sentences
    results = await analyze_batch(sentences)

    # Compute ratios
    n = len(results)
    pos_count = sum(1 for r in results if r.label == "positive")
    neg_count = sum(1 for r in results if r.label == "negative")
    neu_count = n - pos_count - neg_count

    # Weighted overall (later sentences weighted higher — more candid in Q&A)
    weights = [0.5 + 0.5 * (i / n) for i in range(n)]
    weighted_pos = sum(w * r.scores.get("positive", 0) for w, r in zip(weights, results))
    weighted_neg = sum(w * r.scores.get("negative", 0) for w, r in zip(weights, results))
    weighted_neu = sum(w * r.scores.get("neutral", 0) for w, r in zip(weights, results))
    total_w = sum(weights)

    overall_scores = {
        "positive": weighted_pos / total_w,
        "negative": weighted_neg / total_w,
        "neutral":  weighted_neu / total_w,
    }
    overall_label = max(overall_scores, key=overall_scores.get)

    # Detect guidance sentences (forward-looking language)
    guidance_keywords = {"expect", "anticipate", "forecast", "guidance", "outlook",
                        "project", "target", "estimate", "believe", "plan"}
    guidance_results = [
        r for r in results
        if any(kw in r.text.lower() for kw in guidance_keywords)
    ]
    if guidance_results:
        g_pos = sum(r.scores.get("positive", 0) for r in guidance_results) / len(guidance_results)
        g_neg = sum(r.scores.get("negative", 0) for r in guidance_results) / len(guidance_results)
        guidance_sentiment = "positive" if g_pos > g_neg else ("negative" if g_neg > g_pos else "neutral")
    else:
        guidance_sentiment = "neutral"

    # Detect Q&A section (questions contain "?")
    qa_results = [r for r in results if "?" in r.text or r.text.lower().startswith(("how", "what", "why", "when", "do you", "can you", "could"))]
    if qa_results:
        qa_pos = sum(r.scores.get("positive", 0) for r in qa_results) / len(qa_results)
        qa_neg = sum(r.scores.get("negative", 0) for r in qa_results) / len(qa_results)
        qa_sentiment = "positive" if qa_pos > qa_neg else ("negative" if qa_neg > qa_pos else "neutral")
    else:
        qa_sentiment = "neutral"

    # Key phrases: top 10 most polarized sentences
    polarized = sorted(results, key=lambda r: abs(r.scores.get("positive", 0) - r.scores.get("negative", 0)), reverse=True)

    # Management tone: first 40% of transcript (prepared remarks)
    mgmt_slice = results[:max(1, int(n * 0.4))]
    mgmt_pos = sum(r.scores.get("positive", 0) for r in mgmt_slice) / len(mgmt_slice)
    mgmt_neg = sum(r.scores.get("negative", 0) for r in mgmt_slice) / len(mgmt_slice)
    management_tone = "positive" if mgmt_pos > mgmt_neg + 0.1 else ("negative" if mgmt_neg > mgmt_pos + 0.1 else "neutral")

    return EarningsAnalysis(
        overall_sentiment=overall_label,
        overall_confidence=overall_scores[overall_label],
        management_tone=management_tone,
        guidance_sentiment=guidance_sentiment,
        qa_sentiment=qa_sentiment,
        key_phrases=[r.as_dict() for r in polarized[:10]],
        sentence_sentiments=[r.as_dict() for r in results],
        positive_ratio=pos_count / n if n else 0,
        negative_ratio=neg_count / n if n else 0,
        neutral_ratio=neu_count / n if n else 0,
    )
