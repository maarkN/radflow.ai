import { Controller, Get, Inject, Module, NotFoundException, Param, Query } from '@nestjs/common';
import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DurableConsumer } from '@radflow/messaging';
import { Subjects } from '@radflow/shared';
import { sendMllp } from '../../core/mllp/mllp-client';
import { createOruHandler } from '../../core/oru/oru-emitter';
import type { StudyDetails } from '../../core/oru/oru-emitter';
import { OruStore } from '../../core/oru/oru-store';
import type { EnvDto } from '../../config/env.dto';

export const ORU_CONSUMER_DURABLE_NAME = 'integration-oru-emitter';

@Controller('hl7/oru')
export class OruController {
  constructor(@Inject(OruStore) private readonly store: OruStore) {}

  @Get()
  list(@Query('limit') limit?: string) {
    const items = this.store.list().slice(0, limit ? Number(limit) : 20);
    return {
      data: items.map((item) => ({
        accessionNumber: item.accessionNumber,
        studyId: item.studyId,
        emittedAt: item.emittedAt.toISOString(),
        message: item.message.split('\r'),
      })),
    };
  }

  @Get(':accessionNumber')
  byAccession(@Param('accessionNumber') accessionNumber: string) {
    const item = this.store.findByAccession(accessionNumber);
    if (!item) {
      throw new NotFoundException(`No ORU emitted for accession ${accessionNumber}`);
    }
    return {
      data: {
        accessionNumber: item.accessionNumber,
        studyId: item.studyId,
        emittedAt: item.emittedAt.toISOString(),
        message: item.message.split('\r'),
      },
    };
  }
}

@Module({
  controllers: [OruController],
  providers: [{ provide: OruStore, useValue: new OruStore() }],
})
export class OruModule implements OnApplicationBootstrap, OnApplicationShutdown {
  private consumer: DurableConsumer | null = null;

  constructor(
    @Inject(OruStore) private readonly store: OruStore,
    @Inject(ConfigService) private readonly config: ConfigService<EnvDto, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const worklistUrl = this.config.get('WORKLIST_URL', { infer: true });
    const oruDestination = this.config.get('ORU_DESTINATION', { infer: true });

    const fetchStudy = async (studyId: string): Promise<StudyDetails> => {
      const response = await fetch(`${worklistUrl}/studies/${studyId}`);
      if (!response.ok) {
        throw new Error(`worklist returned ${response.status} for study ${studyId}`);
      }
      const body = (await response.json()) as { data: StudyDetails };
      return body.data;
    };

    const sendOru = oruDestination
      ? async (message: string) => {
          const [host, port] = oruDestination.split(':');
          await sendMllp(host!, Number(port), message);
        }
      : undefined;

    this.consumer = new DurableConsumer({
      natsUrl: this.config.get('NATS_URL', { infer: true }),
      durableName: ORU_CONSUMER_DURABLE_NAME,
      filterSubject: Subjects.StudySigned,
      handler: createOruHandler(fetchStudy, this.store, sendOru),
    });
    await this.consumer.start();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.consumer?.stop();
  }
}
