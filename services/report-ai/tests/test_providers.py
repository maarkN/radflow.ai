import asyncio

import pytest

from report_ai.config import Settings
from report_ai.draft_service import DraftService
from report_ai.providers.base import ReportDraft
from report_ai.providers.factory import get_provider
from report_ai.providers.stub import StubProvider


@pytest.mark.parametrize(
    ("transcript", "expected_critical"),
    [
        ("Large right-sided pneumothorax is present. Lungs otherwise clear.", True),
        ("No acute findings. Impression: normal chest CT.", False),
        ("Findings concerning for pulmonary embolism in the right lower lobe.", True),
    ],
)
def test_stub_detects_critical_findings(transcript: str, expected_critical: bool) -> None:
    draft = asyncio.run(StubProvider().draft(transcript, "CT"))
    assert (draft.critical_finding is not None) is expected_critical
    if expected_critical:
        assert draft.impression.startswith("CRITICAL:")


def test_stub_splits_impression_section() -> None:
    transcript = "Lungs are clear. No effusion. Impression: Normal study."
    draft = asyncio.run(StubProvider().draft(transcript, "CR"))
    assert draft.findings == "Lungs are clear. No effusion."
    assert draft.impression == "Normal study."
    assert draft.technique == "CR study as dictated."


def test_stub_is_deterministic() -> None:
    transcript = "Free air under the diaphragm."
    first = asyncio.run(StubProvider().draft(transcript, "CT"))
    second = asyncio.run(StubProvider().draft(transcript, "CT"))
    assert first == second


class TestProviderFactory:
    def test_uses_stub_when_no_key_is_configured(self) -> None:
        settings = Settings(ai_provider="anthropic", anthropic_api_key="")
        assert get_provider(settings).name == "stub"

    def test_uses_anthropic_when_key_present(self) -> None:
        settings = Settings(ai_provider="anthropic", anthropic_api_key="sk-test")
        assert get_provider(settings).name == "anthropic"

    def test_uses_openai_when_selected_and_key_present(self) -> None:
        settings = Settings(ai_provider="openai", openai_api_key="sk-test")
        assert get_provider(settings).name == "openai"

    def test_stub_can_be_forced(self) -> None:
        settings = Settings(ai_provider="stub", anthropic_api_key="sk-test")
        assert get_provider(settings).name == "stub"


class SlowProvider:
    name = "slow"

    async def draft(self, transcript: str, modality: str) -> ReportDraft:
        await asyncio.sleep(5)
        raise AssertionError("should have timed out")


class FailingProvider:
    name = "failing"

    async def draft(self, transcript: str, modality: str) -> ReportDraft:
        raise RuntimeError("llm down")


class TestDraftService:
    def test_falls_back_to_stub_on_timeout(self) -> None:
        service = DraftService(SlowProvider(), timeout_seconds=0.05)
        result = asyncio.run(service.draft("Lungs clear.", "CT"))
        assert result.provider == "stub-fallback"
        assert result.draft.findings == "Lungs clear."

    def test_falls_back_to_stub_on_provider_error(self) -> None:
        service = DraftService(FailingProvider(), timeout_seconds=1)
        result = asyncio.run(service.draft("Lungs clear.", "CT"))
        assert result.provider == "stub-fallback"

    def test_reports_the_real_provider_on_success(self) -> None:
        service = DraftService(StubProvider(), timeout_seconds=1)
        result = asyncio.run(service.draft("Lungs clear.", "CT"))
        assert result.provider == "stub"
        assert result.elapsed_ms >= 0
