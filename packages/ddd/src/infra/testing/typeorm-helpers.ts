import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';

type ClassLike = new (...args: never[]) => unknown;

type SetupTypeOrmOptions = {
  entities: ClassLike[];
  migrations: ClassLike[];
  tables: string[];
};

type TypeOrmTestContext = {
  dataSource: DataSource;
};

/**
 * Starts a disposable Postgres (Testcontainers), runs the migrations once and
 * truncates the given tables before each test. Requires a running Docker daemon.
 */
export function setupTypeOrm(options: SetupTypeOrmOptions): TypeOrmTestContext {
  let container: StartedPostgreSqlContainer;
  const context = {} as TypeOrmTestContext;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    context.dataSource = new DataSource({
      type: 'postgres',
      url: container.getConnectionUri(),
      entities: options.entities,
      migrations: options.migrations,
      synchronize: false,
      logging: false,
    });
    await context.dataSource.initialize();
    await context.dataSource.runMigrations();
  }, 180_000);

  beforeEach(async () => {
    for (const table of options.tables) {
      await context.dataSource.query(`TRUNCATE TABLE ${table} CASCADE`);
    }
  });

  afterAll(async () => {
    await context.dataSource?.destroy();
    await container?.stop();
  }, 60_000);

  return context;
}
