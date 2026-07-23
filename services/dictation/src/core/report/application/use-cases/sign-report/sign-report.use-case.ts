import { NotFoundError } from '@radflow/ddd';
import type { IClock, IUnitOfWork, IUseCase } from '@radflow/ddd';
import { Report } from '../../../domain/report.aggregate';
import type { IReportRepository } from '../../../domain/report.repository';
import { ReportId } from '../../../domain/value-objects/ids.vo';
import type { IWorklistClient } from '../../ports/worklist-client.interface';
import { ReportOutputMapper, type ReportOutput } from '../common/report-output';

export type SignReportInput = { reportId: string; radiologistId: string };

/**
 * Signing orchestration:
 *   1. worklist markDictated (validates ownership + state machine)
 *   2. freeze the report locally (content hash) and commit
 *   3. worklist sign with the hash -> study.signed -> ORU (epic 2 path)
 *
 * Retrying after a partial failure is safe: a report already signed locally
 * skips to step 3, and the worklist client treats "already signed" as success.
 */
export class SignReportUseCase implements IUseCase<SignReportInput, ReportOutput> {
  constructor(
    private readonly reportRepository: IReportRepository,
    private readonly unitOfWork: IUnitOfWork,
    private readonly worklistClient: IWorklistClient,
    private readonly clock: IClock,
  ) {}

  async execute(input: SignReportInput): Promise<ReportOutput> {
    const report = await this.reportRepository.findById(new ReportId(input.reportId));
    if (!report) {
      throw new NotFoundError(input.reportId, Report);
    }

    if (report.status === 'draft') {
      await this.worklistClient.markDictated(
        report.studyId.id,
        report.reportId.id,
        input.radiologistId,
      );

      report.sign(this.clock.now());
      await this.unitOfWork.do(async (uow) => {
        await this.reportRepository.update(report);
        uow.addAggregateRoot(report);
        uow.recordAudit({
          actor: input.radiologistId,
          action: 'report.signed',
          entityType: 'Report',
          entityId: report.reportId.id,
          detail: { contentHash: report.contentHash },
          origin: 'dictation-api',
        });
      });
    }

    await this.worklistClient.sign(report.studyId.id, input.radiologistId, report.contentHash!);
    return ReportOutputMapper.toOutput(report);
  }
}
