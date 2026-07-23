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
  const response = await fetch(`${API_URL}/studies?${params}`);
  return handle<StudyCollection>(response);
}

export async function claimStudy(studyId: string, radiologistId: string): Promise<void> {
  const response = await fetch(`${API_URL}/studies/${studyId}/claim`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ radiologistId }),
  });
  await handle(response);
}

export async function releaseStudy(studyId: string, radiologistId: string): Promise<void> {
  const response = await fetch(`${API_URL}/studies/${studyId}/release`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ radiologistId }),
  });
  await handle(response);
}

export type DicomStudyRef = {
  accessionNumber: string;
  studyInstanceUid: string;
  viewerUrl: string;
};

export async function getDicomStudy(accessionNumber: string): Promise<DicomStudyRef> {
  const response = await fetch(`${API_URL}/dicom/studies/${accessionNumber}`);
  const body = await handle<{ data: DicomStudyRef }>(response);
  return body.data;
}
