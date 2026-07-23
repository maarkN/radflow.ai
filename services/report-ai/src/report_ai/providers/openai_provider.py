from openai import AsyncOpenAI

from .anthropic_provider import SYSTEM_PROMPT
from .base import ReportDraft


class OpenAIProvider:
    name = "openai"

    def __init__(self, api_key: str, model: str = "gpt-4o") -> None:
        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model

    async def draft(self, transcript: str, modality: str) -> ReportDraft:
        response = await self._client.chat.completions.parse(
            model=self._model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Modality: {modality}\n\nDictation transcript:\n{transcript}",
                },
            ],
            response_format=ReportDraft,
        )
        parsed = response.choices[0].message.parsed
        if parsed is None:
            raise RuntimeError("OpenAI response did not match the ReportDraft schema")
        return parsed
