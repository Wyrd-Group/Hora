"""
POST /api/v1/maven/chat   — multi-turn MAVEN AI conversation
POST /api/v1/maven/brief  — one-shot empire SITREP brief

Keeps the Anthropic API key server-side; the browser never sees it.
"""
from __future__ import annotations

import os
import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/maven", tags=["maven"])

# ── Lazy Anthropic client (avoids import-time failure if key absent) ──────────

_client = None

def _get_client():
    global _client
    if _client is None:
        import anthropic
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            raise HTTPException(
                status_code=503,
                detail="MAVEN_OFFLINE: ANTHROPIC_API_KEY not set on the server.",
            )
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


# ── Request / Response models ─────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=8000)

class ChatRequest(BaseModel):
    system: str = Field(..., max_length=4000)
    messages: list[ChatMessage] = Field(..., min_length=1, max_length=40)
    max_tokens: int = Field(default=1024, ge=64, le=2048)

class BriefRequest(BaseModel):
    system: str = Field(..., max_length=4000)
    prompt: str = Field(..., max_length=2000)

class MavenResponse(BaseModel):
    text: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=MavenResponse)
async def maven_chat(req: ChatRequest) -> MavenResponse:
    """Multi-turn chat with MAVEN. Caller supplies message history + system prompt."""
    client = _get_client()
    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=req.max_tokens,
            system=req.system,
            messages=[{"role": m.role, "content": m.content} for m in req.messages],
        )
        text = response.content[0].text if response.content else "(no response)"
        return MavenResponse(text=text)
    except Exception as exc:
        log.warning("Anthropic chat error: %s", exc)
        raise HTTPException(status_code=502, detail=f"MAVEN_ERROR: {exc}") from exc


@router.post("/brief", response_model=MavenResponse)
async def maven_brief(req: BriefRequest) -> MavenResponse:
    """One-shot SITREP brief generation."""
    client = _get_client()
    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=600,
            system=req.system,
            messages=[{"role": "user", "content": req.prompt}],
        )
        text = response.content[0].text if response.content else "(no response)"
        return MavenResponse(text=text)
    except Exception as exc:
        log.warning("Anthropic brief error: %s", exc)
        raise HTTPException(status_code=502, detail=f"BRIEF_ERROR: {exc}") from exc
