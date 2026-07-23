import { NotFoundError } from '../../../../shared/domain/errors/not-found.error';
import type { IUnitOfWork } from '../../../../shared/domain/repository/unit-of-work.interface';
import type { IUseCase } from '../../../../shared/application/use-case.interface';
import { Study } from '../../../domain/study.aggregate';
import type { IStudyRepository } from '../../../domain/study.repository';
import { RadiologistId, StudyId } from '../../../domain/value-objects/ids.vo';
import { StudyOutputMapper, type StudyOutput } from '../common/study-output';

export type ReleaseStudyInput = { studyId: string; radiologistId: string };

export class ReleaseStudyUseCase implements IUseCase<ReleaseStudyInput, StudyOutput> {
  constructor(
    private readonly studyRepository: IStudyRepository,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: ReleaseStudyInput): Promise<StudyOutput> {
    const study = await this.studyRepository.findById(new StudyId(input.studyId));
    if (!study) {
      throw new NotFoundError(input.studyId, Study);
    }

    const radiologistId = new RadiologistId(input.radiologistId);
    if (!study.assignedTo?.equals(radiologistId)) {
      throw new StudyNotAssignedToRadiologistError(input.studyId, input.radiologistId);
    }

    study.release();

    await this.unitOfWork.do(async (uow) => {
      await this.studyRepository.update(study);
      uow.addAggregateRoot(study);
    });

    return StudyOutputMapper.toOutput(study);
  }
}

export class StudyNotAssignedToRadiologistError extends Error {
  constructor(studyId: string, radiologistId: string) {
    super(`Study ${studyId} is not assigned to radiologist ${radiologistId}`);
    this.name = 'StudyNotAssignedToRadiologistError';
  }
}
