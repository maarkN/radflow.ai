import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer } from 'testcontainers';
import type { StartedTestContainer } from 'testcontainers';

jest.setTimeout(300_000);

describe('GET /health (e2e)', () => {
  let app: INestApplication;
  let postgres: StartedPostgreSqlContainer;
  let nats: StartedTestContainer;

  beforeAll(async () => {
    [postgres, nats] = await Promise.all([
      new PostgreSqlContainer('postgres:16-alpine').start(),
      new GenericContainer('nats:2.12-alpine')
        .withCommand(['--jetstream'])
        .withExposedPorts(4222)
        .start(),
    ]);
    process.env.DATABASE_URL = postgres.getConnectionUri();
    process.env.NATS_URL = `nats://${nats.getHost()}:${nats.getMappedPort(4222)}`;

    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.enableShutdownHooks();
    await app.init();
  }, 240_000);

  afterAll(async () => {
    await app?.close();
    await Promise.all([postgres?.stop(), nats?.stop()]);
  }, 60_000);

  it('reports the service as healthy', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
  });
});
