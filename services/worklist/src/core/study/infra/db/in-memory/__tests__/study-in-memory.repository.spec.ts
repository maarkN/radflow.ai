import { ConcurrencyError } from '@radflow/ddd';
import { StudyFakeBuilder } from '../../../../domain/study-fake.builder';
import {
  DuplicatedAccessionNumberError,
  StudySearchParams,
} from '../../../../domain/study.repository';
import { RadiologistId } from '../../../../domain/value-objects/ids.vo';
import { StudyInMemoryRepository } from '../study-in-memory.repository';

describe('StudyInMemoryRepository', () => {
  let repository: StudyInMemoryRepository;

  beforeEach(() => {
    repository = new StudyInMemoryRepository();
  });

  it('inserts and finds a study by id', async () => {
    const study = StudyFakeBuilder.aStudy().build();
    await repository.insert(study);
    const found = await repository.findById(study.studyId);
    expect(found?.accessionNumber).toBe(study.accessionNumber);
  });

  it('rejects duplicated accession numbers (mirrors the DB unique index)', async () => {
    const study = StudyFakeBuilder.aStudy().withAccessionNumber('ACC-1').build();
    await repository.insert(study);
    const duplicated = StudyFakeBuilder.aStudy().withAccessionNumber('ACC-1').build();
    await expect(repository.insert(duplicated)).rejects.toThrow(DuplicatedAccessionNumberError);
  });

  it('finds by accession number', async () => {
    const study = StudyFakeBuilder.aStudy().withAccessionNumber('ACC-FIND').build();
    await repository.insert(study);
    const found = await repository.findByAccessionNumber('ACC-FIND');
    expect(found?.studyId.equals(study.studyId)).toBe(true);
  });

  it('update enforces optimistic locking: the second concurrent claim fails', async () => {
    const study = StudyFakeBuilder.aStudy().build();
    await repository.insert(study);

    const copyA = (await repository.findById(study.studyId))!;
    const copyB = (await repository.findById(study.studyId))!;

    copyA.claim(new RadiologistId());
    await repository.update(copyA);

    copyB.claim(new RadiologistId());
    await expect(repository.update(copyB)).rejects.toThrow(ConcurrencyError);

    const stored = await repository.findById(study.studyId);
    expect(stored?.assignedTo?.equals(copyA.assignedTo!)).toBe(true);
  });

  describe('search', () => {
    it('orders by priority rank then earliest SLA deadline by default', async () => {
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
    });

    it('filters by status and priority', async () => {
      const claimed = StudyFakeBuilder.aStudy().stat().claimedBy().build();
      const unread = StudyFakeBuilder.aStudy().routine().build();
      await repository.insert(claimed);
      await repository.insert(unread);

      const result = await repository.search(
        new StudySearchParams({ filter: { status: 'in_progress', priority: 'stat' } }),
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.studyId.equals(claimed.studyId)).toBe(true);
    });

    it('paginates and reports totals', async () => {
      for (const study of StudyFakeBuilder.theStudies(7).buildMany()) {
        await repository.insert(study);
      }
      const result = await repository.search(new StudySearchParams({ page: 2, perPage: 3 }));
      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(7);
      expect(result.lastPage).toBe(3);
    });
  });
});
