#!/usr/bin/env python3
"""
Test script for Quadratic API Server.

Validates endpoints and engine availability.

Usage:
    python test_api.py [--host localhost] [--port 8888] [--verbose]
"""

import argparse
import json
import sys
import time
from typing import Any, Dict

try:
    import requests
except ImportError:
    print("Error: 'requests' module not found. Install with: pip install requests")
    sys.exit(1)


class APITester:
    """Test Quadratic API endpoints."""

    def __init__(self, host: str = "localhost", port: int = 8888, verbose: bool = False):
        self.base_url = f"http://{host}:{port}"
        self.verbose = verbose
        self.passed = 0
        self.failed = 0
        self.skipped = 0

    def log(self, message: str, level: str = "INFO"):
        """Log a message."""
        if self.verbose or level in ("ERROR", "WARN"):
            timestamp = time.strftime("%H:%M:%S")
            print(f"[{timestamp}] {level:8} {message}")

    def test(self, name: str, method: str, endpoint: str, data: Dict[str, Any] = None, expected_status: int = 200):
        """Test an endpoint."""
        try:
            url = f"{self.base_url}{endpoint}"
            self.log(f"Testing: {method} {endpoint}")

            if method == "GET":
                response = requests.get(url, timeout=5)
            elif method == "POST":
                response = requests.post(url, json=data, timeout=5)
            else:
                raise ValueError(f"Unsupported method: {method}")

            if response.status_code == expected_status:
                self.log(f"✓ {name} [{response.status_code}]")
                self.passed += 1

                # Validate response format
                try:
                    resp_json = response.json()
                    if "status" in resp_json and "timestamp" in resp_json:
                        self.log(f"  Response format valid", level="DEBUG")
                    else:
                        self.log(f"  Warning: Response missing standard fields", level="WARN")
                except json.JSONDecodeError:
                    self.log(f"  Warning: Response not valid JSON", level="WARN")

                return True
            else:
                self.log(f"✗ {name} [got {response.status_code}, expected {expected_status}]", level="ERROR")
                self.failed += 1
                return False

        except requests.ConnectionError:
            self.log(f"✗ {name} [Connection refused]", level="ERROR")
            self.skipped += 1
            return False
        except requests.Timeout:
            self.log(f"✗ {name} [Timeout]", level="ERROR")
            self.failed += 1
            return False
        except Exception as e:
            self.log(f"✗ {name} [{str(e)}]", level="ERROR")
            self.failed += 1
            return False

    def run_tests(self):
        """Run all tests."""
        print("=" * 80)
        print("Quadratic API Test Suite")
        print("=" * 80)
        print()

        # Health & Status
        print("Health & Status Endpoints")
        print("-" * 40)
        self.test("Health check", "GET", "/")
        self.test("Engine status", "GET", "/api/status")
        print()

        # Portfolio
        print("Portfolio Endpoints")
        print("-" * 40)
        self.test(
            "Portfolio optimize",
            "POST",
            "/api/portfolio/optimize",
            {
                "tickers": ["AAPL", "MSFT"],
                "start": "2024-01-01",
                "method": "CVaR",
                "objective": "MinRisk",
            },
        )
        self.test("Portfolio returns", "GET", "/api/portfolio/returns?tickers=AAPL,MSFT&start=2024-01-01")
        print()

        # Forecasting
        print("Forecasting Endpoints")
        print("-" * 40)
        self.test(
            "Forecast single",
            "POST",
            "/api/forecast/AAPL",
            {
                "start": "2024-01-01",
                "horizon": 30,
                "model_key": "bolt-small",
            },
        )
        self.test(
            "Forecast multi",
            "POST",
            "/api/forecast/multi",
            {
                "tickers": ["AAPL", "MSFT"],
                "start": "2024-01-01",
                "horizon": 30,
            },
        )
        print()

        # Market Data
        print("Market Data Endpoints")
        print("-" * 40)
        self.test("OHLCV data", "GET", "/api/market/ohlcv/AAPL?start=2024-01-01")
        print()

        # Anomaly Detection
        print("Anomaly Detection Endpoints")
        print("-" * 40)
        self.test(
            "Anomaly scan",
            "POST",
            "/api/anomaly/scan",
            {
                "n": 100,
                "scenario": "default",
                "include_anomalies": True,
            },
        )
        self.test(
            "Anomaly analyze",
            "POST",
            "/api/anomaly/analyze",
            {
                "entities": [
                    {"uid": "entity_1", "value": 100},
                    {"uid": "entity_2", "value": 200},
                ],
            },
        )
        print()

        # Threat Analysis
        print("Threat Analysis Endpoints")
        print("-" * 40)
        self.test(
            "Threat rank",
            "POST",
            "/api/threat/rank",
            {
                "entities": [
                    {"uid": "entity_1"},
                    {"uid": "entity_2"},
                ],
                "min_score": 0,
            },
        )
        print()

        # Clustering
        print("Clustering Endpoints")
        print("-" * 40)
        self.test(
            "DBSCAN cluster",
            "POST",
            "/api/clustering/dbscan",
            {
                "entities": [
                    {"uid": "entity_1", "lat": 40.0, "lon": -74.0},
                    {"uid": "entity_2", "lat": 40.1, "lon": -74.1},
                ],
                "eps_nm": 30.0,
                "min_pts": 3,
            },
        )
        print()

        # Link Analysis
        print("Link Analysis Endpoints")
        print("-" * 40)
        self.test(
            "Link graph",
            "POST",
            "/api/links/graph",
            {
                "entities": [
                    {"uid": "entity_1"},
                    {"uid": "entity_2"},
                ],
            },
        )
        print()

        # Kalman Filtering
        print("Kalman Filtering Endpoints")
        print("-" * 40)
        self.test(
            "Kalman track",
            "POST",
            "/api/kalman/track",
            {
                "tracks": {
                    "track_1": [[40.0, -74.0, 100.0], [40.1, -74.1, 101.0]],
                },
            },
        )
        print()

        # Explainability
        print("Explainability Endpoints")
        print("-" * 40)
        self.test(
            "Explain threat",
            "POST",
            "/api/explain/threat",
            {
                "entity": {"uid": "entity_1"},
                "threat_result": {"score": 0.8, "type": "behavioral"},
            },
        )
        print()

        # Market Intelligence
        print("Market Intelligence Endpoints")
        print("-" * 40)
        self.test("Predictions scan", "GET", "/api/predictions/scan")
        self.test("Sports scores", "GET", "/api/sports/scores/NFL")
        print()

        # Sentinel
        print("Sentinel Endpoints")
        print("-" * 40)
        self.test("Sentinel status", "GET", "/api/sentinel/status")
        self.test(
            "Sentinel config",
            "POST",
            "/api/sentinel/config",
            {
                "threat_threshold": 0.75,
                "anomaly_threshold": 0.65,
            },
        )
        self.test("Sentinel alerts", "GET", "/api/sentinel/alerts")
        print()

        # Summary
        print("=" * 80)
        print("Test Summary")
        print("=" * 80)
        total = self.passed + self.failed + self.skipped
        print(f"Passed:  {self.passed}")
        print(f"Failed:  {self.failed}")
        print(f"Skipped: {self.skipped}")
        print(f"Total:   {total}")
        print()

        if self.failed == 0 and self.skipped == 0:
            print("✓ All tests passed!")
            return 0
        elif self.skipped > 0:
            print(f"⚠ Server not responding (run 'python server.py' first)")
            return 1
        else:
            print(f"✗ {self.failed} test(s) failed")
            return 1


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Test Quadratic API")
    parser.add_argument("--host", default="localhost", help="API host (default: localhost)")
    parser.add_argument("--port", type=int, default=8888, help="API port (default: 8888)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")

    args = parser.parse_args()

    tester = APITester(host=args.host, port=args.port, verbose=args.verbose)
    exit_code = tester.run_tests()

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
