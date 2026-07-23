import { Subjects } from '@radflow/shared';
import { FixedClock } from '@radflow/ddd';
import { EntityValidationError } from '@radflow/ddd';
import { FakeUnitOfWork } from '@radflow/ddd';
import { StudyInMemoryRepository } from '../../../../infra/db/in-memory/study-in-memory.repository';
import { CreateStudyUseCase } from '../create-study.use-case';

describe('CreateStudyUseCase', () => {
  const now = new Date('2026-07-22T12:00:00Z');
  let repository: StudyInMemoryRepository;
  let unitOfWork: FakeUnitOfWork;
  let useCase: CreateStudyUseCase;

  const validInput = {
    accessionNumber: 'ACC-2026-0001',
    patientName: 'Test Patient',
    modality: 'CT' as const,
    priority: 'stat' as const,
  };

  beforeEach(() => {
    repository = new StudyInMemoryRepository();
    unitOfWork = new FakeUnitOfWork();
    useCase = new CreateStudyUseCase(repository, unitOfWork, new FixedClock(now));
  });

  it('creates an unread study with the SLA computed from the priority', async () => {
    const output = await useCase.execute(validInput);
    expect(output.created).toBe(true);
    expect(output.study.status).toBe('unread');
    expect(output.study.slaDeadline.toISOString()).toBe('2026-07-22T13:00:00.000Z');
    await expect(repository.findByAccessionNumber('ACC-2026-0001')).resolves.not.toBeNull();
  });

  it('registers the aggregate on the unit of work so events reach the outbox', async () => {
    await useCase.execute(validInput);
    const aggregates = unitOfWork.getAggregateRoots();
    expect(aggregates).toHaveLength(1);
    const integrationEvent = aggregates[0]!.getUncommittedEvents()[0]!.getIntegrationEvent();
    expect(integrationEvent?.subject).toBe(Subjects.StudyOrdered);
  });

  it('is idempotent by accession number: the second call returns the stored study', async () => {
    const first = await useCase.execute(validInput);
    const second = await useCase.execute({ ...validInput, patientName: 'Someone Else' });
    expect(second.created).toBe(false);
    expect(second.study.id).toBe(first.study.id);
    expect(second.study.patientName).toBe('Test Patient');
  });

  it('throws EntityValidationError with the accumulated notification errors', async () => {
    await expect(useCase.execute({ ...validInput, accessionNumber: '' })).rejects.toThrow(
      EntityValidationError,
    );
  });
});
