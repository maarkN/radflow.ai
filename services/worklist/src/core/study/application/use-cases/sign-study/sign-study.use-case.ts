import { NotFoundError } from '../../../../shared/domain/errors/not-found.error';
import type { IUnitOfWork } from '../../../../shared/domain/repository/unit-of-work.interface';
import type { IUseCase } from '../../../../shared/application/use-case.interface';
import { Study } from '../../../domain/study.aggregate';
import type { IStudyRepository } from '../../../domain/study.repository';
import { RadiologistId, StudyId } from '../../../domain/value-objects/ids.vo';
import { StudyOutputMapper, type StudyOutput } from '../common/study-output';

export type SignStudyInput = { studyId: string; radiologistId: string; contentHash: string };

export class SignStudyUseCase implements IUseCase<SignStudyInput, StudyOutput> {
  constructor(
    private readonly studyRepository: IStudyRepository,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: SignStudyInput): Promise<StudyOutput> {
    const study = await this.studyRepository.findById(new StudyId(input.studyId));
    if (!study) {
      throw new NotFoundError(input.studyId, Study);
    }

    study.sign(new RadiologistId(input.radiologistId), input.contentHash);

    await this.unitOfWork.do(async (uow) => {
      await this.studyRepository.update(study);
      uow.addAggregateRoot(study);
    });

    return StudyOutputMapper.toOutput(study);
  }
}
