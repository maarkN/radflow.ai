import type { SortDirection } from '@radflow/ddd';
import {
  PaginationOutputMapper,
  type PaginationOutput,
} from '@radflow/ddd';
import type { IUseCase } from '@radflow/ddd';
import { StudySearchParams, type IStudyRepository, type StudyFilter } from '../../../domain/study.repository';
import { StudyOutputMapper, type StudyOutput } from '../common/study-output';

export type ListStudiesInput = {
  page?: number;
  perPage?: number;
  sort?: string;
  sortDir?: SortDirection;
  filter?: StudyFilter;
};

export type ListStudiesOutput = PaginationOutput<StudyOutput>;

export class ListStudiesUseCase implements IUseCase<ListStudiesInput, ListStudiesOutput> {
  constructor(private readonly studyRepository: IStudyRepository) {}

  async execute(input: ListStudiesInput): Promise<ListStudiesOutput> {
    const params = new StudySearchParams({
      page: input.page,
      perPage: input.perPage,
      sort: input.sort ?? null,
      sortDir: input.sortDir ?? null,
      filter: input.filter ?? null,
    });
    const result = await this.studyRepository.search(params);
    const items = result.items.map((study) => StudyOutputMapper.toOutput(study));
    return PaginationOutputMapper.toOutput(items, result);
  }
}
