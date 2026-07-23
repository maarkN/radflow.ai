import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'studies' })
export class StudyModel {
  @PrimaryColumn({ name: 'study_id', type: 'uuid' })
  studyId!: string;

  @Column({ name: 'accession_number', type: 'varchar', length: 64, unique: true })
  accessionNumber!: string;

  @Column({ name: 'patient_name', type: 'varchar', length: 255 })
  patientName!: string;

  @Column({ name: 'modality', type: 'varchar', length: 8 })
  modality!: string;

  @Column({ name: 'priority', type: 'varchar', length: 16 })
  priority!: string;

  @Column({ name: 'status', type: 'varchar', length: 16 })
  status!: string;

  @Column({ name: 'ordered_at', type: 'timestamptz' })
  orderedAt!: Date;

  @Column({ name: 'sla_deadline', type: 'timestamptz' })
  slaDeadline!: Date;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assignedTo!: string | null;

  @Column({ name: 'report_id', type: 'uuid', nullable: true })
  reportId!: string | null;

  @Column({ name: 'version', type: 'int', default: 0 })
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
