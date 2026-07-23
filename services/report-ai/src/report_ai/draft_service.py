import asyncio
import time
from dataclasses import dataclass

from .providers.base import DraftProvider, ReportDraft
from .providers.stub import StubProvider


@dataclass
class DraftResult:
    draft: ReportDraft
    provider: str
    elapsed_ms: int


class DraftService:
    """Runs the configured provider with a hard timeout.

    On timeout or provider failure it degrades to the deterministic stub —
    the radiologist always gets a draft to edit; the LLM is never on the
    critical path (AGENTS.md §10).
    """

    def __init__(self, provider: DraftProvider, timeout_seconds: float) -> None:
        self._provider = provider
        self._timeout_seconds = timeout_seconds
        self._fallback = StubProvider()

    async def draft(self, transcript: str, modality: str) -> DraftResult:
        started = time.monotonic()
        try:
            draft = await asyncio.wait_for(
                self._provider.draft(transcript, modality),
                timeout=self._timeout_seconds,
            )
            provider_name = self._provider.name
        except Exception:
            draft = await self._fallback.draft(transcript, modality)
            provider_name = (
                self._fallback.name
                if self._provider.name == self._fallback.name
                else f"{self._fallback.name}-fallback"
            )
        elapsed_ms = int((time.monotonic() - started) * 1000)
        return DraftResult(draft=draft, provider=provider_name, elapsed_ms=elapsed_ms)
