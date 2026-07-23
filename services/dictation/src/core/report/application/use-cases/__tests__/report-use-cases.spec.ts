import { randomUUID } from 'node:crypto';
import { FakeUnitOfWork, FixedClock } from '@radflow/ddd';
import { Subjects } from '@radflow/shared';
import { ReportInMemoryRepository } from '../../../infra/db/in-memory/report-in-memory.repository';
import type { GeneratedDraft, IDraftClient } from '../../ports/draft-client.interface';
import type { IWorklistClient, WorklistStudy } from '../../ports/worklist-client.interface';
import { AttachTranscriptUseCase } from '../attach-transcript/attach-transcript.use-case';
import { GenerateDraftUseCase, TranscriptMissingError } from '../generate-draft/generate-draft.use-case';
import { SignReportUseCase } from '../sign-report/sign-report.use-case';
import { StartReportUseCase } from '../start-report/start-report.use-case';
import { UpdateReportUseCase } from '../update-report/update-report.use-case';

class FakeDraftClient implements IDraftClient {
  draft: GeneratedDraft = {
    technique: 'CT chest',
    findings: 'Pneumothorax on the right.',
    impression: 'CRITICAL: pneumothorax',
    criticalFinding: 'Pneumothorax on the right.',
    provider: 'stub',
  };

  async generateDraft(): Promise<GeneratedDraft> {
    return this.draft;
  }
}

class FakeWorklistClient implements IWorklistClient {
  calls: string[] = [];
  failSignOnce = false;

  async getStudy(studyId: string): Promise<WorklistStudy> {
    return {
      id: studyId,
      accessionNumber: 'ACC-1',
      patientName: 'DOE, JOHN',
      modality: 'CT',
      status: 'in_progress',
      assignedTo: null,
    };
  }

  async markDictated(studyId: string, reportId: string): Promise<void> {
    this.calls.push(`dictate:${studyId}:${reportId}`);
  }

  async sign(studyId: string): Promise<void> {
    if (this.failSignOnce) {
      this.failSignOnce = false;
      throw new Error('worklist sign unavailable');
    }
    this.calls.push(`sign:${studyId}`);
  }
}

describe('report use cases', () => {
  let repository: ReportInMemoryRepository;
  let unitOfWork: FakeUnitOfWork;
  let worklist: FakeWorklistClient;
  let draftClient: FakeDraftClient;

  beforeEach(() => {
    repository = new ReportInMemoryRepository();
    unitOfWork = new FakeUnitOfWork();
    worklist = new FakeWorklistClient();
    draftClient = new FakeDraftClient();
  });

  const startReport = async () =>
    new StartReportUseCase(repository, unitOfWork).execute({
      studyId: randomUUID(),
      radiologistId: randomUUID(),
    });

  it('start is idempotent per study: reopening resumes the same draft', async () => {
    const useCase = new StartReportUseCase(repository, unitOfWork);
    const input = { studyId: randomUUID(), radiologistId: randomUUID() };
    const first = await useCase.execute(input);
    const second = await useCase.execute(input);
    expect(second.id).toBe(first.id);
  });

  it('generate draft applies sections and registers the critical event on the outbox path', async () => {
    const report = await startReport();
    await new AttachTranscriptUseCase(repository, unitOfWork).execute({
      reportId: report.id,
      transcript: 'Pneumothorax on the right.',
    });

    const output = await new GenerateDraftUseCase(
      repository,
      unitOfWork,
      draftClient,
      worklist,
    ).execute({ reportId: report.id });

    expect(output.sections?.findings).toBe('Pneumothorax on the right.');
    expect(output.criticalFinding).toBe('Pneumothorax on the right.');
    const integrationEvents = unitOfWork
      .getAggregateRoots()
      .flatMap((aggregate) => [...aggregate.getUncommittedEvents()])
      .map((event) => event.getIntegrationEvent());
    expect(
      integrationEvents.some((event) => event?.subject === Subjects.StudyCriticalFinding),
    ).toBe(true);
  });

  it('generate draft requires a transcript', async () => {
    const report = await startReport();
    await expect(
      new GenerateDraftUseCase(repository, unitOfWork, draftClient, worklist).execute({
        reportId: report.id,
      }),
    ).rejects.toThrow(TranscriptMissingError);
  });

  it('sign orchestrates dictate -> local freeze -> worklist sign', async () => {
    const report = await startReport();
    await new UpdateReportUseCase(repository, unitOfWork).execute({
      reportId: report.id,
      sections: { technique: 't', findings: 'f', impression: 'i' },
    });

    const radiologistId = randomUUID();
    const signed = await new SignReportUseCase(
      repository,
      unitOfWork,
      worklist,
      new FixedClock(new Date('2026-07-23T15:00:00Z')),
    ).execute({ reportId: report.id, radiologistId });

    expect(signed.status).toBe('signed');
    expect(worklist.calls[0]).toContain('dictate:');
    expect(worklist.calls[1]).toContain('sign:');
    const auditActions = unitOfWork.getAuditEntries().map((entry) => entry.action);
    expect(auditActions).toContain('report.signed');
  });

  it('retrying sign after a worklist failure completes without re-dictating', async () => {
    const report = await startReport();
    await new UpdateReportUseCase(repository, unitOfWork).execute({
      reportId: report.id,
      sections: { technique: 't', findings: 'f', impression: 'i' },
    });
    worklist.failSignOnce = true;
    const useCase = new SignReportUseCase(
      repository,
      unitOfWork,
      worklist,
      new FixedClock(new Date()),
    );
    const radiologistId = randomUUID();

    await expect(useCase.execute({ reportId: report.id, radiologistId })).rejects.toThrow(
      'worklist sign unavailable',
    );

    const retried = await useCase.execute({ reportId: report.id, radiologistId });
    expect(retried.status).toBe('signed');
    const dictates = worklist.calls.filter((call) => call.startsWith('dictate:'));
    expect(dictates).toHaveLength(1);
  });
});
