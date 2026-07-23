import { Transform } from 'class-transformer';
import type { StudyOutput } from '../../core/study/application/use-cases/common/study-output';
import type { ListStudiesOutput } from '../../core/study/application/use-cases/list-studies/list-studies.use-case';

export class StudyPresenter {
  id: string;
  accessionNumber: string;
  patientName: string;
  modality: string;
  priority: string;
  status: string;
  @Transform(({ value }: { value: Date }) => value.toISOString())
  orderedAt: Date;
  @Transform(({ value }: { value: Date }) => value.toISOString())
  slaDeadline: Date;
  assignedTo: string | null;
  reportId: string | null;

  constructor(output: StudyOutput) {
    this.id = output.id;
    this.accessionNumber = output.accessionNumber;
    this.patientName = output.patientName;
    this.modality = output.modality;
    this.priority = output.priority;
    this.status = output.status;
    this.orderedAt = output.orderedAt;
    this.slaDeadline = output.slaDeadline;
    this.assignedTo = output.assignedTo;
    this.reportId = output.reportId;
  }
}

export class StudyCollectionPresenter {
  data: StudyPresenter[];
  meta: { total: number; currentPage: number; perPage: number; lastPage: number };

  constructor(output: ListStudiesOutput) {
    this.data = output.items.map((item) => new StudyPresenter(item));
    this.meta = {
      total: output.total,
      currentPage: output.currentPage,
      perPage: output.perPage,
      lastPage: output.lastPage,
    };
  }
}
