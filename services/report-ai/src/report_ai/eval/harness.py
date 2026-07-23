"""Scores a draft provider against the labeled cases.

A case passes when the critical-finding flag is correct AND every required
keyword appears in the draft. The pass rate gates CI (see __main__).
"""

import asyncio
from dataclasses import dataclass

from ..providers.base import DraftProvider
from .cases import CASES, EvalCase


@dataclass
class CaseResult:
    case_id: str
    passed: bool
    critical_correct: bool
    missing_keywords: list[str]


@dataclass
class EvalReport:
    results: list[CaseResult]

    @property
    def total(self) -> int:
        return len(self.results)

    @property
    def passed(self) -> int:
        return sum(1 for result in self.results if result.passed)

    @property
    def pass_rate(self) -> float:
        return self.passed / self.total if self.total else 0.0

    @property
    def critical_accuracy(self) -> float:
        if not self.results:
            return 0.0
        return sum(1 for result in self.results if result.critical_correct) / self.total


async def evaluate_case(provider: DraftProvider, case: EvalCase) -> CaseResult:
    draft = await provider.draft(case.transcript, case.modality)
    draft_text = " ".join(
        part for part in (draft.technique, draft.findings, draft.impression) if part
    ).lower()

    critical_correct = (draft.critical_finding is not None) == case.expect_critical
    if case.expect_critical and case.critical_keyword and draft.critical_finding:
        critical_correct = case.critical_keyword.lower() in draft.critical_finding.lower()

    missing = [
        keyword for keyword in case.required_keywords if keyword.lower() not in draft_text
    ]

    return CaseResult(
        case_id=case.id,
        passed=critical_correct and not missing,
        critical_correct=critical_correct,
        missing_keywords=missing,
    )


async def run_eval(provider: DraftProvider) -> EvalReport:
    results = await asyncio.gather(*(evaluate_case(provider, case) for case in CASES))
    return EvalReport(results=list(results))
