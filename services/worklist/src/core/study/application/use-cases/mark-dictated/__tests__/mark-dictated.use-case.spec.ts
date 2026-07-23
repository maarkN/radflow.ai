import { Subjects } from '@radflow/shared';
import { FakeUnitOfWork } from '@radflow/ddd';
import { StudyFakeBuilder } from '../../../../domain/study-fake.builder';
import { StudyInMemoryRepository } from '../../../../infra/db/in-memory/study-in-memory.repository';
import { RadiologistId, ReportId } from '../../../../domain/value-objects/ids.vo';
import { StudyNotAssignedToRadiologistError } from '../../release-study/release-study.use-case';
import { MarkDictatedUseCase } from '../mark-dictated.use-case';

describe('MarkDictatedUseCase', () => {
  let repository: StudyInMemoryRepository;
  let unitOfWork: FakeUnitOfWork;
  let useCase: MarkDictatedUseCase;

  beforeEach(() => {
    repository = new StudyInMemoryRepository();
    unitOfWork = new FakeUnitOfWork();
    useCase = new MarkDictatedUseCase(repository, unitOfWork);
  });

  it('marks a claimed study as dictated and registers the event', async () => {
    const radiologistId = new RadiologistId();
    const study = StudyFakeBuilder.aStudy().claimedBy(radiologistId).build();
    await repository.insert(study);
    const reportId = new ReportId();

    const output = await useCase.execute({
      studyId: study.studyId.id,
      reportId: reportId.id,
      radiologistId: radiologistId.id,
    });

    expect(output.status).toBe('dictated');
    expect(output.reportId).toBe(reportId.id);
    const events = unitOfWork
      .getAggregateRoots()
      .flatMap((aggregate) => [...aggregate.getUncommittedEvents()]);
    expect(
      events.some((event) => event.getIntegrationEvent()?.subject === Subjects.StudyDictated),
    ).toBe(true);
  });

  it('rejects dictation by a radiologist that does not hold the study', async () => {
    const study = StudyFakeBuilder.aStudy().claimedBy().build();
    await repository.insert(study);
    await expect(
      useCase.execute({
        studyId: study.studyId.id,
        reportId: new ReportId().id,
        radiologistId: new RadiologistId().id,
      }),
    ).rejects.toThrow(StudyNotAssignedToRadiologistError);
  });
});
