import type { IClock } from '../../../../shared/domain/clock.interface';
import type { IUnitOfWork } from '../../../../shared/domain/repository/unit-of-work.interface';
import { EntityValidationError } from '../../../../shared/domain/validators/validation.error';
import type { IUseCase } from '../../../../shared/application/use-case.interface';
import { SlaPolicy } from '../../../domain/sla-policy';
import { Study } from '../../../domain/study.aggregate';
import type { IStudyRepository } from '../../../domain/study.repository';
import { StudyOutputMapper, type StudyOutput } from '../common/study-output';
import type { CreateStudyInput } from './create-study.input';

export type CreateStudyOutput = { study: StudyOutput; created: boolean };

/**
 * Idempotent by accession number: creating a study that already exists returns
 * the stored one (created=false) so the HL7 consumer can safely reprocess.
 */
export class CreateStudyUseCase implements IUseCase<CreateStudyInput, CreateStudyOutput> {
  constructor(
    private readonly studyRepository: IStudyRepository,
    private readonly unitOfWork: IUnitOfWork,
    private readonly clock: IClock,
  ) {}

  async execute(input: CreateStudyInput): Promise<CreateStudyOutput> {
    const existing = await this.studyRepository.findByAccessionNumber(input.accessionNumber);
    if (existing) {
      return { study: StudyOutputMapper.toOutput(existing), created: false };
    }

    const orderedAt = input.orderedAt ?? this.clock.now();
    const study = Study.create({
      accessionNumber: input.accessionNumber,
      patientName: input.patientName,
      modality: input.modality,
      priority: input.priority,
      orderedAt,
      slaDeadline: SlaPolicy.deadlineFor(input.priority, orderedAt),
    });

    if (study.notification.hasErrors()) {
      throw new EntityValidationError(study.notification.toJSON());
    }

    await this.unitOfWork.do(async (uow) => {
      await this.studyRepository.insert(study);
      uow.addAggregateRoot(study);
    });

    return { study: StudyOutputMapper.toOutput(study), created: true };
  }
}
