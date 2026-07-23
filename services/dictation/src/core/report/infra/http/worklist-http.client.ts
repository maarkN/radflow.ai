import { WorklistClientError } from '../../application/ports/worklist-client.interface';
import type {
  IWorklistClient,
  WorklistStudy,
} from '../../application/ports/worklist-client.interface';

export class WorklistHttpClient implements IWorklistClient {
  constructor(private readonly baseUrl: string) {}

  async getStudy(studyId: string): Promise<WorklistStudy> {
    const response = await this.request('GET', `/studies/${studyId}`);
    const body = (await response.json()) as { data: WorklistStudy };
    return body.data;
  }

  async markDictated(studyId: string, reportId: string, radiologistId: string): Promise<void> {
    await this.request('POST', `/studies/${studyId}/dictate`, { reportId, radiologistId });
  }

  async sign(studyId: string, radiologistId: string, contentHash: string): Promise<void> {
    const response = await this.request(
      'POST',
      `/studies/${studyId}/sign`,
      { radiologistId, contentHash },
      // 409 = the study is already signed: a retry after a partial failure —
      // treat as success so the saga converges.
      [409],
    );
    void response;
  }

  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    tolerated: number[] = [],
  ): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { 'content-type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      throw new WorklistClientError(`unreachable (${String(error)})`);
    }
    if (!response.ok && !tolerated.includes(response.status)) {
      const detail = await response.text().catch(() => '');
      throw new WorklistClientError(`${method} ${path} -> ${response.status} ${detail}`);
    }
    return response;
  }
}
