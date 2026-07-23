export type WorklistStudy = {
  id: string;
  accessionNumber: string;
  patientName: string;
  modality: string;
  status: string;
  assignedTo: string | null;
};

/** Port to the worklist service (study state machine). */
export interface IWorklistClient {
  getStudy(studyId: string): Promise<WorklistStudy>;
  markDictated(studyId: string, reportId: string, radiologistId: string): Promise<void>;
  /** Must treat an already-signed study (409 from worklist) as success for retries. */
  sign(studyId: string, radiologistId: string, contentHash: string): Promise<void>;
}

export class WorklistClientError extends Error {
  constructor(detail: string) {
    super(`worklist call failed: ${detail}`);
    this.name = 'WorklistClientError';
  }
}
