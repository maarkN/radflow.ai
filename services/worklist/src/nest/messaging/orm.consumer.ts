import { Inject, Injectable } from '@nestjs/common';
import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DurableConsumer } from '@radflow/messaging';
import type { ConsumedMessage } from '@radflow/messaging';
import { hl7OrmReceivedEventSchema, Subjects } from '@radflow/shared';
import { DataSource } from 'typeorm';
import { SystemClock } from '../../core/shared/domain/clock.interface';
import { UnitOfWorkTypeOrm } from '../../core/shared/infra/db/typeorm/unit-of-work-typeorm';
import { CreateStudyUseCase } from '../../core/study/application/use-cases/create-study/create-study.use-case';
import { StudyTypeOrmRepository } from '../../core/study/infra/db/typeorm/study-typeorm.repository';
import type { EnvDto } from '../../config/env.dto';

export const ORM_CONSUMER_DURABLE_NAME = 'worklist-orm-consumer';

/**
 * Creates the message handler used by the durable consumer. Exported so the
 * integration test exercises exactly what production runs.
 *
 * Idempotency layers: JetStream dedupes by Nats-Msg-Id; CreateStudyUseCase is
 * idempotent by accession number; the DB unique index is the last resort.
 */
export function createOrmHandler(dataSource: DataSource) {
  return async ({ envelope }: ConsumedMessage): Promise<void> => {
    const event = hl7OrmReceivedEventSchema.parse(envelope);
    const unitOfWork = new UnitOfWorkTypeOrm(dataSource, () => event.correlationId);
    const repository = new StudyTypeOrmRepository(dataSource, unitOfWork);
    const useCase = new CreateStudyUseCase(repository, unitOfWork, new SystemClock());
    await useCase.execute({
      accessionNumber: event.payload.accessionNumber,
      patientName: event.payload.patientName,
      modality: event.payload.modality,
      priority: event.payload.priority,
      orderedAt: new Date(event.payload.orderedAt),
    });
  };
}

@Injectable()
export class OrmConsumerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private consumer: DurableConsumer | null = null;

  constructor(
    private readonly dataSource: DataSource,
    @Inject(ConfigService) private readonly config: ConfigService<EnvDto, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.consumer = new DurableConsumer({
      natsUrl: this.config.get('NATS_URL', { infer: true }),
      durableName: ORM_CONSUMER_DURABLE_NAME,
      filterSubject: Subjects.Hl7OrmReceived,
      handler: createOrmHandler(this.dataSource),
    });
    await this.consumer.start();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.consumer?.stop();
  }
}
