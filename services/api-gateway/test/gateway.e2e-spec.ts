import { createServer } from 'node:http';
import type { Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { connect, StringCodec } from 'nats';
import type { NatsConnection } from 'nats';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import request from 'supertest';
import { GenericContainer } from 'testcontainers';
import type { StartedTestContainer } from 'testcontainers';

jest.setTimeout(300_000);

describe('API gateway (e2e)', () => {
  let app: INestApplication;
  let natsContainer: StartedTestContainer;
  let natsConnection: NatsConnection;
  let worklistStub: HttpServer;
  let socket: Socket;
  let radiologistToken: string;
  let adminToken: string;
  let techToken: string;
  const auditRecords: Record<string, unknown>[] = [];

  beforeAll(async () => {
    natsContainer = await new GenericContainer('nats:2.12-alpine').withExposedPorts(4222).start();

    worklistStub = createServer((req, res) => {
      res.setHeader('content-type', 'application/json');
      if (req.method === 'POST' && req.url === '/audit') {
        let raw = '';
        req.on('data', (chunk: Buffer) => (raw += chunk.toString()));
        req.on('end', () => {
          auditRecords.push(JSON.parse(raw) as Record<string, unknown>);
          res.writeHead(204);
          res.end();
        });
        return;
      }
      if (req.method === 'GET' && req.url?.startsWith('/studies')) {
        res.writeHead(200);
        res.end(JSON.stringify({ data: [{ id: 'stub-study' }], meta: { total: 1 } }));
        return;
      }
      if (req.method === 'GET' && req.url?.startsWith('/audit')) {
        res.writeHead(200);
        res.end(JSON.stringify([{ action: 'study.claimed', actor: 'stub' }]));
        return;
      }
      if (req.method === 'GET' && req.url?.startsWith('/dicom/studies/')) {
        res.writeHead(200);
        res.end(JSON.stringify({ data: { viewerUrl: 'http://stub/ohif/viewer?x=1' } }));
        return;
      }
      if (req.method === 'POST' && req.url?.endsWith('/claim')) {
        res.writeHead(409);
        res.end(JSON.stringify({ statusCode: 409, error: 'Conflict', message: 'stub conflict' }));
        return;
      }
      res.writeHead(404);
      res.end(JSON.stringify({ statusCode: 404 }));
    });
    await new Promise<void>((resolve) => worklistStub.listen(0, resolve));
    const stubPort = (worklistStub.address() as AddressInfo).port;

    process.env.NATS_URL = `nats://${natsContainer.getHost()}:${natsContainer.getMappedPort(4222)}`;
    process.env.WORKLIST_URL = `http://127.0.0.1:${stubPort}`;
    process.env.INTEGRATION_URL = `http://127.0.0.1:${stubPort}`;

    const { AppModule } = await import('../src/app.module');
    const { applyGlobalConfig } = await import('../src/nest/global-config');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    applyGlobalConfig(app);
    app.enableShutdownHooks();
    await app.init();
    await app.listen(0);

    natsConnection = await connect({ servers: process.env.NATS_URL });

    const login = async (username: string, password: string) => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username, password })
        .expect(200);
      return response.body.data.token as string;
    };
    radiologistToken = await login('ana', 'ana');
    adminToken = await login('admin', 'admin');
    techToken = await login('tech', 'tech');
  }, 240_000);

  afterAll(async () => {
    socket?.disconnect();
    await natsConnection?.drain();
    await app?.close();
    await new Promise<void>((resolve) => worklistStub.close(() => resolve()));
    await natsContainer?.stop();
  }, 60_000);

  it('rejects unauthenticated requests with 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/studies').expect(401);
  });

  it('rejects an invalid login with 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'ana', password: 'wrong' })
      .expect(401);
  });

  it('proxies GET /api/v1/studies for any authenticated role', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/studies')
      .set('Authorization', `Bearer ${techToken}`)
      .expect(200);
    expect(response.body.data[0].id).toBe('stub-study');
  });

  it('RBAC: a technologist cannot claim a study (403) and the denial is audited', async () => {
    auditRecords.length = 0;
    await request(app.getHttpServer())
      .post('/api/v1/studies/some-id/claim')
      .set('Authorization', `Bearer ${techToken}`)
      .send({ radiologistId: 'x' })
      .expect(403);

    expect(auditRecords).toHaveLength(1);
    expect(auditRecords[0]).toMatchObject({
      action: 'access.denied',
      entityType: 'Route',
      origin: 'api-gateway',
      detail: { role: 'technologist', requiredRoles: ['radiologist'] },
    });
    expect(auditRecords[0]?.entityId).toContain('/studies/some-id/claim');
  });

  it('RBAC: only admin reads the audit trail', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/audit/worklist')
      .set('Authorization', `Bearer ${radiologistToken}`)
      .expect(403);
    const response = await request(app.getHttpServer())
      .get('/api/v1/audit/worklist')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(response.body[0].action).toBe('study.claimed');
  });

  it('passes upstream error statuses through unchanged (radiologist claim)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/studies/some-id/claim')
      .set('Authorization', `Bearer ${radiologistToken}`)
      .send({ radiologistId: 'x' })
      .expect(409);
  });

  it('keeps /health outside the /api/v1 prefix', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });

  it('proxies GET /api/v1/dicom/studies/:accession to the integration service', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/dicom/studies/ACC-1')
      .set('Authorization', `Bearer ${radiologistToken}`)
      .expect(200);
    expect(response.body.data.viewerUrl).toContain('/ohif/viewer');
  });

  it('re-emits NATS events to websocket clients as study.event', async () => {
    const httpServer = app.getHttpServer() as HttpServer;
    const port = (httpServer.address() as AddressInfo).port;
    socket = io(`http://127.0.0.1:${port}`, { transports: ['websocket'] });

    const received = new Promise<{ subject: string; envelope: { eventId: string } }>((resolve) =>
      socket.on('study.event', resolve),
    );
    await new Promise<void>((resolve) => socket.on('connect', () => resolve()));

    const envelope = { eventId: 'evt-1', payload: { studyId: 'study-1' } };
    natsConnection.publish('radflow.study.ordered', StringCodec().encode(JSON.stringify(envelope)));

    const message = await received;
    expect(message.subject).toBe('radflow.study.ordered');
    expect(message.envelope.eventId).toBe('evt-1');
  });
});
