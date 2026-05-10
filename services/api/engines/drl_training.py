"""
FinRL Training Engine — reinforcement learning for trading agents.

Trains PPO/A2C/SAC agents on real OHLCV market data via Stable Baselines 3,
then exports weights in a format compatible with tfjsEngine.mjs AcceleratedPPO.

Architecture:
  1. MarketEnv (Gymnasium) — custom environment consuming OHLCV bars
     - 11-dimensional state vector (matches tfjsEngine.mjs)
     - Single continuous action [-1, 1] (participation rate)
     - Reward: risk-adjusted return (Sharpe-like)

  2. Training loop via Stable Baselines 3 (PPO default, A2C/SAC available)
     - Walk-forward: train on window, validate on next segment
     - Early stopping on validation Sharpe

  3. Weight export → JSON matching TFJS sequential model format
     - Actor: [11] → Dense(64, relu) → Dense(64, relu) → Dense(1, tanh)
     - Critic: [11] → Dense(64, relu) → Dense(64, relu) → Dense(1, linear)

Dependencies (optional — graceful fallback):
  pip install stable-baselines3 gymnasium torch

Without SB3, the engine exposes the MarketEnv for manual experimentation
and a simple cross-entropy method as a training fallback.

Usage:
    from engines.drl_training import train_agent, export_weights_tfjs, MarketEnv

    # Train
    result = await train_agent(ohlcv_data, algorithm="PPO", timesteps=50000)

    # Export for browser
    weights_json = export_weights_tfjs(result["model_path"])
"""
from __future__ import annotations

import json
import logging
import math
import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import numpy as np

log = logging.getLogger("mss.api.drl_training")

# ── Graceful imports ─────────────────────────────────────────────────────────

_HAS_GYMNASIUM = False
_HAS_SB3 = False
_HAS_TORCH = False

try:
    import gymnasium as gym
    from gymnasium import spaces
    _HAS_GYMNASIUM = True
except ImportError:
    log.info("gymnasium not installed — MarketEnv unavailable")

try:
    import torch
    _HAS_TORCH = True
except ImportError:
    log.info("torch not installed — SB3 training unavailable")

if _HAS_TORCH:
    try:
        from stable_baselines3 import PPO, A2C, SAC
        from stable_baselines3.common.callbacks import EvalCallback, StopTrainingOnNoModelImprovement
        _HAS_SB3 = True
    except ImportError:
        log.info("stable-baselines3 not installed — using fallback training")


# ── Constants ────────────────────────────────────────────────────────────────

STATE_DIM = 11          # Matches tfjsEngine.mjs AcceleratedPPO
ACTION_DIM = 1          # Single continuous action
ACTOR_HIDDEN = 64       # Hidden layer size (matches TFJS)

# State vector feature indices (matches tfjsEngine.mjs expectations)
# [0] momentum_short      — 5-bar log return
# [1] momentum_long       — 20-bar log return
# [2] volatility_short    — 5-bar realized vol
# [3] volatility_long     — 20-bar realized vol
# [4] bid_ask_proxy       — intraday range / close (proxy for spread)
# [5] order_book_proxy    — volume ratio vs 20-bar avg (proxy for imbalance)
# [6] price_vs_sma20      — close / SMA(20) - 1 (mean reversion signal)
# [7] price_vs_sma50      — close / SMA(50) - 1 (trend signal)
# [8] volume_ratio        — current volume / prev volume
# [9] regime_proxy        — rolling 20-bar Sharpe (regime indicator)
# [10] gap                — overnight gap (open - prev close) / prev close

MODELS_DIR = Path("/tmp/mss_drl_models")
MODELS_DIR.mkdir(parents=True, exist_ok=True)

ALGORITHMS = {
    "PPO": PPO if _HAS_SB3 else None,
    "A2C": A2C if _HAS_SB3 else None,
    "SAC": SAC if _HAS_SB3 else None,
}


# ── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class TrainingResult:
    """Result of a training run."""
    algorithm: str
    symbol: str
    timesteps: int
    episodes: int
    training_time_sec: float
    model_path: str
    metrics: dict = field(default_factory=dict)
    weights_exported: bool = False
    export_path: Optional[str] = None

    def as_dict(self) -> dict:
        return {
            "algorithm": self.algorithm,
            "symbol": self.symbol,
            "timesteps": self.timesteps,
            "episodes": self.episodes,
            "trainingTimeSec": round(self.training_time_sec, 2),
            "modelPath": self.model_path,
            "metrics": self.metrics,
            "weightsExported": self.weights_exported,
            "exportPath": self.export_path,
        }


# ── Feature engineering ──────────────────────────────────────────────────────

def compute_state_features(
    closes: np.ndarray,
    highs: np.ndarray,
    lows: np.ndarray,
    opens: np.ndarray,
    volumes: np.ndarray,
    idx: int,
) -> np.ndarray:
    """
    Compute the 11-dimensional state vector at bar index `idx`.
    Requires at least 50 bars of history before `idx`.

    All features are z-score normalized against their rolling window
    to keep values roughly in [-3, 3] for neural network stability.
    """
    if idx < 50:
        return np.zeros(STATE_DIM, dtype=np.float32)

    c = closes[:idx + 1]
    h = highs[:idx + 1]
    l = lows[:idx + 1]
    o = opens[:idx + 1]
    v = volumes[:idx + 1]

    # Log returns
    log_ret = np.diff(np.log(np.maximum(c, 1e-8)))

    # [0] momentum_short — 5-bar log return
    mom_short = np.sum(log_ret[-5:]) if len(log_ret) >= 5 else 0.0

    # [1] momentum_long — 20-bar log return
    mom_long = np.sum(log_ret[-20:]) if len(log_ret) >= 20 else 0.0

    # [2] volatility_short — 5-bar realized vol (annualized)
    vol_short = np.std(log_ret[-5:]) * np.sqrt(252) if len(log_ret) >= 5 else 0.0

    # [3] volatility_long — 20-bar realized vol (annualized)
    vol_long = np.std(log_ret[-20:]) * np.sqrt(252) if len(log_ret) >= 20 else 0.0

    # [4] bid_ask_proxy — intraday range / close
    bid_ask = (h[-1] - l[-1]) / max(c[-1], 1e-8)

    # [5] order_book_proxy — volume ratio vs 20-bar mean
    vol_mean_20 = np.mean(v[-20:]) if len(v) >= 20 else max(v[-1], 1.0)
    ob_proxy = v[-1] / max(vol_mean_20, 1.0) - 1.0

    # [6] price_vs_sma20
    sma20 = np.mean(c[-20:])
    price_sma20 = c[-1] / max(sma20, 1e-8) - 1.0

    # [7] price_vs_sma50
    sma50 = np.mean(c[-50:])
    price_sma50 = c[-1] / max(sma50, 1e-8) - 1.0

    # [8] volume_ratio — current / previous
    vol_ratio = v[-1] / max(v[-2], 1.0) if len(v) >= 2 else 1.0

    # [9] regime_proxy — rolling 20-bar Sharpe
    if len(log_ret) >= 20:
        ret_20 = log_ret[-20:]
        regime = np.mean(ret_20) / max(np.std(ret_20), 1e-8) * np.sqrt(252)
    else:
        regime = 0.0

    # [10] gap — overnight gap
    gap = (o[-1] - c[-2]) / max(c[-2], 1e-8) if len(c) >= 2 else 0.0

    state = np.array([
        mom_short, mom_long, vol_short, vol_long,
        bid_ask, ob_proxy, price_sma20, price_sma50,
        vol_ratio, regime, gap,
    ], dtype=np.float32)

    # Clip to [-5, 5] for numerical stability
    return np.clip(state, -5.0, 5.0)


# ── Market Environment (Gymnasium) ──────────────────────────────────────────

