import type { IUnitOfWork, IUseCase } from '@radflow/ddd';
import { Report } from '../../../domain/report.aggregate';
import type { IReportRepository } from '../../../domain/report.repository';
import { RadiologistId, StudyId } from '../../../domain/value-objects/ids.vo';
import { ReportOutputMapper, type ReportOutput } from '../common/report-output';

export type StartReportInput = { studyId: string; radiologistId: string };

/** Get-or-create: reopening the dictation screen resumes the existing draft. */
export class StartReportUseCase implements IUseCase<StartReportInput, ReportOutput> {
  constructor(
    private readonly reportRepository: IReportRepository,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: StartReportInput): Promise<ReportOutput> {
    const studyId = new StudyId(input.studyId);
    const existing = await this.reportRepository.findLatestByStudyId(studyId);
    if (existing && existing.status === 'draft') {
      return ReportOutputMapper.toOutput(existing);
    }

    const report = Report.create({
      studyId,
      radiologistId: new RadiologistId(input.radiologistId),
    });
    await this.unitOfWork.do(async (uow) => {
      await this.reportRepository.insert(report);
      uow.addAggregateRoot(report);
    });
    return ReportOutputMapper.toOutput(report);
  }
}
