# RadFlow — Engineering Rules

Rules for humans and coding agents. Every PR must comply. When a rule needs to be broken, write an
ADR in `specs/` first.

## 0. Non-negotiables

1. **Framework-agnostic core.** Business logic lives in `src/core/` with ZERO NestJS imports.
   Dependency direction is always inward: `infra → application → domain`. NestJS is glue.
2. **Rich entities.** No anemic models, no public setters, no logic in services that belongs to the
   aggregate. State changes only through named behavior methods that enforce invariants.
3. **Every feature ships with tests** (unit + integration; e2e for API surfaces). Deterministic and
   offline by default — no real LLM/network calls in tests.
4. **Contracts are typed and shared.** NATS subjects, event payloads and DTOs come from
   `packages/shared` (zod schemas → inferred TS types; Pydantic mirrors in the Python service).
5. **Nothing clinical is fake-real.** Only synthetic patients and public anonymized DICOM. Zero PHI.
6. **Every write is audited** (who/what/when/where) and every message consumer is **idempotent**.

## 1. Service anatomy (NestJS services)

Each NestJS service (`services/worklist`, `services/integration`, `services/dictation`,
`services/api-gateway`) follows the same two-layer layout:

```
src/
  core/                          # framework-agnostic (NO NestJS imports)
    <context>/                   # bounded context, e.g. study/, report/
      domain/                    #   aggregates, VOs, validators, repo interfaces, domain events
        __tests__/               #   *.spec.ts (pure unit)
      application/               #   use cases (one folder per use case)
        use-cases/<name>/        #     <name>.use-case.ts, <name>.input.ts, __tests__/
        common/                  #     output DTOs + mappers shared by use cases
      infra/                     #   db/{in-memory,prisma-or-typeorm}/, messaging/
    shared/                      # base classes: entity, value-object, notification, repo contracts
  nest/                          # NestJS layer: modules, controllers, presenters, filters, config
    <context>-module/
      <context>.module.ts, <context>.providers.ts, <context>.controller.ts
      dto/  docs/  testing/  __tests__/
```

File naming grammar (from ack): `<feature>.<qualifier>.<layer>.ts` — e.g.
`study.claim.use-case.ts`, `study.create.request.dto.ts`, `study.not-found.exception.ts`,
`worklist.admin.controller.ts`. Classes mirror files in PascalCase.

## 2. Domain layer

### 2.1 Entities & aggregates

- Base classes in `core/shared/domain`: `Entity` (holds a `Notification` error accumulator, abstract
  `entityId`/`toJSON`) and `AggregateRoot extends Entity` (domain-event machinery: `applyEvent`,
  `getUncommittedEvents`, local handlers for intra-aggregate reactions).
- **Constructor hydrates, static factory creates.** The constructor only assigns fields (used to
  rebuild from DB). `static create(command)` is the real factory: builds, validates, applies the
  creation event. Separate types: `StudyConstructorProps` (full, id optional) vs
  `StudyCreateCommand` (creation input only).
- **Behavior methods, never setters**: `study.claim(radiologistId)`, `study.release()`,
  `study.markDictated(reportId)`, `study.sign(...)`. Each mutator re-validates only the fields it
  touched (validation groups) and enforces the state machine — an invalid transition (e.g.
  `sign()` from `unread`) throws a domain error, period. The state machine lives IN the aggregate,
  not in a service.
