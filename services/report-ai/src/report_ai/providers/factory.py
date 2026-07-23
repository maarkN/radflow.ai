from ..config import Settings
from .anthropic_provider import AnthropicProvider
from .base import DraftProvider
from .openai_provider import OpenAIProvider
from .stub import StubProvider


def get_provider(settings: Settings) -> DraftProvider:
    """Selects the draft provider from configuration.

    Falls back to the deterministic stub whenever the configured provider has
    no API key — the service must always be able to produce a draft.
    """
    if settings.ai_provider == "anthropic" and settings.anthropic_api_key:
        return AnthropicProvider(settings.anthropic_api_key, settings.anthropic_model)
    if settings.ai_provider == "openai" and settings.openai_api_key:
        return OpenAIProvider(settings.openai_api_key, settings.openai_model)
    return StubProvider()
