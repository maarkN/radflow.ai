from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8000

    ai_provider: Literal["anthropic", "openai", "stub"] = "anthropic"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-opus-4-8"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    # A slow/unavailable LLM must never block manual reporting (AGENTS.md §10).
    ai_timeout_seconds: float = 8.0
