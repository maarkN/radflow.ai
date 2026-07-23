import { dlqSubjectFor } from '@radflow/shared';
import { AckPolicy, connect, DeliverPolicy, StringCodec } from 'nats';
import type { ConsumerMessages, NatsConnection } from 'nats';
import { ensureStream, RADFLOW_STREAM } from './publisher';

const codec = StringCodec();

export type ConsumedMessage = {
  subject: string;
  envelope: Record<string, unknown>;
  redeliveryCount: number;
};

export type DurableConsumerOptions = {
  natsUrl: string;
  durableName: string;
  filterSubject: string;
  /** Attempts before the message is parked in the DLQ (default 5). */
  maxDeliver?: number;
  /** Delay before a failed message is redelivered, in ms (default 200). */
  retryDelayMs?: number;
  handler: (message: ConsumedMessage) => Promise<void>;
};

/**
 * Durable JetStream consumer: explicit ack, bounded retries and dead-letter
 * parking under radflow.dlq.<subject>. One durable name = one consumer group;
 * running multiple instances load-balances the messages.
 */
export class DurableConsumer {
  private connection: NatsConnection | null = null;
  private messages: ConsumerMessages | null = null;

  constructor(private readonly options: DurableConsumerOptions) {}

  async start(): Promise<void> {
    const maxDeliver = this.options.maxDeliver ?? 5;
    this.connection = await connect({ servers: this.options.natsUrl });
    await ensureStream(this.connection);

    const manager = await this.connection.jetstreamManager();
    try {
      await manager.consumers.add(RADFLOW_STREAM, {
        durable_name: this.options.durableName,
        ack_policy: AckPolicy.Explicit,
        deliver_policy: DeliverPolicy.All,
        filter_subject: this.options.filterSubject,
        // +1 so the attempt where we park the message still gets delivered.
        max_deliver: maxDeliver + 1,
        ack_wait: 30_000_000_000,
      });
    } catch {
      // Consumer already exists with this durable name.
    }

    const jetStream = this.connection.jetstream();
    const consumer = await jetStream.consumers.get(RADFLOW_STREAM, this.options.durableName);
    this.messages = await consumer.consume();

    void (async () => {
      for await (const message of this.messages!) {
        let envelope: Record<string, unknown>;
        try {
          envelope = JSON.parse(codec.decode(message.data)) as Record<string, unknown>;
        } catch (error) {
          await this.park(message.subject, { raw: codec.decode(message.data) }, error);
          message.term();
          continue;
        }

        try {
          await this.options.handler({
            subject: message.subject,
            envelope,
            redeliveryCount: message.info.redeliveryCount,
          });
          message.ack();
        } catch (error) {
          if (message.info.redeliveryCount >= maxDeliver) {
            await this.park(message.subject, envelope, error);
            message.term();
          } else {
            message.nak(this.options.retryDelayMs ?? 200);
          }
        }
      }
    })();
  }

  private async park(subject: string, envelope: Record<string, unknown>, error: unknown) {
    const jetStream = this.connection?.jetstream();
    await jetStream?.publish(
      dlqSubjectFor(subject),
      JSON.stringify({
        originalSubject: subject,
        envelope,
        error: error instanceof Error ? error.message : String(error),
        failedAt: new Date().toISOString(),
      }),
    );
  }

  async stop(): Promise<void> {
    await this.messages?.close();
    await this.connection?.drain();
    this.connection = null;
    this.messages = null;
  }
}
