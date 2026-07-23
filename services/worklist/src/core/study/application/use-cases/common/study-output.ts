import type { Study } from '../../../domain/study.aggregate';

export type StudyOutput = {
  id: string;
  accessionNumber: string;
  patientName: string;
  modality: string;
  priority: string;
  status: string;
  orderedAt: Date;
  slaDeadline: Date;
  assignedTo: string | null;
  reportId: string | null;
};

export const StudyOutputMapper = {
  toOutput(study: Study): StudyOutput {
    return {
      id: study.studyId.id,
      accessionNumber: study.accessionNumber,
      patientName: study.patientName,
      modality: study.modality,
      priority: study.priority,
      status: study.status,
      orderedAt: study.orderedAt,
      slaDeadline: study.slaDeadline,
      assignedTo: study.assignedTo?.id ?? null,
      reportId: study.reportId?.id ?? null,
    };
  },
};
