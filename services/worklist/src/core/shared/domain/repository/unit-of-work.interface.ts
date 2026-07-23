import type { AggregateRoot } from '../aggregate-root';

/**
 * Runs work inside a single database transaction. Aggregates registered via
 * addAggregateRoot have their uncommitted integration events persisted to the
 * outbox within the SAME transaction (see AGENTS.md §3).
 */
export interface IUnitOfWork {
  do<T>(workFn: (uow: IUnitOfWork) => Promise<T>): Promise<T>;
  addAggregateRoot(aggregate: AggregateRoot): void;
  getAggregateRoots(): readonly AggregateRoot[];
  /** Transaction handle of the underlying driver (e.g. TypeORM EntityManager). */
  getTransaction(): unknown;
}
