import { StudyFakeBuilder } from '../study-fake.builder';

describe('StudyFakeBuilder', () => {
  it('builds a valid unread study by default', () => {
    const study = StudyFakeBuilder.aStudy().build();
    expect(study.notification.hasErrors()).toBe(false);
    expect(study.status).toBe('unread');
    expect(study.slaDeadline.getTime()).toBeGreaterThan(study.orderedAt.getTime());
  });

  it('builds many studies with per-index factories', () => {
    const studies = StudyFakeBuilder.theStudies(3)
      .withAccessionNumber((index) => `ACC-${index}`)
      .buildMany();
    expect(studies.map((study) => study.accessionNumber)).toEqual(['ACC-0', 'ACC-1', 'ACC-2']);
  });

  it('claimedBy produces a consistent in_progress study', () => {
    const study = StudyFakeBuilder.aStudy().claimedBy().build();
    expect(study.status).toBe('in_progress');
    expect(study.assignedTo).not.toBeNull();
  });

  it('invalid-data helpers populate the notification', () => {
    const study = StudyFakeBuilder.aStudy().withInvalidAccessionNumberTooLong().build();
    expect(study.notification.hasErrors()).toBe(true);
  });
});
