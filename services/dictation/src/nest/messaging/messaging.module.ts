import { Global, Inject, Module } from '@nestjs/common';
import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { OutboxRelay } from '@radflow/ddd';
import { NatsJetStreamPublisher } from '@radflow/messaging';
import type { EnvDto } from '../../config/env.dto';

@Global()
@Module({
  providers: [
    {
      provide: NatsJetStreamPublisher,
      useFactory: async (config: ConfigService<EnvDto, true>) => {
        const publisher = new NatsJetStreamPublisher(config.get('NATS_URL', { infer: true }));
        await publisher.connect();
        return publisher;
      },
      inject: [ConfigService],
    },
    {
      provide: OutboxRelay,
      useFactory: (dataSource: DataSource, publisher: NatsJetStreamPublisher) =>
        new OutboxRelay(dataSource, publisher),
      inject: [DataSource, NatsJetStreamPublisher],
    },
  ],
  exports: [NatsJetStreamPublisher, OutboxRelay],
})
export class MessagingModule implements OnApplicationBootstrap, OnApplicationShutdown {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly relay: OutboxRelay,
    private readonly publisher: NatsJetStreamPublisher,
    @Inject(ConfigService) private readonly config: ConfigService<EnvDto, true>,
  ) {}

  onApplicationBootstrap(): void {
    const interval = this.config.get('OUTBOX_POLL_INTERVAL_MS', { infer: true });
    this.timer = setInterval(() => {
      void this.relay.publishPending().catch(() => {
        // The next tick retries; rows stay unpublished until the publish succeeds.
      });
    }, interval);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
    }
    await this.publisher.close();
  }
}
