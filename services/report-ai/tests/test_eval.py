import asyncio

from report_ai.eval.cases import CASES
from report_ai.eval.harness import run_eval
from report_ai.providers.stub import StubProvider


def test_dataset_has_at_least_15_labeled_cases() -> None:
    assert len(CASES) >= 15
    assert len({case.id for case in CASES}) == len(CASES)


def test_stub_provider_meets_the_ci_threshold() -> None:
    report = asyncio.run(run_eval(StubProvider()))
    failing = [result.case_id for result in report.results if not result.passed]
    assert report.pass_rate >= 0.9, f"failing cases: {failing}"
    assert report.critical_accuracy >= 0.9
