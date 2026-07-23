import { InvalidStateTransitionError } from '../../../../../shared/domain/errors/invalid-state-transition.error';
import { NotFoundError } from '../../../../../shared/domain/errors/not-found.error';
import { FakeUnitOfWork } from '../../../../../shared/infra/testing/fake-unit-of-work';
import { StudyFakeBuilder } from '../../../../domain/study-fake.builder';
import { StudyInMemoryRepository } from '../../../../infra/db/in-memory/study-in-memory.repository';
import { RadiologistId } from '../../../../domain/value-objects/ids.vo';
import { ClaimStudyUseCase } from '../claim-study.use-case';

describe('ClaimStudyUseCase', () => {
  let repository: StudyInMemoryRepository;
  let useCase: ClaimStudyUseCase;

  beforeEach(() => {
    repository = new StudyInMemoryRepository();
    useCase = new ClaimStudyUseCase(repository, new FakeUnitOfWork());
  });

  it('claims an unread study for the radiologist', async () => {
    const study = StudyFakeBuilder.aStudy().build();
    await repository.insert(study);
    const radiologistId = new RadiologistId();

    const output = await useCase.execute({
      studyId: study.studyId.id,
      radiologistId: radiologistId.id,
    });

    expect(output.status).toBe('in_progress');
    expect(output.assignedTo).toBe(radiologistId.id);
    const stored = await repository.findById(study.studyId);
    expect(stored?.status).toBe('in_progress');
  });

  it('throws NotFoundError for an unknown study', async () => {
    await expect(
      useCase.execute({ studyId: new RadiologistId().id, radiologistId: new RadiologistId().id }),
    ).rejects.toThrow(NotFoundError);
  });

  it('propagates the domain error when the study is already claimed', async () => {
    const study = StudyFakeBuilder.aStudy().claimedBy().build();
    await repository.insert(study);
    await expect(
      useCase.execute({ studyId: study.studyId.id, radiologistId: new RadiologistId().id }),
    ).rejects.toThrow(InvalidStateTransitionError);
  });
});
