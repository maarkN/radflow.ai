import { InvalidStateTransitionError } from '@radflow/ddd';
import {
  StudyClaimedEvent,
  StudyDictatedEvent,
  StudyOrderedEvent,
  StudyReleasedEvent,
  StudySignedEvent,
} from '../domain-events/study.events';
import { SignedByAnotherRadiologistError, Study } from '../study.aggregate';
import { StudyFakeBuilder } from '../study-fake.builder';
import { RadiologistId, ReportId } from '../value-objects/ids.vo';

const createCommand = () => ({
  accessionNumber: 'ACC-2026-0001',
  patientName: 'Test Patient',
  modality: 'CT' as const,
  priority: 'stat' as const,
  orderedAt: new Date('2026-07-22T12:00:00Z'),
  slaDeadline: new Date('2026-07-22T13:00:00Z'),
});

describe('Study.create', () => {
  it('creates a valid unread study and applies StudyOrderedEvent', () => {
    const study = Study.create(createCommand());
    expect(study.notification.hasErrors()).toBe(false);
    expect(study.status).toBe('unread');
    expect(study.assignedTo).toBeNull();
    const events = study.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(StudyOrderedEvent);
  });

  it('accumulates validation errors in the notification instead of throwing', () => {
    const study = Study.create({ ...createCommand(), accessionNumber: '', patientName: '' });
    expect(study.notification.hasErrors()).toBe(true);
    expect(study).toContainNotificationErrors([
      { accessionNumber: ['accessionNumber should not be empty'] },
      { patientName: ['patientName should not be empty'] },
    ]);
  });

  it('rejects an accession number longer than 64 chars', () => {
    const study = Study.create({ ...createCommand(), accessionNumber: 'A'.repeat(65) });
    expect(study).toContainNotificationErrors([
      { accessionNumber: ['accessionNumber must be shorter than or equal to 64 characters'] },
    ]);
  });
});

describe('state machine', () => {
  it('claim: unread -> in_progress assigns the radiologist and emits event', () => {
    const study = StudyFakeBuilder.aStudy().build();
    const radiologistId = new RadiologistId();
    study.claim(radiologistId);
    expect(study.status).toBe('in_progress');
    expect(study.assignedTo?.equals(radiologistId)).toBe(true);
    expect(study.getUncommittedEvents().at(-1)).toBeInstanceOf(StudyClaimedEvent);
  });

  it('claim on an already claimed study throws', () => {
    const study = StudyFakeBuilder.aStudy().claimedBy().build();
    expect(() => study.claim(new RadiologistId())).toThrow(InvalidStateTransitionError);
  });

  it('release: in_progress -> unread clears the assignment and emits event', () => {
    const study = StudyFakeBuilder.aStudy().claimedBy().build();
    study.release();
    expect(study.status).toBe('unread');
    expect(study.assignedTo).toBeNull();
    expect(study.getUncommittedEvents().at(-1)).toBeInstanceOf(StudyReleasedEvent);
  });

  it('release on an unread study throws', () => {
    const study = StudyFakeBuilder.aStudy().build();
    expect(() => study.release()).toThrow(InvalidStateTransitionError);
  });

  it('markDictated: in_progress -> dictated stores the report and emits event', () => {
    const study = StudyFakeBuilder.aStudy().claimedBy().build();
    const reportId = new ReportId();
    study.markDictated(reportId);
    expect(study.status).toBe('dictated');
    expect(study.reportId?.equals(reportId)).toBe(true);
    expect(study.getUncommittedEvents().at(-1)).toBeInstanceOf(StudyDictatedEvent);
  });

  it('markDictated on an unread study throws', () => {
    const study = StudyFakeBuilder.aStudy().build();
    expect(() => study.markDictated(new ReportId())).toThrow(InvalidStateTransitionError);
  });

  it('sign: dictated -> signed by the assigned radiologist emits event with content hash', () => {
    const radiologistId = new RadiologistId();
    const study = StudyFakeBuilder.aStudy().claimedBy(radiologistId).dictated().build();
    study.sign(radiologistId, 'sha256:abc');
    expect(study.status).toBe('signed');
    const event = study.getUncommittedEvents().at(-1) as StudySignedEvent;
    expect(event).toBeInstanceOf(StudySignedEvent);
    expect(event.contentHash).toBe('sha256:abc');
  });

  it('sign by a different radiologist than the assigned one throws', () => {
    const study = StudyFakeBuilder.aStudy().claimedBy().dictated().build();
    expect(() => study.sign(new RadiologistId(), 'sha256:abc')).toThrow(
      SignedByAnotherRadiologistError,
    );
  });

  it('sign on a signed study throws (immutability of signed reports)', () => {
    const radiologistId = new RadiologistId();
    const study = StudyFakeBuilder.aStudy().claimedBy(radiologistId).dictated().build();
    study.sign(radiologistId, 'sha256:abc');
    expect(() => study.sign(radiologistId, 'sha256:abc')).toThrow(InvalidStateTransitionError);
  });
});

describe('isOverdue', () => {
  it('is overdue when now is past the SLA deadline and the study is not signed', () => {
    const study = StudyFakeBuilder.aStudy()
      .withSlaDeadline(new Date('2026-07-22T13:00:00Z'))
      .build();
    expect(study.isOverdue(new Date('2026-07-22T13:01:00Z'))).toBe(true);
    expect(study.isOverdue(new Date('2026-07-22T12:59:00Z'))).toBe(false);
  });
});
