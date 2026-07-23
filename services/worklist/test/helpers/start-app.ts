import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer } from 'testcontainers';
import type { StartedTestContainer } from 'testcontainers';

export type E2eContext = { app: INestApplication };

/**
 * Boots the full application against disposable Postgres + NATS containers.
 * AppModule is imported lazily so ConfigModule reads the env AFTER the
 * container URLs are known.
 */
export function startApp(): E2eContext {
  let postgres: StartedPostgreSqlContainer;
  let nats: StartedTestContainer;
  const context = {} as E2eContext;

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
    process.env.OUTBOX_POLL_INTERVAL_MS = '100';

    const { AppModule } = await import('../../src/app.module');
    const { applyGlobalConfig } = await import('../../src/nest/global-config');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    context.app = moduleRef.createNestApplication();
    applyGlobalConfig(context.app);
    context.app.enableShutdownHooks();
    await context.app.init();
  }, 240_000);

  afterAll(async () => {
    await context.app?.close();
    await Promise.all([postgres?.stop(), nats?.stop()]);
  }, 60_000);

  return context;
}