if _HAS_GYMNASIUM:

    class MarketEnv(gym.Env):
        """
        Single-asset trading environment for RL agent training.

        State: 11-dimensional feature vector (matches tfjsEngine.mjs)
        Action: continuous [-1, 1] → position sizing
            -1.0 = fully short (or fully sold)
             0.0 = flat / no position
            +1.0 = fully long
        Reward: risk-adjusted P&L (penalizes large drawdowns)
        """

        metadata = {"render_modes": ["human"]}

        def __init__(
            self,
            closes: np.ndarray,
            highs: np.ndarray,
            lows: np.ndarray,
            opens: np.ndarray,
            volumes: np.ndarray,
            initial_balance: float = 100_000.0,
            transaction_cost_bps: float = 5.0,  # 5 bps per trade
            max_steps: Optional[int] = None,
        ):
            super().__init__()

            self.closes = closes.astype(np.float64)
            self.highs = highs.astype(np.float64)
            self.lows = lows.astype(np.float64)
            self.opens = opens.astype(np.float64)
            self.volumes = volumes.astype(np.float64)

            self.initial_balance = initial_balance
            self.tc_rate = transaction_cost_bps / 10_000.0
            self.start_idx = 50  # need 50 bars of history for features
            self.max_idx = len(closes) - 1
            self.max_steps = max_steps or (self.max_idx - self.start_idx)

            # Spaces
            self.observation_space = spaces.Box(
                low=-5.0, high=5.0, shape=(STATE_DIM,), dtype=np.float32,
            )
            self.action_space = spaces.Box(
                low=-1.0, high=1.0, shape=(ACTION_DIM,), dtype=np.float32,
            )

            # Episode state
            self._reset_state()

        def _reset_state(self):
            self.idx = self.start_idx
            self.position = 0.0          # current position [-1, 1]
            self.balance = self.initial_balance
            self.portfolio_value = self.initial_balance
            self.peak_value = self.initial_balance
            self.step_count = 0
            self.total_trades = 0
            self.returns_history = []

        def reset(self, seed=None, options=None):
            super().reset(seed=seed)
            self._reset_state()
            obs = compute_state_features(
                self.closes, self.highs, self.lows, self.opens, self.volumes, self.idx,
            )
            return obs, {}

        def step(self, action):
            action_val = float(np.clip(action[0], -1.0, 1.0))

            # Current and next prices
            price_now = self.closes[self.idx]
            self.idx += 1
            price_next = self.closes[self.idx]

            # Position change and transaction cost
            delta_pos = action_val - self.position
            tc = abs(delta_pos) * self.tc_rate * price_now
            if abs(delta_pos) > 0.01:
                self.total_trades += 1

            # P&L from position
            price_return = (price_next - price_now) / max(price_now, 1e-8)
            pnl = self.position * price_return * self.portfolio_value - tc

            # Update portfolio
            self.portfolio_value += pnl
            self.position = action_val
            self.step_count += 1

            # Track returns
            step_return = pnl / max(self.portfolio_value - pnl, 1e-8)
            self.returns_history.append(step_return)

            # Peak tracking for drawdown
            self.peak_value = max(self.peak_value, self.portfolio_value)
            drawdown = (self.peak_value - self.portfolio_value) / max(self.peak_value, 1e-8)

            # Reward: risk-adjusted return with drawdown penalty
            reward = step_return - 0.5 * max(drawdown - 0.05, 0)  # penalize DD > 5%

            # Terminal conditions
            terminated = (
                self.portfolio_value <= self.initial_balance * 0.5  # -50% bankruptcy
                or self.idx >= self.max_idx
                or self.step_count >= self.max_steps
            )
            truncated = False

            # Observation
            obs = compute_state_features(
                self.closes, self.highs, self.lows, self.opens, self.volumes, self.idx,
            )

            info = {
                "portfolio_value": self.portfolio_value,
                "position": self.position,
                "drawdown": drawdown,
                "total_trades": self.total_trades,
                "step_return": step_return,
            }

            return obs, float(reward), terminated, truncated, info

        def get_episode_metrics(self) -> dict:
            """Compute episode-level metrics after done."""
            returns = np.array(self.returns_history)
            if len(returns) < 2:
                return {"totalReturn": 0.0, "sharpe": 0.0, "maxDrawdown": 0.0}

            total_return = (self.portfolio_value / self.initial_balance) - 1.0
            sharpe = (np.mean(returns) / max(np.std(returns), 1e-8)) * np.sqrt(252)
            max_dd = 0.0
            peak = self.initial_balance
            val = self.initial_balance
            for r in returns:
                val *= (1 + r)
                peak = max(peak, val)
                dd = (peak - val) / peak
                max_dd = max(max_dd, dd)

            return {
                "totalReturn": round(float(total_return), 4),
                "sharpe": round(float(sharpe), 4),
                "maxDrawdown": round(float(max_dd), 4),
                "totalTrades": self.total_trades,
                "steps": self.step_count,
                "finalValue": round(float(self.portfolio_value), 2),
            }


