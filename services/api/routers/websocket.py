"""
WS /ws/entities   — stream of WSEntityMessage (newline-delimited JSON)
WS /ws/events     — stream of WSEventMessage  (newline-delimited JSON)

Architecture:
  Ingestor publishes deltas to Redis channels ws:entities and ws:events.
  A single shared _ChannelBroker per channel holds ONE Redis pub/sub
  subscription and fans out to all connected WebSocket clients via
  asyncio.Queue — this scales to tens of thousands of concurrent WS
  connections without opening a Redis connection per client.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from core.redis import client as redis_client

router = APIRouter(tags=["websocket"])
log    = logging.getLogger(__name__)

ENTITY_CHANNEL = "ws:entities"
EVENT_CHANNEL  = "ws:events"

# ── Fan-out broker ────────────────────────────────────────────────────────────

class _ChannelBroker:
    """One Redis pub/sub connection shared across all WS clients for a channel.

    Each WebSocket client registers a Queue; the broker's reader task
    pushes every Redis message onto every registered queue.  This keeps
    Redis connection count at O(workers) rather than O(clients).
    """

    def __init__(self, channel: str) -> None:
        self.channel    = channel
        self._queues:   Set[asyncio.Queue] = set()
        self._task:     asyncio.Task | None = None
        self._lock      = asyncio.Lock()

    # ── public API ───────────────────────────────────────────────────────────

    async def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=256)
        async with self._lock:
            self._queues.add(q)
            if self._task is None or self._task.done():
                self._task = asyncio.create_task(self._reader())
        return q

    async def unsubscribe(self, q: asyncio.Queue) -> None:
        async with self._lock:
            self._queues.discard(q)

    # ── internal reader ──────────────────────────────────────────────────────

    async def _reader(self) -> None:
        """Connect to Redis and fan out messages until no clients remain."""
        while True:
            async with self._lock:
                if not self._queues:
                    return          # no clients — stop the task
            try:
                r      = redis_client()
                pubsub = r.pubsub()
                await pubsub.subscribe(self.channel)
                log.info("Broker subscribed to Redis channel=%s", self.channel)
                async for message in pubsub.listen():
                    if message["type"] != "message":
                        continue
                    data = message["data"]
                    async with self._lock:
                        dead = set()
                        for q in self._queues:
                            try:
                                q.put_nowait(data)
                            except asyncio.QueueFull:
                                dead.add(q)   # slow client — drop it
                        self._queues -= dead
                    if not self._queues:
                        break       # all clients gone, exit inner loop
            except asyncio.CancelledError:
                return
            except Exception as exc:
                log.warning("Broker Redis error channel=%s: %s — retrying in 2s", self.channel, exc)
                await asyncio.sleep(2)
            finally:
                try:
                    await pubsub.unsubscribe(self.channel)
                    await pubsub.aclose()
                except Exception:
                    pass


# One broker per channel, created once per uvicorn worker process
_brokers: dict[str, _ChannelBroker] = {}


def _broker(channel: str) -> _ChannelBroker:
    if channel not in _brokers:
        _brokers[channel] = _ChannelBroker(channel)
    return _brokers[channel]


# ── WebSocket endpoints ───────────────────────────────────────────────────────

async def _ws_handler(ws: WebSocket, channel: str) -> None:
    await ws.accept()
    log.info("WS %s client connected: %s", channel, ws.client)
    q = await _broker(channel).subscribe()
    try:
        while True:
            try:
                data = await asyncio.wait_for(q.get(), timeout=20)
                await ws.send_text(data)
            except asyncio.TimeoutError:
                # Send a keepalive ping so the connection isn't closed by
                # intermediate proxies on idle channels
                await ws.send_text('{"type":"ping"}')
    except (WebSocketDisconnect, asyncio.CancelledError):
        pass
    except Exception as exc:
        log.warning("WS send error channel=%s: %s", channel, exc)
    finally:
        await _broker(channel).unsubscribe(q)
        log.info("WS %s client disconnected: %s", channel, ws.client)


@router.websocket("/ws/entities")
async def ws_entities(ws: WebSocket) -> None:
    await _ws_handler(ws, ENTITY_CHANNEL)


@router.websocket("/ws/events")
async def ws_events(ws: WebSocket) -> None:
    await _ws_handler(ws, EVENT_CHANNEL)
