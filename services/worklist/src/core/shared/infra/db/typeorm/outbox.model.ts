import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Transactional outbox: integration events are inserted here in the SAME
 * transaction as the aggregate write, then published to NATS by the relay.
 */
@Entity({ name: 'outbox' })
export class OutboxModel {
  @PrimaryColumn({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @Column({ name: 'subject', type: 'varchar', length: 128 })
  subject!: string;

  @Column({ name: 'envelope', type: 'jsonb' })
  envelope!: Record<string, unknown>;

  @Column({ name: 'occurred_on', type: 'timestamptz' })
  occurredOn!: Date;

  @Index('idx_outbox_unpublished', { where: 'published_at IS NULL' })
  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts!: number;
}