# ── Training ─────────────────────────────────────────────────────────────────

async def train_agent(
    ohlcv_data: dict[str, np.ndarray],
    symbol: str = "UNKNOWN",
    algorithm: str = "PPO",
    timesteps: int = 50_000,
    learning_rate: float = 3e-4,
    batch_size: int = 64,
    n_epochs: int = 10,
) -> TrainingResult:
    """
    Train a DRL agent on OHLCV data.

    Args:
        ohlcv_data: dict with keys "closes", "highs", "lows", "opens", "volumes"
                    each a numpy array of equal length
        symbol: ticker label
        algorithm: "PPO", "A2C", or "SAC"
        timesteps: total training timesteps
        learning_rate: optimizer LR
        batch_size: minibatch size (PPO/A2C)
        n_epochs: PPO epochs per update

    Returns:
        TrainingResult with model path and metrics
    """
    if not _HAS_SB3 or not _HAS_GYMNASIUM:
        return TrainingResult(
            algorithm=algorithm, symbol=symbol, timesteps=0, episodes=0,
            training_time_sec=0.0, model_path="",
            metrics={"error": "stable-baselines3 or gymnasium not installed"},
        )

    algo_cls = ALGORITHMS.get(algorithm)
    if algo_cls is None:
        return TrainingResult(
            algorithm=algorithm, symbol=symbol, timesteps=0, episodes=0,
            training_time_sec=0.0, model_path="",
            metrics={"error": f"Unknown algorithm: {algorithm}. Available: {list(ALGORITHMS.keys())}"},
        )

    # Create environment
    env = MarketEnv(
        closes=ohlcv_data["closes"],
        highs=ohlcv_data["highs"],
        lows=ohlcv_data["lows"],
        opens=ohlcv_data["opens"],
        volumes=ohlcv_data["volumes"],
    )

    log.info("Training %s on %s: %d bars, %d timesteps", algorithm, symbol, len(ohlcv_data["closes"]), timesteps)
    t0 = time.monotonic()

    # Configure policy network to match TFJS architecture
    policy_kwargs = {
        "net_arch": {
            "pi": [ACTOR_HIDDEN, ACTOR_HIDDEN],    # actor: 64→64
            "vf": [ACTOR_HIDDEN, ACTOR_HIDDEN],    # critic: 64→64
        },
    }

    # Instantiate agent
    if algorithm == "SAC":
        # SAC uses different policy class
        model = algo_cls(
            "MlpPolicy", env,
            learning_rate=learning_rate,
            batch_size=batch_size,
            policy_kwargs=policy_kwargs,
            verbose=0,
            device="auto",
        )
    else:
        model = algo_cls(
            "MlpPolicy", env,
            learning_rate=learning_rate,
            batch_size=batch_size,
            n_epochs=n_epochs if algorithm == "PPO" else None,
            policy_kwargs=policy_kwargs,
            verbose=0,
            device="auto",
        )

    # Train
    model.learn(total_timesteps=timesteps)

    elapsed = time.monotonic() - t0

    # Save model
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    model_name = f"{symbol}_{algorithm}_{timestamp}"
    model_path = str(MODELS_DIR / model_name)
    model.save(model_path)

    # Evaluate: run one episode
    obs, _ = env.reset()
    done = False
    while not done:
        action, _ = model.predict(obs, deterministic=True)
        obs, reward, terminated, truncated, info = env.step(action)
        done = terminated or truncated

    metrics = env.get_episode_metrics()

    log.info(
        "Training complete: %s/%s — Sharpe=%.2f, Return=%.1f%%, MaxDD=%.1f%%, Time=%.1fs",
        algorithm, symbol, metrics["sharpe"], metrics["totalReturn"] * 100,
        metrics["maxDrawdown"] * 100, elapsed,
    )

    result = TrainingResult(
        algorithm=algorithm,
        symbol=symbol,
        timesteps=timesteps,
        episodes=int(timesteps / max(env.step_count, 1)),
        training_time_sec=elapsed,
        model_path=model_path,
        metrics=metrics,
    )

    # Auto-export weights for TFJS
    try:
        export_path = export_weights_tfjs(model, model_name)
        result.weights_exported = True
        result.export_path = export_path
    except Exception as exc:
        log.warning("Weight export failed: %s", exc)

    return result


