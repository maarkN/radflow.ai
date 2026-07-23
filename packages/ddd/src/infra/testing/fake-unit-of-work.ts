import type { AggregateRoot } from '../../domain/aggregate-root';
import type { IUnitOfWork } from '../../domain/repository/unit-of-work.interface';

export class FakeUnitOfWork implements IUnitOfWork {
  private aggregateRoots: AggregateRoot[] = [];

  async do<T>(workFn: (uow: IUnitOfWork) => Promise<T>): Promise<T> {
    return workFn(this);
  }

  addAggregateRoot(aggregate: AggregateRoot): void {
    this.aggregateRoots.push(aggregate);
  }

  getAggregateRoots(): readonly AggregateRoot[] {
    return this.aggregateRoots;
  }

  getTransaction(): unknown {
    return null;
  }
}