- Example shape (worklist's `Study` is the reference aggregate):

```ts
static create(cmd: StudyCreateCommand): Study {
  const study = new Study(cmd);
  study.validate(['accessionNumber', 'priority']);
  study.applyEvent(new StudyOrderedEvent(study.studyId));
  return study;
}

claim(radiologistId: RadiologistId): void {
  this.assertTransition(StudyStatus.IN_PROGRESS);
  this.assignedTo = radiologistId;
  this.status = StudyStatus.IN_PROGRESS;
  this.applyEvent(new StudyClaimedEvent(this.studyId, radiologistId));
}
```

### 2.2 Value Objects

- Base `ValueObject` with deep structural `equals()`. VOs are **immutable** — transitions return new
  instances (e.g. `transcript.withCorrection(...)` returns a new VO).
- **Branded IDs**: `class StudyId extends Uuid {}`, `ReportId`, `RadiologistId` — compile-time
  distinction between id types.
- Enum-backed VOs with private constructor + named factories returning `Either<VO, Error>` for
  fallible creation (e.g. `Priority`, `Modality`, `ReportSection`).

### 2.3 Validation — Notification pattern

- Entities **accumulate** errors in `this.notification` instead of throwing: a `<Name>Rules` class
  with class-validator decorators (using groups per field), a `<Name>Validator extends
ClassValidatorFields`, run inside `create()` and every mutator.
- The **use case** decides to throw: `if (entity.notification.hasErrors()) throw new
EntityValidationError(entity.notification.toJSON())`.
- VOs throw specific errors on construction; wrap with `Either.safe()` when the caller needs to fold
  VO errors into the aggregate's notification.
- Error hierarchy: `EntityValidationError`, `SearchValidationError`, `LoadEntityError` (thrown by DB
  mappers when a row fails to rehydrate), `NotFoundError`, `InvalidStateTransitionError`.

## 3. Application layer

- **One class per use case**, `IUseCase<Input, Output>` with a single `execute(input)`. Dependencies
  (repo interfaces, UoW, clock, id generator) via constructor — trivially unit-testable.
- Input DTO colocated with the use case; output DTOs + `<Name>OutputMapper` in
  `use-cases/common/`. Controllers/presenters never touch entities directly.
- Pagination is generic: `SearchParams`/`SearchResult` VOs in domain, `PaginationOutputMapper` in
  application. Repos expose `search(params)` with declared `sortableFields`.
- **Unit of Work + outbox**: writes that must publish events go through
  `ApplicationService.run(cb)` — start tx → execute → persist events to the **outbox table in the
  same transaction** → commit; a relay publishes outbox rows to NATS (at-least-once). Aggregates are
  registered on the UoW so uncommitted events are drained on commit. Never publish to NATS directly
  from a use case.

## 4. Infrastructure layer

- **Repository pattern**: interface in domain (`IStudyRepository extends ISearchableRepository<...>`),
  TWO implementations: in-memory (`core/.../infra/db/in-memory/`, used by unit tests) and the real
  ORM one. Services never touch the ORM client directly.
- **Model mappers** are bidirectional (`toModel`/`toEntity`); `toEntity` re-validates and throws
  `LoadEntityError` on corrupt rows — bad data never becomes a silently-invalid aggregate.
- Universal columns on every table: `created_at`, `created_by`, `updated_at`, `updated_by`; soft
  delete via `deleted_at` where deletion is a product concept. Signed reports are **immutable rows**
  (append-only, content hash) — updates forbidden at the DB level.
- Schema changes only via migrations (checked in, reversible). `sync()`/`db push` allowed in tests
  only.

## 5. API conventions (gateway)

- URI versioning: `/api/v1/...`. Route surfaces split by access scope (from ack):
  `/public`, `/user` (radiologist), `/admin`, `/system` (service-to-service, API-key protected).
- **Standard response envelope** on every endpoint:
  `{ statusCode, message, metadata: { timestamp, requestId, correlationId, version }, data }` —
  collections add `metadata.pagination`. Applied via `@Response()` / `@ResponsePaging()` method
  decorators + interceptor, never hand-built in controllers.
- **Error contract**: one exception class per error, extending `AppBaseException` (declares
  `module`, numeric `statusCode` from a per-module enum range, `httpStatus`, message key). Global
  filters (general → base → http → validation) map everything to the same envelope. Numeric ranges:
  worklist 1xxx, integration 2xxx, dictation 3xxx, report-ai 4xxx, auth/gateway 5xxx.
- Validation: DTOs + class-validator, global `ValidationPipe({ transform: true, errorHttpStatusCode:
422 })`; presenters via class-transformer (dates → ISO 8601 UTC).
- **Swagger lives in a parallel `docs/` layer** of composite decorators
  (`StudyClaimDoc()` = `applyDecorators(Doc, DocAuth, DocResponse, DocErrors)`), not inline noise on
  controllers. Docs must show the real error contract.
- Auth: JWT access+refresh; composable stacked decorators (`@AuthProtected()`,
  `@RoleProtected('radiologist')`, `@ApiKeySystemProtected()`); RBAC roles `radiologist | admin |
technologist`. Helmet, CORS allowlist, rate limiting at the gateway.

## 6. Events & messaging (NATS JetStream)

- Subjects: `radflow.<context>.<event>` past tense (`radflow.study.ordered`,
  `radflow.study.signed`, `radflow.report.draft_ready`). Payload schemas in `packages/shared`
  (zod) with an `eventVersion` field; breaking change ⇒ new versioned subject, never mutate in place.
- Envelope on every message: `{ eventId (uuid), eventVersion, occurredOn, correlationId, payload }`.
- **Consumers are idempotent** (dedupe by `eventId` or natural key, e.g. accession number) and use
  durable consumers with explicit ack; poison messages go to a DLQ subject after N deliveries.
- Domain events (in-process, aggregate) vs integration events (published to NATS) are distinct
  types; an explicit translator (`getIntegrationEvent()`) maps one to the other. Not every domain
  event leaves the service.
- `correlationId` propagates end-to-end: HTTP header → CLS context → event envelope → next service
  → logs/traces.

## 7. Configuration

- Per-domain config files via `registerAs` (`app`, `database`, `nats`, `auth`, `orthanc`, `ai`, …)
  aggregated in one `configs/index.ts`; `ConfigModule.forRoot({ load, isGlobal, cache })`.
- **Env validated at bootstrap** with a decorated `EnvDto` (class-validator) — fail fast before
  `listen()`. `.env.example` always current; secrets never committed.

## 8. Observability & security

- Logger: pino (`nestjs-pino`), JSON in containers, `requestId`/`correlationId` on every line.
- OpenTelemetry traces across gateway → services → NATS; metrics via Prometheus; health endpoints
  with terminus (`/health`, per-dependency indicators), API-key protected on system scope.
- **Audit log**: append-only table written for every state-changing action (actor, action, entity,
  before/after refs, origin IP, timestamp). Writing audit is part of the use case transaction, not
  best-effort.
- Request context via AsyncLocalStorage (`nestjs-cls`): user, roles, requestId, correlationId —
  never passed down call stacks by hand.

## 9. Testing strategy

Three tiers, distinguished by filename suffix and jest project:

| Suffix          | Level       | Lives in                 | Doubles                                   |
| --------------- | ----------- | ------------------------ | ----------------------------------------- |
| `*.spec.ts`     | Unit        | colocated `__tests__/`   | in-memory repos, fake UoW, fixed clock    |
| `*.int-spec.ts` | Integration | colocated `__tests__/`   | real PG + NATS via Testcontainers         |
| `*.e2e-spec.ts` | End-to-end  | root `test/` per service | full app over HTTP (supertest), seeded DB |

Rules:

- **Domain unit tests** cover every aggregate factory, mutator, invariant and state transition
  (including invalid ones), and VO equality. Custom matchers for the Notification pattern
  (`toContainNotificationErrors`).
- **Use-case unit tests** run against in-memory repos; **use-case/repo integration tests** run the
  same scenarios against real infra (Testcontainers). Mapper tests assert round-trip + Load errors.
- **E2E** drives HTTP through the booted app: status codes, envelope shape, exact serialized bodies,
  authz (each role × each surface).
- **FakeBuilder per aggregate** (`Study.fake().aStudy().stat().withAccession('A123').build()`,
  `.theStudies(5)`, `.withInvalidPriority()`), deterministic via seeded chance/faker. E2E fixtures
  build `{ send_data, expected }` tables consumed by `test.each`.
- Messaging tests: consumer idempotency (same event twice ⇒ one effect), outbox relay
  (crash between commit and publish ⇒ event still delivered), DLQ after N failures.
- LLM/Whisper: never called in tests. Providers are faked behind their interface; prompt/output
  quality is measured by the **eval harness** (labeled cases, runs in CI as its own job).
- Coverage gate: 80% global on core (`domain` + `application` near 100%); interfaces, DTOs and
  test helpers excluded. `clearMocks: true`, `TZ=UTC` everywhere.

## 10. Python service (`services/report-ai`)

Mirror the same philosophy in Python idiom: FastAPI + Pydantic v2 (schemas mirror
`packages/shared` events), providers behind `Protocol` (Anthropic/OpenAI selected by env, timeout +
fallback mandatory), `mypy --strict`, ruff, pytest with the same tier split (unit offline /
integration with Testcontainers), eval harness (labeled transcript → expected report/impression)
wired to CLI and CI. No LLM call without timeout; the system must degrade to manual reporting.

## 11. Git & CI

- Conventional Commits; branch per epic/feature; PRs must state what was AI-generated and what was
  human-reviewed/changed (part of the project's AI-first narrative).
- CI (GitHub Actions) per workspace: lint → typecheck → unit → integration (Testcontainers) → e2e →
  eval harness → docker build. A red eval is a red build.
- ADRs in `specs/NNNN-*.md` for every architectural decision (template in `specs/README.md`).
