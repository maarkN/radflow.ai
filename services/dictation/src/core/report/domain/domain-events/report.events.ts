import { Subjects } from '@radflow/shared';
import type { IDomainEvent, IntegrationEvent } from '@radflow/ddd';
import type { ReportId, StudyId } from '../value-objects/ids.vo';

export class CriticalFindingDetectedEvent implements IDomainEvent {
  readonly occurredOn = new Date();
  readonly eventVersion = 1;

  constructor(
    readonly aggregateId: ReportId,
    readonly studyId: StudyId,
    readonly description: string,
  ) {}

  getIntegrationEvent(): IntegrationEvent {
    return {
      subject: Subjects.StudyCriticalFinding,
      payload: {
        studyId: this.studyId.id,
        reportId: this.aggregateId.id,
        description: this.description,
        detectedAt: this.occurredOn.toISOString(),
      },
    };
  }
}
