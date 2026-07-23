import { createHash } from 'node:crypto';
import { AggregateRoot } from '@radflow/ddd';
import { CriticalFindingDetectedEvent } from './domain-events/report.events';
import { RadiologistId, ReportId, StudyId } from './value-objects/ids.vo';
import { ReportSections } from './value-objects/report-sections.vo';

export type ReportStatus = 'draft' | 'signed';

export type ReportConstructorProps = {
  reportId?: ReportId;
  studyId: StudyId;
  radiologistId: RadiologistId;
  transcript?: string | null;
  sections?: ReportSections | null;
  criticalFinding?: string | null;
  provider?: string | null;
  status?: ReportStatus;
  contentHash?: string | null;
  signedAt?: Date | null;
  version?: number;
};

/**
 * The radiology report being dictated. Draft until signed; a signed report is
 * immutable and identified by the sha256 of its sections (the contentHash
 * carried by radflow.study.signed and into the ORU).
 */
export class Report extends AggregateRoot {
  readonly reportId: ReportId;
  readonly studyId: StudyId;
  readonly radiologistId: RadiologistId;
  transcript: string | null;
  sections: ReportSections | null;
  criticalFinding: string | null;
  provider: string | null;
  status: ReportStatus;
  contentHash: string | null;
  signedAt: Date | null;
  /** Optimistic-lock version; incremented by the repository on update. */
  version: number;

  constructor(props: ReportConstructorProps) {
    super();
    this.reportId = props.reportId ?? new ReportId();
    this.studyId = props.studyId;
    this.radiologistId = props.radiologistId;
    this.transcript = props.transcript ?? null;
    this.sections = props.sections ?? null;
    this.criticalFinding = props.criticalFinding ?? null;
    this.provider = props.provider ?? null;
    this.status = props.status ?? 'draft';
    this.contentHash = props.contentHash ?? null;
    this.signedAt = props.signedAt ?? null;
    this.version = props.version ?? 0;
  }

  static create(command: { studyId: StudyId; radiologistId: RadiologistId }): Report {
    return new Report(command);
  }

  attachTranscript(transcript: string): void {
    this.assertDraft('attach a transcript');
    this.transcript = transcript;
  }

  applyDraft(sections: ReportSections, criticalFinding: string | null, provider: string): void {
    this.assertDraft('apply an AI draft');
    this.sections = sections;
    this.provider = provider;
    if (criticalFinding && criticalFinding !== this.criticalFinding) {
      this.criticalFinding = criticalFinding;
      this.applyEvent(
        new CriticalFindingDetectedEvent(this.reportId, this.studyId, criticalFinding),
      );
    }
  }

  updateSections(
    edits: Partial<{ technique: string; findings: string; impression: string }>,
  ): void {
    this.assertDraft('edit the sections');
    const base =
      this.sections ?? new ReportSections({ technique: '', findings: '', impression: '' });
    this.sections = base.withEdits(edits);
  }

  sign(now: Date): void {
    this.assertDraft('sign');
    if (!this.sections) {
      throw new ReportNotReadyToSignError(this.reportId.id);
    }
    this.contentHash = `sha256:${createHash('sha256')
      .update(JSON.stringify(this.sections.toJSON()))
      .digest('hex')}`;
    this.signedAt = now;
    this.status = 'signed';
  }

  private assertDraft(action: string): void {
    if (this.status === 'signed') {
      throw new ReportAlreadySignedError(this.reportId.id, action);
    }
  }

  get entityId(): ReportId {
    return this.reportId;
  }

  toJSON(): Record<string, unknown> {
    return {
      reportId: this.reportId.id,
      studyId: this.studyId.id,
      radiologistId: this.radiologistId.id,
      transcript: this.transcript,
      sections: this.sections?.toJSON() ?? null,
      criticalFinding: this.criticalFinding,
      provider: this.provider,
      status: this.status,
      contentHash: this.contentHash,
      signedAt: this.signedAt,
    };
  }
}

export class ReportAlreadySignedError extends Error {
  constructor(reportId: string, action: string) {
    super(`Report ${reportId} is signed and immutable; cannot ${action}`);
    this.name = 'ReportAlreadySignedError';
  }
}

export class ReportNotReadyToSignError extends Error {
  constructor(reportId: string) {
    super(`Report ${reportId} has no sections yet; dictate or write the report before signing`);
    this.name = 'ReportNotReadyToSignError';
  }
}
