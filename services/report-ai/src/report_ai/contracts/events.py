"""Pydantic mirror of the NATS event contracts in packages/shared (zod).

Field names are snake_case in Python and camelCase on the wire, matching the
TypeScript side. Any change here MUST be mirrored in packages/shared.
"""

from enum import StrEnum
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, PositiveInt
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Priority(StrEnum):
    STAT = "stat"
    URGENT = "urgent"
    ROUTINE = "routine"


class Modality(StrEnum):
    CT = "CT"
    MR = "MR"
    CR = "CR"
    US = "US"


class EventEnvelope[PayloadT: CamelModel](CamelModel):
    event_id: UUID
    event_version: PositiveInt
    occurred_on: AwareDatetime
    correlation_id: UUID
    payload: PayloadT


class StudyOrderedPayload(CamelModel):
    study_id: UUID
    accession_number: str = Field(min_length=1)
    patient_name: str = Field(min_length=1)
    modality: Modality
    priority: Priority
    ordered_at: AwareDatetime
    sla_deadline: AwareDatetime


class ReportSections(CamelModel):
    technique: str
    findings: str
    impression: str


class ReportDraftRequestedPayload(CamelModel):
    study_id: UUID
    transcript_id: UUID
    transcript: str = Field(min_length=1)
    requested_at: AwareDatetime


class ReportDraftReadyPayload(CamelModel):
    study_id: UUID
    report_id: UUID
    sections: ReportSections
    critical_finding: str | None
    drafted_at: AwareDatetime


class Hl7OrmReceivedPayload(CamelModel):
    accession_number: str = Field(min_length=1, max_length=64)
    patient_name: str = Field(min_length=1, max_length=255)
    modality: Modality
    priority: Priority
    ordered_at: AwareDatetime
    placer_order_number: str | None = None
    sending_facility: str | None = None


SUBJECT_REPORT_DRAFT_REQUESTED = "radflow.report.draft_requested"
SUBJECT_REPORT_DRAFT_READY = "radflow.report.draft_ready"
SUBJECT_HL7_ORM_RECEIVED = "radflow.hl7.orm_received"
DLQ_PREFIX = "radflow.dlq."
