import { NotFoundError } from '@radflow/ddd';
import type { IUnitOfWork } from '@radflow/ddd';
import type { IUseCase } from '@radflow/ddd';
import { Study } from '../../../domain/study.aggregate';
import type { IStudyRepository } from '../../../domain/study.repository';
import { RadiologistId, ReportId, StudyId } from '../../../domain/value-objects/ids.vo';
import { StudyNotAssignedToRadiologistError } from '../release-study/release-study.use-case';
import { StudyOutputMapper, type StudyOutput } from '../common/study-output';

export type MarkDictatedInput = { studyId: string; reportId: string; radiologistId: string };

export class MarkDictatedUseCase implements IUseCase<MarkDictatedInput, StudyOutput> {
  constructor(
    private readonly studyRepository: IStudyRepository,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: MarkDictatedInput): Promise<StudyOutput> {
    const study = await this.studyRepository.findById(new StudyId(input.studyId));
    if (!study) {
      throw new NotFoundError(input.studyId, Study);
    }
    if (!study.assignedTo?.equals(new RadiologistId(input.radiologistId))) {
      throw new StudyNotAssignedToRadiologistError(input.studyId, input.radiologistId);
    }

    study.markDictated(new ReportId(input.reportId));

    await this.unitOfWork.do(async (uow) => {
      await this.studyRepository.update(study);
      uow.addAggregateRoot(study);
      uow.recordAudit({
        actor: input.radiologistId,
        action: 'study.dictated',
        entityType: 'Study',
        entityId: study.studyId.id,
        detail: { reportId: input.reportId },
        origin: 'worklist-api',
      });
    });

    return StudyOutputMapper.toOutput(study);
  }
}
