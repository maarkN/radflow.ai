import { makeSeedInputs } from '../make-seed-inputs';

describe('makeSeedInputs', () => {
  it('generates the requested amount with unique accession numbers', () => {
    const inputs = makeSeedInputs(50);
    expect(inputs).toHaveLength(50);
    expect(new Set(inputs.map((input) => input.accessionNumber)).size).toBe(50);
  });

  it('is deterministic for the same seed and reference date', () => {
    const refDate = new Date('2026-07-22T12:00:00Z');
    expect(makeSeedInputs(10, 7, refDate)).toEqual(makeSeedInputs(10, 7, refDate));
  });

  it('only produces valid modalities and priorities', () => {
    for (const input of makeSeedInputs(30)) {
      expect(['CT', 'MR', 'CR', 'US']).toContain(input.modality);
      expect(['stat', 'urgent', 'routine']).toContain(input.priority);
    }
  });
});
