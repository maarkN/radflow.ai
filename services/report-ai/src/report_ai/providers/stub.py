"""Deterministic, offline draft provider.

Used in tests, in CI, and as the runtime fallback when no API key is
configured or the real provider fails/times out. The heuristics are simple on
purpose: split the transcript into sections and flag critical keywords.
"""

import re

from .base import ReportDraft

CRITICAL_KEYWORDS = (
    "pneumothorax",
    "hemorrhage",
    "haemorrhage",
    "pulmonary embolism",
    "aortic dissection",
    "free air",
    "midline shift",
    "acute infarct",
)

_IMPRESSION_MARKER = re.compile(r"impression\s*:?", re.IGNORECASE)


class StubProvider:
    name = "stub"

    async def draft(self, transcript: str, modality: str) -> ReportDraft:
        normalized = transcript.strip()
        lowered = normalized.lower()

        critical_finding = None
        for keyword in CRITICAL_KEYWORDS:
            if keyword in lowered:
                critical_finding = self._sentence_containing(normalized, keyword)
                break

        marker = _IMPRESSION_MARKER.search(normalized)
        if marker:
            findings = normalized[: marker.start()].strip() or normalized
            impression = normalized[marker.end() :].strip() or self._default_impression(
                critical_finding
            )
        else:
            findings = normalized
            impression = self._default_impression(critical_finding)

        return ReportDraft(
            technique=f"{modality} study as dictated.",
            findings=findings,
            impression=impression,
            critical_finding=critical_finding,
        )

    @staticmethod
    def _sentence_containing(text: str, keyword: str) -> str:
        for sentence in re.split(r"(?<=[.!?])\s+", text):
            if keyword in sentence.lower():
                return sentence.strip()
        return keyword

    @staticmethod
    def _default_impression(critical_finding: str | None) -> str:
        if critical_finding:
            return f"CRITICAL: {critical_finding}"
        return "Findings as described above. Clinical correlation is recommended."
