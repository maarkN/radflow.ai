import type { Report } from './report.aggregate';
import type { ReportId, StudyId } from './value-objects/ids.vo';

export interface IReportRepository {
  insert(report: Report): Promise<void>;
  update(report: Report): Promise<void>;
  findById(id: ReportId): Promise<Report | null>;
  /** Latest report for the study (draft first), or null. */
  findLatestByStudyId(studyId: StudyId): Promise<Report | null>;
}
