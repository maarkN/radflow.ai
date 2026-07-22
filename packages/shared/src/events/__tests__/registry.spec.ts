import { eventSchemaBySubject } from '../registry';
import { Subjects } from '../subjects';

describe('eventSchemaBySubject', () => {
  it('has a schema for every declared subject', () => {
    for (const subject of Object.values(Subjects)) {
      expect(eventSchemaBySubject[subject]).toBeDefined();
    }
  });

  it('has no schema for subjects that were not declared', () => {
    expect(Object.keys(eventSchemaBySubject).sort()).toEqual(Object.values(Subjects).sort());
  });
});
