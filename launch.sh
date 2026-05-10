#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Quadratic — Master Launch Script
# Starts: FastAPI backend (8888) + Sentinel daemon + Terminal UI (4000)
# Usage:  ./launch.sh [--no-sentinel] [--api-only] [--terminal-only]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# ── API Keys (persist here so they survive reboots) ──────────────────────────
# Sports betting odds — $80/mo pro, free tier 500 req/mo
export ODDS_API_KEY="${ODDS_API_KEY:-d715b8b7d20fd33e776b64e0613e7cc3}"
# Real-time stocks, options, financials — $30/mo starter at polygon.io
export POLYGON_API_KEY="${POLYGON_API_KEY:-ST19kDMA2GTsUaTFIGPqpOIsj7F_a5bi}"
# News headlines + search — $50/mo everything plan at newsapi.org
export NEWSAPI_KEY="${NEWSAPI_KEY:-7d93028e892d489cbcb2f8d7bd8f985c}"
# Macro indicators — FREE at fred.stlouisfed.org/docs/api/api_key.html
export FRED_API_KEY="${FRED_API_KEY:-d5db7f6e846211c24a83b9fd4836b093}"
# HuggingFace Inference API (FinBERT fallback) — FREE at huggingface.co
export HF_API_TOKEN="${HF_API_TOKEN:-}"

RED='\033[0;31m'
GRN='\033[0;32m'
AMB='\033[0;33m'
CYN='\033[0;36m'
RST='\033[0m'

banner() {
  echo ""
  echo -e "${GRN}  ╔═══════════════════════════════════════════╗${RST}"
  echo -e "${GRN}  ║     QUADRATIC TERMINAL — LAUNCH SYSTEM    ║${RST}"
  echo -e "${GRN}  ╚═══════════════════════════════════════════╝${RST}"
  echo ""
}

# Parse flags
RUN_API=true
RUN_SENTINEL=true
RUN_TERMINAL=true

for arg in "$@"; do
  case "$arg" in
    --no-sentinel)   RUN_SENTINEL=false ;;
    --api-only)      RUN_SENTINEL=false; RUN_TERMINAL=false ;;
    --terminal-only) RUN_API=false; RUN_SENTINEL=false ;;
  esac
done

banner

# Track PIDs for cleanup
PIDS=()
cleanup() {
  echo ""
  echo -e "${AMB}Shutting down...${RST}"
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null
  echo -e "${GRN}All services stopped.${RST}"
}
trap cleanup EXIT INT TERM

# ── 1. FastAPI Backend ───────────────────────────────────────────────────────
if $RUN_API; then
  echo -e "${CYN}[1/3]${RST} Starting FastAPI backend on port 8888..."
  cd "$ROOT"
  python3 -m uvicorn api.server:app --host 0.0.0.0 --port 8888 --log-level info &
  PIDS+=($!)
  sleep 2

  # Health check
  if curl -s http://localhost:8888/ > /dev/null 2>&1; then
    echo -e "      ${GRN}✓ API server running → http://localhost:8888${RST}"
  else
    echo -e "      ${AMB}⚠ API server may still be starting...${RST}"
  fi
fi

# ── 2. Sentinel Daemon ───────────────────────────────────────────────────────
if $RUN_SENTINEL; then
  echo -e "${CYN}[2/3]${RST} Starting Sentinel daemon..."
  cd "$ROOT"
  python3 -m sentinel.daemon &
  PIDS+=($!)
  echo -e "      ${GRN}✓ Sentinel daemon active${RST}"
fi

# ── 3. Terminal Dashboard ────────────────────────────────────────────────────
if $RUN_TERMINAL; then
  echo -e "${CYN}[3/3]${RST} Starting Terminal dashboard on port 4000..."
  cd "$ROOT"
  python3 terminal/serve.py &
  PIDS+=($!)
  sleep 1
  echo -e "      ${GRN}✓ Terminal UI → http://localhost:4000${RST}"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${GRN}  ┌─────────────────────────────────────────┐${RST}"
$RUN_TERMINAL && echo -e "${GRN}  │  Terminal:  http://localhost:4000        │${RST}"
$RUN_API      && echo -e "${GRN}  │  API:       http://localhost:8888        │${RST}"
$RUN_SENTINEL && echo -e "${GRN}  │  Sentinel:  Running (5 scanners)        │${RST}"
echo -e "${GRN}  │                                         │${RST}"
echo -e "${GRN}  │  Press Ctrl+C to stop all services      │${RST}"
echo -e "${GRN}  └─────────────────────────────────────────┘${RST}"
echo ""

# Wait for all background processes
wait
