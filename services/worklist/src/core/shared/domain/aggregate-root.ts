import { Entity } from './entity';
import type { IDomainEvent } from './events/domain-event.interface';

export abstract class AggregateRoot extends Entity {
  private uncommittedEvents: IDomainEvent[] = [];

  applyEvent(event: IDomainEvent): void {
    this.uncommittedEvents.push(event);
  }

  getUncommittedEvents(): readonly IDomainEvent[] {
    return this.uncommittedEvents;
  }

  markEventsDispatched(): void {
    this.uncommittedEvents = [];
  }
}
