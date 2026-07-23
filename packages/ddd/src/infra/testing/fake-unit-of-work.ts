import type { AggregateRoot } from '../../domain/aggregate-root';
import type { AuditEntry, IUnitOfWork } from '../../domain/repository/unit-of-work.interface';

export class FakeUnitOfWork implements IUnitOfWork {
  private aggregateRoots: AggregateRoot[] = [];
  private auditEntries: AuditEntry[] = [];

  async do<T>(workFn: (uow: IUnitOfWork) => Promise<T>): Promise<T> {
    return workFn(this);
  }

  addAggregateRoot(aggregate: AggregateRoot): void {
    this.aggregateRoots.push(aggregate);
  }

  getAggregateRoots(): readonly AggregateRoot[] {
    return this.aggregateRoots;
  }

  recordAudit(entry: AuditEntry): void {
    this.auditEntries.push(entry);
  }

  getAuditEntries(): readonly AuditEntry[] {
    return this.auditEntries;
  }

  getTransaction(): unknown {
    return null;
  }
}
