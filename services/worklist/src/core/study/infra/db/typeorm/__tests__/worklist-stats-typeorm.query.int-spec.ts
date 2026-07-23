import { setupTypeOrm } from '@radflow/ddd/dist/infra/testing/typeorm-helpers';
import { CreateStudiesTable1753200000000 } from '../migrations/1753200000000-create-studies-table';
import { StudyModel } from '../study.model';
import { WorklistStatsTypeOrmQuery } from '../worklist-stats-typeorm.query';

jest.setTimeout(240_000);

describe('WorklistStatsTypeOrmQuery (integration PG)', () => {
  const context = setupTypeOrm({
    entities: [StudyModel],
    migrations: [CreateStudiesTable1753200000000],
    tables: ['studies'],
  });

  const now = new Date('2026-07-23T12:00:00.000Z');
  const minutes = (delta: number) => new Date(now.getTime() + delta * 60_000);

  const insertStudy = async (partial: Partial<StudyModel>): Promise<void> => {
    await context.dataSource.getRepository(StudyModel).insert({
      studyId: crypto.randomUUID(),
      accessionNumber: `ACC-${crypto.randomUUID()}`,
      patientName: 'Stats Patient',
      modality: 'CT',
      priority: 'routine',
      status: 'unread',
      orderedAt: minutes(-120),
      slaDeadline: minutes(120),
      assignedTo: null,
      reportId: null,
      version: 0,
      ...partial,
    });
  };

  it('returns zeroed stats for an empty worklist', async () => {
    const stats = await new WorklistStatsTypeOrmQuery(context.dataSource).execute(now);

    expect(stats).toEqual({
      queueByStatus: { unread: 0, in_progress: 0, dictated: 0, signed: 0 },
      slaAtRiskCount: 0,
      slaBreachedCount: 0,
      avgTurnaroundMinutes: null,
      orderedLastHour: 0,
      signedLastHour: 0,
    });
  });

  it('aggregates queue, SLA risk and hourly volume', async () => {
    // Fila: 2 unread, 1 in_progress, 1 dictated
    await insertStudy({ status: 'unread', slaDeadline: minutes(120) });
    await insertStudy({ status: 'unread', slaDeadline: minutes(10) }); // em risco (janela 15min)
    await insertStudy({ status: 'in_progress', slaDeadline: minutes(-5) }); // estourado
    await insertStudy({ status: 'dictated', slaDeadline: minutes(-5) }); // fechado: fora do risco
    await insertStudy({ status: 'unread', orderedAt: minutes(-30) }); // pedido na última hora

    const stats = await new WorklistStatsTypeOrmQuery(context.dataSource).execute(now);

    expect(stats.queueByStatus).toEqual({ unread: 3, in_progress: 1, dictated: 1, signed: 0 });
    expect(stats.slaAtRiskCount).toBe(2); // deadline em 10min + estourado
    expect(stats.slaBreachedCount).toBe(1);
    expect(stats.orderedLastHour).toBe(1);
  });

  it('computes the average ordered→signed turnaround from signed studies', async () => {
    const insertedAt = new Date();
    // updated_at é definido pelo banco no insert; ordered_at 30min antes disso
    await insertStudy({
      status: 'signed',
      orderedAt: new Date(insertedAt.getTime() - 30 * 60_000),
    });

    const stats = await new WorklistStatsTypeOrmQuery(context.dataSource).execute(new Date());

    expect(stats.avgTurnaroundMinutes).toBeGreaterThanOrEqual(29);
    expect(stats.avgTurnaroundMinutes).toBeLessThanOrEqual(31);
    expect(stats.signedLastHour).toBe(1);
  });
});
