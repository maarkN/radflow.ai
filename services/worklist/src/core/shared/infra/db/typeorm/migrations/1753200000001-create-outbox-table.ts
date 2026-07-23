import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOutboxTable1753200000001 implements MigrationInterface {
  name = 'CreateOutboxTable1753200000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE outbox (
        event_id uuid PRIMARY KEY,
        subject varchar(128) NOT NULL,
        envelope jsonb NOT NULL,
        occurred_on timestamptz NOT NULL,
        published_at timestamptz,
        attempts int NOT NULL DEFAULT 0
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_outbox_unpublished ON outbox (occurred_on) WHERE published_at IS NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE outbox`);
  }
}
