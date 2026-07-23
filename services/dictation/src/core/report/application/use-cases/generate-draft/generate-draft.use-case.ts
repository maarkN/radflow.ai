import { NotFoundError } from '@radflow/ddd';
import type { IUnitOfWork, IUseCase } from '@radflow/ddd';
import { Report } from '../../../domain/report.aggregate';
import type { IReportRepository } from '../../../domain/report.repository';
import { ReportId } from '../../../domain/value-objects/ids.vo';
import { ReportSections } from '../../../domain/value-objects/report-sections.vo';
import type { IDraftClient } from '../../ports/draft-client.interface';
import type { IWorklistClient } from '../../ports/worklist-client.interface';
import { ReportOutputMapper, type ReportOutput } from '../common/report-output';

export type GenerateDraftInput = { reportId: string };

/**
 * Sends the transcript to report-ai and applies the structured draft. A
 * detected critical finding raises the domain event that reaches NATS through
 * the outbox. Failure here never blocks manual reporting — the radiologist
 * can still write the sections by hand.
 */
export class GenerateDraftUseCase implements IUseCase<GenerateDraftInput, ReportOutput> {
  constructor(
    private readonly reportRepository: IReportRepository,
    private readonly unitOfWork: IUnitOfWork,
    private readonly draftClient: IDraftClient,
    private readonly worklistClient: IWorklistClient,
  ) {}

  async execute(input: GenerateDraftInput): Promise<ReportOutput> {
    const report = await this.reportRepository.findById(new ReportId(input.reportId));
    if (!report) {
      throw new NotFoundError(input.reportId, Report);
    }
    if (!report.transcript) {
      throw new TranscriptMissingError(input.reportId);
    }

    const study = await this.worklistClient.getStudy(report.studyId.id);
    const draft = await this.draftClient.generateDraft(report.transcript, study.modality);

    report.applyDraft(
      new ReportSections({
        technique: draft.technique,
        findings: draft.findings,
        impression: draft.impression,
      }),
      draft.criticalFinding,
      draft.provider,
    );

    await this.unitOfWork.do(async (uow) => {
      await this.reportRepository.update(report);
      uow.addAggregateRoot(report);
      uow.recordAudit({
        actor: report.radiologistId.id,
        action: 'report.draft_generated',
        entityType: 'Report',
        entityId: report.reportId.id,
        detail: { provider: draft.provider, criticalFinding: draft.criticalFinding },
        origin: 'dictation-api',
      });
    });

    return ReportOutputMapper.toOutput(report);
  }
}

export class TranscriptMissingError extends Error {
  constructor(reportId: string) {
    super(`Report ${reportId} has no transcript to draft from`);
    this.name = 'TranscriptMissingError';
  }
}
