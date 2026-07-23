export type GeneratedDraft = {
  technique: string;
  findings: string;
  impression: string;
  criticalFinding: string | null;
  provider: string;
};

/** Port to the report-ai service. */
export interface IDraftClient {
  generateDraft(transcript: string, modality: string): Promise<GeneratedDraft>;
}

export class DraftClientError extends Error {
  constructor(detail: string) {
    super(`report-ai draft generation failed: ${detail}`);
    this.name = 'DraftClientError';
  }
}
