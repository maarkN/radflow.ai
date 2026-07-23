import { ConcurrencyError } from '@radflow/ddd';
import { NotFoundError } from '@radflow/ddd';
import { LoadEntityError } from '@radflow/ddd';
import { setupTypeOrm } from '@radflow/ddd/dist/infra/testing/typeorm-helpers';
import { StudyFakeBuilder } from '../../../../domain/study-fake.builder';
import {
  DuplicatedAccessionNumberError,
  StudySearchParams,
} from '../../../../domain/study.repository';
import { RadiologistId, StudyId } from '../../../../domain/value-objects/ids.vo';
import { CreateStudiesTable1753200000000 } from '../migrations/1753200000000-create-studies-table';
import { StudyModel } from '../study.model';
import { StudyTypeOrmRepository } from '../study-typeorm.repository';

jest.setTimeout(180_000);

describe('StudyTypeOrmRepository (integration)', () => {
  const context = setupTypeOrm({
    entities: [StudyModel],
    migrations: [CreateStudiesTable1753200000000],
    tables: ['studies'],
  });

  const makeRepository = () => new StudyTypeOrmRepository(context.dataSource);

  it('inserts and rehydrates a study with its value objects', async () => {
    const repository = makeRepository();
    const study = StudyFakeBuilder.aStudy().stat().build();
    await repository.insert(study);

    const found = await repository.findById(study.studyId);
    expect(found).not.toBeNull();
    expect(found!.studyId.equals(study.studyId)).toBe(true);
    expect(found!.priority).toBe('stat');
    expect(found!.status).toBe('unread');
    expect(found!.version).toBe(0);
  });

  it('maps the unique constraint to DuplicatedAccessionNumberError', async () => {
    const repository = makeRepository();
    await repository.insert(StudyFakeBuilder.aStudy().withAccessionNumber('ACC-DUP').build());
    await expect(
      repository.insert(StudyFakeBuilder.aStudy().withAccessionNumber('ACC-DUP').build()),
    ).rejects.toThrow(DuplicatedAccessionNumberError);
  });

  it('persists a claim and bumps the version', async () => {
    const repository = makeRepository();
    const study = StudyFakeBuilder.aStudy().build();
    await repository.insert(study);

    study.claim(new RadiologistId());
    await repository.update(study);

    const stored = await repository.findById(study.studyId);
    expect(stored!.status).toBe('in_progress');
    expect(stored!.version).toBe(1);
  });

  it('GATE: two concurrent claims — only the first one wins (optimistic lock)', async () => {
    const repository = makeRepository();
    const study = StudyFakeBuilder.aStudy().build();
    await repository.insert(study);

    const copyA = (await repository.findById(study.studyId))!;
    const copyB = (await repository.findById(study.studyId))!;
    const radiologistA = new RadiologistId();
    copyA.claim(radiologistA);
    copyB.claim(new RadiologistId());

    const results = await Promise.allSettled([repository.update(copyA), repository.update(copyB)]);
    const failed = results.filter((result) => result.status === 'rejected');
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConcurrencyError);

    const stored = await repository.findById(study.studyId);
    expect(stored!.status).toBe('in_progress');
    expect(stored!.version).toBe(1);
  });

  it('throws NotFoundError when updating a study that does not exist', async () => {
    const repository = makeRepository();
    const ghost = StudyFakeBuilder.aStudy().build();
    ghost.claim(new RadiologistId());
    await expect(repository.update(ghost)).rejects.toThrow(NotFoundError);
  });

  it('searches with the default worklist order (priority rank, then SLA)', async () => {
    const repository = makeRepository();
    const routine = StudyFakeBuilder.aStudy()
      .routine()
      .withAccessionNumber('R-1')
      .withSlaDeadline(new Date('2026-07-22T10:00:00Z'))
      .build();
    const statLate = StudyFakeBuilder.aStudy()
      .stat()
      .withAccessionNumber('S-2')
      .withSlaDeadline(new Date('2026-07-22T15:00:00Z'))
      .build();
    const statEarly = StudyFakeBuilder.aStudy()
      .stat()
      .withAccessionNumber('S-1')
      .withSlaDeadline(new Date('2026-07-22T13:00:00Z'))
      .build();
    for (const study of [routine, statLate, statEarly]) {
      await repository.insert(study);
    }

    const result = await repository.search(new StudySearchParams());
    expect(result.items.map((item) => item.accessionNumber)).toEqual(['S-1', 'S-2', 'R-1']);
    expect(result.total).toBe(3);
  });

  it('filters by status and assignedTo', async () => {
    const repository = makeRepository();
    const radiologistId = new RadiologistId();
    const mine = StudyFakeBuilder.aStudy().claimedBy(radiologistId).build();
    const other = StudyFakeBuilder.aStudy().claimedBy().build();
    const unread = StudyFakeBuilder.aStudy().build();
    for (const study of [mine, other, unread]) {
      await repository.insert(study);
    }

    const result = await repository.search(
      new StudySearchParams({
        filter: { status: 'in_progress', assignedTo: radiologistId.id },
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.studyId.equals(mine.studyId)).toBe(true);
  });

  it('throws LoadEntityError when a stored row is corrupt', async () => {
    const repository = makeRepository();
    const id = new StudyId();
    await context.dataSource.query(
      `INSERT INTO studies (study_id, accession_number, patient_name, modality, priority, status, ordered_at, sla_deadline)
       VALUES ($1, 'ACC-BAD', 'Corrupt Row', 'CT', 'not-a-priority', 'unread', now(), now())`,
      [id.id],
    );
    await expect(repository.findById(id)).rejects.toThrow(LoadEntityError);
  });
});
