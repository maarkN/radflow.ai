import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReportsTable1753300000000 implements MigrationInterface {
  name = 'CreateReportsTable1753300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE reports (
        report_id uuid PRIMARY KEY,
        study_id uuid NOT NULL,
        radiologist_id uuid NOT NULL,
        transcript text,
        technique text,
        findings text,
        impression text,
        critical_finding text,
        provider varchar(32),
        status varchar(16) NOT NULL,
        content_hash varchar(128),
        signed_at timestamptz,
        version int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_reports_study_id ON reports (study_id)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE reports`);
  }
}
