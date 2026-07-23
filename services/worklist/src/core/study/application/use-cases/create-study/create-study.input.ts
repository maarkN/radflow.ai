import type { Modality, Priority } from '@radflow/shared';

export type CreateStudyInput = {
  accessionNumber: string;
  patientName: string;
  modality: Modality;
  priority: Priority;
  orderedAt?: Date;
  /** Who/what created the study (e.g. 'hl7-feed', 'seed', a user id). */
  actor?: string;
};
