import { Subjects } from '@radflow/shared';
import { InvalidStateTransitionError } from '../../../../../shared/domain/errors/invalid-state-transition.error';
import { FakeUnitOfWork } from '../../../../../shared/infra/testing/fake-unit-of-work';
import { StudyFakeBuilder } from '../../../../domain/study-fake.builder';
import { StudyInMemoryRepository } from '../../../../infra/db/in-memory/study-in-memory.repository';
import { SignedByAnotherRadiologistError } from '../../../../domain/study.aggregate';
import { RadiologistId } from '../../../../domain/value-objects/ids.vo';
import { SignStudyUseCase } from '../sign-study.use-case';

describe('SignStudyUseCase', () => {
  let repository: StudyInMemoryRepository;
  let unitOfWork: FakeUnitOfWork;
  let useCase: SignStudyUseCase;

  beforeEach(() => {
    repository = new StudyInMemoryRepository();
    unitOfWork = new FakeUnitOfWork();
    useCase = new SignStudyUseCase(repository, unitOfWork);
  });

  it('signs a dictated study and registers the event with the content hash', async () => {
    const radiologistId = new RadiologistId();
    const study = StudyFakeBuilder.aStudy().claimedBy(radiologistId).dictated().build();
    await repository.insert(study);

    const output = await useCase.execute({
      studyId: study.studyId.id,
      radiologistId: radiologistId.id,
      contentHash: 'sha256:abc',
    });

    expect(output.status).toBe('signed');
    const events = unitOfWork
      .getAggregateRoots()
      .flatMap((aggregate) => [...aggregate.getUncommittedEvents()]);
    const signed = events
      .map((event) => event.getIntegrationEvent())
      .find((integration) => integration?.subject === Subjects.StudySigned);
    expect(signed?.payload.contentHash).toBe('sha256:abc');
  });

  it('rejects signing by another radiologist', async () => {
    const study = StudyFakeBuilder.aStudy().claimedBy().dictated().build();
    await repository.insert(study);
    await expect(
      useCase.execute({
        studyId: study.studyId.id,
        radiologistId: new RadiologistId().id,
        contentHash: 'sha256:abc',
      }),
    ).rejects.toThrow(SignedByAnotherRadiologistError);
  });

  it('rejects signing a study that was not dictated yet', async () => {
    const radiologistId = new RadiologistId();
    const study = StudyFakeBuilder.aStudy().claimedBy(radiologistId).build();
    await repository.insert(study);
    await expect(
      useCase.execute({
        studyId: study.studyId.id,
        radiologistId: radiologistId.id,
        contentHash: 'sha256:abc',
      }),
    ).rejects.toThrow(InvalidStateTransitionError);
  });
});
