import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { startApp } from './helpers/start-app';

jest.setTimeout(300_000);

const createPayload = (overrides: Record<string, unknown> = {}) => ({
  accessionNumber: `ACC-${randomUUID().slice(0, 8)}`,
  patientName: 'E2E Patient',
  modality: 'CT',
  priority: 'stat',
  ...overrides,
});

describe('Studies API (e2e)', () => {
  const context = startApp();

  it('POST /studies creates a study and serializes dates as ISO strings', async () => {
    const response = await request(context.app.getHttpServer())
      .post('/studies')
      .send(createPayload())
      .expect(201);

    expect(response.body.data.status).toBe('unread');
    expect(response.body.data.slaDeadline).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(response.body.data.assignedTo).toBeNull();
  });

  it('POST /studies is idempotent by accession number', async () => {
    const payload = createPayload();
    const first = await request(context.app.getHttpServer())
      .post('/studies')
      .send(payload)
      .expect(201);
    const second = await request(context.app.getHttpServer())
      .post('/studies')
      .send(payload)
      .expect(201);
    expect(second.body.data.id).toBe(first.body.data.id);
  });

  it('POST /studies rejects an invalid payload with 422', async () => {
    await request(context.app.getHttpServer())
      .post('/studies')
      .send(createPayload({ modality: 'XR', accessionNumber: '' }))
      .expect(422);
  });

  it('GET /studies returns the worklist ordered by priority then SLA with meta', async () => {
    await request(context.app.getHttpServer())
      .post('/studies')
      .send(createPayload({ priority: 'routine', accessionNumber: `R-${randomUUID().slice(0, 8)}` }))
      .expect(201);
    const stat = createPayload({ accessionNumber: `S-${randomUUID().slice(0, 8)}` });
    await request(context.app.getHttpServer()).post('/studies').send(stat).expect(201);

    const response = await request(context.app.getHttpServer())
      .get('/studies')
      .query({ perPage: 100 })
      .expect(200);

    expect(response.body.meta.total).toBeGreaterThanOrEqual(2);
    const priorities = response.body.data.map((item: { priority: string }) => item.priority);
    const lastStat = priorities.lastIndexOf('stat');
    const firstRoutine = priorities.indexOf('routine');
    expect(firstRoutine === -1 || lastStat < firstRoutine).toBe(true);
  });

  it('claim -> conflict on second claim -> release flow', async () => {
    const created = await request(context.app.getHttpServer())
      .post('/studies')
      .send(createPayload())
      .expect(201);
    const studyId = created.body.data.id;
    const radiologistId = randomUUID();

    const claimed = await request(context.app.getHttpServer())
      .post(`/studies/${studyId}/claim`)
      .send({ radiologistId })
      .expect(200);
    expect(claimed.body.data.status).toBe('in_progress');
    expect(claimed.body.data.assignedTo).toBe(radiologistId);

    await request(context.app.getHttpServer())
      .post(`/studies/${studyId}/claim`)
      .send({ radiologistId: randomUUID() })
      .expect(409);

    await request(context.app.getHttpServer())
      .post(`/studies/${studyId}/release`)
      .send({ radiologistId: randomUUID() })
      .expect(403);

    const released = await request(context.app.getHttpServer())
      .post(`/studies/${studyId}/release`)
      .send({ radiologistId })
      .expect(200);
    expect(released.body.data.status).toBe('unread');
  });

  it('returns 404 when claiming an unknown study', async () => {
    await request(context.app.getHttpServer())
      .post(`/studies/${randomUUID()}/claim`)
      .send({ radiologistId: randomUUID() })
      .expect(404);
  });
});
