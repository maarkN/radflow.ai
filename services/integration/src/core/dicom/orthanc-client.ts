import { SYNTHETIC_IMAGE_DATA_URI } from './synthetic-image';

export type CreateDicomStudyInput = {
  accessionNumber: string;
  patientName: string;
  modality: string;
  studyDescription?: string;
  /** Instances (images) to create for the study. Default 3. */
  instances?: number;
};

export type OrthancStudyRef = {
  orthancId: string;
  studyInstanceUid: string;
};

export class OrthancError extends Error {
  constructor(operation: string, status: number) {
    super(`Orthanc ${operation} failed with status ${status}`);
    this.name = 'OrthancError';
  }
}

/** 'DOE, JOHN' -> DICOM PN 'DOE^JOHN'. */
export function toDicomPersonName(displayName: string): string {
  const [family, given] = displayName.split(', ');
  return given ? `${family}^${given}` : displayName.replaceAll(' ', '^');
}

type CreateDicomResponse = { ID: string; ParentSeries: string; ParentStudy: string };

/**
 * Thin client over Orthanc's REST API. Synthetic studies are created through
 * /tools/create-dicom: the first instance creates the study/series (Orthanc
 * assigns the UIDs) and the remaining ones attach via Parent. The accession
 * number is the join key to the worklist; OHIF opens by StudyInstanceUID.
 */
export class OrthancClient {
  constructor(private readonly baseUrl: string) {}

  async createSyntheticStudy(input: CreateDicomStudyInput): Promise<void> {
    const instances = input.instances ?? 3;
    const first = await this.createDicom({
      Tags: {
        PatientName: toDicomPersonName(input.patientName),
        PatientID: `SYN-${input.accessionNumber}`,
        AccessionNumber: input.accessionNumber,
        Modality: input.modality,
        StudyDescription: input.studyDescription ?? `Synthetic ${input.modality} study`,
        SeriesDescription: 'Synthetic series',
        InstanceNumber: '1',
      },
      Content: SYNTHETIC_IMAGE_DATA_URI,
    });

    for (let index = 2; index <= instances; index += 1) {
      await this.createDicom({
        Parent: first.ParentSeries,
        Tags: { InstanceNumber: String(index) },
        Content: SYNTHETIC_IMAGE_DATA_URI,
      });
    }
  }

  private async createDicom(body: Record<string, unknown>): Promise<CreateDicomResponse> {
    const response = await fetch(`${this.baseUrl}/tools/create-dicom`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new OrthancError('create-dicom', response.status);
    }
    return (await response.json()) as CreateDicomResponse;
  }

  async findStudyByAccession(accessionNumber: string): Promise<OrthancStudyRef | null> {
    const response = await fetch(`${this.baseUrl}/tools/find`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        Level: 'Study',
        Query: { AccessionNumber: accessionNumber },
        Expand: true,
      }),
    });
    if (!response.ok) {
      throw new OrthancError('tools/find', response.status);
    }
    const results = (await response.json()) as Array<{
      ID: string;
      MainDicomTags: { StudyInstanceUID: string };
    }>;
    const first = results[0];
    if (!first) {
      return null;
    }
    return { orthancId: first.ID, studyInstanceUid: first.MainDicomTags.StudyInstanceUID };
  }
}

export function buildOhifViewerUrl(publicOrthancUrl: string, studyInstanceUid: string): string {
  return `${publicOrthancUrl}/ohif/viewer?StudyInstanceUIDs=${studyInstanceUid}`;
}
