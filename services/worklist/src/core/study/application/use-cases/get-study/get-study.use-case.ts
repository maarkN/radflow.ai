import { NotFoundError } from '../../../../shared/domain/errors/not-found.error';
import type { IUseCase } from '../../../../shared/application/use-case.interface';
import { Study } from '../../../domain/study.aggregate';
import type { IStudyRepository } from '../../../domain/study.repository';
import { StudyId } from '../../../domain/value-objects/ids.vo';
import { StudyOutputMapper, type StudyOutput } from '../common/study-output';

export type GetStudyInput = { studyId: string };

export class GetStudyUseCase implements IUseCase<GetStudyInput, StudyOutput> {
  constructor(private readonly studyRepository: IStudyRepository) {}

  async execute(input: GetStudyInput): Promise<StudyOutput> {
    const study = await this.studyRepository.findById(new StudyId(input.studyId));
    if (!study) {
      throw new NotFoundError(input.studyId, Study);
    }
    return StudyOutputMapper.toOutput(study);
  }
}
