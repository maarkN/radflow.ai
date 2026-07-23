import { Subjects } from '@radflow/shared';
import {
  Report,
  ReportAlreadySignedError,
  ReportNotReadyToSignError,
} from '../report.aggregate';
import { CriticalFindingDetectedEvent } from '../domain-events/report.events';
import { RadiologistId, StudyId } from '../value-objects/ids.vo';
import { ReportSections } from '../value-objects/report-sections.vo';

const sections = () =>
  new ReportSections({ technique: 'CT chest', findings: 'Clear lungs.', impression: 'Normal.' });

const draftReport = () =>
  Report.create({ studyId: new StudyId(), radiologistId: new RadiologistId() });

describe('Report aggregate', () => {
  it('starts as an empty draft', () => {
    const report = draftReport();
    expect(report.status).toBe('draft');
    expect(report.sections).toBeNull();
    expect(report.contentHash).toBeNull();
  });

  it('applyDraft with a critical finding raises the integration event', () => {
    const report = draftReport();
    report.applyDraft(sections(), 'Large pneumothorax.', 'stub');

    const events = report.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(CriticalFindingDetectedEvent);
    const integration = events[0]!.getIntegrationEvent();
    expect(integration?.subject).toBe(Subjects.StudyCriticalFinding);
    expect(integration?.payload.description).toBe('Large pneumothorax.');
  });

  it('applyDraft without a critical finding raises no event', () => {
    const report = draftReport();
    report.applyDraft(sections(), null, 'stub');
    expect(report.getUncommittedEvents()).toHaveLength(0);
  });

  it('sign freezes the content with a deterministic hash', () => {
    const now = new Date('2026-07-23T15:00:00Z');
    const first = draftReport();
    first.applyDraft(sections(), null, 'stub');
    first.sign(now);

    const second = draftReport();
    second.applyDraft(sections(), null, 'stub');
    second.sign(now);

    expect(first.status).toBe('signed');
    expect(first.contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(first.contentHash).toBe(second.contentHash);
    expect(first.signedAt).toEqual(now);
  });

  it('cannot sign without sections', () => {
    const report = draftReport();
    expect(() => report.sign(new Date())).toThrow(ReportNotReadyToSignError);
  });

  it('a signed report is immutable', () => {
    const report = draftReport();
    report.applyDraft(sections(), null, 'stub');
    report.sign(new Date());

    expect(() => report.updateSections({ findings: 'edit' })).toThrow(ReportAlreadySignedError);
    expect(() => report.attachTranscript('x')).toThrow(ReportAlreadySignedError);
    expect(() => report.sign(new Date())).toThrow(ReportAlreadySignedError);
  });

  it('manual edits work without an AI draft', () => {
    const report = draftReport();
    report.updateSections({ findings: 'Hand-written findings.' });
    expect(report.sections?.findings).toBe('Hand-written findings.');
    expect(report.sections?.technique).toBe('');
  });
});
