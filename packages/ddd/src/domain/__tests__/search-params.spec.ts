import { SearchParams } from '../repository/search-params';

describe('SearchParams', () => {
  it.each([
    [undefined, 1],
    [0, 1],
    [-1, 1],
    [5.5, 1],
    [2, 2],
  ])('normalizes page %p to %p', (input, expected) => {
    expect(new SearchParams({ page: input }).page).toBe(expected);
  });

  it.each([
    [undefined, 15],
    [0, 15],
    [101, 15],
    [25, 25],
  ])('normalizes perPage %p to %p', (input, expected) => {
    expect(new SearchParams({ perPage: input }).perPage).toBe(expected);
  });

  it('defaults sortDir to asc when sort is set', () => {
    const params = new SearchParams({ sort: 'slaDeadline' });
    expect(params.sortDir).toBe('asc');
  });

  it('nullifies sortDir when there is no sort', () => {
    const params = new SearchParams({ sortDir: 'desc' });
    expect(params.sortDir).toBeNull();
  });
});
