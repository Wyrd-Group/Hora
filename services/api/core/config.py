from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
_ENV_FILE = _PROJECT_ROOT / ".env" if (_PROJECT_ROOT / ".env").exists() else ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_ENV_FILE), extra="ignore")

    database_url: str = "postgresql://mss:mssdev@localhost:5432/mss"
    redis_url: str    = "redis://localhost:6379"
    ollama_url: str   = "http://localhost:11434"
    ollama_chat_model: str  = "llama3:8b"
    ollama_embed_model: str = "nomic-embed-text"
    app_version: str  = "0.1.0"
    log_level: str    = "info"
    air_gap_mode: bool = False


settings = Settings()
