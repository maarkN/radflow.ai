import type { AggregateRoot } from '../aggregate-root';

export type AuditEntry = {
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  detail?: Record<string, unknown>;
  origin: string;
};

/**
 * Runs work inside a single database transaction. Aggregates registered via
 * addAggregateRoot have their uncommitted integration events persisted to the
 * outbox within the SAME transaction, and audit entries recorded via
 * recordAudit are written to the append-only audit_log in that transaction
 * too (AGENTS.md §3 and §8).
 */
export interface IUnitOfWork {
  do<T>(workFn: (uow: IUnitOfWork) => Promise<T>): Promise<T>;
  addAggregateRoot(aggregate: AggregateRoot): void;
  getAggregateRoots(): readonly AggregateRoot[];
  recordAudit(entry: AuditEntry): void;
  /** Transaction handle of the underlying driver (e.g. TypeORM EntityManager). */
  getTransaction(): unknown;
}
