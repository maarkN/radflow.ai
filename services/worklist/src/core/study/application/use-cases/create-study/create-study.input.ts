import type { Modality, Priority } from '@radflow/shared';

export type CreateStudyInput = {
  accessionNumber: string;
  patientName: string;
  modality: Modality;
  priority: Priority;
  orderedAt?: Date;
};
