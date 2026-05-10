from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str   = "postgresql://mss:mssdev@localhost:5432/mss"
    redis_url: str      = "redis://localhost:6379"
    ollama_url: str     = "http://localhost:11434"
    ollama_embed_model: str = "nomic-embed-text"
    ollama_chat_model:  str = "llama3:8b"

    # External data sources
    opensky_username: str = ""
    opensky_password: str = ""
    aisstream_api_key: str = ""
    gdelt_api_url: str = "https://api.gdeltproject.org/api/v2/doc/doc"
    acled_api_key: str = ""
    acled_email: str = ""

    # Operations
    air_gap_mode: bool  = False
    log_level: str      = "info"
    poll_interval_sec: float = 30.0
    gdelt_interval_sec: float = 300.0

    # Financial data (yfinance)
    yfinance_daily_interval_sec: float = 21600.0   # 6h — fetch daily bars 4x/day
    yfinance_intraday_interval_sec: float = 300.0  # 5min — fetch intraday bars
    yfinance_intraday_enabled: bool = False         # Off by default (Yahoo rate limits)
    yfinance_max_concurrent: int = 5                # Max parallel fetches
    yfinance_batch_delay: float = 0.5               # Delay between batches (seconds)


settings = Settings()
