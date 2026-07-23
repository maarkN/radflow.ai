import { SearchResult } from '../repository/search-result';

describe('SearchResult', () => {
  it('computes lastPage from total and perPage', () => {
    const result = new SearchResult({ items: [], total: 101, currentPage: 1, perPage: 20 });
    expect(result.lastPage).toBe(6);
  });

  it('lastPage is 0 when there are no items', () => {
    const result = new SearchResult({ items: [], total: 0, currentPage: 1, perPage: 15 });
    expect(result.lastPage).toBe(0);
  });
});
