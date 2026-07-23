import { FakeUnitOfWork } from '../../../../../shared/infra/testing/fake-unit-of-work';
import { StudyFakeBuilder } from '../../../../domain/study-fake.builder';
import { StudyInMemoryRepository } from '../../../../infra/db/in-memory/study-in-memory.repository';
import { RadiologistId } from '../../../../domain/value-objects/ids.vo';
import {
  ReleaseStudyUseCase,
  StudyNotAssignedToRadiologistError,
} from '../release-study.use-case';

describe('ReleaseStudyUseCase', () => {
  let repository: StudyInMemoryRepository;
  let useCase: ReleaseStudyUseCase;

  beforeEach(() => {
    repository = new StudyInMemoryRepository();
    useCase = new ReleaseStudyUseCase(repository, new FakeUnitOfWork());
  });

  it('releases a study claimed by the same radiologist', async () => {
    const radiologistId = new RadiologistId();
    const study = StudyFakeBuilder.aStudy().claimedBy(radiologistId).build();
    await repository.insert(study);

    const output = await useCase.execute({
      studyId: study.studyId.id,
      radiologistId: radiologistId.id,
    });

    expect(output.status).toBe('unread');
    expect(output.assignedTo).toBeNull();
  });

  it('rejects a release by a radiologist that does not hold the study', async () => {
    const study = StudyFakeBuilder.aStudy().claimedBy().build();
    await repository.insert(study);
    await expect(
      useCase.execute({ studyId: study.studyId.id, radiologistId: new RadiologistId().id }),
    ).rejects.toThrow(StudyNotAssignedToRadiologistError);
  });
});
