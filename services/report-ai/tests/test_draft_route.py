from fastapi.testclient import TestClient

from report_ai.main import app, get_draft_service, get_settings

client = TestClient(app)


def setup_function() -> None:
    get_settings.cache_clear()
    get_draft_service.cache_clear()


def test_draft_route_returns_structured_sections(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setenv("AI_PROVIDER", "stub")
    response = client.post(
        "/reports/draft",
        json={
            "transcript": "Large pneumothorax on the right. Impression: urgent finding.",
            "modality": "CT",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["technique"] == "CT study as dictated."
    assert "pneumothorax" in body["criticalFinding"]
    assert body["provider"] == "stub"
    assert body["elapsedMs"] >= 0


def test_draft_route_rejects_empty_transcript() -> None:
    response = client.post("/reports/draft", json={"transcript": "", "modality": "CT"})
    assert response.status_code == 422


def test_draft_route_rejects_unknown_modality() -> None:
    response = client.post("/reports/draft", json={"transcript": "x", "modality": "PET"})
    assert response.status_code == 422
