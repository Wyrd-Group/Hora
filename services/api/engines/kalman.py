"""
2D Constant-Velocity Kalman Filter — pure Python, zero dependencies.

State vector:  X = [lat, lon, d_lat, d_lon]   (position + velocity in deg/sec)
Measurement:   Z = [lat, lon]

Usage:
    kf = KalmanFilter()
    for (lat, lon, t) in track:
        kf.update(lat, lon, t)
    pred_lat, pred_lon = kf.predict(horizon_sec=300)  # 5-min ahead
"""
from __future__ import annotations

import math
import time
from dataclasses import dataclass, field
from typing import Optional

# Earth radius for deg→metre conversion
_EARTH_M = 6_371_000.0


def _deg_to_m(deg: float, lat: float = 0.0) -> float:
    """Convert degrees longitude/latitude to metres at given latitude."""
    return deg * (math.pi / 180.0) * _EARTH_M * math.cos(math.radians(lat))


@dataclass
class KalmanFilter:
    """
    4-state Kalman filter: [lat, lon, vlat, vlon].

    Tuning knobs (all in degree units):
      process_noise  — how much we trust the motion model (lower = smoother)
      meas_noise_pos — measurement uncertainty per source type
    """
    process_noise: float   = 1e-8    # deg²/s²  — constant velocity assumption
    meas_noise:    float   = 1e-5    # deg²     — sensor noise

    # State
    _x:  list[float] = field(default_factory=lambda: [0.0] * 4)
    # Covariance (flattened 4×4, stored as list of 16)
    _P:  list[float] = field(default_factory=lambda: [
        1e-4, 0,    0,    0,
        0,    1e-4, 0,    0,
        0,    0,    1e-6, 0,
        0,    0,    0,    1e-6,
    ])
    _t:  Optional[float] = None      # last update timestamp
    _initialized: bool = False

    # ── Matrix helpers (row-major, 4×4) ───────────────────────────────────────

    @staticmethod
    def _matmul(A: list[float], B: list[float]) -> list[float]:
        """4×4 × 4×4 → 4×4."""
        n = 4
        C = [0.0] * 16
        for i in range(n):
            for j in range(n):
                for k in range(n):
                    C[i*n+j] += A[i*n+k] * B[k*n+j]
        return C

    @staticmethod
    def _matT(A: list[float]) -> list[float]:
        """Transpose 4×4."""
        n = 4
        return [A[j*n+i] for i in range(n) for j in range(n)]

    @staticmethod
    def _mat2x4_mul_4x4(A2: list[float], B: list[float]) -> list[float]:
        """2×4 × 4×4 → 2×4."""
        C = [0.0] * 8
        for i in range(2):
            for j in range(4):
                for k in range(4):
                    C[i*4+j] += A2[i*4+k] * B[k*4+j]
        return C

    @staticmethod
    def _mat4x4_mul_4x2(A: list[float], B2: list[float]) -> list[float]:
        """4×4 × 4×2 → 4×2."""
        C = [0.0] * 8
        for i in range(4):
            for j in range(2):
                for k in range(4):
                    C[i*2+j] += A[i*4+k] * B2[k*2+j]
        return C

    @staticmethod
    def _inv2x2(M: list[float]) -> list[float]:
        """Invert 2×2 matrix."""
        a, b, c, d = M
        det = a * d - b * c
        if abs(det) < 1e-20:
            det = 1e-20
        return [d/det, -b/det, -c/det, a/det]

    # ── Public API ─────────────────────────────────────────────────────────────

    def update(self, lat: float, lon: float, t: Optional[float] = None) -> None:
        """Incorporate a new measurement."""
        now = t if t is not None else time.monotonic()

        if not self._initialized:
            self._x = [lat, lon, 0.0, 0.0]
            self._t = now
            self._initialized = True
            return

        dt = max(now - self._t, 0.001)
        self._t = now

        # ── Predict ────────────────────────────────────────────────────────────
        # State transition: F = [[1,0,dt,0],[0,1,0,dt],[0,0,1,0],[0,0,0,1]]
        F = [
            1, 0, dt, 0,
            0, 1, 0,  dt,
            0, 0, 1,  0,
            0, 0, 0,  1,
        ]
        x = self._x
        # x_pred = F @ x
        x_pred = [
            x[0] + dt * x[2],
            x[1] + dt * x[3],
            x[2],
            x[3],
        ]
        # Q (process noise)
        q = self.process_noise * dt * dt
        Q = [
            q, 0, 0, 0,
            0, q, 0, 0,
            0, 0, q, 0,
            0, 0, 0, q,
        ]
        # P_pred = F @ P @ F.T + Q
        FP   = self._matmul(F, self._P)
        FPFt = self._matmul(FP, self._matT(F))
        P_pred = [FPFt[i] + Q[i] for i in range(16)]

        # ── Update ─────────────────────────────────────────────────────────────
        # H = [[1,0,0,0],[0,1,0,0]]  (measurement matrix)
        H2 = [1, 0, 0, 0,
              0, 1, 0, 0]

        # S = H @ P_pred @ H.T + R
        HP   = self._mat2x4_mul_4x4(H2, P_pred)
        # HP is 2×4; HP @ H.T (H.T is 4×2) → but H.T in 2×4 sense:
        # S[i,j] = sum_k HP[i,k] * H[j,k]
        S = [
            HP[0]*H2[0] + HP[1]*H2[1] + HP[2]*H2[2] + HP[3]*H2[3],   # S[0,0]
            HP[0]*H2[4] + HP[1]*H2[5] + HP[2]*H2[6] + HP[3]*H2[7],   # S[0,1]
            HP[4]*H2[0] + HP[5]*H2[1] + HP[6]*H2[2] + HP[7]*H2[3],   # S[1,0]
            HP[4]*H2[4] + HP[5]*H2[5] + HP[6]*H2[6] + HP[7]*H2[7],   # S[1,1]
        ]
        r = self.meas_noise
        S[0] += r; S[3] += r

        S_inv = self._inv2x2(S)

        # K = P_pred @ H.T @ S_inv  (4×2)
        # P_pred @ H.T → 4×2
        Ht2 = [H2[0], H2[4],
               H2[1], H2[5],
               H2[2], H2[6],
               H2[3], H2[7]]
        PHt = self._mat4x4_mul_4x2(P_pred, Ht2)
        # K = PHt @ S_inv  (4×2 × 2×2 → 4×2)
        K = [0.0] * 8
        for i in range(4):
            for j in range(2):
                for k in range(2):
                    K[i*2+j] += PHt[i*2+k] * S_inv[k*2+j]

        # innovation y = z - H @ x_pred
        y = [lat - x_pred[0], lon - x_pred[1]]

        # x_new = x_pred + K @ y
        self._x = [
            x_pred[0] + K[0]*y[0] + K[1]*y[1],
            x_pred[1] + K[2]*y[0] + K[3]*y[1],
            x_pred[2] + K[4]*y[0] + K[5]*y[1],
            x_pred[3] + K[6]*y[0] + K[7]*y[1],
        ]

        # P_new = (I - K @ H) @ P_pred
        I_KH = [
            1 - K[0]*H2[0], -K[0]*H2[4], -K[1]*H2[0], -K[1]*H2[4],
           -K[2]*H2[0], 1 - K[2]*H2[4], -K[3]*H2[0], -K[3]*H2[4],
           -K[4]*H2[0],    -K[4]*H2[4], 1-K[5]*H2[0], -K[5]*H2[4],
           -K[6]*H2[0],    -K[6]*H2[4],  -K[7]*H2[0], 1-K[7]*H2[4],
        ]
        self._P = self._matmul(I_KH, P_pred)

    def predict(self, horizon_sec: float = 300.0) -> tuple[float, float]:
        """Return predicted (lat, lon) T seconds from last update."""
        if not self._initialized:
            raise RuntimeError("KalmanFilter has no data yet — call update() first")
        lat = self._x[0] + self._x[2] * horizon_sec
        lon = self._x[1] + self._x[3] * horizon_sec
        return round(lat, 6), round(lon, 6)

    def velocity_kts(self) -> float:
        """Return estimated current speed in knots."""
        vlat = self._x[2]   # deg/s
        vlon = self._x[3]
        lat  = self._x[0]
        # Convert deg/s → m/s
        ms_lat = vlat * (math.pi / 180) * _EARTH_M
        ms_lon = vlon * (math.pi / 180) * _EARTH_M * math.cos(math.radians(lat))
        ms     = math.sqrt(ms_lat**2 + ms_lon**2)
        return ms * 1.944  # m/s → kts


# ── Entity-level filter registry (uid → KalmanFilter) ─────────────────────────
_filters: dict[str, KalmanFilter] = {}


def smooth_entity(uid: str, lat: float, lon: float, t: Optional[float] = None,
                  meas_noise: float = 1e-5) -> tuple[float, float]:
    """Feed a new measurement into this entity's filter; return smoothed position."""
    kf = _filters.get(uid)
    if kf is None:
        kf = KalmanFilter(meas_noise=meas_noise)
        _filters[uid] = kf
    kf.update(lat, lon, t)
    return kf._x[0], kf._x[1]


def predict_entity(uid: str, horizon_sec: float = 300.0) -> Optional[tuple[float, float]]:
    """Return predicted position for an entity, or None if no track data."""
    kf = _filters.get(uid)
    if kf is None or not kf._initialized:
        return None
    return kf.predict(horizon_sec)


# Measurement noise presets per source
SOURCE_NOISE: dict[str, float] = {
    "ADS-B": 1e-6,    # GPS-grade, very accurate
    "AIS":   5e-6,    # GPS but less frequent
    "CoT":   1e-5,    # varies by sensor
    "OSINT": 1e-3,    # reported positions, imprecise
    "MANUAL": 1e-3,
}
