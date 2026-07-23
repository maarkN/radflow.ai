import { randomUUID } from 'node:crypto';
import { dlqSubjectFor } from '@radflow/shared';
import { connect, StringCodec } from 'nats';
import type { NatsConnection } from 'nats';
import { GenericContainer } from 'testcontainers';
import type { StartedTestContainer } from 'testcontainers';
import { DurableConsumer } from '../durable-consumer';
import { NatsJetStreamPublisher, RADFLOW_STREAM } from '../publisher';

jest.setTimeout(240_000);

const codec = StringCodec();

const waitFor = async (predicate: () => boolean, timeoutMs = 15_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('waitFor timeout');
};

describe('DurableConsumer (integration)', () => {
  let container: StartedTestContainer;
  let natsUrl: string;
  let publisher: NatsJetStreamPublisher;
  let inspector: NatsConnection;
  const consumers: DurableConsumer[] = [];

  beforeAll(async () => {
    container = await new GenericContainer('nats:2.12-alpine')
      .withCommand(['--jetstream'])
      .withExposedPorts(4222)
      .start();
    natsUrl = `nats://${container.getHost()}:${container.getMappedPort(4222)}`;
    publisher = new NatsJetStreamPublisher(natsUrl);
    await publisher.connect();
    inspector = await connect({ servers: natsUrl });
  }, 180_000);

  afterAll(async () => {
    for (const consumer of consumers) {
      await consumer.stop().catch(() => undefined);
    }
    await inspector?.drain();
    await publisher?.close();
    await container?.stop();
  }, 60_000);

  const startConsumer = async (options: {
    filterSubject: string;
    handler: (message: { envelope: Record<string, unknown> }) => Promise<void>;
    maxDeliver?: number;
  }) => {
    const consumer = new DurableConsumer({
      natsUrl,
      durableName: `test-${randomUUID().slice(0, 8)}`,
      retryDelayMs: 50,
      ...options,
    });
    await consumer.start();
    consumers.push(consumer);
    return consumer;
  };

  it('delivers each published message exactly once to the handler', async () => {
    const subject = 'radflow.study.ordered';
    const received: string[] = [];
    await startConsumer({
      filterSubject: subject,
      handler: async ({ envelope }) => {
        received.push(envelope.eventId as string);
      },
    });

    const ids = [randomUUID(), randomUUID(), randomUUID()];
    for (const id of ids) {
      await publisher.publish(subject, { eventId: id }, id);
    }

    await waitFor(() => received.length === 3);
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(received.sort()).toEqual([...ids].sort());
  });

  it('retries a failing message and succeeds on a later delivery', async () => {
    const subject = 'radflow.study.claimed';
    let attempts = 0;
    let succeeded = false;
    await startConsumer({
      filterSubject: subject,
      handler: async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error('transient failure');
        }
        succeeded = true;
      },
    });

    await publisher.publish(subject, { eventId: 'retry-1' }, randomUUID());
    await waitFor(() => succeeded);
    expect(attempts).toBe(3);
  });

  it('parks a poison message in the DLQ after maxDeliver attempts', async () => {
    const subject = 'radflow.study.signed';
    let attempts = 0;
    await startConsumer({
      filterSubject: subject,
      maxDeliver: 3,
      handler: async () => {
        attempts += 1;
        throw new Error('always fails');
      },
    });

    const dlqMessages: Array<Record<string, unknown>> = [];
    const dlqSubscription = inspector.subscribe(dlqSubjectFor(subject));
    void (async () => {
      for await (const message of dlqSubscription) {
        dlqMessages.push(JSON.parse(codec.decode(message.data)) as Record<string, unknown>);
      }
    })();

    await publisher.publish(subject, { eventId: 'poison-1' }, randomUUID());

    await waitFor(() => dlqMessages.length === 1, 30_000);
    expect(attempts).toBe(3);
    expect(dlqMessages[0]!.originalSubject).toBe(subject);
    expect(dlqMessages[0]!.error).toBe('always fails');

    const manager = await inspector.jetstreamManager();
    const info = await manager.streams.info(RADFLOW_STREAM);
    expect(info.state.messages).toBeGreaterThanOrEqual(1);
  });
});
