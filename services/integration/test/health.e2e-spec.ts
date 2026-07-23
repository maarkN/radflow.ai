import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { GenericContainer } from 'testcontainers';
import type { StartedTestContainer } from 'testcontainers';

jest.setTimeout(300_000);

describe('GET /health (e2e)', () => {
  let app: INestApplication;
  let nats: StartedTestContainer;

  beforeAll(async () => {
    nats = await new GenericContainer('nats:2.12-alpine')
      .withCommand(['--jetstream'])
      .withExposedPorts(4222)
      .start();
    process.env.NATS_URL = `nats://${nats.getHost()}:${nats.getMappedPort(4222)}`;
    process.env.MLLP_PORT = '0';

    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.enableShutdownHooks();
    await app.init();
  }, 240_000);

  afterAll(async () => {
    await app?.close();
    await nats?.stop();
  }, 60_000);

  it('reports the service as healthy', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
  });
});
