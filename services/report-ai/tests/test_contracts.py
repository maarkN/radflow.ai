from uuid import uuid4

import pytest
from pydantic import ValidationError

from report_ai.contracts.events import (
    EventEnvelope,
    Hl7OrmReceivedPayload,
    ReportDraftReadyPayload,
    ReportSections,
    StudyOrderedPayload,
)


def study_ordered_wire_payload() -> dict[str, object]:
    return {
        "studyId": str(uuid4()),
        "accessionNumber": "ACC-2026-0001",
        "patientName": "Test Patient",
        "modality": "CT",
        "priority": "stat",
        "orderedAt": "2026-07-22T12:00:00Z",
        "slaDeadline": "2026-07-22T13:00:00Z",
    }


def test_envelope_parses_camel_case_wire_format() -> None:
    raw = {
        "eventId": str(uuid4()),
        "eventVersion": 1,
        "occurredOn": "2026-07-22T12:00:00Z",
        "correlationId": str(uuid4()),
        "payload": study_ordered_wire_payload(),
    }
    envelope = EventEnvelope[StudyOrderedPayload].model_validate(raw)
    assert envelope.payload.accession_number == "ACC-2026-0001"
    assert envelope.payload.priority == "stat"


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("eventId", "not-a-uuid"),
        ("eventVersion", 0),
        ("occurredOn", "22/07/2026"),
    ],
)
def test_envelope_rejects_invalid_fields(field: str, value: object) -> None:
    raw: dict[str, object] = {
        "eventId": str(uuid4()),
        "eventVersion": 1,
        "occurredOn": "2026-07-22T12:00:00Z",
        "correlationId": str(uuid4()),
        "payload": study_ordered_wire_payload(),
    }
    raw[field] = value
    with pytest.raises(ValidationError):
        EventEnvelope[StudyOrderedPayload].model_validate(raw)


def test_study_ordered_rejects_unknown_modality() -> None:
    raw = study_ordered_wire_payload()
    raw["modality"] = "XR"
    with pytest.raises(ValidationError):
        StudyOrderedPayload.model_validate(raw)


def test_hl7_orm_received_parses_wire_format_with_optionals_absent() -> None:
    payload = Hl7OrmReceivedPayload.model_validate(
        {
            "accessionNumber": "ACC-1",
            "patientName": "DOE^JOHN",
            "modality": "CT",
            "priority": "stat",
            "orderedAt": "2026-07-23T12:00:00Z",
        }
    )
    assert payload.placer_order_number is None
    assert payload.priority == "stat"


def test_report_draft_ready_serializes_to_camel_case() -> None:
    payload = ReportDraftReadyPayload(
        study_id=uuid4(),
        report_id=uuid4(),
        sections=ReportSections(technique="CT chest", findings="Clear", impression="Normal"),
        critical_finding=None,
        drafted_at="2026-07-22T12:30:00Z",  # type: ignore[arg-type]
    )
    wire = payload.model_dump(by_alias=True, mode="json")
    assert "studyId" in wire
    assert "criticalFinding" in wire
    assert wire["sections"]["impression"] == "Normal"
