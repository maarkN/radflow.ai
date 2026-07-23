import type { DataSource } from 'typeorm';
import { IsNull } from 'typeorm';
import { OutboxModel } from '../db/typeorm/outbox.model';
import type { IEventPublisher } from '@radflow/messaging';

/**
 * Polls unpublished outbox rows and publishes them to NATS. Rows are locked
 * with FOR UPDATE SKIP LOCKED so multiple relay instances never double-send;
 * JetStream deduplicates by eventId anyway (at-least-once end to end).
 */
export class OutboxRelay {
  constructor(
    private readonly dataSource: DataSource,
    private readonly publisher: IEventPublisher,
    private readonly batchSize = 50,
  ) {}

  async publishPending(): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const rows = await manager.getRepository(OutboxModel).find({
        where: { publishedAt: IsNull() },
        order: { occurredOn: 'ASC' },
        take: this.batchSize,
        lock: { mode: 'pessimistic_write', onLocked: 'skip_locked' },
      });

      for (const row of rows) {
        await this.publisher.publish(row.subject, row.envelope, row.eventId);
        await manager
          .getRepository(OutboxModel)
          .update(
            { eventId: row.eventId },
            { publishedAt: new Date(), attempts: row.attempts + 1 },
          );
      }
      return rows.length;
    });
  }
}
