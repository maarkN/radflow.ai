import { Global, Inject, Module } from '@nestjs/common';
import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NatsJetStreamPublisher } from '@radflow/messaging';
import { MllpServer } from '../../core/mllp/mllp-server';
import { OrmIngestor } from '../../core/mllp/orm-ingestor';
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
      provide: OrmIngestor,
      useFactory: (publisher: NatsJetStreamPublisher) => new OrmIngestor(publisher),
      inject: [NatsJetStreamPublisher],
    },
    {
      provide: MllpServer,
      useFactory: (ingestor: OrmIngestor) => new MllpServer((raw) => ingestor.handle(raw)),
      inject: [OrmIngestor],
    },
  ],
  exports: [NatsJetStreamPublisher],
})
export class MllpModule implements OnApplicationBootstrap, OnApplicationShutdown {
  constructor(
    private readonly mllpServer: MllpServer,
    private readonly publisher: NatsJetStreamPublisher,
    @Inject(ConfigService) private readonly config: ConfigService<EnvDto, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.mllpServer.listen(this.config.get('MLLP_PORT', { infer: true }));
  }

  async onApplicationShutdown(): Promise<void> {
    await this.mllpServer.close();
    await this.publisher.close();
  }
}
