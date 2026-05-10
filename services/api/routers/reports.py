"""
GET /api/v1/reports/similar?query=<text>&limit=10
"""
from __future__ import annotations

import json
from typing import Optional

import httpx
from fastapi import APIRouter, Query

from core.config import settings
from core.db import pool
from models.entities import OsintReport, SimilarReportsResult

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


async def _embed(text: str) -> list[float] | None:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                settings.ollama_url + "/api/embeddings",
                json={"model": settings.ollama_embed_model, "prompt": text},
            )
            resp.raise_for_status()
            return resp.json().get("embedding")
    except Exception:
        return None


@router.get("/similar", response_model=SimilarReportsResult)
async def similar_reports(
    query: str           = Query(..., min_length=3),
    limit: int           = Query(10, ge=1, le=50),
) -> SimilarReportsResult:
    embedding = await _embed(query)

    db = pool()

    if embedding:
        vec_str = "[" + ",".join(str(x) for x in embedding) + "]"
        rows = await db.fetch(
            f"""
            SELECT id, title, body, source_url, published_at, entity_ids,
                   1 - (embedding <=> '{vec_str}'::vector) AS similarity
            FROM reports
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> '{vec_str}'::vector
            LIMIT $1
            """,
            limit,
        )
    else:
        # Fallback: full-text search when embeddings unavailable
        rows = await db.fetch(
            """
            SELECT id, title, body, source_url, published_at, entity_ids,
                   NULL AS similarity
            FROM reports
            WHERE to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))
                  @@ plainto_tsquery('english', $1)
            LIMIT $2
            """,
            query, limit,
        )

    reports = [
        OsintReport(
            id          = str(r["id"]),
            title       = r.get("title"),
            body        = r.get("body"),
            source_url  = r.get("source_url"),
            published_at= r.get("published_at"),
            entity_ids  = [str(e) for e in (r.get("entity_ids") or [])],
            similarity  = r.get("similarity"),
        )
        for r in rows
    ]
    return SimilarReportsResult(reports=reports)
