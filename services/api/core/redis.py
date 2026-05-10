"""
Redis client (async). Shared pub/sub for WebSocket fanout.
"""
import redis.asyncio as aioredis
from .config import settings

_client: aioredis.Redis | None = None


async def startup() -> None:
    global _client
    _client = await aioredis.from_url(
        settings.redis_url,
        decode_responses=True,
    )


async def shutdown() -> None:
    global _client
    if _client:
        await _client.aclose()
        _client = None


def client() -> aioredis.Redis:
    if _client is None:
        raise RuntimeError("Redis client not initialized — call startup() first")
    return _client
