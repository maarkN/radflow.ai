import { Subjects } from '@radflow/shared';
import type { Modality, Priority } from '@radflow/shared';
import type {
  IDomainEvent,
  IntegrationEvent,
} from '@radflow/ddd';
import type { RadiologistId, ReportId, StudyId } from '../value-objects/ids.vo';

export class StudyOrderedEvent implements IDomainEvent {
  readonly occurredOn = new Date();
  readonly eventVersion = 1;

  constructor(
    readonly aggregateId: StudyId,
    readonly accessionNumber: string,
    readonly patientName: string,
    readonly modality: Modality,
    readonly priority: Priority,
    readonly orderedAt: Date,
    readonly slaDeadline: Date,
  ) {}

  getIntegrationEvent(): IntegrationEvent {
    return {
      subject: Subjects.StudyOrdered,
      payload: {
        studyId: this.aggregateId.id,
        accessionNumber: this.accessionNumber,
        patientName: this.patientName,
        modality: this.modality,
        priority: this.priority,
        orderedAt: this.orderedAt.toISOString(),
        slaDeadline: this.slaDeadline.toISOString(),
      },
    };
  }
}

export class StudyClaimedEvent implements IDomainEvent {
  readonly occurredOn = new Date();
  readonly eventVersion = 1;

  constructor(
    readonly aggregateId: StudyId,
    readonly radiologistId: RadiologistId,
  ) {}

  getIntegrationEvent(): IntegrationEvent {
    return {
      subject: Subjects.StudyClaimed,
      payload: {
        studyId: this.aggregateId.id,
        radiologistId: this.radiologistId.id,
        claimedAt: this.occurredOn.toISOString(),
      },
    };
  }
}

export class StudyReleasedEvent implements IDomainEvent {
  readonly occurredOn = new Date();
  readonly eventVersion = 1;

  constructor(
    readonly aggregateId: StudyId,
    readonly radiologistId: RadiologistId,
  ) {}

  getIntegrationEvent(): IntegrationEvent {
    return {
      subject: Subjects.StudyReleased,
      payload: {
        studyId: this.aggregateId.id,
        radiologistId: this.radiologistId.id,
        releasedAt: this.occurredOn.toISOString(),
      },
    };
  }
}

export class StudyDictatedEvent implements IDomainEvent {
  readonly occurredOn = new Date();
  readonly eventVersion = 1;

  constructor(
    readonly aggregateId: StudyId,
    readonly reportId: ReportId,
  ) {}

  getIntegrationEvent(): IntegrationEvent {
    return {
      subject: Subjects.StudyDictated,
      payload: {
        studyId: this.aggregateId.id,
        reportId: this.reportId.id,
        dictatedAt: this.occurredOn.toISOString(),
      },
    };
  }
}

export class StudySignedEvent implements IDomainEvent {
  readonly occurredOn = new Date();
  readonly eventVersion = 1;

  constructor(
    readonly aggregateId: StudyId,
    readonly reportId: ReportId,
    readonly signedBy: RadiologistId,
    readonly contentHash: string,
  ) {}

  getIntegrationEvent(): IntegrationEvent {
    return {
      subject: Subjects.StudySigned,
      payload: {
        studyId: this.aggregateId.id,
        reportId: this.reportId.id,
        signedBy: this.signedBy.id,
        signedAt: this.occurredOn.toISOString(),
        contentHash: this.contentHash,
      },
    };
  }
}
