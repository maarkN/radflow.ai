import { authHeaders } from './auth';

export type Study = {
  id: string;
  accessionNumber: string;
  patientName: string;
  modality: string;
  priority: 'stat' | 'urgent' | 'routine';
  status: 'unread' | 'in_progress' | 'dictated' | 'signed';
  orderedAt: string;
  slaDeadline: string;
  assignedTo: string | null;
  reportId: string | null;
};

export type StudyCollection = {
  data: Study[];
  meta: { total: number; currentPage: number; perPage: number; lastPage: number };
};

export type WorklistFilters = {
  status?: string;
  modality?: string;
  priority?: string;
};

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3010/api/v1';

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handle<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
  if (!response.ok) {
    const message = Array.isArray(body.message) ? body.message.join('; ') : body.message;
    throw new ApiError(response.status, message ?? `Request failed (${response.status})`);
  }
  return body as T;
}

export async function listStudies(filters: WorklistFilters): Promise<StudyCollection> {
  const params = new URLSearchParams({ perPage: '100' });
  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }
  const response = await fetch(`${API_URL}/studies?${params}`, { headers: authHeaders() });
  return handle<StudyCollection>(response);
}

export async function claimStudy(studyId: string, radiologistId: string): Promise<void> {
  const response = await fetch(`${API_URL}/studies/${studyId}/claim`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ radiologistId }),
  });
  await handle(response);
}

export async function releaseStudy(studyId: string, radiologistId: string): Promise<void> {
  const response = await fetch(`${API_URL}/studies/${studyId}/release`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ radiologistId }),
  });
  await handle(response);
}

export type ReportSections = {
  technique: string;
  findings: string;
  impression: string;
};

export type Report = {
  id: string;
  studyId: string;
  radiologistId: string;
  transcript: string | null;
  sections: ReportSections | null;
  criticalFinding: string | null;
  provider: string | null;
  status: 'draft' | 'signed';
  contentHash: string | null;
  signedAt: string | null;
};

async function reportRequest(path: string, init?: RequestInit): Promise<Report> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'content-type': 'application/json', ...authHeaders() },
    ...init,
  });
  const body = await handle<{ data: Report }>(response);
  return body.data;
}

export function startReport(studyId: string, radiologistId: string): Promise<Report> {
  return reportRequest('/reports', {
    method: 'POST',
    body: JSON.stringify({ studyId, radiologistId }),
  });
}

export function attachTranscript(reportId: string, transcript: string): Promise<Report> {
  return reportRequest(`/reports/${reportId}/transcript`, {
    method: 'PUT',
    body: JSON.stringify({ transcript }),
  });
}

export function generateDraft(reportId: string): Promise<Report> {
  return reportRequest(`/reports/${reportId}/draft`, { method: 'POST' });
}

export function updateReport(reportId: string, sections: Partial<ReportSections>): Promise<Report> {
  return reportRequest(`/reports/${reportId}`, {
    method: 'PUT',
    body: JSON.stringify({ sections }),
  });
}

export function signReport(reportId: string, radiologistId: string): Promise<Report> {
  return reportRequest(`/reports/${reportId}/sign`, {
    method: 'POST',
    body: JSON.stringify({ radiologistId }),
  });
}

export type DicomStudyRef = {
  accessionNumber: string;
  studyInstanceUid: string;
  viewerUrl: string;
};

export async function getDicomStudy(accessionNumber: string): Promise<DicomStudyRef> {
  const response = await fetch(`${API_URL}/dicom/studies/${accessionNumber}`, {
    headers: authHeaders(),
  });
  const body = await handle<{ data: DicomStudyRef }>(response);
  return body.data;
}
