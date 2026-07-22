# RadFlow

**AI-powered radiology worklist & dictation cockpit** — a unified workspace where radiologists
manage their reading queue, view DICOM studies, dictate reports, and let AI draft the structured
report — integrated with clinical systems via HL7 and DICOM.

> ⚠️ Demo project. Uses only public, anonymized DICOM datasets (TCIA) and synthetic patients.
> No real PHI, ever.

## Architecture

Event-driven microservices over NATS JetStream:

```
React/Vite (cockpit + admin)
        │ HTTPS/WS
   api-gateway (NestJS)  ── auth, RBAC, WebSocket
        │ NATS JetStream
   ┌────┴─────────┬───────────────┬─────────────────┐
worklist-svc  integration-svc  dictation-svc   report-ai-svc
(NestJS+PG)   (NestJS)         (NestJS)        (Python/FastAPI)
queue, SLA,   HL7 ORM in /     audio upload,   report structuring,
state machine ORU out,         Whisper         impression, critical
& assignment  Orthanc bridge   transcription   findings, eval harness
        │
   PostgreSQL · Orthanc (PACS) · OHIF (viewer) · OTel → Prometheus/Grafana
```

## Stack

NestJS/TypeScript · React 18 + Vite · PostgreSQL 16 · NATS JetStream · Python 3.12/FastAPI ·
Docker Compose · OpenTelemetry · Orthanc + OHIF

## Status

🚧 Early scaffolding. Roadmap tracked internally; architecture decisions live in [`specs/`](specs/).

## Getting started

```bash
docker compose up   # (coming soon)
```
