import type { Modality, Priority, StudyStatus } from '@radflow/shared';
import { AggregateRoot } from '@radflow/ddd';
import { InvalidStateTransitionError } from '@radflow/ddd';
import {
  StudyClaimedEvent,
  StudyDictatedEvent,
  StudyOrderedEvent,
  StudyReleasedEvent,
  StudySignedEvent,
} from './domain-events/study.events';
import { StudyValidatorFactory } from './study.validator';
import { RadiologistId, ReportId, StudyId } from './value-objects/ids.vo';

export type StudyConstructorProps = {
  studyId?: StudyId;
  accessionNumber: string;
  patientName: string;
  modality: Modality;
  priority: Priority;
  status?: StudyStatus;
  orderedAt: Date;
  slaDeadline: Date;
  assignedTo?: RadiologistId | null;
  reportId?: ReportId | null;
  version?: number;
};

export type StudyCreateCommand = {
  accessionNumber: string;
  patientName: string;
  modality: Modality;
  priority: Priority;
  orderedAt: Date;
  slaDeadline: Date;
};

const ALLOWED_TRANSITIONS: Record<StudyStatus, StudyStatus[]> = {
  unread: ['in_progress'],
  in_progress: ['unread', 'dictated'],
  dictated: ['signed'],
  signed: [],
};

export class Study extends AggregateRoot {
  readonly studyId: StudyId;
  readonly accessionNumber: string;
  readonly patientName: string;
  readonly modality: Modality;
  priority: Priority;
  status: StudyStatus;
  readonly orderedAt: Date;
  readonly slaDeadline: Date;
  assignedTo: RadiologistId | null;
  reportId: ReportId | null;
  /** Optimistic-lock version; incremented by the repository on update. */
  version: number;

  constructor(props: StudyConstructorProps) {
    super();
    this.studyId = props.studyId ?? new StudyId();
    this.accessionNumber = props.accessionNumber;
    this.patientName = props.patientName;
    this.modality = props.modality;
    this.priority = props.priority;
    this.status = props.status ?? 'unread';
    this.orderedAt = props.orderedAt;
    this.slaDeadline = props.slaDeadline;
    this.assignedTo = props.assignedTo ?? null;
    this.reportId = props.reportId ?? null;
    this.version = props.version ?? 0;
  }

  static create(command: StudyCreateCommand): Study {
    const study = new Study(command);
    study.validate(['accessionNumber', 'patientName']);
    study.applyEvent(
      new StudyOrderedEvent(
        study.studyId,
        study.accessionNumber,
        study.patientName,
        study.modality,
        study.priority,
        study.orderedAt,
        study.slaDeadline,
      ),
    );
    return study;
  }

  claim(radiologistId: RadiologistId): void {
    this.assertTransition('in_progress');
    this.assignedTo = radiologistId;
    this.status = 'in_progress';
    this.applyEvent(new StudyClaimedEvent(this.studyId, radiologistId));
  }

  release(): void {
    this.assertTransition('unread');
    const releasedBy = this.assignedTo;
    if (!releasedBy) {
      throw new InvalidStateTransitionError(Study.name, this.status, 'unread');
    }
    this.assignedTo = null;
    this.status = 'unread';
    this.applyEvent(new StudyReleasedEvent(this.studyId, releasedBy));
  }

  markDictated(reportId: ReportId): void {
    this.assertTransition('dictated');
    this.reportId = reportId;
    this.status = 'dictated';
    this.applyEvent(new StudyDictatedEvent(this.studyId, reportId));
  }

  sign(signedBy: RadiologistId, contentHash: string): void {
    this.assertTransition('signed');
    if (!this.assignedTo?.equals(signedBy)) {
      throw new SignedByAnotherRadiologistError(this.studyId.id);
    }
    if (!this.reportId) {
      throw new InvalidStateTransitionError(Study.name, this.status, 'signed');
    }
    this.status = 'signed';
    this.applyEvent(new StudySignedEvent(this.studyId, this.reportId, signedBy, contentHash));
  }

  isOverdue(now: Date): boolean {
    return this.status !== 'signed' && now.getTime() > this.slaDeadline.getTime();
  }

  validate(fields?: string[]): boolean {
    return StudyValidatorFactory.create().validate(this.notification, this, fields ?? []);
  }

  private assertTransition(to: StudyStatus): void {
    if (!ALLOWED_TRANSITIONS[this.status].includes(to)) {
      throw new InvalidStateTransitionError(Study.name, this.status, to);
    }
  }

  get entityId(): StudyId {
    return this.studyId;
  }

  toJSON(): Record<string, unknown> {
    return {
      studyId: this.studyId.id,
      accessionNumber: this.accessionNumber,
      patientName: this.patientName,
      modality: this.modality,
      priority: this.priority,
      status: this.status,
      orderedAt: this.orderedAt,
      slaDeadline: this.slaDeadline,
      assignedTo: this.assignedTo?.id ?? null,
      reportId: this.reportId?.id ?? null,
    };
  }
}

export class SignedByAnotherRadiologistError extends Error {
  constructor(studyId: string) {
    super(`Study ${studyId} can only be signed by the radiologist assigned to it`);
    this.name = 'SignedByAnotherRadiologistError';
  }
}
