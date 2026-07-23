import { randomUUID } from 'node:crypto';
import type { DataSource, EntityManager } from 'typeorm';
import { eventSchemaBySubject } from '@radflow/shared';
import type { Subject } from '@radflow/shared';
import type { AggregateRoot } from '../../../domain/aggregate-root';
import type { IUnitOfWork } from '../../../domain/repository/unit-of-work.interface';
import { OutboxModel } from './outbox.model';

export class InvalidIntegrationEventError extends Error {
  constructor(subject: string, detail: string) {
    super(`Integration event for subject ${subject} violates the shared contract: ${detail}`);
    this.name = 'InvalidIntegrationEventError';
  }
}

/**
 * TypeORM Unit of Work. Runs the work inside a transaction and persists the
 * integration events of every registered aggregate to the outbox table in the
 * SAME transaction. Envelopes are validated against @radflow/shared before
 * being written — an invalid event aborts the whole transaction.
 */
export class UnitOfWorkTypeOrm implements IUnitOfWork {
  private manager: EntityManager | null = null;
  private aggregateRoots: AggregateRoot[] = [];

  constructor(
    private readonly dataSource: DataSource,
    private readonly correlationIdProvider: () => string = randomUUID,
  ) {}

  async do<T>(workFn: (uow: IUnitOfWork) => Promise<T>): Promise<T> {
    if (this.manager) {
      return workFn(this);
    }
    try {
      return await this.dataSource.transaction(async (manager) => {
        this.manager = manager;
        const result = await workFn(this);
        await this.persistOutbox(manager);
        return result;
      });
    } finally {
      this.manager = null;
      this.aggregateRoots = [];
    }
  }

  addAggregateRoot(aggregate: AggregateRoot): void {
    this.aggregateRoots.push(aggregate);
  }

  getAggregateRoots(): readonly AggregateRoot[] {
    return this.aggregateRoots;
  }

  getTransaction(): EntityManager | null {
    return this.manager;
  }

  private async persistOutbox(manager: EntityManager): Promise<void> {
    const correlationId = this.correlationIdProvider();
    const rows: OutboxModel[] = [];

    for (const aggregate of this.aggregateRoots) {
      for (const domainEvent of aggregate.getUncommittedEvents()) {
        const integrationEvent = domainEvent.getIntegrationEvent();
        if (!integrationEvent) {
          continue;
        }
        const envelope = {
          eventId: randomUUID(),
          eventVersion: domainEvent.eventVersion,
          occurredOn: domainEvent.occurredOn.toISOString(),
          correlationId,
          payload: integrationEvent.payload,
        };

        const schema = eventSchemaBySubject[integrationEvent.subject as Subject];
        if (!schema) {
          throw new InvalidIntegrationEventError(integrationEvent.subject, 'unknown subject');
        }
        const parsed = schema.safeParse(envelope);
        if (!parsed.success) {
          throw new InvalidIntegrationEventError(integrationEvent.subject, parsed.error.message);
        }

        const row = new OutboxModel();
        row.eventId = envelope.eventId;
        row.subject = integrationEvent.subject;
        row.envelope = envelope;
        row.occurredOn = domainEvent.occurredOn;
        row.publishedAt = null;
        row.attempts = 0;
        rows.push(row);
      }
      aggregate.markEventsDispatched();
    }

    if (rows.length > 0) {
      await manager.getRepository(OutboxModel).save(rows);
    }
  }
}
