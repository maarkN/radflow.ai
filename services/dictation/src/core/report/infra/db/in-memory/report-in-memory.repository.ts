import { ConcurrencyError, NotFoundError } from '@radflow/ddd';
import { Report } from '../../../domain/report.aggregate';
import type { IReportRepository } from '../../../domain/report.repository';
import type { ReportId, StudyId } from '../../../domain/value-objects/ids.vo';

export class ReportInMemoryRepository implements IReportRepository {
  private items = new Map<string, Report>();
  private insertionOrder: string[] = [];

  async insert(report: Report): Promise<void> {
    this.items.set(report.reportId.id, this.clone(report));
    this.insertionOrder.push(report.reportId.id);
  }

  async update(report: Report): Promise<void> {
    const stored = this.items.get(report.reportId.id);
    if (!stored) {
      throw new NotFoundError(report.reportId.id, Report);
    }
    if (stored.version !== report.version) {
      throw new ConcurrencyError(Report.name, report.reportId.id);
    }
    report.version += 1;
    this.items.set(report.reportId.id, this.clone(report));
  }

  async findById(id: ReportId): Promise<Report | null> {
    const stored = this.items.get(id.id);
    return stored ? this.clone(stored) : null;
  }

  async findLatestByStudyId(studyId: StudyId): Promise<Report | null> {
    for (const id of [...this.insertionOrder].reverse()) {
      const report = this.items.get(id);
      if (report?.studyId.equals(studyId)) {
        return this.clone(report);
      }
    }
    return null;
  }

  private clone(report: Report): Report {
    return new Report({
      reportId: report.reportId,
      studyId: report.studyId,
      radiologistId: report.radiologistId,
      transcript: report.transcript,
      sections: report.sections,
      criticalFinding: report.criticalFinding,
      provider: report.provider,
      status: report.status,
      contentHash: report.contentHash,
      signedAt: report.signedAt,
      version: report.version,
    });
  }
}
