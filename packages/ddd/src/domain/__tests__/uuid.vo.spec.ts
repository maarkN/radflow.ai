import { InvalidUuidError, Uuid } from '../value-objects/uuid.vo';

describe('Uuid', () => {
  it('generates a valid uuid when none is provided', () => {
    const uuid = new Uuid();
    expect(uuid.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('accepts a valid uuid', () => {
    const id = 'c2a7f3f0-2f2b-4b1a-9d2e-8f0b6a1c9d10';
    expect(new Uuid(id).id).toBe(id);
  });

  it('throws InvalidUuidError for an invalid value', () => {
    expect(() => new Uuid('not-a-uuid')).toThrow(InvalidUuidError);
  });

  it('two instances with the same id are equal', () => {
    const id = 'c2a7f3f0-2f2b-4b1a-9d2e-8f0b6a1c9d10';
    expect(new Uuid(id).equals(new Uuid(id))).toBe(true);
  });

  it('subclasses with the same value are NOT equal to the base class (branded ids)', () => {
    class StudyId extends Uuid {}
    const id = 'c2a7f3f0-2f2b-4b1a-9d2e-8f0b6a1c9d10';
    expect(new StudyId(id).equals(new Uuid(id) as never)).toBe(false);
  });
});
