"""
ML Benchmark Data Feed Module
Provides datasets for benchmark framework engines (SWE-bench, MLE-STAR, ML scenarios)

Usage:
    from data_feeds.ml_benchmarks import MLBenchmarkFeed
    feed = MLBenchmarkFeed()

    # Classification dataset
    X, y, meta = feed.get_classification_dataset('iris')

    # Regression dataset
    X, y, meta = feed.get_regression_dataset('diabetes')

    # Anomaly detection dataset
    X, y, meta = feed.get_anomaly_dataset()

    # Time series dataset
    series, meta = feed.get_timeseries_dataset()
"""

import logging
from typing import Optional
import numpy as np

logger = logging.getLogger(__name__)


class MLBenchmarkFeed:
    """Provides ML benchmark datasets from scikit-learn, OpenML, and synthetic generators."""

    def __init__(self, seed: int = 42):
        self.seed = seed
        self._sklearn = None
        self._openml = None

    def _ensure_sklearn(self):
        if self._sklearn is None:
            import sklearn.datasets
            self._sklearn = sklearn.datasets
        return self._sklearn

    def _try_openml(self):
        if self._openml is None:
            try:
                import openml
                self._openml = openml
            except ImportError:
                logger.info("OpenML not installed. Using sklearn built-ins. Install: pip install openml")
                self._openml = False
        return self._openml if self._openml else None

    # ─── Classification ───────────────────────────────────────

    def get_classification_dataset(self, name: str = 'iris',
                                    n_samples: int = 1000,
                                    n_features: int = 20) -> tuple:
        """
        Get a classification dataset.

        Built-in names: 'iris', 'digits', 'wine', 'breast_cancer', 'synthetic'
        Or pass an OpenML dataset ID as integer string: '61' (iris), '40996' (Fashion-MNIST)

        Returns: (X: np.ndarray, y: np.ndarray, meta: dict)
        """
        ds = self._ensure_sklearn()

        builtins = {
            'iris': lambda: ds.load_iris(return_X_y=True),
            'digits': lambda: ds.load_digits(return_X_y=True),
            'wine': lambda: ds.load_wine(return_X_y=True),
            'breast_cancer': lambda: ds.load_breast_cancer(return_X_y=True),
        }

        if name in builtins:
            X, y = builtins[name]()
            meta = {'name': name, 'source': 'sklearn', 'n_samples': len(X),
                    'n_features': X.shape[1], 'n_classes': len(np.unique(y))}
            logger.info(f"Loaded {name}: {X.shape}")
            return X, y, meta

        # Try OpenML
        if name.isdigit():
            oml = self._try_openml()
            if oml:
                try:
                    dataset = oml.datasets.get_dataset(int(name))
                    X, y, _, _ = dataset.get_data(target=dataset.default_target_attribute)
                    X = X.values if hasattr(X, 'values') else np.array(X)
                    y = y.values if hasattr(y, 'values') else np.array(y)
                    meta = {'name': dataset.name, 'source': 'openml', 'id': name,
                            'n_samples': len(X), 'n_features': X.shape[1]}
                    logger.info(f"Loaded OpenML #{name} ({dataset.name}): {X.shape}")
                    return X, y, meta
                except Exception as e:
                    logger.warning(f"OpenML dataset {name} failed: {e}")

        # Fallback: synthetic
        X, y = ds.make_classification(
            n_samples=n_samples, n_features=n_features, n_informative=n_features // 2,
            n_classes=min(5, n_features // 4 + 2), random_state=self.seed
        )
        meta = {'name': 'synthetic', 'source': 'sklearn.make_classification',
                'n_samples': n_samples, 'n_features': n_features, 'n_classes': len(np.unique(y))}
        logger.info(f"Generated synthetic classification: {X.shape}")
        return X, y, meta

    # ─── Regression ───────────────────────────────────────────

    def get_regression_dataset(self, name: str = 'diabetes',
                                n_samples: int = 1000,
                                n_features: int = 20) -> tuple:
        """
        Get a regression dataset.

        Built-in names: 'diabetes', 'california_housing', 'synthetic'

        Returns: (X: np.ndarray, y: np.ndarray, meta: dict)
        """
        ds = self._ensure_sklearn()

        if name == 'diabetes':
            X, y = ds.load_diabetes(return_X_y=True)
            meta = {'name': 'diabetes', 'source': 'sklearn', 'n_samples': len(X), 'n_features': X.shape[1]}
            return X, y, meta

        if name == 'california_housing':
            X, y = ds.fetch_california_housing(return_X_y=True)
            meta = {'name': 'california_housing', 'source': 'sklearn', 'n_samples': len(X), 'n_features': X.shape[1]}
            return X, y, meta

        # Synthetic
        X, y = ds.make_regression(
            n_samples=n_samples, n_features=n_features, n_informative=n_features // 2,
            noise=10.0, random_state=self.seed
        )
        meta = {'name': 'synthetic', 'source': 'sklearn.make_regression',
                'n_samples': n_samples, 'n_features': n_features}
        return X, y, meta

    # ─── Anomaly Detection ────────────────────────────────────

    def get_anomaly_dataset(self, n_samples: int = 1000,
                             contamination: float = 0.05) -> tuple:
        """
        Get an anomaly detection dataset.

        Returns: (X: np.ndarray, y: np.ndarray, meta: dict)
            y: 0=normal, 1=anomaly
        """
        ds = self._ensure_sklearn()

        n_outliers = int(n_samples * contamination)
        n_inliers = n_samples - n_outliers

        # Generate inlier blob
        rng = np.random.RandomState(self.seed)
        X_inliers = 0.3 * rng.randn(n_inliers, 6) + np.array([0, 0, 0, 0, 0, 0])

        # Generate outliers in different regions
        X_outliers = rng.uniform(low=-4, high=4, size=(n_outliers, 6))

        X = np.vstack([X_inliers, X_outliers])
        y = np.hstack([np.zeros(n_inliers), np.ones(n_outliers)])

        # Shuffle
        idx = rng.permutation(len(X))
        X, y = X[idx], y[idx]

        meta = {'name': 'synthetic_anomaly', 'source': 'generated',
                'n_samples': n_samples, 'n_features': 6, 'contamination': contamination,
                'feature_names': ['speed', 'heading_sin', 'heading_cos', 'altitude', 'lat', 'lon']}

        logger.info(f"Generated anomaly dataset: {X.shape}, {n_outliers} outliers")
        return X, y, meta

    # ─── Clustering ───────────────────────────────────────────

    def get_clustering_dataset(self, n_samples: int = 500,
                                n_clusters: int = 5) -> tuple:
        """
        Get a clustering dataset with known ground truth.

        Returns: (X: np.ndarray, y: np.ndarray, meta: dict)
        """
        ds = self._ensure_sklearn()
        X, y = ds.make_blobs(
            n_samples=n_samples, n_features=2, centers=n_clusters,
            cluster_std=1.0, random_state=self.seed
        )
        meta = {'name': 'synthetic_blobs', 'source': 'sklearn.make_blobs',
                'n_samples': n_samples, 'n_clusters': n_clusters}
        return X, y, meta

    # ─── Time Series ──────────────────────────────────────────

    def get_timeseries_dataset(self, n_points: int = 1000,
                                n_series: int = 5,
                                with_anomalies: bool = True) -> tuple:
        """
        Get synthetic time series data for forecasting benchmarks.

        Returns: (series: dict[str, np.ndarray], meta: dict)
        """
        rng = np.random.RandomState(self.seed)
        series = {}

        for i in range(n_series):
            # Base: trend + seasonality + noise
            t = np.arange(n_points)
            trend = 0.01 * t * (1 + 0.5 * rng.randn())
            seasonal = 10 * np.sin(2 * np.pi * t / (50 + 20 * rng.randn()))
            noise = rng.randn(n_points) * (2 + rng.rand())

            base = 100 + trend + seasonal + noise

            # Inject anomalies
            if with_anomalies and i < 3:
                n_anomalies = rng.randint(3, 8)
                for _ in range(n_anomalies):
                    idx = rng.randint(50, n_points - 50)
                    base[idx] += rng.choice([-1, 1]) * rng.uniform(15, 40)

            series[f'series_{i}'] = base.astype(np.float64)

        meta = {'name': 'synthetic_timeseries', 'source': 'generated',
                'n_series': n_series, 'n_points': n_points, 'has_anomalies': with_anomalies}

        logger.info(f"Generated {n_series} time series × {n_points} points")
        return series, meta

    # ─── SWE-bench ────────────────────────────────────────────

    def get_swe_bench_tasks(self, n_tasks: int = 10) -> list[dict]:
        """
        Get SWE-bench-style code tasks for the SWE-bench engine.
        Tries Hugging Face datasets first, falls back to synthetic tasks.

        Returns: list[dict] with keys: id, category, description, input_code, expected_output, test_cases
        """
        # Try Hugging Face
        try:
            from datasets import load_dataset
            ds = load_dataset("princeton-nlp/SWE-bench_Lite", split="test")
            tasks = []
            for i, row in enumerate(ds):
                if i >= n_tasks:
                    break
                tasks.append({
                    'id': row.get('instance_id', f'swe-{i}'),
                    'category': 'bug_fix',
                    'description': row.get('problem_statement', ''),
                    'input_code': row.get('patch', ''),
                    'expected_output': row.get('test_patch', ''),
                    'test_cases': [],
                    'difficulty': 'medium',
                    'metadata': {'repo': row.get('repo', ''), 'source': 'swe-bench-lite'}
                })
            if tasks:
                logger.info(f"Loaded {len(tasks)} SWE-bench Lite tasks from Hugging Face")
                return tasks
        except Exception as e:
            logger.info(f"SWE-bench from HuggingFace unavailable: {e}")

        # Fallback: synthetic code tasks
        tasks = [
            {
                'id': 'task-001', 'category': 'bug_fix', 'difficulty': 'easy',
                'description': 'Fix the off-by-one error in binary search',
                'input_code': 'def binary_search(arr, target):\n    lo, hi = 0, len(arr)\n    while lo < hi:\n        mid = (lo + hi) // 2\n        if arr[mid] == target: return mid\n        elif arr[mid] < target: lo = mid\n        else: hi = mid\n    return -1',
                'expected_output': 'def binary_search(arr, target):\n    lo, hi = 0, len(arr) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if arr[mid] == target: return mid\n        elif arr[mid] < target: lo = mid + 1\n        else: hi = mid - 1\n    return -1',
                'test_cases': ['assert binary_search([1,2,3,4,5], 3) == 2', 'assert binary_search([1,2,3], 4) == -1'],
            },
            {
                'id': 'task-002', 'category': 'code_generation', 'difficulty': 'medium',
                'description': 'Implement a LRU cache with O(1) get and put',
                'input_code': '# Implement LRUCache class with get(key) and put(key, value) methods\n# capacity is set in __init__',
                'expected_output': '',  # Multiple valid implementations
                'test_cases': ['cache = LRUCache(2)', 'cache.put(1, 1)', 'cache.put(2, 2)', 'assert cache.get(1) == 1'],
            },
            {
                'id': 'task-003', 'category': 'refactoring', 'difficulty': 'easy',
                'description': 'Refactor nested loops into list comprehension',
                'input_code': 'result = []\nfor i in range(10):\n    for j in range(10):\n        if i != j:\n            result.append((i, j))',
                'expected_output': 'result = [(i, j) for i in range(10) for j in range(10) if i != j]',
                'test_cases': ['assert len(result) == 90'],
            },
            {
                'id': 'task-004', 'category': 'bug_fix', 'difficulty': 'medium',
                'description': 'Fix the race condition in the thread-safe counter',
                'input_code': 'class Counter:\n    def __init__(self):\n        self.count = 0\n    def increment(self):\n        self.count += 1\n    def get(self):\n        return self.count',
                'expected_output': 'import threading\nclass Counter:\n    def __init__(self):\n        self.count = 0\n        self._lock = threading.Lock()\n    def increment(self):\n        with self._lock:\n            self.count += 1\n    def get(self):\n        with self._lock:\n            return self.count',
                'test_cases': [],
            },
            {
                'id': 'task-005', 'category': 'code_generation', 'difficulty': 'hard',
                'description': 'Implement Dijkstra shortest path algorithm',
                'input_code': '# Implement dijkstra(graph, start) where graph is adjacency dict\n# graph = {node: [(neighbor, weight), ...]}',
                'expected_output': '',
                'test_cases': ['assert dijkstra({"A": [("B", 1), ("C", 4)], "B": [("C", 2)], "C": []}, "A") == {"A": 0, "B": 1, "C": 3}'],
            },
        ]

        logger.info(f"Generated {len(tasks[:n_tasks])} synthetic SWE-bench tasks")
        return tasks[:n_tasks]

    # ─── Convenience ──────────────────────────────────────────

    def bootstrap(self):
        """Pre-generate and verify all benchmark datasets."""
        print("[MLBenchmarkFeed] Bootstrapping ML benchmark datasets...")

        # Classification
        for name in ['iris', 'digits', 'wine', 'breast_cancer']:
            X, y, meta = self.get_classification_dataset(name)
            print(f"  ✓ {name}: {X.shape}, {meta['n_classes'] if 'n_classes' in meta else '?'} classes")

        # Regression
        for name in ['diabetes']:
            X, y, meta = self.get_regression_dataset(name)
            print(f"  ✓ {name}: {X.shape}")

        # Anomaly detection
        X, y, meta = self.get_anomaly_dataset()
        print(f"  ✓ anomaly: {X.shape}, {int(y.sum())} outliers")

        # Clustering
        X, y, meta = self.get_clustering_dataset()
        print(f"  ✓ clustering: {X.shape}, {meta['n_clusters']} clusters")

        # Time series
        series, meta = self.get_timeseries_dataset()
        print(f"  ✓ timeseries: {meta['n_series']} series × {meta['n_points']} points")

        # SWE-bench tasks
        tasks = self.get_swe_bench_tasks()
        print(f"  ✓ swe-bench: {len(tasks)} tasks")

        print("[MLBenchmarkFeed] ✓ Bootstrap complete")


# ─── Quick test ───────────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    feed = MLBenchmarkFeed()
    feed.bootstrap()
    print("\n✅ All ML benchmark feeds working")
