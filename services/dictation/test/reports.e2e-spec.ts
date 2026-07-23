import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Subjects } from '@radflow/shared';
import { connect, StringCodec } from 'nats';
import type { NatsConnection } from 'nats';
import request from 'supertest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer } from 'testcontainers';
import type { StartedTestContainer } from 'testcontainers';

jest.setTimeout(300_000);

const codec = StringCodec();

describe('Dictation reporting flow (e2e)', () => {
  let app: INestApplication;
  let postgres: StartedPostgreSqlContainer;
  let nats: StartedTestContainer;
  let natsConnection: NatsConnection;
  let reportAiStub: HttpServer;
  let worklistStub: HttpServer;
  const worklistCalls: string[] = [];
  const criticalEvents: Array<Record<string, unknown>> = [];

  beforeAll(async () => {
    [postgres, nats] = await Promise.all([
      new PostgreSqlContainer('postgres:16-alpine').start(),
      new GenericContainer('nats:2.12-alpine')
        .withCommand(['--jetstream'])
        .withExposedPorts(4222)
        .start(),
    ]);

    // report-ai stub: returns a structured draft with a critical finding
    reportAiStub = createServer((req, res) => {
      res.setHeader('content-type', 'application/json');
      if (req.method === 'POST' && req.url === '/reports/draft') {
        res.writeHead(200);
        res.end(
          JSON.stringify({
            technique: 'CT chest without contrast',
            findings: 'Large right pneumothorax.',
            impression: 'CRITICAL: Large right pneumothorax.',
            criticalFinding: 'Large right pneumothorax.',
            provider: 'stub',
          }),
        );
        return;
      }
      res.writeHead(404);
      res.end('{}');
    });
    await new Promise<void>((resolve) => reportAiStub.listen(0, resolve));

    // worklist stub: records dictate/sign calls, serves study details
    worklistStub = createServer((req, res) => {
      res.setHeader('content-type', 'application/json');
      const url = req.url ?? '';
      if (req.method === 'GET' && url.startsWith('/studies/')) {
        res.writeHead(200);
        res.end(
          JSON.stringify({
            data: {
              id: url.split('/')[2],
              accessionNumber: 'ACC-E2E',
              patientName: 'DOE, JOHN',
              modality: 'CT',
              status: 'in_progress',
              assignedTo: null,
            },
          }),
        );
        return;
      }
      if (req.method === 'POST' && (url.endsWith('/dictate') || url.endsWith('/sign'))) {
        worklistCalls.push(`${url}`);
        res.writeHead(200);
        res.end(JSON.stringify({ data: { ok: true } }));
        return;
      }
      res.writeHead(404);
      res.end('{}');
    });
    await new Promise<void>((resolve) => worklistStub.listen(0, resolve));

    process.env.DATABASE_URL = postgres.getConnectionUri();
    process.env.NATS_URL = `nats://${nats.getHost()}:${nats.getMappedPort(4222)}`;
    process.env.REPORT_AI_URL = `http://127.0.0.1:${(reportAiStub.address() as AddressInfo).port}`;
    process.env.WORKLIST_URL = `http://127.0.0.1:${(worklistStub.address() as AddressInfo).port}`;
    process.env.OUTBOX_POLL_INTERVAL_MS = '100';

    natsConnection = await connect({ servers: process.env.NATS_URL });
    const subscription = natsConnection.subscribe(Subjects.StudyCriticalFinding);
    void (async () => {
      for await (const message of subscription) {
        criticalEvents.push(JSON.parse(codec.decode(message.data)) as Record<string, unknown>);
      }
    })();

    const { AppModule } = await import('../src/app.module');
    const { applyGlobalConfig } = await import('../src/nest/global-config');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    applyGlobalConfig(app);
    app.enableShutdownHooks();
    await app.init();
  }, 240_000);

  afterAll(async () => {
    await natsConnection?.drain();
    await app?.close();
    await new Promise<void>((resolve) => reportAiStub.close(() => resolve()));
    await new Promise<void>((resolve) => worklistStub.close(() => resolve()));
    await Promise.all([postgres?.stop(), nats?.stop()]);
  }, 60_000);

  it('full journey: start -> transcript -> AI draft -> edit -> sign -> events', async () => {
    const studyId = randomUUID();
    const radiologistId = randomUUID();

    const started = await request(app.getHttpServer())
      .post('/reports')
      .send({ studyId, radiologistId })
      .expect(201);
    const reportId = started.body.data.id;
    expect(started.body.data.status).toBe('draft');

    // Reopening resumes the same draft
    const resumed = await request(app.getHttpServer())
      .post('/reports')
      .send({ studyId, radiologistId })
      .expect(201);
    expect(resumed.body.data.id).toBe(reportId);

    await request(app.getHttpServer())
      .put(`/reports/${reportId}/transcript`)
      .send({ transcript: 'Large right pneumothorax. Otherwise clear.' })
      .expect(200);

    const drafted = await request(app.getHttpServer())
      .post(`/reports/${reportId}/draft`)
      .expect(200);
    expect(drafted.body.data.sections.impression).toContain('CRITICAL');
    expect(drafted.body.data.criticalFinding).toBe('Large right pneumothorax.');

    // The critical finding travels outbox -> NATS
    const deadline = Date.now() + 15_000;
    while (criticalEvents.length === 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    expect(criticalEvents.length).toBeGreaterThanOrEqual(1);
    const envelope = criticalEvents[0]! as { payload: { studyId: string; description: string } };
    expect(envelope.payload.studyId).toBe(studyId);

    // Radiologist edits the impression before signing
    const edited = await request(app.getHttpServer())
      .put(`/reports/${reportId}`)
      .send({ sections: { impression: 'CRITICAL: right pneumothorax. Team notified.' } })
      .expect(200);
    expect(edited.body.data.sections.impression).toContain('Team notified');

    const signed = await request(app.getHttpServer())
      .post(`/reports/${reportId}/sign`)
      .send({ radiologistId })
      .expect(200);
    expect(signed.body.data.status).toBe('signed');
    expect(signed.body.data.contentHash).toMatch(/^sha256:/);

    expect(worklistCalls[0]).toBe(`/studies/${studyId}/dictate`);
    expect(worklistCalls[1]).toBe(`/studies/${studyId}/sign`);

    // A signed report is immutable
    await request(app.getHttpServer())
      .put(`/reports/${reportId}`)
      .send({ sections: { findings: 'tamper' } })
      .expect(409);
  });

  it('drafting without a transcript conflicts; manual reporting still works', async () => {
    const studyId = randomUUID();
    const radiologistId = randomUUID();
    const started = await request(app.getHttpServer())
      .post('/reports')
      .send({ studyId, radiologistId })
      .expect(201);
    const reportId = started.body.data.id;

    await request(app.getHttpServer()).post(`/reports/${reportId}/draft`).expect(409);

    // Manual path: write sections by hand and sign
    await request(app.getHttpServer())
      .put(`/reports/${reportId}`)
      .send({ sections: { technique: 'CT', findings: 'Clear.', impression: 'Normal.' } })
      .expect(200);
    const signed = await request(app.getHttpServer())
      .post(`/reports/${reportId}/sign`)
      .send({ radiologistId })
      .expect(200);
    expect(signed.body.data.status).toBe('signed');
  });

  it('signing without sections returns 409', async () => {
    const started = await request(app.getHttpServer())
      .post('/reports')
      .send({ studyId: randomUUID(), radiologistId: randomUUID() })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/reports/${started.body.data.id}/sign`)
      .send({ radiologistId: randomUUID() })
      .expect(409);
  });
});
