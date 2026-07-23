import { StudyFakeBuilder } from '../../../../domain/study-fake.builder';
import { StudyInMemoryRepository } from '../../../../infra/db/in-memory/study-in-memory.repository';
import { ListStudiesUseCase } from '../list-studies.use-case';

describe('ListStudiesUseCase', () => {
  let repository: StudyInMemoryRepository;
  let useCase: ListStudiesUseCase;

  beforeEach(() => {
    repository = new StudyInMemoryRepository();
    useCase = new ListStudiesUseCase(repository);
  });

  it('lists studies in worklist order (priority then SLA) with pagination metadata', async () => {
    const stat = StudyFakeBuilder.aStudy().stat().withAccessionNumber('S-1').build();
    const routine = StudyFakeBuilder.aStudy().routine().withAccessionNumber('R-1').build();
    await repository.insert(routine);
    await repository.insert(stat);

    const output = await useCase.execute({});
    expect(output.items.map((item) => item.accessionNumber)).toEqual(['S-1', 'R-1']);
    expect(output.total).toBe(2);
    expect(output.currentPage).toBe(1);
  });

  it('applies filters', async () => {
    await repository.insert(StudyFakeBuilder.aStudy().withModality('CT').build());
    await repository.insert(StudyFakeBuilder.aStudy().withModality('MR').build());

    const output = await useCase.execute({ filter: { modality: 'MR' } });
    expect(output.items).toHaveLength(1);
    expect(output.items[0]!.modality).toBe('MR');
  });
});
