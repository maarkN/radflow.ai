"""CLI: uv run python -m report_ai.eval [--min-pass-rate 0.9]

Runs the eval harness against the provider selected by the environment
(stub when no API key is configured) and exits non-zero below the threshold —
a red eval is a red build.
"""

import argparse
import asyncio
import sys

from ..config import Settings
from ..providers.factory import get_provider
from .harness import run_eval


def main() -> int:
    parser = argparse.ArgumentParser(description="RadFlow report-drafting eval harness")
    parser.add_argument("--min-pass-rate", type=float, default=0.9)
    args = parser.parse_args()

    settings = Settings()
    provider = get_provider(settings)
    report = asyncio.run(run_eval(provider))

    print(f"provider: {provider.name}")
    for result in report.results:
        status = "PASS" if result.passed else "FAIL"
        detail = ""
        if not result.critical_correct:
            detail += " [critical flag wrong]"
        if result.missing_keywords:
            detail += f" [missing: {', '.join(result.missing_keywords)}]"
        print(f"  {status}  {result.case_id}{detail}")

    print(
        f"\npass rate: {report.passed}/{report.total} ({report.pass_rate:.0%}) | "
        f"critical accuracy: {report.critical_accuracy:.0%} | "
        f"threshold: {args.min_pass_rate:.0%}"
    )
    return 0 if report.pass_rate >= args.min_pass_rate else 1


if __name__ == "__main__":
    sys.exit(main())
