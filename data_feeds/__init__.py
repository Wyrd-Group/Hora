"""
Quadratic Data Feeds — Unified data provisioning for all engines.

Usage:
    from data_feeds.market_data import MarketDataFeed
    from data_feeds.ais_data import AISDataFeed
    from data_feeds.ml_benchmarks import MLBenchmarkFeed
"""

try:
    from data_feeds.market_data import MarketDataFeed
    from data_feeds.ais_data import AISDataFeed
    from data_feeds.ml_benchmarks import MLBenchmarkFeed
    __all__ = ['MarketDataFeed', 'AISDataFeed', 'MLBenchmarkFeed']
except ImportError:
    # Allow individual imports to work even if package import fails
    pass
