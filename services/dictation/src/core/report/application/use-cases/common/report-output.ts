import type { Report } from '../../../domain/report.aggregate';

export type ReportOutput = {
  id: string;
  studyId: string;
  radiologistId: string;
  transcript: string | null;
  sections: { technique: string; findings: string; impression: string } | null;
  criticalFinding: string | null;
  provider: string | null;
  status: string;
  contentHash: string | null;
  signedAt: Date | null;
};

export const ReportOutputMapper = {
  toOutput(report: Report): ReportOutput {
    return {
      id: report.reportId.id,
      studyId: report.studyId.id,
      radiologistId: report.radiologistId.id,
      transcript: report.transcript,
      sections: report.sections?.toJSON() ?? null,
      criticalFinding: report.criticalFinding,
      provider: report.provider,
      status: report.status,
      contentHash: report.contentHash,
      signedAt: report.signedAt,
    };
  },
};
