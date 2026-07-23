import type { ValueObject } from '../value-object';

/** In-process event applied by an aggregate. */
export interface IDomainEvent {
  aggregateId: ValueObject;
  occurredOn: Date;
  eventVersion: number;

  /**
   * Translates this domain event into the message published to NATS
   * (subject + payload matching the schemas in @radflow/shared).
   * Return null for events that must not leave the service.
   */
  getIntegrationEvent(): IntegrationEvent | null;
}

export interface IntegrationEvent {
  subject: string;
  payload: Record<string, unknown>;
}
