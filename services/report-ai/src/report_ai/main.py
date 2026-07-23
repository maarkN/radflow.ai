from functools import lru_cache
from typing import Literal

from fastapi import Depends, FastAPI
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from .config import Settings
from .draft_service import DraftService
from .providers.factory import get_provider

app = FastAPI(title="RadFlow Report AI", version="0.1.0")


@lru_cache
def get_settings() -> Settings:
    return Settings()


@lru_cache
def get_draft_service() -> DraftService:
    settings = get_settings()
    return DraftService(get_provider(settings), settings.ai_timeout_seconds)


class DraftRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    transcript: str = Field(min_length=1)
    modality: Literal["CT", "MR", "CR", "US"]


class DraftResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    technique: str
    findings: str
    impression: str
    critical_finding: str | None
    provider: str
    elapsed_ms: int


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/reports/draft", response_model=DraftResponse, response_model_by_alias=True)
async def draft_report(
    request: DraftRequest,
    service: DraftService = Depends(get_draft_service),  # noqa: B008
) -> DraftResponse:
    result = await service.draft(request.transcript, request.modality)
    return DraftResponse(
        technique=result.draft.technique,
        findings=result.draft.findings,
        impression=result.draft.impression,
        critical_finding=result.draft.critical_finding,
        provider=result.provider,
        elapsed_ms=result.elapsed_ms,
    )
