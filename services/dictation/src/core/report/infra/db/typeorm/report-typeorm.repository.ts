import type { DataSource, EntityManager } from 'typeorm';
import { ConcurrencyError, NotFoundError } from '@radflow/ddd';
import type { IUnitOfWork } from '@radflow/ddd';
import { Report } from '../../../domain/report.aggregate';
import type { IReportRepository } from '../../../domain/report.repository';
import type { ReportId, StudyId } from '../../../domain/value-objects/ids.vo';
import { ReportModelMapper } from './report-model.mapper';
import { ReportModel } from './report.model';

export class ReportTypeOrmRepository implements IReportRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly unitOfWork?: IUnitOfWork,
  ) {}

  private get manager(): EntityManager {
    const transaction = this.unitOfWork?.getTransaction() as EntityManager | null | undefined;
    return transaction ?? this.dataSource.manager;
  }

  async insert(report: Report): Promise<void> {
    await this.manager.getRepository(ReportModel).insert(ReportModelMapper.toModel(report));
  }

  /** Optimistic lock: the UPDATE only applies when the stored version matches. */
  async update(report: Report): Promise<void> {
    const model = ReportModelMapper.toModel(report);
    const result = await this.manager
      .createQueryBuilder()
      .update(ReportModel)
      .set({
        transcript: model.transcript,
        technique: model.technique,
        findings: model.findings,
        impression: model.impression,
        criticalFinding: model.criticalFinding,
        provider: model.provider,
        status: model.status,
        contentHash: model.contentHash,
        signedAt: model.signedAt,
        version: () => 'version + 1',
      })
      .where('report_id = :reportId AND version = :version', {
        reportId: model.reportId,
        version: report.version,
      })
      .execute();

    if (result.affected === 0) {
      const exists = await this.manager
        .getRepository(ReportModel)
        .existsBy({ reportId: model.reportId });
      if (!exists) {
        throw new NotFoundError(model.reportId, Report);
      }
      throw new ConcurrencyError(Report.name, model.reportId);
    }
    report.version += 1;
  }

  async findById(id: ReportId): Promise<Report | null> {
    const model = await this.manager.getRepository(ReportModel).findOneBy({ reportId: id.id });
    return model ? ReportModelMapper.toEntity(model) : null;
  }

  async findLatestByStudyId(studyId: StudyId): Promise<Report | null> {
    const model = await this.manager.getRepository(ReportModel).findOne({
      where: { studyId: studyId.id },
      order: { createdAt: 'DESC' },
    });
    return model ? ReportModelMapper.toEntity(model) : null;
  }
}
