import type { Entity } from '../domain/entity';
import type { SearchResult } from '../domain/repository/search-result';

export type PaginationOutput<Item = unknown> = {
  items: Item[];
  total: number;
  currentPage: number;
  perPage: number;
  lastPage: number;
};

export const PaginationOutputMapper = {
  toOutput<Item, E extends Entity>(items: Item[], result: SearchResult<E>): PaginationOutput<Item> {
    return {
      items,
      total: result.total,
      currentPage: result.currentPage,
      perPage: result.perPage,
      lastPage: result.lastPage,
    };
  },
};
