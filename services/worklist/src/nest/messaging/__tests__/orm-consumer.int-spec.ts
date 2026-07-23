import { randomUUID } from 'node:crypto';
import { DurableConsumer, NatsJetStreamPublisher } from '@radflow/messaging';
import { dlqSubjectFor, Subjects } from '@radflow/shared';
import { connect, StringCodec } from 'nats';
import type { NatsConnection } from 'nats';
import { GenericContainer } from 'testcontainers';
import type { StartedTestContainer } from 'testcontainers';
import { setupTypeOrm } from '@radflow/ddd/dist/infra/testing/typeorm-helpers';
import { AuditLogModel, CreateAuditLogTable1753200000002 } from '@radflow/ddd';
import { CreateOutboxTable1753200000001 } from '@radflow/ddd';
import { OutboxModel } from '@radflow/ddd';
import { CreateStudiesTable1753200000000 } from '../../../core/study/infra/db/typeorm/migrations/1753200000000-create-studies-table';
import { StudyModel } from '../../../core/study/infra/db/typeorm/study.model';
import { createOrmHandler } from '../orm.consumer';

jest.setTimeout(240_000);

const codec = StringCodec();

const waitFor = async (predicate: () => Promise<boolean>, timeoutMs = 20_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('waitFor timeout');
};

const ormEnvelope = (accessionNumber: string) => ({
  eventId: randomUUID(),
  eventVersion: 1,
  occurredOn: new Date().toISOString(),
  correlationId: randomUUID(),
  payload: {
    accessionNumber,
    patientName: 'DOE, JOHN',
    modality: 'CT',
    priority: 'stat',
    orderedAt: new Date().toISOString(),
  },
});

describe('ORM consumer (integration PG + NATS)', () => {
  const context = setupTypeOrm({
    entities: [StudyModel, OutboxModel, AuditLogModel],
    migrations: [
      CreateStudiesTable1753200000000,
      CreateOutboxTable1753200000001,
      CreateAuditLogTable1753200000002,
    ],
    tables: ['studies', 'outbox'],
  });

  let natsContainer: StartedTestContainer;
  let publisher: NatsJetStreamPublisher;
  let inspector: NatsConnection;
  let consumer: DurableConsumer;

  beforeAll(async () => {
    natsContainer = await new GenericContainer('nats:2.12-alpine')
      .withCommand(['--jetstream'])
      .withExposedPorts(4222)
      .start();
    const natsUrl = `nats://${natsContainer.getHost()}:${natsContainer.getMappedPort(4222)}`;
    publisher = new NatsJetStreamPublisher(natsUrl);
    await publisher.connect();
    inspector = await connect({ servers: natsUrl });
  }, 180_000);

  beforeEach(async () => {
    const natsUrl = `nats://${natsContainer.getHost()}:${natsContainer.getMappedPort(4222)}`;
    consumer = new DurableConsumer({
      natsUrl,
      durableName: `orm-test-${randomUUID().slice(0, 8)}`,
      filterSubject: Subjects.Hl7OrmReceived,
      maxDeliver: 2,
      retryDelayMs: 50,
      handler: createOrmHandler(context.dataSource),
    });
    await consumer.start();
  });

  afterEach(async () => {
    await consumer?.stop();
  });

  afterAll(async () => {
    await inspector?.drain();
    await publisher?.close();
    await natsContainer?.stop();
  }, 60_000);

  const studyCount = (accession?: string) =>
    context.dataSource
      .getRepository(StudyModel)
      .count(accession ? { where: { accessionNumber: accession } } : {});

  it('creates a study from an orm_received event (and its own outbox event)', async () => {
    const accession = `ACC-${randomUUID().slice(0, 8)}`;
    await publisher.publish(Subjects.Hl7OrmReceived, ormEnvelope(accession), randomUUID());

    await waitFor(async () => (await studyCount(accession)) === 1);
    const study = await context.dataSource
      .getRepository(StudyModel)
      .findOneByOrFail({ accessionNumber: accession });
    expect(study.status).toBe('unread');
    expect(study.priority).toBe('stat');

    const outboxRows = await context.dataSource.getRepository(OutboxModel).find();
    expect(outboxRows.some((row) => row.subject === Subjects.StudyOrdered)).toBe(true);
  });

  it('is idempotent: two events with the same accession create a single study', async () => {
    const accession = `ACC-${randomUUID().slice(0, 8)}`;
    await publisher.publish(Subjects.Hl7OrmReceived, ormEnvelope(accession), randomUUID());
    await publisher.publish(Subjects.Hl7OrmReceived, ormEnvelope(accession), randomUUID());

    await waitFor(async () => (await studyCount(accession)) === 1);
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    expect(await studyCount(accession)).toBe(1);
  });

  it('propagates the correlationId from the incoming event to the outbox envelope', async () => {
    const accession = `ACC-${randomUUID().slice(0, 8)}`;
    const envelope = ormEnvelope(accession);
    await publisher.publish(Subjects.Hl7OrmReceived, envelope, randomUUID());

    await waitFor(async () => (await studyCount(accession)) === 1);
    const outboxRow = (await context.dataSource.getRepository(OutboxModel).find()).find(
      (row) =>
        (row.envelope.payload as { accessionNumber?: string }).accessionNumber === accession,
    );
    expect(outboxRow?.envelope.correlationId).toBe(envelope.correlationId);
  });

  it('parks an envelope that violates the contract in the DLQ', async () => {
    const dlqMessages: unknown[] = [];
    const subscription = inspector.subscribe(dlqSubjectFor(Subjects.Hl7OrmReceived));
    void (async () => {
      for await (const message of subscription) {
        dlqMessages.push(JSON.parse(codec.decode(message.data)));
      }
    })();

    const bad = { ...ormEnvelope(`ACC-${randomUUID().slice(0, 8)}`), payload: { broken: true } };
    await publisher.publish(Subjects.Hl7OrmReceived, bad, randomUUID());

    await waitFor(async () => dlqMessages.length === 1, 30_000);
    expect(dlqMessages).toHaveLength(1);
  });
});
