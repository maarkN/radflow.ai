import { GenericContainer } from 'testcontainers';
import type { StartedTestContainer } from 'testcontainers';
import { OrthancClient } from '../orthanc-client';

jest.setTimeout(300_000);

const ORTHANC_CONFIG = JSON.stringify({
  AuthenticationEnabled: false,
  RemoteAccessAllowed: true,
  DicomWeb: { Enable: true },
});

describe('OrthancClient (integration against real Orthanc)', () => {
  let container: StartedTestContainer;
  let client: OrthancClient;

  beforeAll(async () => {
    container = await new GenericContainer('orthancteam/orthanc:latest')
      .withCopyContentToContainer([
        { content: ORTHANC_CONFIG, target: '/etc/orthanc/orthanc.json' },
      ])
      .withExposedPorts(8042)
      .start();
    client = new OrthancClient(
      `http://${container.getHost()}:${container.getMappedPort(8042)}`,
    );
  }, 240_000);

  afterAll(async () => {
    await container?.stop();
  }, 60_000);

  it('creates a synthetic study and finds it back by accession (the join key)', async () => {
    await client.createSyntheticStudy({
      accessionNumber: 'ACC-INT-1',
      patientName: 'DOE, JOHN',
      modality: 'CT',
      instances: 2,
    });

    const found = await client.findStudyByAccession('ACC-INT-1');
    expect(found).not.toBeNull();
    expect(found!.studyInstanceUid).toMatch(/^[\d.]+$/);
  });

  it('returns null for an accession without DICOM', async () => {
    await expect(client.findStudyByAccession('ACC-MISSING')).resolves.toBeNull();
  });
});
