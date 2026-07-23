import { DraftClientError } from '../../application/ports/draft-client.interface';
import type { GeneratedDraft, IDraftClient } from '../../application/ports/draft-client.interface';

export class ReportAiHttpClient implements IDraftClient {
  constructor(private readonly baseUrl: string) {}

  async generateDraft(transcript: string, modality: string): Promise<GeneratedDraft> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/reports/draft`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ transcript, modality }),
      });
    } catch (error) {
      throw new DraftClientError(`unreachable (${String(error)})`);
    }
    if (!response.ok) {
      throw new DraftClientError(`status ${response.status}`);
    }
    const body = (await response.json()) as {
      technique: string;
      findings: string;
      impression: string;
      criticalFinding: string | null;
      provider: string;
    };
    return {
      technique: body.technique,
      findings: body.findings,
      impression: body.impression,
      criticalFinding: body.criticalFinding,
      provider: body.provider,
    };
  }
}