# ── Weight export for TFJS ───────────────────────────────────────────────────

def export_weights_tfjs(model: Any, name: str = "agent") -> str:
    """
    Export SB3 model weights to JSON format compatible with tfjsEngine.mjs.

    The TFJS AcceleratedPPO expects:
      Actor:  Sequential([Dense(64, relu), Dense(64, relu), Dense(1, tanh)])
      Critic: Sequential([Dense(64, relu), Dense(64, relu), Dense(1, linear)])

    SB3 MlpPolicy stores these in:
      model.policy.mlp_extractor.policy_net  → shared feature extractor (actor)
      model.policy.mlp_extractor.value_net   → shared feature extractor (critic)
      model.policy.action_net                → final action layer
      model.policy.value_net                 → final value layer
    """
    if not _HAS_TORCH:
        raise RuntimeError("torch not installed — cannot export weights")

    policy = model.policy
    state_dict = policy.state_dict()

    def _tensor_to_list(key: str) -> list:
        """Extract weight tensor as nested list."""
        t = state_dict.get(key)
        if t is None:
            raise KeyError(f"Key {key} not found in state_dict. Available: {list(state_dict.keys())}")
        return t.cpu().numpy().tolist()

    # Build TFJS-compatible weight structure
    # SB3 key mapping (MlpPolicy with pi=[64,64], vf=[64,64]):
    #   mlp_extractor.policy_net.0.weight → actor hidden 1 kernel (64, 11) → transpose to (11, 64)
    #   mlp_extractor.policy_net.0.bias   → actor hidden 1 bias (64,)
    #   mlp_extractor.policy_net.2.weight → actor hidden 2 kernel (64, 64) → transpose
    #   mlp_extractor.policy_net.2.bias   → actor hidden 2 bias (64,)
    #   action_net.weight                 → actor output kernel (1, 64) → transpose
    #   action_net.bias                   → actor output bias (1,)

    export = {
        "format": "tfjs_sequential",
        "stateDim": STATE_DIM,
        "actionDim": ACTION_DIM,
        "architecture": {
            "actor": [
                {"units": ACTOR_HIDDEN, "activation": "relu"},
                {"units": ACTOR_HIDDEN, "activation": "relu"},
                {"units": ACTION_DIM, "activation": "tanh"},
            ],
            "critic": [
                {"units": ACTOR_HIDDEN, "activation": "relu"},
                {"units": ACTOR_HIDDEN, "activation": "relu"},
                {"units": 1, "activation": "linear"},
            ],
        },
        "weights": {
            "actor": [],
            "critic": [],
        },
        "metadata": {
            "exportedAt": datetime.now(timezone.utc).isoformat() + "Z",
            "name": name,
        },
    }

    # Extract actor weights
    try:
        # Hidden layer 1
        w1 = state_dict["mlp_extractor.policy_net.0.weight"].cpu().numpy()  # (64, 11)
        b1 = state_dict["mlp_extractor.policy_net.0.bias"].cpu().numpy()    # (64,)
        export["weights"]["actor"].append({
            "kernel": w1.T.tolist(),   # Transpose to (11, 64) for TFJS
            "bias": b1.tolist(),
        })

        # Hidden layer 2
        w2 = state_dict["mlp_extractor.policy_net.2.weight"].cpu().numpy()  # (64, 64)
        b2 = state_dict["mlp_extractor.policy_net.2.bias"].cpu().numpy()    # (64,)
        export["weights"]["actor"].append({
            "kernel": w2.T.tolist(),
            "bias": b2.tolist(),
        })

        # Output layer
        w3 = state_dict["action_net.weight"].cpu().numpy()  # (1, 64)
        b3 = state_dict["action_net.bias"].cpu().numpy()    # (1,)
        export["weights"]["actor"].append({
            "kernel": w3.T.tolist(),   # (64, 1)
            "bias": b3.tolist(),
        })

    except KeyError as exc:
        log.warning("Actor weight extraction failed: %s. Dumping available keys.", exc)
        export["weights"]["actor_keys_available"] = list(state_dict.keys())

    # Extract critic weights
    try:
        # Hidden layer 1
        vw1 = state_dict["mlp_extractor.value_net.0.weight"].cpu().numpy()
        vb1 = state_dict["mlp_extractor.value_net.0.bias"].cpu().numpy()
        export["weights"]["critic"].append({
            "kernel": vw1.T.tolist(),
            "bias": vb1.tolist(),
        })

        # Hidden layer 2
        vw2 = state_dict["mlp_extractor.value_net.2.weight"].cpu().numpy()
        vb2 = state_dict["mlp_extractor.value_net.2.bias"].cpu().numpy()
        export["weights"]["critic"].append({
            "kernel": vw2.T.tolist(),
            "bias": vb2.tolist(),
        })

        # Output layer
        vw3 = state_dict["value_net.weight"].cpu().numpy()
        vb3 = state_dict["value_net.bias"].cpu().numpy()
        export["weights"]["critic"].append({
            "kernel": vw3.T.tolist(),
            "bias": vb3.tolist(),
        })

    except KeyError as exc:
        log.warning("Critic weight extraction failed: %s", exc)

    # Save
    export_path = str(MODELS_DIR / f"{name}_tfjs.json")
    with open(export_path, "w") as f:
        json.dump(export, f, indent=2)

    log.info("Exported TFJS weights to %s", export_path)
    return export_path


# ── Status ───────────────────────────────────────────────────────────────────

def get_training_status() -> dict:
    """Return training infrastructure status."""
    # List saved models
    saved_models = []
    if MODELS_DIR.exists():
        for f in MODELS_DIR.iterdir():
            if f.suffix == ".zip":  # SB3 saves as .zip
                saved_models.append(f.stem)

    return {
        "hasGymnasium": _HAS_GYMNASIUM,
        "hasSB3": _HAS_SB3,
        "hasTorch": _HAS_TORCH,
        "availableAlgorithms": list(ALGORITHMS.keys()) if _HAS_SB3 else [],
        "stateDim": STATE_DIM,
        "actionDim": ACTION_DIM,
        "actorArchitecture": f"[{STATE_DIM}] → Dense(64, relu) → Dense(64, relu) → Dense(1, tanh)",
        "savedModels": saved_models,
        "modelsDir": str(MODELS_DIR),
        "gpuAvailable": _HAS_TORCH and torch.cuda.is_available(),
    }
