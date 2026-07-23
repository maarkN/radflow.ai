import type { AggregateRoot } from '../aggregate-root';
import type { ValueObject } from '../value-object';
import type { SearchParams } from './search-params';
import type { SearchResult } from './search-result';

export interface IRepository<A extends AggregateRoot, AggregateId extends ValueObject> {
  insert(aggregate: A): Promise<void>;
  update(aggregate: A): Promise<void>;
  findById(id: AggregateId): Promise<A | null>;
  getEntity(): new (...args: never[]) => A;
}

export interface ISearchableRepository<
  A extends AggregateRoot,
  AggregateId extends ValueObject,
  Filter = string,
  Params extends SearchParams<Filter> = SearchParams<Filter>,
  Result extends SearchResult<A> = SearchResult<A>,
> extends IRepository<A, AggregateId> {
  sortableFields: string[];
  search(params: Params): Promise<Result>;
}
