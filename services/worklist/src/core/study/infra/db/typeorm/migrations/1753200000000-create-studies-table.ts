import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStudiesTable1753200000000 implements MigrationInterface {
  name = 'CreateStudiesTable1753200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE studies (
        study_id uuid PRIMARY KEY,
        accession_number varchar(64) NOT NULL,
        patient_name varchar(255) NOT NULL,
        modality varchar(8) NOT NULL,
        priority varchar(16) NOT NULL,
        status varchar(16) NOT NULL,
        ordered_at timestamptz NOT NULL,
        sla_deadline timestamptz NOT NULL,
        assigned_to uuid,
        report_id uuid,
        version int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_studies_accession_number UNIQUE (accession_number)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_studies_worklist ON studies (status, priority, sla_deadline)`,
    );
    await queryRunner.query(`CREATE INDEX idx_studies_assigned_to ON studies (assigned_to)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE studies`);
  }
}
