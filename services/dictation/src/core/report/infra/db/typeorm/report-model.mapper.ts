import { LoadEntityError } from '@radflow/ddd';
import { Report, type ReportStatus } from '../../../domain/report.aggregate';
import { RadiologistId, ReportId, StudyId } from '../../../domain/value-objects/ids.vo';
import { ReportSections } from '../../../domain/value-objects/report-sections.vo';
import { ReportModel } from './report.model';

const VALID_STATUSES: ReportStatus[] = ['draft', 'signed'];

export const ReportModelMapper = {
  toModel(report: Report): ReportModel {
    const model = new ReportModel();
    model.reportId = report.reportId.id;
    model.studyId = report.studyId.id;
    model.radiologistId = report.radiologistId.id;
    model.transcript = report.transcript;
    model.technique = report.sections?.technique ?? null;
    model.findings = report.sections?.findings ?? null;
    model.impression = report.sections?.impression ?? null;
    model.criticalFinding = report.criticalFinding;
    model.provider = report.provider;
    model.status = report.status;
    model.contentHash = report.contentHash;
    model.signedAt = report.signedAt;
    model.version = report.version;
    return model;
  },

  toEntity(model: ReportModel): Report {
    if (!VALID_STATUSES.includes(model.status as ReportStatus)) {
      throw new LoadEntityError([{ status: [`status "${model.status}" is invalid`] }]);
    }
    const hasSections =
      model.technique !== null || model.findings !== null || model.impression !== null;
    return new Report({
      reportId: new ReportId(model.reportId),
      studyId: new StudyId(model.studyId),
      radiologistId: new RadiologistId(model.radiologistId),
      transcript: model.transcript,
      sections: hasSections
        ? new ReportSections({
            technique: model.technique ?? '',
            findings: model.findings ?? '',
            impression: model.impression ?? '',
          })
        : null,
      criticalFinding: model.criticalFinding,
      provider: model.provider,
      status: model.status as ReportStatus,
      contentHash: model.contentHash,
      signedAt: model.signedAt,
      version: model.version,
    });
  },
};
