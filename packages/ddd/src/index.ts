// Domain building blocks
export * from './domain/entity';
export * from './domain/aggregate-root';
export * from './domain/value-object';
export * from './domain/notification';
export * from './domain/clock.interface';
export * from './domain/events/domain-event.interface';
export * from './domain/value-objects/uuid.vo';
export * from './domain/validators/class-validator-fields';
export * from './domain/validators/validation.error';
export * from './domain/errors/not-found.error';
export * from './domain/errors/invalid-state-transition.error';
export * from './domain/errors/concurrency.error';
export * from './domain/repository/repository.interface';
export * from './domain/repository/search-params';
export * from './domain/repository/search-result';
export * from './domain/repository/unit-of-work.interface';

// Application building blocks
export * from './application/use-case.interface';
export * from './application/pagination-output';

// Infra: transactional outbox over TypeORM
export * from './infra/db/typeorm/outbox.model';
export * from './infra/db/typeorm/audit-log.model';
export * from './infra/db/typeorm/unit-of-work-typeorm';
export * from './infra/db/typeorm/migrations/1753200000001-create-outbox-table';
export * from './infra/db/typeorm/migrations/1753200000002-create-audit-log-table';
export * from './infra/messaging/outbox-relay';

// Testing helpers (FakeUnitOfWork is dependency-free; heavier helpers —
// typeorm-helpers with Testcontainers, the jest expect matcher — are
// deep-imported from dist to keep them out of production bundles).
export * from './infra/testing/fake-unit-of-work';
