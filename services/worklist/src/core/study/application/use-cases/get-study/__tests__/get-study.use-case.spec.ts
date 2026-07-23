import { NotFoundError } from '@radflow/ddd';
import { StudyFakeBuilder } from '../../../../domain/study-fake.builder';
import { StudyInMemoryRepository } from '../../../../infra/db/in-memory/study-in-memory.repository';
import { StudyId } from '../../../../domain/value-objects/ids.vo';
import { GetStudyUseCase } from '../get-study.use-case';

describe('GetStudyUseCase', () => {
  it('returns the study output by id', async () => {
    const repository = new StudyInMemoryRepository();
    const study = StudyFakeBuilder.aStudy().build();
    await repository.insert(study);

    const output = await new GetStudyUseCase(repository).execute({ studyId: study.studyId.id });
    expect(output.accessionNumber).toBe(study.accessionNumber);
  });

  it('throws NotFoundError for an unknown id', async () => {
    const useCase = new GetStudyUseCase(new StudyInMemoryRepository());
    await expect(useCase.execute({ studyId: new StudyId().id })).rejects.toThrow(NotFoundError);
  });
});
