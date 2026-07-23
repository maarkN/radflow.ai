import { AuditLogModel } from '../audit-log.model';
import { CreateAuditLogTable1753200000002 } from '../migrations/1753200000002-create-audit-log-table';
import { CreateOutboxTable1753200000001 } from '../migrations/1753200000001-create-outbox-table';
import { OutboxModel } from '../outbox.model';
import { UnitOfWorkTypeOrm } from '../unit-of-work-typeorm';
import { setupTypeOrm } from '../../../testing/typeorm-helpers';

jest.setTimeout(240_000);

describe('Audit log (integration)', () => {
  const context = setupTypeOrm({
    entities: [AuditLogModel, OutboxModel],
    migrations: [CreateOutboxTable1753200000001, CreateAuditLogTable1753200000002],
    tables: ['outbox'],
  });

  beforeEach(async () => {
    // audit_log cannot be truncated through DELETE paths guarded by the
    // trigger; TRUNCATE bypasses row triggers, which is fine for tests.
    await context.dataSource.query('TRUNCATE TABLE audit_log');
  });

  it('writes the audit entry in the same transaction as the work', async () => {
    const uow = new UnitOfWorkTypeOrm(context.dataSource);
    await uow.do(async (activeUow) => {
      activeUow.recordAudit({
        actor: 'rad-1',
        action: 'study.claimed',
        entityType: 'Study',
        entityId: 'study-1',
        origin: 'worklist-api',
        detail: { from: 'unread', to: 'in_progress' },
      });
    });

    const rows = await context.dataSource.getRepository(AuditLogModel).find();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.actor).toBe('rad-1');
    expect(rows[0]!.action).toBe('study.claimed');
    expect(rows[0]!.detail).toEqual({ from: 'unread', to: 'in_progress' });
  });

  it('rolls the audit entry back when the work fails (atomicity)', async () => {
    const uow = new UnitOfWorkTypeOrm(context.dataSource);
    await expect(
      uow.do(async (activeUow) => {
        activeUow.recordAudit({
          actor: 'rad-1',
          action: 'study.claimed',
          entityType: 'Study',
          entityId: 'study-1',
          origin: 'worklist-api',
        });
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    await expect(context.dataSource.getRepository(AuditLogModel).count()).resolves.toBe(0);
  });

  it('the database rejects UPDATE and DELETE on audit rows (append-only)', async () => {
    const uow = new UnitOfWorkTypeOrm(context.dataSource);
    await uow.do(async (activeUow) => {
      activeUow.recordAudit({
        actor: 'rad-1',
        action: 'study.signed',
        entityType: 'Study',
        entityId: 'study-2',
        origin: 'worklist-api',
      });
    });

    await expect(
      context.dataSource.query(`UPDATE audit_log SET actor = 'tampered'`),
    ).rejects.toThrow(/append-only/);
    await expect(context.dataSource.query(`DELETE FROM audit_log`)).rejects.toThrow(
      /append-only/,
    );
  });
});
