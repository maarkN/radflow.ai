import { NotFoundError } from '@radflow/ddd';
import type { IUseCase } from '@radflow/ddd';
import { Report } from '../../../domain/report.aggregate';
import type { IReportRepository } from '../../../domain/report.repository';
import { ReportId, StudyId } from '../../../domain/value-objects/ids.vo';
import { ReportOutputMapper, type ReportOutput } from '../common/report-output';

export type GetReportInput = { reportId?: string; studyId?: string };

export class GetReportUseCase implements IUseCase<GetReportInput, ReportOutput> {
  constructor(private readonly reportRepository: IReportRepository) {}

  async execute(input: GetReportInput): Promise<ReportOutput> {
    const report = input.reportId
      ? await this.reportRepository.findById(new ReportId(input.reportId))
      : input.studyId
        ? await this.reportRepository.findLatestByStudyId(new StudyId(input.studyId))
        : null;
    if (!report) {
      throw new NotFoundError(input.reportId ?? input.studyId, Report);
    }
    return ReportOutputMapper.toOutput(report);
  }
}
