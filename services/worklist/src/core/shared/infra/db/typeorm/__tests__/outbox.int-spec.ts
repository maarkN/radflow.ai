import { GenericContainer } from 'testcontainers';
import type { StartedTestContainer } from 'testcontainers';
import { Subjects, studyOrderedEventSchema } from '@radflow/shared';
import { connect } from 'nats';
import type { NatsConnection } from 'nats';
import { CreateStudiesTable1753200000000 } from '../../../../../study/infra/db/typeorm/migrations/1753200000000-create-studies-table';
import { StudyModel } from '../../../../../study/infra/db/typeorm/study.model';
import { StudyTypeOrmRepository } from '../../../../../study/infra/db/typeorm/study-typeorm.repository';
import { Study } from '../../../../../study/domain/study.aggregate';
import { StudyFakeBuilder } from '../../../../../study/domain/study-fake.builder';
import { setupTypeOrm } from '../../../testing/typeorm-helpers';
import { NatsJetStreamPublisher, RADFLOW_STREAM } from '@radflow/messaging';
import { OutboxRelay } from '../../../messaging/outbox-relay';
import { CreateOutboxTable1753200000001 } from '../migrations/1753200000001-create-outbox-table';
import { OutboxModel } from '../outbox.model';
import { UnitOfWorkTypeOrm } from '../unit-of-work-typeorm';

jest.setTimeout(240_000);

describe('Outbox + relay (integration PG + NATS)', () => {
  const context = setupTypeOrm({
    entities: [StudyModel, OutboxModel],
    migrations: [CreateStudiesTable1753200000000, CreateOutboxTable1753200000001],
    tables: ['studies', 'outbox'],
  });

  let natsContainer: StartedTestContainer;
  let natsUrl: string;
  let publisher: NatsJetStreamPublisher;
  let subscriberConnection: NatsConnection;

  beforeAll(async () => {
    natsContainer = await new GenericContainer('nats:2.12-alpine')
      .withCommand(['--jetstream'])
      .withExposedPorts(4222)
      .start();
    natsUrl = `nats://${natsContainer.getHost()}:${natsContainer.getMappedPort(4222)}`;
    publisher = new NatsJetStreamPublisher(natsUrl);
    await publisher.connect();
    subscriberConnection = await connect({ servers: natsUrl });
  }, 180_000);

  afterAll(async () => {
    await subscriberConnection?.drain();
    await publisher?.close();
    await natsContainer?.stop();
  }, 60_000);

  // Uses Study.create (not the FakeBuilder) because create() is what applies
  // the StudyOrderedEvent that must reach the outbox.
  const createStudyThroughUow = async () => {
    const uow = new UnitOfWorkTypeOrm(context.dataSource);
    const repository = new StudyTypeOrmRepository(context.dataSource, uow);
    const orderedAt = new Date();
    const study = Study.create({
      accessionNumber: `ACC-${crypto.randomUUID()}`,
      patientName: 'Outbox Patient',
      modality: 'CT',
      priority: 'stat',
      orderedAt,
      slaDeadline: new Date(orderedAt.getTime() + 3_600_000),
    });
    await uow.do(async (activeUow) => {
      await repository.insert(study);
      activeUow.addAggregateRoot(study);
    });
    return study;
  };

  it('persists the aggregate and its outbox row in the same transaction', async () => {
    const study = await createStudyThroughUow();

    const outboxRows = await context.dataSource.getRepository(OutboxModel).find();
    expect(outboxRows).toHaveLength(1);
    expect(outboxRows[0]!.subject).toBe(Subjects.StudyOrdered);
    expect(outboxRows[0]!.publishedAt).toBeNull();

    const parsed = studyOrderedEventSchema.safeParse(outboxRows[0]!.envelope);
    expect(parsed.success).toBe(true);
    expect((outboxRows[0]!.envelope.payload as { studyId: string }).studyId).toBe(study.studyId.id);
  });

  it('rolls back BOTH the aggregate and the outbox row when the work fails', async () => {
    const uow = new UnitOfWorkTypeOrm(context.dataSource);
    const repository = new StudyTypeOrmRepository(context.dataSource, uow);
    const study = StudyFakeBuilder.aStudy().build();

    await expect(
      uow.do(async (activeUow) => {
        await repository.insert(study);
        activeUow.addAggregateRoot(study);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    await expect(context.dataSource.getRepository(StudyModel).count()).resolves.toBe(0);
    await expect(context.dataSource.getRepository(OutboxModel).count()).resolves.toBe(0);
  });

  it('relay publishes pending rows to JetStream and marks them as published', async () => {
    await createStudyThroughUow();
    const relay = new OutboxRelay(context.dataSource, publisher);

    const published = await relay.publishPending();
    expect(published).toBe(1);

    const outboxRow = (await context.dataSource.getRepository(OutboxModel).find())[0]!;
    expect(outboxRow.publishedAt).not.toBeNull();

    const manager = await subscriberConnection.jetstreamManager();
    const streamInfo = await manager.streams.info(RADFLOW_STREAM);
    expect(streamInfo.state.messages).toBeGreaterThanOrEqual(1);

    await expect(relay.publishPending()).resolves.toBe(0);
  });

  it('JetStream deduplicates a republished eventId (Nats-Msg-Id)', async () => {
    await createStudyThroughUow();
    const row = (await context.dataSource.getRepository(OutboxModel).find())[0]!;

    const first = await publisher.publish(row.subject, row.envelope, row.eventId);
    const second = await publisher.publish(row.subject, row.envelope, row.eventId);
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
  });

  it('rejects an integration event that violates the shared contract', async () => {
    const uow = new UnitOfWorkTypeOrm(context.dataSource);
    const badAggregate = StudyFakeBuilder.aStudy().build();
    badAggregate.markEventsDispatched();
    badAggregate.applyEvent({
      aggregateId: badAggregate.studyId,
      occurredOn: new Date(),
      eventVersion: 1,
      getIntegrationEvent: () => ({
        subject: Subjects.StudyOrdered,
        payload: { studyId: 'not-a-uuid' },
      }),
    });

    await expect(
      uow.do(async (activeUow) => {
        activeUow.addAggregateRoot(badAggregate);
      }),
    ).rejects.toThrow(/violates the shared contract/);

    await expect(context.dataSource.getRepository(OutboxModel).count()).resolves.toBe(0);
  });
});
