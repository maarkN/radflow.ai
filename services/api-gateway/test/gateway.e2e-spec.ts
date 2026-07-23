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

  beforeAll(async () => {
    natsContainer = await new GenericContainer('nats:2.12-alpine')
      .withExposedPorts(4222)
      .start();

    worklistStub = createServer((req, res) => {
      res.setHeader('content-type', 'application/json');
      if (req.method === 'GET' && req.url?.startsWith('/studies')) {
        res.writeHead(200);
        res.end(JSON.stringify({ data: [{ id: 'stub-study' }], meta: { total: 1 } }));
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

    const { AppModule } = await import('../src/app.module');
    const { applyGlobalConfig } = await import('../src/nest/global-config');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    applyGlobalConfig(app);
    app.enableShutdownHooks();
    await app.init();
    await app.listen(0);

    natsConnection = await connect({ servers: process.env.NATS_URL });
  }, 240_000);

  afterAll(async () => {
    socket?.disconnect();
    await natsConnection?.drain();
    await app?.close();
    await new Promise<void>((resolve) => worklistStub.close(() => resolve()));
    await natsContainer?.stop();
  }, 60_000);

  it('proxies GET /api/v1/studies to the worklist service', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/studies').expect(200);
    expect(response.body.data[0].id).toBe('stub-study');
  });

  it('passes upstream error statuses through unchanged', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/studies/some-id/claim')
      .send({ radiologistId: 'x' })
      .expect(409);
  });

  it('keeps /health outside the /api/v1 prefix', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
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
