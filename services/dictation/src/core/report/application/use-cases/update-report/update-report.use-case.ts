import { NotFoundError } from '@radflow/ddd';
import type { IUnitOfWork, IUseCase } from '@radflow/ddd';
import { Report } from '../../../domain/report.aggregate';
import type { IReportRepository } from '../../../domain/report.repository';
import { ReportId } from '../../../domain/value-objects/ids.vo';
import { ReportOutputMapper, type ReportOutput } from '../common/report-output';

export type UpdateReportInput = {
  reportId: string;
  sections: Partial<{ technique: string; findings: string; impression: string }>;
};

export class UpdateReportUseCase implements IUseCase<UpdateReportInput, ReportOutput> {
  constructor(
    private readonly reportRepository: IReportRepository,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: UpdateReportInput): Promise<ReportOutput> {
    const report = await this.reportRepository.findById(new ReportId(input.reportId));
    if (!report) {
      throw new NotFoundError(input.reportId, Report);
    }
    report.updateSections(input.sections);
    await this.unitOfWork.do(async (uow) => {
      await this.reportRepository.update(report);
      uow.addAggregateRoot(report);
    });
    return ReportOutputMapper.toOutput(report);
  }
}
