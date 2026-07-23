import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'reports' })
export class ReportModel {
  @PrimaryColumn({ name: 'report_id', type: 'uuid' })
  reportId!: string;

  @Index('idx_reports_study_id')
  @Column({ name: 'study_id', type: 'uuid' })
  studyId!: string;

  @Column({ name: 'radiologist_id', type: 'uuid' })
  radiologistId!: string;

  @Column({ name: 'transcript', type: 'text', nullable: true })
  transcript!: string | null;

  @Column({ name: 'technique', type: 'text', nullable: true })
  technique!: string | null;

  @Column({ name: 'findings', type: 'text', nullable: true })
  findings!: string | null;

  @Column({ name: 'impression', type: 'text', nullable: true })
  impression!: string | null;

  @Column({ name: 'critical_finding', type: 'text', nullable: true })
  criticalFinding!: string | null;

  @Column({ name: 'provider', type: 'varchar', length: 32, nullable: true })
  provider!: string | null;

  @Column({ name: 'status', type: 'varchar', length: 16 })
  status!: string;

  @Column({ name: 'content_hash', type: 'varchar', length: 128, nullable: true })
  contentHash!: string | null;

  @Column({ name: 'signed_at', type: 'timestamptz', nullable: true })
  signedAt!: Date | null;

  @Column({ name: 'version', type: 'int', default: 0 })
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
