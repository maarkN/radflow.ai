from anthropic import AsyncAnthropic

from .base import ReportDraft

SYSTEM_PROMPT = (
    "You are a radiology reporting assistant. Structure the dictated transcript "
    "into a formal radiology report draft. Preserve every clinical statement from "
    "the transcript; do not invent findings. Set critical_finding to the exact "
    "sentence describing any critical/urgent finding (pneumothorax, hemorrhage, "
    "pulmonary embolism, aortic dissection, free air, midline shift, acute "
    "infarct or similar), or null when there is none."
)


class AnthropicProvider:
    name = "anthropic"

    def __init__(self, api_key: str, model: str = "claude-opus-4-8") -> None:
        self._client = AsyncAnthropic(api_key=api_key)
        self._model = model

    async def draft(self, transcript: str, modality: str) -> ReportDraft:
        response = await self._client.messages.parse(
            model=self._model,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Modality: {modality}\n\nDictation transcript:\n{transcript}",
                }
            ],
            output_format=ReportDraft,
        )
        parsed = response.parsed_output
        if parsed is None:
            raise RuntimeError("Anthropic response did not match the ReportDraft schema")
        return parsed
