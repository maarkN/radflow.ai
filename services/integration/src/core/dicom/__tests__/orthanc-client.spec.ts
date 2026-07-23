import {
  buildOhifViewerUrl,
  OrthancClient,
  OrthancError,
  toDicomPersonName,
} from '../orthanc-client';

describe('toDicomPersonName', () => {
  it.each([
    ['DOE, JOHN', 'DOE^JOHN'],
    ['SILVA, MARIA', 'SILVA^MARIA'],
    ['Madonna', 'Madonna'],
    ['Ana Clara Souza', 'Ana^Clara^Souza'],
  ])('converts %p to %p', (input, expected) => {
    expect(toDicomPersonName(input)).toBe(expected);
  });
});

describe('buildOhifViewerUrl', () => {
  it('builds the ohif viewer url with the study uid', () => {
    expect(buildOhifViewerUrl('http://localhost:8042', '1.2.3')).toBe(
      'http://localhost:8042/ohif/viewer?StudyInstanceUIDs=1.2.3',
    );
  });
});

describe('OrthancClient', () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('creates the study on the first instance and attaches the rest via Parent', async () => {
    fetchSpy.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({ ID: 'i-1', ParentSeries: 'series-1', ParentStudy: 'study-1' }),
          { status: 200 },
        ),
    );
    const client = new OrthancClient('http://orthanc:8042');

    await client.createSyntheticStudy({
      accessionNumber: 'ACC-1',
      patientName: 'DOE, JOHN',
      modality: 'CT',
      instances: 3,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    const bodies = fetchSpy.mock.calls.map(
      (call) =>
        JSON.parse(call[1]!.body as string) as { Tags: Record<string, string>; Parent?: string },
    );
    expect(bodies[0]!.Tags.AccessionNumber).toBe('ACC-1');
    expect(bodies[0]!.Tags.PatientName).toBe('DOE^JOHN');
    expect(bodies[0]!.Parent).toBeUndefined();
    expect(bodies[1]!.Parent).toBe('series-1');
    expect(bodies[2]!.Parent).toBe('series-1');
    expect(bodies[2]!.Tags.InstanceNumber).toBe('3');
  });

  it('finds a study by accession returning the StudyInstanceUID', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify([{ ID: 'orthanc-1', MainDicomTags: { StudyInstanceUID: '1.2.3' } }]),
        { status: 200 },
      ),
    );
    const client = new OrthancClient('http://orthanc:8042');
    const found = await client.findStudyByAccession('ACC-1');
    expect(found).toEqual({ orthancId: 'orthanc-1', studyInstanceUid: '1.2.3' });
  });

  it('returns null when no study matches', async () => {
    fetchSpy.mockResolvedValue(new Response('[]', { status: 200 }));
    const client = new OrthancClient('http://orthanc:8042');
    await expect(client.findStudyByAccession('NOPE')).resolves.toBeNull();
  });

  it('throws OrthancError on non-2xx responses', async () => {
    fetchSpy.mockResolvedValue(new Response('err', { status: 500 }));
    const client = new OrthancClient('http://orthanc:8042');
    await expect(client.findStudyByAccession('ACC-1')).rejects.toThrow(OrthancError);
  });
});
