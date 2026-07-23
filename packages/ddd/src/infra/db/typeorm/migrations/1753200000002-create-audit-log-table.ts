import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogTable1753200000002 implements MigrationInterface {
  name = 'CreateAuditLogTable1753200000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE audit_log (
        audit_id uuid PRIMARY KEY,
        actor varchar(128) NOT NULL,
        action varchar(64) NOT NULL,
        entity_type varchar(64) NOT NULL,
        entity_id varchar(64) NOT NULL,
        detail jsonb,
        origin varchar(64) NOT NULL,
        occurred_on timestamptz NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_audit_entity_id ON audit_log (entity_id)`);
    await queryRunner.query(`CREATE INDEX idx_audit_occurred_on ON audit_log (occurred_on)`);
    await queryRunner.query(`
      CREATE FUNCTION audit_log_immutable() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'audit_log is append-only';
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER audit_log_no_mutation
      BEFORE UPDATE OR DELETE ON audit_log
      FOR EACH ROW EXECUTE FUNCTION audit_log_immutable()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER audit_log_no_mutation ON audit_log`);
    await queryRunner.query(`DROP FUNCTION audit_log_immutable`);
    await queryRunner.query(`DROP TABLE audit_log`);
  }
}
