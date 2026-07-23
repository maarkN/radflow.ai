import { ValueObject } from '../value-object';

export type SortDirection = 'asc' | 'desc';

export type SearchParamsConstructorProps<Filter = string> = {
  page?: number;
  perPage?: number;
  sort?: string | null;
  sortDir?: SortDirection | null;
  filter?: Filter | null;
};

export class SearchParams<Filter = string> extends ValueObject {
  readonly page: number;
  readonly perPage: number;
  readonly sort: string | null;
  readonly sortDir: SortDirection | null;
  readonly filter: Filter | null;

  constructor(props: SearchParamsConstructorProps<Filter> = {}) {
    super();
    this.page = this.normalizePage(props.page);
    this.perPage = this.normalizePerPage(props.perPage);
    this.sort = props.sort ?? null;
    this.sortDir = this.sort ? (props.sortDir ?? 'asc') : null;
    this.filter = props.filter ?? null;
  }

  private normalizePage(page?: number): number {
    const value = Number(page);
    if (!Number.isInteger(value) || value <= 0) {
      return 1;
    }
    return value;
  }

  private normalizePerPage(perPage?: number): number {
    const value = Number(perPage);
    if (!Number.isInteger(value) || value <= 0 || value > 100) {
      return 15;
    }
    return value;
  }
}
