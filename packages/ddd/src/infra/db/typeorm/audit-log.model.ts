import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Append-only audit trail. Rows are written in the SAME transaction as the
 * aggregate write (via the UnitOfWork); a database trigger rejects UPDATE and
 * DELETE, so the log is immutable even for a compromised service.
 */
@Entity({ name: 'audit_log' })
export class AuditLogModel {
  @PrimaryColumn({ name: 'audit_id', type: 'uuid' })
  auditId!: string;

  @Column({ name: 'actor', type: 'varchar', length: 128 })
  actor!: string;

  @Column({ name: 'action', type: 'varchar', length: 64 })
  action!: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 64 })
  entityType!: string;

  @Index('idx_audit_entity_id')
  @Column({ name: 'entity_id', type: 'varchar', length: 64 })
  entityId!: string;

  @Column({ name: 'detail', type: 'jsonb', nullable: true })
  detail!: Record<string, unknown> | null;

  @Column({ name: 'origin', type: 'varchar', length: 64 })
  origin!: string;

  @Index('idx_audit_occurred_on')
  @Column({ name: 'occurred_on', type: 'timestamptz' })
  occurredOn!: Date;
}
