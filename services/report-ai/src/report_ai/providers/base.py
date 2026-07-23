from typing import Protocol

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ReportDraft(BaseModel):
    """Structured radiology report draft produced from a dictation transcript."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    technique: str
    findings: str
    impression: str
    critical_finding: str | None = None


class DraftProvider(Protocol):
    """Anything that can turn a transcript into a structured report draft."""

    name: str

    async def draft(self, transcript: str, modality: str) -> ReportDraft: ...
