import { connect, headers } from 'nats';
import type { JetStreamClient, NatsConnection } from 'nats';

export const RADFLOW_STREAM = 'RADFLOW';

export async function ensureStream(connection: NatsConnection): Promise<void> {
  const manager = await connection.jetstreamManager();
  try {
    await manager.streams.info(RADFLOW_STREAM);
  } catch {
    await manager.streams.add({ name: RADFLOW_STREAM, subjects: ['radflow.>'] });
  }
}

export type PublishResult = { duplicate: boolean };

export interface IEventPublisher {
  publish(
    subject: string,
    envelope: Record<string, unknown>,
    messageId: string,
  ): Promise<PublishResult>;
}

/**
 * JetStream publisher. `messageId` becomes the Nats-Msg-Id header, so the
 * stream deduplicates redeliveries of the same message (at-least-once safe).
 */
export class NatsJetStreamPublisher implements IEventPublisher {
  private connection: NatsConnection | null = null;
  private jetStream: JetStreamClient | null = null;

  constructor(private readonly natsUrl: string) {}

  async connect(): Promise<void> {
    this.connection = await connect({ servers: this.natsUrl });
    await ensureStream(this.connection);
    this.jetStream = this.connection.jetstream();
  }

  async publish(
    subject: string,
    envelope: Record<string, unknown>,
    messageId: string,
  ): Promise<PublishResult> {
    if (!this.jetStream) {
      throw new Error('NatsJetStreamPublisher is not connected; call connect() first');
    }
    const messageHeaders = headers();
    messageHeaders.set('Nats-Msg-Id', messageId);
    const ack = await this.jetStream.publish(subject, JSON.stringify(envelope), {
      headers: messageHeaders,
    });
    return { duplicate: ack.duplicate };
  }

  async close(): Promise<void> {
    await this.connection?.drain();
    this.connection = null;
    this.jetStream = null;
  }
}
